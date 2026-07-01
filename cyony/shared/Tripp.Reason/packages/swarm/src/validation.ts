/**
 * @tripp-reason/swarm — validation helpers
 *
 * Pure functions for validating swarm configuration, task packets,
 * result packets, and worker counts. No side effects. No I/O.
 */
import type { SwarmMode, TaskPacket, ResultPacket, SubagentSpec, SubagentAssignment, SwarmRunPlan, CriticalPathMetrics } from "./types.js";
import { TaskPacketSchema, ResultPacketSchema, SwarmConfigSchema, SubagentSpecSchema, SubagentAssignmentSchema, SwarmRunPlanSchema } from "./schemas.js";
import {
  SOLO_MAX_WORKERS,
  SMALL_MIN_WORKERS,
  SMALL_MAX_WORKERS,
  MEDIUM_MIN_WORKERS,
  MEDIUM_MAX_WORKERS,
  LARGE_MIN_WORKERS,
  LARGE_MAX_WORKERS,
  ABSOLUTE_MAX_WORKERS,
  APPROVAL_REQUIRED_MODES,
  MANUAL_APPROVAL_MODES,
} from "./constants.js";

// ── Worker Cap Helpers ───────────────────────────────────────────────

/** Return the allowed worker count range for a given mode. */
export function getWorkerCapForMode(mode: SwarmMode): {
  min: number;
  max: number;
} {
  switch (mode) {
    case "solo":
      return { min: 1, max: SOLO_MAX_WORKERS };
    case "small":
      return { min: SMALL_MIN_WORKERS, max: SMALL_MAX_WORKERS };
    case "medium":
      return { min: MEDIUM_MIN_WORKERS, max: MEDIUM_MAX_WORKERS };
    case "large":
      return { min: LARGE_MIN_WORKERS, max: LARGE_MAX_WORKERS };
    case "max":
      return { min: LARGE_MAX_WORKERS + 1, max: ABSOLUTE_MAX_WORKERS };
  }
}

/** Check if the given mode requires operator approval. */
export function doesModeRequireApproval(mode: SwarmMode): boolean {
  return (APPROVAL_REQUIRED_MODES as string[]).includes(mode);
}

/** Check if the given mode requires manual (human) approval. */
export function doesModeRequireManualApproval(mode: SwarmMode): boolean {
  return (MANUAL_APPROVAL_MODES as string[]).includes(mode);
}

/** Validate worker count for a mode. Returns null if valid, error string if not. */
export function validateWorkerCount(
  mode: SwarmMode,
  count: number,
): string | null {
  if (count > ABSOLUTE_MAX_WORKERS) {
    return `Worker count ${count} exceeds absolute maximum of ${ABSOLUTE_MAX_WORKERS}`;
  }

  const cap = getWorkerCapForMode(mode);

  if (count < cap.min) {
    return `Worker count ${count} is below minimum of ${cap.min} for mode '${mode}'`;
  }

  if (count > cap.max) {
    return `Worker count ${count} exceeds maximum of ${cap.max} for mode '${mode}'`;
  }

  return null;
}

// ── Packet Validation ────────────────────────────────────────────────

/** Validate a TaskPacket. Returns null if valid, error string if not. */
export function validateTaskPacket(
  packet: unknown,
): string | null {
  const result = TaskPacketSchema.safeParse(packet);
  if (!result.success) {
    return `TaskPacket validation failed: ${result.error.message}`;
  }
  return null;
}

/** Validate a ResultPacket. Returns null if valid, error string if not. */
export function validateResultPacket(
  packet: unknown,
): string | null {
  const result = ResultPacketSchema.safeParse(packet);
  if (!result.success) {
    return `ResultPacket validation failed: ${result.error.message}`;
  }
  return null;
}

/** Validate a swarm config. Returns null if valid, error string if not. */
export function validateSwarmConfig(
  config: unknown,
): string | null {
  const result = SwarmConfigSchema.safeParse(config);
  if (!result.success) {
    return `SwarmConfig validation failed: ${result.error.message}`;
  }

  // Additional cross-field validation
  const cfg = result.data;
  const countErr = validateWorkerCount(cfg.mode, cfg.maxWorkers);
  if (countErr) return countErr;

  return null;
}

// ── Phase 5B.1: Dynamic Subagent Helpers ─────────────────────────────

