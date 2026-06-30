import { validateSubagentSpec, validateTaskPacket } from "./validation.js";
import { SwarmValidationError, SwarmRoleMismatchError, } from "./workerErrors.js";
import { runFakeWorker } from "./fakeWorkers.js";
import { runReasonLoopWorker } from "./reasonLoopWorker.js";
// ── Implementation ───────────────────────────────────────────────────
/**
 * Run a worker (fake or real based on context).
 *
 * Phase 5C: all workers are fake. context.fakeExecution must be true.
 * Phase 5E: context.fakeExecution=false enables ReasonLoop-backed execution.
 *   Requires context.reasonLoop to be injected.
 */
export async function runWorker(subagent, taskPacket, context) {
    // Validate inputs
    const specErr = validateSubagentSpec(subagent);
    if (specErr) {
        throw new SwarmValidationError(specErr, subagent.id, taskPacket.id);
    }
    const taskErr = validateTaskPacket(taskPacket);
    if (taskErr) {
        throw new SwarmValidationError(taskErr, subagent.id, taskPacket.id);
    }
    // Role must match
    if (subagent.role !== taskPacket.role) {
        throw new SwarmRoleMismatchError(subagent.id, subagent.role, taskPacket.role);
    }
    // Phase 5C: fake execution
    if (context.fakeExecution) {
        return runFakeWorker(subagent, taskPacket, context);
    }
    // Phase 5E: ReasonLoop-backed execution
    const reasonLoop = context.reasonLoop;
    if (!reasonLoop) {
        throw new SwarmValidationError("Real worker execution requires injected ReasonLoop (context.reasonLoop)", subagent.id, taskPacket.id);
    }
    return runReasonLoopWorker({
        subagent,
        taskPacket,
        reasonLoop,
        toolDispatcher: context.toolDispatcher,
        approvalGate: context.approvalGate,
        workdir: context.workdir,
    });
}
//# sourceMappingURL=workerRunner.js.map