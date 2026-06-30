/**
 * @tripp-reason/swarm — orchestrator
 *
 * Phase 5D: deterministic fake pipeline. Plan → execute → merge → warden → summary.
 * Phase 5E+: context.fakeExecution=false enables ReasonLoop-backed workers.
 */
import { createPlan } from "./planner.js";
import { runWorker } from "./workerRunner.js";
import { mergeResults } from "./merger.js";
import { detectConflicts } from "./conflictDetector.js";
import { runWarden } from "./warden.js";
import { buildSwarmSummary } from "./swarmSummary.js";
import { validateSwarmRunPlan } from "./validation.js";
import { SwarmValidationError } from "./workerErrors.js";
import { ABSOLUTE_MAX_WORKERS } from "./constants.js";
/**
 * Run the full deterministic swarm pipeline.
 *
 * Flow: plan → validate → execute waves → merge → conflicts → warden → summary
 */
export async function runSwarmPipeline(input) {
    // 1. Plan
    const plan = createPlan({ operatorPrompt: input.operatorPrompt, workdir: input.workdir });
    // 2. Validate plan
    const planErr = validateSwarmRunPlan(plan);
    if (planErr) {
        throw new SwarmValidationError(planErr, "orchestrator", plan.id);
    }
    // 3. Enforce hard cap
    if (plan.workerCount > ABSOLUTE_MAX_WORKERS) {
        throw new SwarmValidationError(`Worker count ${plan.workerCount} exceeds absolute max ${ABSOLUTE_MAX_WORKERS}`, "orchestrator", plan.id);
    }
    const startedAt = new Date().toISOString();
    const hasRealDeps = !!(input.reasonLoop);
    const baseContext = {
        swarmId: plan.id,
        startedAt,
        workdir: input.workdir,
        fakeExecution: !hasRealDeps,
        reasonLoop: input.reasonLoop,
        toolDispatcher: input.toolDispatcher,
        approvalGate: input.approvalGate,
    };
    // 4. Execute by wave
    const resultPackets = [];
    const waves = groupByWave(plan.assignments);
    for (const waveNum of Object.keys(waves).map(Number).sort((a, b) => a - b)) {
        const waveAssignments = waves[waveNum];
        const waveResults = await Promise.all(waveAssignments.map(async (asgn) => {
            const sub = plan.subagents.find((s) => s.id === asgn.subagentId);
            const task = plan.taskPackets.find((t) => t.id === asgn.taskPacketId);
            asgn.status = "running";
            asgn.startedAt = new Date().toISOString();
            const result = await runWorker(sub, task, baseContext);
            asgn.status = result.status === "pass" ? "pass" : result.status;
            asgn.completedAt = new Date().toISOString();
            return result;
        }));
        resultPackets.push(...waveResults);
    }
    // 5. Detect conflicts
    const conflicts = detectConflicts(resultPackets);
    // 6. Merge
    const merged = mergeResults(resultPackets, conflicts);
    // 7. Warden review
    const verdict = runWarden(plan, resultPackets, merged, conflicts);
    // 8. Build summary
    const completedAt = new Date().toISOString();
    const summary = buildSwarmSummary({
        plan,
        resultPackets,
        conflicts,
        verdict,
        startedAt,
        completedAt,
    });
    return summary;
}
function groupByWave(assignments) {
    const waves = {};
    for (const a of assignments) {
        const w = a.wave ?? 0;
        if (!waves[w])
            waves[w] = [];
        waves[w].push(a);
    }
    return waves;
}
//# sourceMappingURL=orchestrator.js.map