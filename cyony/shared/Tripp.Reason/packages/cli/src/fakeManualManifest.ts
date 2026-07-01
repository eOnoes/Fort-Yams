/**
 * Stage 6J — Fake/Manual Manifest Sync Mapper
 *
 * Pure, deterministic, static/manual trace-to-manifest converter.
 * Reads trace events (in-memory or from JSONL file), produces a
 * ManifestSnapshot with packet lifecycle state derivation,
 * confidence scoring, redaction, and causal DAG reconstruction.
 *
 * NEVER: polls, watches, subscribes, activates live agents,
 *        mutates shared-agent-bus, or writes outside manifest dir.
 */
import type { AgentBusTraceEvent } from "@tripp-reason/external-agents";
import { readTraceEvents } from "@tripp-reason/external-agents";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────

export interface ManifestSnapshot {
  manifest_version: string;
  generated_at: string;
  source: string;
  source_mode: string;
  sync_mode: string;
  mutation_capability: string;
  trace_event_count: number;
  packet_count: number;
  confidence_level: "confirmed" | "trace-backed" | "partial-trace" | "unknown";
  confidence_reason: string;
  packets: ManifestPacketEntry[];
  warnings: string[];
  unknowns: string[];
  redaction_summary: RedactionSummary;
  validation_summary: ValidationSummary;
}

export interface ManifestPacketEntry {
  packet_id: string;
  packet_type: string;
  lifecycle_state: string;
  approval_state: string;
  result_state: string;
  rejection_state: string | null;
  timeout_state: string | null;
  owner_or_agent: string;
  created_at: string;
  updated_at: string;
  source_event_ids: string[];
  causal_root_event_id: string | null;
  latest_event_id: string | null;
  confidence_level: string;
  confidence_reason: string;
  warnings: string[];
  redaction_applied: string[];
  safe_metadata: Record<string, unknown>;
}

export interface RedactionSummary {
  fields_redacted: number;
  secrets_stripped: number;
  prompts_truncated: number;
  redaction_rules_applied: string[];
}

