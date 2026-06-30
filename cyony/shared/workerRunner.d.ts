/**
 * @tripp-reason/swarm — worker runner
 *
 * Executes a SubagentSpec + TaskPacket through a role-specific
 * fake or real (ReasonLoop-backed) worker, returning a ResultPacket.
 *
 * Phase 5C: fake workers only. No providers, tools, file I/O.
 * Phase 5E: ReasonLoop-backed real workers added.
 */
import type { WorkerRole, SubagentSpec, TaskPacket, ResultPacket } from "./types.js";
import type { ReasonLoop, ApprovalGate } from "@tripp-reason/core";
import type { ToolDispatcher } from "@tripp-reason/shared";
export interface WorkerExecutionContext {
    swarmId: string;
    startedAt: string;
    workdir: string;
    /** Phase 5C: must be true — real execution not yet implemented.
     *  Phase 5E: set false for ReasonLoop-backed execution. */
    fakeExecution: boolean;
    /** Simulate timeout for testing (fake workers only). */
    simulateTimeout?: boolean;
    /** Simulate failure for testing (fake workers only). */
    simulateFail?: boolean;
    /** Phase 5E: injected ReasonLoop for real execution. */
    reasonLoop?: ReasonLoop;
    /** Phase 5E: injected tool dispatcher for real execution. */
    toolDispatcher?: ToolDispatcher;
    /** Phase 5E: injected approval gate for real execution. */
    approvalGate?: ApprovalGate;
}
export interface WorkerRunner {
    role: WorkerRole;
    /** Execute a subagent against a task packet, returning a ResultPacket. */
    run(subagent: SubagentSpec, taskPacket: TaskPacket, context: WorkerExecutionContext): Promise<ResultPacket>;
}
/**
 * Run a worker (fake or real based on context).
 *
 * Phase 5C: all workers are fake. context.fakeExecution must be true.
 * Phase 5E: context.fakeExecution=false enables ReasonLoop-backed execution.
 *   Requires context.reasonLoop to be injected.
 */
export declare function runWorker(subagent: SubagentSpec, taskPacket: TaskPacket, context: WorkerExecutionContext): Promise<ResultPacket>;
//# sourceMappingURL=workerRunner.d.ts.map