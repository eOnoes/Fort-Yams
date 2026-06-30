/**
 * @tripp-reason/swarm — warden
 *
 * Reviews swarm results and produces a WardenVerdict.
 * Phase 5D: deterministic rule-based pass. No provider calls.
 */
import type { SwarmRunPlan, ResultPacket, WardenVerdict, ConflictRecord } from "./types.js";
import type { MergedResult } from "./merger.js";
/**
 * Run the Warden review pass.
 *
 * Rules:
 * - PASS: all pass, no conflicts, worker cap respected
 * - PARTIAL: partial results or open conflicts
 * - FAIL: critical worker failure, hard cap violation, or recursive spawn detected
 */
export declare function runWarden(plan: SwarmRunPlan, results: ResultPacket[], merged: MergedResult, conflicts: ConflictRecord[]): WardenVerdict;
//# sourceMappingURL=warden.d.ts.map