/** Validate a SubagentSpec. frozenBehavior must be true for workers. */
export function validateSubagentSpec(spec: unknown): string | null {
  const result = SubagentSpecSchema.safeParse(spec);
  if (!result.success) {
    return `SubagentSpec validation failed: ${result.error.message}`;
  }
  if (result.data.role !== "planner" && !result.data.frozenBehavior) {
    return `SubagentSpec '${result.data.id}': non-orchestrator role '${result.data.role}' must have frozenBehavior=true`;
  }
  return null;
}

/** Validate a SubagentAssignment. */
export function validateSubagentAssignment(assignment: unknown): string | null {
  const result = SubagentAssignmentSchema.safeParse(assignment);
  if (!result.success) {
    return `SubagentAssignment validation failed: ${result.error.message}`;
  }
  return null;
}

/** Validate a SwarmRunPlan including cross-field consistency. */
export function validateSwarmRunPlan(plan: unknown): string | null {
  const result = SwarmRunPlanSchema.safeParse(plan);
  if (!result.success) {
    return `SwarmRunPlan validation failed: ${result.error.message}`;
  }

  const p = result.data;
  if (p.workerCount !== p.subagents.length) {
    return `SwarmRunPlan: workerCount (${p.workerCount}) != subagents.length (${p.subagents.length})`;
  }
  if (p.workerCount !== p.taskPackets.length) {
    return `SwarmRunPlan: workerCount (${p.workerCount}) != taskPackets.length (${p.taskPackets.length})`;
  }

  const subagentIds = new Set(p.subagents.map((s) => s.id));
  const taskIds = new Set(p.taskPackets.map((t) => t.id));
  for (const a of p.assignments) {
    if (!subagentIds.has(a.subagentId)) {
      return `SubagentAssignment '${a.id}' references unknown subagentId '${a.subagentId}'`;
    }
    if (!taskIds.has(a.taskPacketId)) {
      return `SubagentAssignment '${a.id}' references unknown taskPacketId '${a.taskPacketId}'`;
    }
  }

  const countErr = validateWorkerCount(p.selectedMode, p.workerCount);
  if (countErr) return countErr;

  const expectedApproval = doesModeRequireApproval(p.selectedMode);
  if (p.approvalRequired !== expectedApproval) {
    return `SwarmRunPlan: approvalRequired (${p.approvalRequired}) mismatch`;
  }

  return null;
}

/**
 * Detect serial collapse risk: orchestrator chose sequential when
 * tasks are independent (no dependency edges between them).
 */
export function detectSerialCollapseRisk(plan: SwarmRunPlan): boolean {
  if (plan.shouldParallelize) return false;
  if (plan.taskPackets.length <= 1) return false;
  const deps = plan.dependencyGraph;
  for (const id of plan.taskPackets.map((t) => t.id)) {
    if (deps[id] && deps[id].length > 0) return false;
  }
  return true;
}

/**
 * Detect swarm spam risk: worker count exceeds meaningful task count.
 */
export function detectSwarmSpamRisk(plan: SwarmRunPlan): boolean {
  if (!plan.shouldParallelize) return false;
  return plan.workerCount > plan.taskPackets.length;
}

/**
 * Calculate critical path metrics.
 * criticalPathMs = orchestratorPlanningMs + max(workerWaveMs) + mergerMs + wardenMs
 */
export function calculateCriticalPathMetrics(
  metrics: Partial<CriticalPathMetrics>,
  workerCount: number,
): CriticalPathMetrics {
  const o = metrics.orchestratorPlanningMs ?? 0;
  const waves = metrics.workerWaveMs ?? [];
  const maxW = waves.length > 0 ? Math.max(...waves) : 0;
  const m = metrics.mergerMs ?? 0;
  const w = metrics.wardenMs ?? 0;
  const totalCritical = o + maxW + m + w;
  const totalWorker = waves.reduce((a, b) => a + b, 0);
  const ratio = totalCritical > 0 && workerCount > 0
    ? totalWorker / (totalCritical * workerCount)
    : undefined;

  return {
    orchestratorPlanningMs: o, workerWaveMs: waves, maxWorkerWaveMs: maxW,
    mergerMs: m, wardenMs: w, totalCriticalPathMs: totalCritical,
    totalWorkerMs: totalWorker, parallelEfficiencyRatio: ratio,
  };
}