export interface ValidationSummary {
  total_events: number;
  valid_events: number;
  malformed_events: number;
  duplicate_event_ids: number;
  missing_causal_targets: number;
  is_valid: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────

const MANIFEST_VERSION = "1.0.0";
const SECRET_KEY_PATTERNS = [
  /^api[_-]?key$/i,
  /^token$/i,
  /^secret$/i,
  /^password$/i,
  /^credential$/i,
  /^bearer$/i,
  /^authorization$/i,
];
const API_KEY_VALUE_PATTERN = /sk-[a-zA-Z0-9]{20,}/;
const BEARER_VALUE_PATTERN = /Bearer\s+[a-zA-Z0-9_-]{20,}/;
const MAX_SAFE_VALUE_LENGTH = 200;

// ── Lifecycle State Derivation ────────────────────────────────────────

function deriveLifecycleState(events: AgentBusTraceEvent[]): string {
  const types = new Set(events.map((e) => e.eventType));

  // Terminal states (highest precedence)
  if (types.has("packet_archived")) return "archived";
  if (types.has("packet_rejected")) return "rejected";

  // Timeout states
  if (types.has("task_timeout")) return "timeout";
  if (types.has("tool_timeout")) return "timeout";
  if (types.has("approval_timeout")) return "timeout_approval";

  // Execution outcomes
  if (types.has("subagent_killed")) return "failed";
  if (types.has("validation_failed_later")) return "failed";
  if (types.has("result_written")) return "completed";

  // Execution in progress
  if (types.has("subagent_spawned")) return "executing";

  // Approval states
  if (types.has("human_decision_recorded")) return "denied";
  if (types.has("mutation_applied") || types.has("mutation_requested")) return "approved";
  if (types.has("approvalgate_required")) return "awaiting_approval";

  // Intake
  if (types.has("packet_claimed")) return "claimed";
  if (types.has("schema_validation_failed") && !types.has("packet_claimed")) return "validating";
  if (types.has("packet_created")) return "pending";

  return "unknown";
}

// ── Approval State Derivation ─────────────────────────────────────────

function deriveApprovalState(events: AgentBusTraceEvent[]): string {
  const hasGate = events.some((e) => e.eventType === "approvalgate_required");
  const hasGrant = events.some((e) => e.eventType === "mutation_applied");
  const hasDeny = events.some((e) => e.eventType === "human_decision_recorded");
  const hasBlock = events.some((e) =>
    e.eventType === "warden_verdict_recorded" && e.summary?.toLowerCase().includes("block"),
  );
  const hasTimeout = events.some((e) => e.eventType === "approval_timeout");

  if (hasTimeout) return "timed_out";
  if (hasDeny || hasBlock) return "denied";
  if (hasGrant) return "granted";
  if (hasGate) return "pending";
  return "not_required";
}

// ── Result State Derivation ───────────────────────────────────────────

function deriveResultState(events: AgentBusTraceEvent[]): string {
  const hasResult = events.some((e) => e.eventType === "result_written");
  const hasFailure = events.some((e) =>
    e.eventType === "subagent_killed" || e.eventType === "validation_failed_later",
  );
  const hasTimeout = events.some((e) =>
    e.eventType === "task_timeout" || e.eventType === "tool_timeout",
  );
  const hasRejection = events.some((e) => e.eventType === "packet_rejected");

  if (hasRejection) return "blocked";
  if (hasTimeout && !hasResult) return "timeout";
  if (hasFailure && !hasResult) return "failure";
  if (hasResult && hasFailure) return "partial";
  if (hasResult) return "success";
  return "none";
}

// ── Confidence Derivation ─────────────────────────────────────────────

function deriveConfidence(
  events: AgentBusTraceEvent[],
  missingTargets: number,
  hasCycles: boolean,
  isRuntimeOnly: boolean,
): { level: string; reason: string } {
  if (events.length === 0) return { level: "unknown", reason: "No trace events for this packet" };
  if (hasCycles) return { level: "unknown", reason: "Cyclic parentEventId chain detected" };
  if (isRuntimeOnly) return { level: "runtime-only", reason: "Event type exists only in source emit points" };
  if (missingTargets > 0) return { level: "partial-trace", reason: `${missingTargets} causal target(s) not found` };
  if (!events.some((e) => e.eventType === "packet_created")) return { level: "partial-trace", reason: "Missing packet_created event" };
  return { level: "confirmed", reason: "Full causal chain with all expected events" };
}

// ── Redaction ─────────────────────────────────────────────────────────

function redactDetails(details: Record<string, unknown> | undefined): {
  safe: Record<string, unknown>;
  redacted: string[];
  secretsStripped: number;
  promptsTruncated: number;
} {
  const safe: Record<string, unknown> = {};
  const redacted: string[] = [];
  let secretsStripped = 0;
  let promptsTruncated = 0;

  if (!details) return { safe, redacted, secretsStripped, promptsTruncated };

  for (const [key, value] of Object.entries(details)) {
    // Check key name against secret patterns
    if (SECRET_KEY_PATTERNS.some((p) => p.test(key))) {
      safe[key] = "[REDACTED]";
      redacted.push(key);
      secretsStripped++;
      continue;
    }

    // Check string values for API key / bearer patterns
    if (typeof value === "string") {
      if (API_KEY_VALUE_PATTERN.test(value) || BEARER_VALUE_PATTERN.test(value)) {
        safe[key] = "[REDACTED]";
        redacted.push(key);
        secretsStripped++;
        continue;
      }
      // Truncate long values
      if (value.length > MAX_SAFE_VALUE_LENGTH) {
        safe[key] = value.slice(0, MAX_SAFE_VALUE_LENGTH) + "...";
        promptsTruncated++;
        continue;
      }
    }

    // Pass through
    safe[key] = value;
  }

  return { safe, redacted, secretsStripped, promptsTruncated };
}

// ── Core Mapper ───────────────────────────────────────────────────────

export function buildManifestFromEvents(
  events: AgentBusTraceEvent[],
  options?: { source?: string; sourceMode?: string },
): ManifestSnapshot {
  const warnings: string[] = [];
  const unknowns: string[] = [];
  let secretsStripped = 0;
  let promptsTruncated = 0;
  let duplicateEventIds = 0;
  let missingCausalTargets = 0;
  const seenEventIds = new Set<string>();

  // Deduplicate eventIds (first wins)
  const uniqueEvents: AgentBusTraceEvent[] = [];
  for (const event of events) {
    if (seenEventIds.has(event.eventId)) {
      duplicateEventIds++;
      continue;
    }
    seenEventIds.add(event.eventId);
    uniqueEvents.push(event);
  }

  // Sort by createdAt then eventId (deterministic ordering)
  const sorted = [...uniqueEvents].sort((a, b) => {
    const timeCmp = a.createdAt.localeCompare(b.createdAt);
    if (timeCmp !== 0) return timeCmp;
    return a.eventId.localeCompare(b.eventId);
  });

  // Group by packetId
  const packetMap = new Map<string, AgentBusTraceEvent[]>();
  for (const event of sorted) {
    const pid = event.packetId ?? "__no_packet__";
    if (!packetMap.has(pid)) packetMap.set(pid, []);
    packetMap.get(pid)!.push(event);
  }

  // Build eventId → event map for causal lookups
  const eventMap = new Map<string, AgentBusTraceEvent>();
  for (const event of sorted) eventMap.set(event.eventId, event);

  // Check causal targets
  const allEventIds = new Set(sorted.map((e) => e.eventId));
  for (const event of sorted) {
    if (event.parentEventId && !allEventIds.has(event.parentEventId)) {
      missingCausalTargets++;
    }
    if (event.rootCauseEventId && !allEventIds.has(event.rootCauseEventId)) {
      missingCausalTargets++;
    }
  }

  // Derive total confidence
  let overallConfidence: ManifestSnapshot["confidence_level"] = "confirmed";
  let overallReason = "All packets have full trace coverage";

  // Build packet entries
  const entries: ManifestPacketEntry[] = [];
  for (const [pid, pktEvents] of packetMap) {
    // Skip the no-packet placeholder
    let packetId = pid;
    if (packetId === "__no_packet__") {
      packetId = pktEvents.find((e) => e.packetId)?.packetId ?? "__no_packet__";
    }

    const sortedPkt = [...pktEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const eventIds = sortedPkt.map((e) => e.eventId);
    const first = sortedPkt[0];
    const last = sortedPkt[sortedPkt.length - 1];

    // Agent / owner
    const ownerEvent = sortedPkt.find((e) => e.agentRole) ?? sortedPkt.find((e) => e.actorType && e.actorType !== "system");
    const owner = ownerEvent?.agentRole ?? ownerEvent?.actorType ?? "unknown";

    // Collect all details for redaction
    const allDetails: Record<string, unknown> = {};
    for (const e of sortedPkt) {
      if (e.details) Object.assign(allDetails, e.details);
    }
    const redaction = redactDetails(Object.keys(allDetails).length > 0 ? allDetails : undefined);
    secretsStripped += redaction.secretsStripped;
    promptsTruncated += redaction.promptsTruncated;

    // Confidence per packet
    const pktMissingTargets = sortedPkt.filter((e) =>
      (e.parentEventId && !allEventIds.has(e.parentEventId)) ||
      (e.rootCauseEventId && !allEventIds.has(e.rootCauseEventId)),
    ).length;
    const conf = deriveConfidence(sortedPkt, pktMissingTargets, false, false);

    if (conf.level === "partial-trace" || conf.level === "unknown") {
      overallConfidence = conf.level as ManifestSnapshot["confidence_level"];
      overallReason = conf.reason;
    }

    entries.push({
      packet_id: packetId,
      packet_type: "task",
      lifecycle_state: deriveLifecycleState(sortedPkt),
      approval_state: deriveApprovalState(sortedPkt),
      result_state: deriveResultState(sortedPkt),
      rejection_state: sortedPkt.some((e) => e.eventType === "packet_rejected") ? "rejected" : null,
      timeout_state: sortedPkt.some((e) =>
        ["task_timeout", "tool_timeout", "approval_timeout"].includes(e.eventType),
      ) ? "timed_out" : null,
      owner_or_agent: owner,
      created_at: first.createdAt,
      updated_at: last.createdAt,
      source_event_ids: eventIds,
      causal_root_event_id: sortedPkt.find((e) => e.eventType === "packet_created")?.eventId ?? null,
      latest_event_id: last.eventId,
      confidence_level: conf.level,
      confidence_reason: conf.reason,
      warnings: [],
      redaction_applied: redaction.redacted,
      safe_metadata: redaction.safe,
    });
  }

  // Sort entries by created_at
  entries.sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Build validation summary
  const validation: ValidationSummary = {
    total_events: events.length,
    valid_events: uniqueEvents.length,
    malformed_events: events.length - uniqueEvents.length,
    duplicate_event_ids: duplicateEventIds,
    missing_causal_targets: missingCausalTargets,
    is_valid: missingCausalTargets === 0 && duplicateEventIds === 0,
  };

  return {
    manifest_version: MANIFEST_VERSION,
    generated_at: new Date().toISOString(),
    source: options?.source ?? "tripp-reason-fake-manual",
    source_mode: options?.sourceMode ?? "fake",
    sync_mode: "static_snapshot",
    mutation_capability: "none",
    trace_event_count: events.length,
    packet_count: entries.length,
    confidence_level: overallConfidence,
    confidence_reason: overallReason,
    packets: entries,
    warnings,
    unknowns,
    redaction_summary: {
      fields_redacted: secretsStripped,
      secrets_stripped: secretsStripped,
      prompts_truncated: promptsTruncated,
      redaction_rules_applied: secretsStripped > 0
        ? ["secret_key_stripped", "value_truncation"]
        : promptsTruncated > 0
          ? ["value_truncation"]
          : [],
    },
    validation_summary: validation,
  };
}

/**
 * Build manifest from a JSONL trace file.
 * Reads the file once, then delegates to buildManifestFromEvents.
 */
export async function buildManifestFromTraceFile(
  workdir?: string,
  options?: { source?: string; sourceMode?: string },
): Promise<ManifestSnapshot> {
  const events = await readTraceEvents({ workdir });
  return buildManifestFromEvents(events, options);
}

/**
 * Write a manifest snapshot to a JSON file and optional Markdown companion.
 * Output: .tripp/agents/manifest/manifest-<timestamp>.json (+ .md)
 */
export async function writeManifest(
  snapshot: ManifestSnapshot,
  workdir?: string,
): Promise<{ jsonPath: string; mdPath: string }> {
  const base = workdir ? path.resolve(workdir) : process.cwd();
  const manifestDir = path.join(base, ".tripp", "agents", "manifest");
  await fs.mkdir(manifestDir, { recursive: true });

  const ts = snapshot.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(manifestDir, `manifest-${ts}.json`);
  const mdPath = path.join(manifestDir, `manifest-${ts}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(snapshot, null, 2), "utf-8");

  const md = buildManifestMarkdown(snapshot);
  await fs.writeFile(mdPath, md, "utf-8");

  return { jsonPath, mdPath };
}

function buildManifestMarkdown(snapshot: ManifestSnapshot): string {
  const lines = [
    `# Tripp.Reason Manifest — ${snapshot.generated_at}`,
    "",
    "## Summary",
    "",
    `- **Version:** ${snapshot.manifest_version}`,
    `- **Source:** ${snapshot.source} (${snapshot.source_mode})`,
    `- **Sync mode:** ${snapshot.sync_mode}`,
    `- **Mutation capability:** ${snapshot.mutation_capability}`,
    `- **Trace events:** ${snapshot.trace_event_count}`,
    `- **Packets:** ${snapshot.packet_count}`,
    `- **Confidence:** ${snapshot.confidence_level} — ${snapshot.confidence_reason}`,
    "",
    "## Packet Lifecycle",
    "",
    ...snapshot.packets.map((p) => [
      `### ${p.packet_id}`,
      "",
      `- **State:** ${p.lifecycle_state}`,
      `- **Approval:** ${p.approval_state}`,
      `- **Result:** ${p.result_state}`,
      `- **Rejection:** ${p.rejection_state ?? "none"}`,
      `- **Timeout:** ${p.timeout_state ?? "none"}`,
      `- **Owner:** ${p.owner_or_agent}`,
      `- **Confidence:** ${p.confidence_level} — ${p.confidence_reason}`,
      `- **Events:** ${p.source_event_ids.length}`,
      `- **Created:** ${p.created_at}`,
      `- **Updated:** ${p.updated_at}`,
      "",
    ]).flat(),
    "## Redaction",
    "",
    `- **Fields redacted:** ${snapshot.redaction_summary.fields_redacted}`,
    `- **Secrets stripped:** ${snapshot.redaction_summary.secrets_stripped}`,
    `- **Prompts truncated:** ${snapshot.redaction_summary.prompts_truncated}`,
    "",
    "## Warnings",
    "",
    ...(snapshot.warnings.length > 0 ? snapshot.warnings.map((w) => `- ${w}`) : ["(none)"]),
    "",
    "---",
    "",
    "⚠️ This is a FAKE/MANUAL manifest. No live execution occurred.",
    "⚠️ Do not use for authorization decisions.",
    "⚠️ Tripp.Reason ApprovalGate remains authoritative.",
  ];
  return lines.join("\n");
}
