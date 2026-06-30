import type { SwarmRunSummary } from "./types.js";
import type { ReasonLoop, ApprovalGate } from "@tripp-reason/core";
import type { ToolDispatcher } from "@tripp-reason/shared";
export interface OrchestratorInput {
    operatorPrompt: string;
    workdir: string;
    /** Phase 5F: optional ReasonLoop for real worker execution */
    reasonLoop?: ReasonLoop;
    /** Phase 5F: optional tool dispatcher for real workers */
    toolDispatcher?: ToolDispatcher;
    /** Phase 5F: optional approval gate for real workers */
    approvalGate?: ApprovalGate;
}
/**
 * Run the full deterministic swarm pipeline.
 *
 * Flow: plan → validate → execute waves → merge → conflicts → warden → summary
 */
export declare function runSwarmPipeline(input: OrchestratorInput): Promise<SwarmRunSummary>;
//# sourceMappingURL=orchestrator.d.ts.map