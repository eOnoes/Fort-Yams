/**
 * @tripp-reason/swarm — ReasonLoop-backed worker
 *
 * Executes a single TaskPacket through ReasonLoop, producing a
 * structured ResultPacket. All provider/tool/approval dependencies
 * are injected — swarm does not instantiate concrete implementations.
 *
 * Phase 5E.
 */
import type { SubagentSpec, TaskPacket, ResultPacket } from "./types.js";
import type { ReasonLoop, ApprovalGate } from "@tripp-reason/core";
import type { ToolDispatcher, Approver } from "@tripp-reason/shared";
export interface ReasonLoopWorkerInput {
    subagent: SubagentSpec;
    taskPacket: TaskPacket;
    /** Injected ReasonLoop instance (with provider wired) */
    reasonLoop: ReasonLoop;
    /** Optional tool dispatcher (wrapped with allow/deny filter) */
    toolDispatcher?: ToolDispatcher;
    /** Optional approval gate (wraps an Approver) */
    approvalGate?: ApprovalGate;
    /** Working directory for tool execution */
    workdir: string;
}
/**
 * Swarm-aware Approver that enforces task-level approval rules.
 * Wraps an underlying Approver (pooled from the swarm assembly).
 *
 * Rules:
 *  - If taskPacket.requiresApproval is false: auto-approve safe tools,
 *    block mutating/destructive tools.
 *  - If taskPacket.requiresApproval is true: delegate to underlying approver.
 *  - If no gate configured and requiresApproval is true: fail closed.
 */
export declare function createSwarmApprover(taskPacket: TaskPacket, innerApprover?: Approver): Approver;
/**
 * Run a single task packet through ReasonLoop.
 *
 * Flow:
 *  1. Build worker prompt
 *  2. Filter tools (if dispatcher provided)
 *  3. Assemble ReasonLoop (with filtered dispatcher + swarm approver)
 *  4. Run ReasonLoop
 *  5. Map result → ResultPacket
 */
export declare function runReasonLoopWorker(input: ReasonLoopWorkerInput): Promise<ResultPacket>;
/**
 * Convenience: run a worker with pre-filtered tool dispatcher.
 *
 * Creates a filtered dispatcher from the TaskPacket's allow/deny lists
 * and passes it to runReasonLoopWorker via the assembly layer.
 *
 * NOTE: In Phase 5E, ReasonLoop is created once with a dispatcher.
 * Tool filtering happens here by passing the filtered tools as context
 * in the prompt (the worker prompt already encodes allowed/forbidden tools).
 * The actual dispatch blocking requires assembly-level injection of a
 * FilteredToolDispatcher into ReasonLoop, which is the server/CLI
 * assembly layer's responsibility in Phase 5F.
 */
export declare function getFilteredToolList(taskPacket: TaskPacket, dispatcher: ToolDispatcher): string[];
//# sourceMappingURL=reasonLoopWorker.d.ts.map