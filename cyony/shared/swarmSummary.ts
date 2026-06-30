/**
 * @tripp-reason/swarm — swarm summary
 *
 * Builds a SwarmRunSummary from pipeline results.
 */
import type {
  SwarmRunPlan,
  ResultPacket,
  ConflictRecord,
  WardenVerdict,
  SwarmRunSummary,
  SwarmStatus,
} from "./types.js";

export interface BuildSummaryInput {
  plan: SwarmRunPlan;
  resultPackets: ResultPacket[];
  conflicts: ConflictRecord[];
  verdict: WardenVerdict;
  startedAt: string;
  completedAt: string;
}

export function buildSwarmSummary(input: BuildSummaryInput): SwarmRunSummary {
  let status: SwarmStatus;
  switch (input.verdict.status) {
    case "PASS":
      status = "pass";
      break;
    case "PARTIAL":
      status = "partial";
      break;
    default:
      status = "fail";
  }

  return {
    id: input.plan.id,
    mode: input.plan.selectedMode,
    workerCount: input.plan.workerCount,
    status,
    taskPackets: input.plan.taskPackets,
    resultPackets: input.resultPackets,
    wardenVerdict: input.verdict,
    conflicts: input.conflicts,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  };
}
