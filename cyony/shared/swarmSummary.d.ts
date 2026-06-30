/**
 * @tripp-reason/swarm — swarm summary
 *
 * Builds a SwarmRunSummary from pipeline results.
 */
import type { SwarmRunPlan, ResultPacket, ConflictRecord, WardenVerdict, SwarmRunSummary } from "./types.js";
export interface BuildSummaryInput {
    plan: SwarmRunPlan;
    resultPackets: ResultPacket[];
    conflicts: ConflictRecord[];
    verdict: WardenVerdict;
    startedAt: string;
    completedAt: string;
}
export declare function buildSwarmSummary(input: BuildSummaryInput): SwarmRunSummary;
//# sourceMappingURL=swarmSummary.d.ts.map