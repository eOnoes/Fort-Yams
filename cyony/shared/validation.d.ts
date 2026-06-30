/**
 * @tripp-reason/swarm — validation helpers
 *
 * Pure functions for validating swarm configuration, task packets,
 * result packets, and worker counts. No side effects. No I/O.
 */
import type { SwarmMode, SwarmRunPlan, CriticalPathMetrics } from "./types.js";
/** Return the allowed worker count range for a given mode. */
export declare function getWorkerCapForMode(mode: SwarmMode): {
    min: number;
    max: number;
};
/** Check if the given mode requires operator approval. */
export declare function doesModeRequireApproval(mode: SwarmMode): boolean;
/** Check if the given mode requires manual (human) approval. */
export declare function doesModeRequireManualApproval(mode: SwarmMode): boolean;
/** Validate worker count for a mode. Returns null if valid, error string if not. */
export declare function validateWorkerCount(mode: SwarmMode, count: number): string | null;
/** Validate a TaskPacket. Returns null if valid, error string if not. */
export declare function validateTaskPacket(packet: unknown): string | null;
/** Validate a ResultPacket. Returns null if valid, error string if not. */
export declare function validateResultPacket(packet: unknown): string | null;
/** Validate a swarm config. Returns null if valid, error string if not. */
export declare function validateSwarmConfig(config: unknown): string | null;
/** Validate a SubagentSpec. frozenBehavior must be true for workers. */
export declare function validateSubagentSpec(spec: unknown): string | null;
/** Validate a SubagentAssignment. */
export declare function validateSubagentAssignment(assignment: unknown): string | null;
/** Validate a SwarmRunPlan including cross-field consistency. */
export declare function validateSwarmRunPlan(plan: unknown): string | null;
/**
 * Detect serial collapse risk: orchestrator chose sequential when
 * tasks are independent (no dependency edges between them).
 */
export declare function detectSerialCollapseRisk(plan: SwarmRunPlan): boolean;
/**
 * Detect swarm spam risk: worker count exceeds meaningful task count.
 */
export declare function detectSwarmSpamRisk(plan: SwarmRunPlan): boolean;
/**
 * Calculate critical path metrics.
 * criticalPathMs = orchestratorPlanningMs + max(workerWaveMs) + mergerMs + wardenMs
 */
export declare function calculateCriticalPathMetrics(metrics: Partial<CriticalPathMetrics>, workerCount: number): CriticalPathMetrics;
//# sourceMappingURL=validation.d.ts.map