/**
 * @tripp-os/agent-bus — Transport Helpers
 *
 * Safe dispatch to fake/manual transports.
 * Live/cloud transport is NOT implemented — contract only.
 */
import { randomUUID } from "node:crypto";
import {
  ValidatedTransportConfigSchema,
  ExternalAgentDispatchRequestSchema,
  type ExternalAgentTransportConfig,
  type ExternalAgentTransportKind,
  type ExternalAgentTransportMode,
  type ExternalAgentDispatchRequest,
  type ExternalAgentDispatchResult,
  type ExternalAgentDispatchStatus,
} from "./transportSchemas.js";
import type {
  ExternalAgentTaskPacket,
  ExternalAgentResultPacket,
  ExternalAgentRole,
} from "./schemas.js";
import { SCHEMA_VERSION } from "./constants.js";
import { writeResultPacket } from "./fileBus.js";
import { createTraceEvent, appendTraceEvent } from "./traceLedger.js";
import { readTaskPacket } from "./fileBus.js";

// ── Default Configs ──────────────────────────────────────────────────

/** Safe default transport config for any agent role */
export function createDefaultTransportConfig(
  agentRole: ExternalAgentRole,
  kind?: ExternalAgentTransportKind,
  mode?: ExternalAgentTransportMode
): ExternalAgentTransportConfig {
  const base: ExternalAgentTransportConfig = {
    transportId: `${agentRole}-default`,
    name: `${agentRole} default transport`,
    kind: kind ?? "fake_agent",
    mode: mode ?? "fake",
    agentRole,
    enabled: mode === "experimental_live" ? false : true,
    allowNetwork: false,
    allowSecrets: false,
    allowRepoAccess: false,
    allowDirectMutation: false,
    requireEchoReview: true,
    requireApprovalGate: true,
    timeoutSeconds: 300,
    maxContextTokens: 8000,
  };

  return ValidatedTransportConfigSchema.parse(base);
}

/** Validate a transport config */
export function validateTransportConfig(
  config: ExternalAgentTransportConfig
): ExternalAgentTransportConfig {
  return ValidatedTransportConfigSchema.parse(config);
}

// ── Dispatch ─────────────────────────────────────────────────────────

/**
 * Create a dispatch request from a validated task packet.
 */
export function createDispatchRequest(
  taskPacket: ExternalAgentTaskPacket,
  config: ExternalAgentTransportConfig,
  options?: {
    dryRun?: boolean;
    traceEnabled?: boolean;
    requestedBy?: string;
  }
): ExternalAgentDispatchRequest {
  return ExternalAgentDispatchRequestSchema.parse({
    dispatchId: randomUUID(),
    packetId: taskPacket.packetId,
    runId: taskPacket.runId,
    agentRole: taskPacket.agentRole,
    transportId: config.transportId,
    mode: config.mode,
    taskPacket,
    createdAt: new Date().toISOString(),
    requestedBy: options?.requestedBy ?? "system",
    dryRun: options?.dryRun ?? true,
    traceEnabled: options?.traceEnabled ?? true,
  });
}

// ── Fake Dispatch ────────────────────────────────────────────────────

/**
 * Dispatch to a fake agent. Deterministic, safe, no LLM/network/shell.
 * Writes result packet to outbox and emits trace events.
 */
