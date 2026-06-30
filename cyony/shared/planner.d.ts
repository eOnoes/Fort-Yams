import type { SwarmRunPlan } from "./types.js";
export interface PlannerInput {
    operatorPrompt: string;
    workdir: string;
}
/**
 * Create a deterministic SwarmRunPlan from an operator prompt.
 *
 * Keyword-driven for Phase 5D testing. Returns a plan with
 * dynamically-created SubagentSpecs, TaskPackets, and Assignments.
 */
export declare function createPlan(input: PlannerInput): SwarmRunPlan;
//# sourceMappingURL=planner.d.ts.map