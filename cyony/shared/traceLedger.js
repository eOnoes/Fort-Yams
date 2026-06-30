/**
 * @tripp-os/agent-bus — Trace Ledger Helpers
 *
 * Append-only JSONL trace ledger for Agent Bus events.
 * Trace events are evidence only — never approve mutations.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { AGENT_BUS_ROOT, SCHEMA_VERSION, } from "./constants.js";
import { ValidatedTraceEventSchema, } from "./traceSchemas.js";
// ── Path Helpers ──────────────────────────────────────────────────────
const TRACE_FILE = "agent-bus-trace.jsonl";
function resolveTraceRoot(workdir) {
    const base = path.resolve(workdir ?? process.cwd());
    return path.join(base, AGENT_BUS_ROOT, "trace");
}
function validateTracePath(targetPath, root) {
    const normalized = path.resolve(targetPath);
    const rootNormalized = path.resolve(root) + path.sep;
    if (!normalized.startsWith(rootNormalized)) {
        throw new Error(`Path traversal rejected: ${targetPath} is outside trace ledger root`);
    }
}
export function getTraceLedgerPath(workdir) {
    return path.join(resolveTraceRoot(workdir), TRACE_FILE);
}
/** Ensure the trace ledger folder and file exist. Idempotent. */
export async function ensureTraceLedger(workdir) {
    const root = resolveTraceRoot(workdir);
    await fs.mkdir(root, { recursive: true });
    const ledgerPath = path.join(root, TRACE_FILE);
    try {
        await fs.access(ledgerPath);
    }
    catch {
        // Create empty file
        await fs.writeFile(ledgerPath, "", "utf-8");
    }
    return ledgerPath;
}
/** Create a validated trace event object (does NOT write to disk). */
export function createTraceEvent(input) {
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
export async function appendTraceEvent(event, workdir) {
    // Validate before writing
    const validated = ValidatedTraceEventSchema.parse(event);
    const ledgerPath = await ensureTraceLedger(workdir);
    validateTracePath(ledgerPath, resolveTraceRoot(workdir));
    const line = JSON.stringify(validated);
    await fs.appendFile(ledgerPath, line + "\n", "utf-8");
    return validated;
}
/** Read and validate trace events from the JSONL ledger. */
export async function readTraceEvents(options = {}) {
    const ledgerPath = getTraceLedgerPath(options.workdir);
    let raw;
    try {
        raw = await fs.readFile(ledgerPath, "utf-8");
    }
    catch {
        return [];
    }
    const lines = raw
        .split("\n")
        .filter((l) => l.trim().length > 0);
    const events = [];
    for (const line of lines) {
        try {
            const event = ValidatedTraceEventSchema.parse(JSON.parse(line));
            events.push(event);
        }
        catch {
            // Skip malformed lines during read — validateTraceLedger reports them
        }
    }
    const result = options.limit ? events.slice(-options.limit) : events;
    return result;
}
/** Validate the trace ledger, reporting malformed lines. */
export async function validateTraceLedger(workdir) {
    const ledgerPath = getTraceLedgerPath(workdir);
    let raw;
    try {
        raw = await fs.readFile(ledgerPath, "utf-8");
    }
    catch {
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
    const malformedLineNumbers = [];
    let validCount = 0;
    for (let i = 0; i < lines.length; i++) {
        try {
            ValidatedTraceEventSchema.parse(JSON.parse(lines[i]));
            validCount++;
        }
        catch {
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
async function filterEvents(predicate, options = {}) {
    const events = await readTraceEvents(options);
    return events.filter(predicate);
}
export function findTraceEventsByPacketId(packetId, options) {
    return filterEvents((e) => e.packetId === packetId, options);
}
export function findTraceEventsByResultId(resultId, options) {
    return filterEvents((e) => e.resultId === resultId, options);
}
export function findTraceEventsByReviewId(reviewId, options) {
    return filterEvents((e) => e.reviewId === reviewId, options);
}
export function findTraceEventsByRunId(runId, options) {
    return filterEvents((e) => e.runId === runId, options);
}
/** Follow parentEventId/rootCauseEventId to build a causal chain. */
export async function findRootCauseChain(eventId, workdir) {
    const allEvents = await readTraceEvents({ workdir });
    const eventMap = new Map();
    for (const e of allEvents) {
        eventMap.set(e.eventId, e);
    }
    const chain = [];
    const visited = new Set();
    let current = eventMap.get(eventId);
    // Walk backward through parentEventId/rootCauseEventId
    while (current && !visited.has(current.eventId)) {
        chain.unshift(current);
        visited.add(current.eventId);
        const parentId = current.rootCauseEventId ?? current.parentEventId;
        if (parentId) {
            current = eventMap.get(parentId);
        }
        else {
            break;
        }
    }
    return chain;
}
//# sourceMappingURL=traceLedger.js.map