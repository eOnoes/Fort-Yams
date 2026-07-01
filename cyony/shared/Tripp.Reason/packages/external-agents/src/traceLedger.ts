/**
 * @tripp-reason/external-agents — Trace Ledger Helpers
 *
 * Append-only JSONL trace ledger for Agent Bus events.
 * Trace events are evidence only — never approve mutations.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import {
  AGENT_BUS_ROOT,
  SCHEMA_VERSION,
} from "./constants.js";
import {
  ValidatedTraceEventSchema,
  type AgentBusTraceEvent,
  type AgentBusTraceEventType,
  type AgentBusTraceSeverity,
  type AgentBusTraceActorType,
  type TraceLedgerValidationResult,
} from "./traceSchemas.js";
import type { ExternalAgentRole } from "./schemas.js";

// ── Path Helpers ──────────────────────────────────────────────────────

const TRACE_FILE = "agent-bus-trace.jsonl";

function resolveTraceRoot(workdir?: string): string {
  const base = path.resolve(workdir ?? process.cwd());
  return path.join(base, AGENT_BUS_ROOT, "trace");
}

function validateTracePath(targetPath: string, root: string): void {
  const normalized = path.resolve(targetPath);
  const rootNormalized = path.resolve(root) + path.sep;
  if (!normalized.startsWith(rootNormalized)) {
    throw new Error(
      `Path traversal rejected: ${targetPath} is outside trace ledger root`
    );
  }
}

export function getTraceLedgerPath(workdir?: string): string {
  return path.join(resolveTraceRoot(workdir), TRACE_FILE);
}

/** Ensure the trace ledger folder and file exist. Idempotent. */
export async function ensureTraceLedger(workdir?: string): Promise<string> {
  const root = resolveTraceRoot(workdir);
  await fs.mkdir(root, { recursive: true });
  const ledgerPath = path.join(root, TRACE_FILE);
  try {
    await fs.access(ledgerPath);
  } catch {
    // Create empty file
    await fs.writeFile(ledgerPath, "", "utf-8");
  }
  return ledgerPath;
}

// ── Create Event ──────────────────────────────────────────────────────

export interface CreateTraceEventInput {
  eventType: AgentBusTraceEventType;
  severity?: AgentBusTraceSeverity;
  actorType?: AgentBusTraceActorType;
  actorId?: string;
  runId?: string;
  parentRunId?: string;
  packetId?: string;
  resultId?: string;
  reviewId?: string;
  parentEventId?: string;
  rootCauseEventId?: string;
  agentRole?: ExternalAgentRole;
  parentAgentRole?: ExternalAgentRole;
  subagentId?: string;
  subagentRole?: string;
  toolNames?: string[];
  sourcePath?: string;
  targetPath?: string;
  summary: string;
  details?: Record<string, unknown>;
  tags?: string[];
}

/** Create a validated trace event object (does NOT write to disk). */
export function createTraceEvent(
  input: CreateTraceEventInput
): AgentBusTraceEvent {
  const event = ValidatedTraceEventSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    eventId: randomUUID(),
    eventType: input.eventType,
    severity: input.severity ?? "info",
    createdAt: new Date().toISOString(),
    actorType: input.actorType ?? "system",
    actorId: input.actorId,
    runId: input.runId,
    parentRunId: input.parentRunId,
    packetId: input.packetId,
    resultId: input.resultId,
    reviewId: input.reviewId,
    parentEventId: input.parentEventId,
    rootCauseEventId: input.rootCauseEventId,
    agentRole: input.agentRole,
    parentAgentRole: input.parentAgentRole,
    subagentId: input.subagentId,
    subagentRole: input.subagentRole,
    toolNames: input.toolNames ?? [],
    sourcePath: input.sourcePath,
    targetPath: input.targetPath,
    summary: input.summary,
    details: input.details ?? {},
    tags: input.tags ?? [],
  });

  return event;
}

/** Append a validated trace event to the JSONL ledger. Returns the event. */
export async function appendTraceEvent(
  event: AgentBusTraceEvent,
  workdir?: string
): Promise<AgentBusTraceEvent> {
  // Validate before writing
  const validated = ValidatedTraceEventSchema.parse(event);
  const ledgerPath = await ensureTraceLedger(workdir);
  validateTracePath(ledgerPath, resolveTraceRoot(workdir));

  const line = JSON.stringify(validated);
  await fs.appendFile(ledgerPath, line + "\n", "utf-8");

  return validated;
}

