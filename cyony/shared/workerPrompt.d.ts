/**
 * @tripp-reason/swarm — worker prompt builder
 *
 * Builds a bounded system+user prompt for a ReasonLoop-backed worker
 * from a SubagentSpec + TaskPacket. No provider calls.
 * Phase 5E.
 */
import type { SubagentSpec, TaskPacket } from "./types.js";
export interface WorkerPromptParts {
    systemPrompt: string;
    userPrompt: string;
}
/**
 * Build a bounded worker prompt from SubagentSpec + TaskPacket.
 *
 * The system prompt encodes the worker's role, scope, tool boundaries,
 * and frozen behavior rules. The user prompt is the task objective.
 */
export declare function buildWorkerPrompt(subagent: SubagentSpec, task: TaskPacket): WorkerPromptParts;
/**
 * Combine system + user into a single prompt string for ReasonLoop.
 */
export declare function toReasonLoopPrompt(parts: WorkerPromptParts): string;
//# sourceMappingURL=workerPrompt.d.ts.map