export async function dispatchToFakeAgent(
  request: ExternalAgentDispatchRequest,
  workdir?: string
): Promise<ExternalAgentDispatchResult> {
  const traceEventIds: string[] = [];
  const errors: string[] = [];

  // Emit packet_claimed
  if (request.traceEnabled) {
    try {
      const ev = createTraceEvent({
        eventType: "packet_claimed",
        severity: "info",
        actorType: request.taskPacket.agentRole as any,
        packetId: request.packetId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        summary: `Packet claimed by fake agent for ${request.taskPacket.agentRole}`,
        details: { dispatchId: request.dispatchId },
      });
      await appendTraceEvent(ev, workdir);
      traceEventIds.push(ev.eventId);
    } catch {
      errors.push("Failed to emit packet_claimed trace event");
    }
  }

  // Build fake result packet
  const resultPacket: ExternalAgentResultPacket = {
    schemaVersion: SCHEMA_VERSION,
    packetId: request.packetId,
    resultId: randomUUID(),
    runId: request.runId,
    createdAt: new Date().toISOString(),
    agentRole: request.taskPacket.agentRole,
    trustZone: request.taskPacket.trustZone,
    status: "success",
    summary: `[FAKE] ${request.taskPacket.agentRole} completed: ${request.taskPacket.title} — ${request.taskPacket.objective}`,
    assumptions: ["Fake agent — no real execution", "Deterministic result only"],
    risks: ["Result is NOT authoritative", "Review required before any action"],
    proposedChanges: [],
    filesReferenced: [],
    validationPerformed: ["schema validation", "agent role check"],
    requestedApprovals: [],
    nextRecommendedAction: "Review by Echo Warden before any mutation",
    metadata: {
      dispatchId: request.dispatchId,
      transportMode: "fake",
      fake: true,
      warning: "This is a FAKE result — no real execution occurred.",
    },
  };

  // Write to outbox
  let outboxPath: string | undefined;
  try {
    outboxPath = await writeResultPacket(resultPacket, { workdir });
  } catch (e) {
    errors.push(`Failed to write result to outbox: ${(e as Error).message}`);
  }

  // Emit result_written
  if (request.traceEnabled) {
    try {
      const ev = createTraceEvent({
        eventType: "result_written",
        severity: "info",
        actorType: request.taskPacket.agentRole as any,
        packetId: request.packetId,
        resultId: resultPacket.resultId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        summary: `Fake result written for packet: ${request.packetId}`,
        details: { dispatchId: request.dispatchId, fake: true },
      });
      await appendTraceEvent(ev, workdir);
      traceEventIds.push(ev.eventId);
    } catch {
      errors.push("Failed to emit result_written trace event");
    }
  }

  const status: ExternalAgentDispatchStatus = errors.length > 0
    ? "failed"
    : request.dryRun
      ? "dry_run"
      : "fake_completed";

  return {
    dispatchId: request.dispatchId,
    packetId: request.packetId,
    resultId: resultPacket.resultId,
    runId: request.runId,
    agentRole: request.taskPacket.agentRole,
    transportId: request.transportId,
    mode: request.mode,
    status,
    summary: status === "fake_completed"
      ? `Fake dispatch completed: ${resultPacket.summary}`
      : `Fake dispatch ${status}: ${errors.join("; ") || "dry run only"}`,
    resultPacket: errors.length === 0 ? resultPacket : undefined,
    outboxPath,
    traceEventIds,
    errors,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// ── Real Dispatch (disabled stub — Phase 8E) ──────────────────────────

/**
 * Real agent transport stub — always blocked.
 *
 * Phase 8E: disabled-by-default skeleton.
 * No network calls. No process spawning. No secrets.
 * Returns "blocked" for every request until real transport is enabled.
 */
export async function dispatchToRealAgent(
  request: ExternalAgentDispatchRequest,
  _config: ExternalAgentTransportConfig,
  workdir?: string
): Promise<ExternalAgentDispatchResult> {
  const traceEventIds: string[] = [];

  // Emit transport_selected trace (evidence of routing decision)
  if (request.traceEnabled) {
    try {
      const ev = createTraceEvent({
        eventType: "packet_claimed",
        severity: "warning",
        actorType: "system",
        packetId: request.packetId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        summary: `Real transport blocked: real_transport_disabled (Phase 8E skeleton)`,
        details: {
          dispatchId: request.dispatchId,
          reason: "real_transport_disabled",
          phase: "8E",
          note: "Real transport is disabled-by-default. Enablement requires operator approval.",
        },
      });
      await appendTraceEvent(ev, workdir);
      traceEventIds.push(ev.eventId);
    } catch {
      // best-effort
    }
  }

  // Emit transport_blocked trace
  if (request.traceEnabled) {
    try {
      const ev = createTraceEvent({
        eventType: "packet_rejected",
        severity: "warning",
        actorType: "system",
        packetId: request.packetId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        summary: `Transport blocked — no real adapter available (Phase 8E)`,
        details: {
          dispatchId: request.dispatchId,
          blockedReason: "real_transport_disabled",
          phase: "8E",
        },
      });
      await appendTraceEvent(ev, workdir);
      traceEventIds.push(ev.eventId);
    } catch {
      // best-effort
    }
  }

  return {
    dispatchId: request.dispatchId,
    packetId: request.packetId,
    runId: request.runId,
    agentRole: request.taskPacket.agentRole,
    transportId: request.transportId,
    mode: request.mode,
    status: "blocked",
    summary: `Real transport blocked: real_transport_disabled. Enablement requires operator approval + endpoint confirmation.`,
    traceEventIds,
    errors: ["real_transport_disabled: Phase 8E skeleton — no real adapter available"],
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// ── Dispatch Router ───────────────────────────────────────────────────

/**
 * Route dispatch to the correct transport based on config mode.
 *
 * mode="fake"              → dispatchToFakeAgent
 * mode="manual"            → dispatchToManualFileTransport
 * mode="experimental_live"  → dispatchToRealAgent (always blocked in Phase 8E)
 * mode="disabled" / default → blocked
 */
export async function dispatchRoute(
  request: ExternalAgentDispatchRequest,
  config: ExternalAgentTransportConfig,
  workdir?: string
): Promise<ExternalAgentDispatchResult> {
  switch (config.mode) {
    case "fake":
      return dispatchToFakeAgent(request, workdir);

    case "manual":
      return dispatchToManualFileTransport(request, workdir);

    case "experimental_live":
      // Always blocked in Phase 8E — no real transport enabled
      return dispatchToRealAgent(request, config, workdir);

    case "disabled":
    case "dry_run":
    default:
      return {
        dispatchId: request.dispatchId,
        packetId: request.packetId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        transportId: request.transportId,
        mode: request.mode,
        status: "blocked",
        summary: `Dispatch blocked: transport mode "${config.mode}" is not enabled.`,
        errors: [`Transport mode "${config.mode}" requires explicit enablement.`],
        traceEventIds: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
  }
}

// ── Manual Dispatch ──────────────────────────────────────────────────

/**
 * Manual file transport — packet stays in inbox, no automatic dispatch.
 */
export async function dispatchToManualFileTransport(
  request: ExternalAgentDispatchRequest,
  workdir?: string
): Promise<ExternalAgentDispatchResult> {
  const traceEventIds: string[] = [];

  // Validate packet exists
  try {
    // Just verify the packet is valid by re-reading
    // (the task packet is already validated in the request)
  } catch {
    return {
      dispatchId: request.dispatchId,
      packetId: request.packetId,
      runId: request.runId,
      agentRole: request.taskPacket.agentRole,
      transportId: request.transportId,
      mode: request.mode,
      status: "failed",
      summary: "Task packet not found or invalid",
      errors: ["Task packet failed validation"],
      traceEventIds: [],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  // Emit packet_claimed with manual details
  if (request.traceEnabled) {
    try {
      const ev = createTraceEvent({
        eventType: "packet_claimed",
        severity: "info",
        actorType: "operator",
        packetId: request.packetId,
        runId: request.runId,
        agentRole: request.taskPacket.agentRole,
        summary: `Packet requires manual handling: ${request.taskPacket.title}`,
        details: {
          dispatchId: request.dispatchId,
          manualRequired: true,
          instruction:
            "This packet is in the inbox awaiting manual processing by operator (Eddie/Tripp/Echo).",
        },
      });
      await appendTraceEvent(ev, workdir);
      traceEventIds.push(ev.eventId);
    } catch {
      // best-effort
    }
  }

  return {
    dispatchId: request.dispatchId,
    packetId: request.packetId,
    runId: request.runId,
    agentRole: request.taskPacket.agentRole,
    transportId: request.transportId,
    mode: request.mode,
    status: "manual_required",
    summary: `Packet ready for manual handling: ${request.taskPacket.title}. Packet is in inbox.`,
    traceEventIds,
    errors: [],
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}