// ── Read Helpers ──────────────────────────────────────────────────────

export interface ReadTraceOptions {
  workdir?: string;
  limit?: number;
}

/** Read and validate trace events from the JSONL ledger. */
export async function readTraceEvents(
  options: ReadTraceOptions = {}
): Promise<AgentBusTraceEvent[]> {
  const ledgerPath = getTraceLedgerPath(options.workdir);
  let raw: string;
  try {
    raw = await fs.readFile(ledgerPath, "utf-8");
  } catch {
    return [];
  }

  const lines = raw
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const events: AgentBusTraceEvent[] = [];
  for (const line of lines) {
    try {
      const event = ValidatedTraceEventSchema.parse(JSON.parse(line));
      events.push(event);
    } catch {
      // Skip malformed lines during read — validateTraceLedger reports them
    }
  }

  const result = options.limit ? events.slice(-options.limit) : events;
  return result;
}

/** Validate the trace ledger, reporting malformed lines. */
export async function validateTraceLedger(
  workdir?: string
): Promise<TraceLedgerValidationResult> {
  const ledgerPath = getTraceLedgerPath(workdir);
  let raw: string;
  try {
    raw = await fs.readFile(ledgerPath, "utf-8");
  } catch {
    return {
      totalLines: 0,
      validEvents: 0,
      malformedLines: 0,
      malformedLineNumbers: [],
      ledgerPath,
      isValid: true,
    };
  }

  const lines = raw
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const malformedLineNumbers: number[] = [];
  let validCount = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      ValidatedTraceEventSchema.parse(JSON.parse(lines[i]));
      validCount++;
    } catch {
      malformedLineNumbers.push(i + 1); // 1-based line numbers
    }
  }

  return {
    totalLines: lines.length,
    validEvents: validCount,
    malformedLines: malformedLineNumbers.length,
    malformedLineNumbers,
    ledgerPath,
    isValid: malformedLineNumbers.length === 0,
  };
}

// ── Query Helpers ─────────────────────────────────────────────────────

export interface FindTraceOptions {
  workdir?: string;
  limit?: number;
}

async function filterEvents(
  predicate: (event: AgentBusTraceEvent) => boolean,
  options: FindTraceOptions = {}
): Promise<AgentBusTraceEvent[]> {
  const events = await readTraceEvents(options);
  return events.filter(predicate);
}

export function findTraceEventsByPacketId(
  packetId: string,
  options?: FindTraceOptions
): Promise<AgentBusTraceEvent[]> {
  return filterEvents((e) => e.packetId === packetId, options);
}

export function findTraceEventsByResultId(
  resultId: string,
  options?: FindTraceOptions
): Promise<AgentBusTraceEvent[]> {
  return filterEvents((e) => e.resultId === resultId, options);
}

export function findTraceEventsByReviewId(
  reviewId: string,
  options?: FindTraceOptions
): Promise<AgentBusTraceEvent[]> {
  return filterEvents((e) => e.reviewId === reviewId, options);
}

export function findTraceEventsByRunId(
  runId: string,
  options?: FindTraceOptions
): Promise<AgentBusTraceEvent[]> {
  return filterEvents((e) => e.runId === runId, options);
}

/** Follow parentEventId/rootCauseEventId to build a causal chain. */
export async function findRootCauseChain(
  eventId: string,
  workdir?: string
): Promise<AgentBusTraceEvent[]> {
  const allEvents = await readTraceEvents({ workdir });
  const eventMap = new Map<string, AgentBusTraceEvent>();
  for (const e of allEvents) {
    eventMap.set(e.eventId, e);
  }

  const chain: AgentBusTraceEvent[] = [];
  const visited = new Set<string>();
  let current = eventMap.get(eventId);

  // Walk backward through parentEventId/rootCauseEventId
  while (current && !visited.has(current.eventId)) {
    chain.unshift(current);
    visited.add(current.eventId);

    const parentId =
      current.rootCauseEventId ?? current.parentEventId;
    if (parentId) {
      current = eventMap.get(parentId);
    } else {
      break;
    }
  }

  return chain;
}
