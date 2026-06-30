/**
 * @tripp-reason/swarm — worker errors
 *
 * Controlled error types for worker execution.
 * All errors are typed — no raw stack traces escape.
 */
export class SwarmWorkerError extends Error {
    code;
    subagentId;
    taskPacketId;
    constructor(message, code, subagentId, taskPacketId) {
        super(message);
        this.code = code;
        this.subagentId = subagentId;
        this.taskPacketId = taskPacketId;
        this.name = "SwarmWorkerError";
    }
}
/** SubagentSpec failed validation. */
export class SwarmValidationError extends SwarmWorkerError {
    constructor(reason, subagentId, taskPacketId) {
        super(`Swarm validation error: ${reason}`, "SWARM_VALIDATION_ERROR", subagentId, taskPacketId);
        this.name = "SwarmValidationError";
    }
}
/** Role mismatch: subagent.role != taskPacket.role. */
export class SwarmRoleMismatchError extends SwarmWorkerError {
    constructor(subagentId, expectedRole, actualRole) {
        super(`Role mismatch: subagent '${subagentId}' role is '${expectedRole}' but taskPacket role is '${actualRole}'`, "SWARM_ROLE_MISMATCH", subagentId);
        this.name = "SwarmRoleMismatchError";
    }
}
/** Worker execution timed out. */
export class SwarmTimeoutError extends SwarmWorkerError {
    constructor(subagentId, taskPacketId, timeoutMs) {
        super(`Worker '${subagentId}' timed out after ${timeoutMs}ms on task '${taskPacketId}'`, "SWARM_TIMEOUT", subagentId, taskPacketId);
        this.name = "SwarmTimeoutError";
    }
}
/** Worker execution failed. */
export class SwarmExecutionError extends SwarmWorkerError {
    constructor(subagentId, taskPacketId, reason) {
        super(`Worker '${subagentId}' failed on task '${taskPacketId}': ${reason}`, "SWARM_EXECUTION_ERROR", subagentId, taskPacketId);
        this.name = "SwarmExecutionError";
    }
}
/** Frozen subagent attempted restricted behavior. */
export class SwarmFrozenViolationError extends SwarmWorkerError {
    constructor(subagentId, role) {
        super(`Frozen violation: subagent '${subagentId}' (role: ${role}) attempted restricted behavior`, "SWARM_FROZEN_VIOLATION", subagentId);
        this.name = "SwarmFrozenViolationError";
    }
}
//# sourceMappingURL=workerErrors.js.map