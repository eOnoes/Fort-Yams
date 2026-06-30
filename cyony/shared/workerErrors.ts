/**
 * @tripp-reason/swarm — worker errors
 *
 * Controlled error types for worker execution.
 * All errors are typed — no raw stack traces escape.
 */

export class SwarmWorkerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly subagentId?: string,
    public readonly taskPacketId?: string,
  ) {
    super(message);
    this.name = "SwarmWorkerError";
  }
}

/** SubagentSpec failed validation. */
export class SwarmValidationError extends SwarmWorkerError {
  constructor(reason: string, subagentId?: string, taskPacketId?: string) {
    super(
      `Swarm validation error: ${reason}`,
      "SWARM_VALIDATION_ERROR",
      subagentId,
      taskPacketId,
    );
    this.name = "SwarmValidationError";
  }
}

/** Role mismatch: subagent.role != taskPacket.role. */
export class SwarmRoleMismatchError extends SwarmWorkerError {
  constructor(
    subagentId: string,
    expectedRole: string,
    actualRole: string,
  ) {
    super(
      `Role mismatch: subagent '${subagentId}' role is '${expectedRole}' but taskPacket role is '${actualRole}'`,
      "SWARM_ROLE_MISMATCH",
      subagentId,
    );
    this.name = "SwarmRoleMismatchError";
  }
}

/** Worker execution timed out. */
export class SwarmTimeoutError extends SwarmWorkerError {
  constructor(
    subagentId: string,
    taskPacketId: string,
    timeoutMs: number,
  ) {
    super(
      `Worker '${subagentId}' timed out after ${timeoutMs}ms on task '${taskPacketId}'`,
      "SWARM_TIMEOUT",
      subagentId,
      taskPacketId,
    );
    this.name = "SwarmTimeoutError";
  }
}

/** Worker execution failed. */
export class SwarmExecutionError extends SwarmWorkerError {
  constructor(
    subagentId: string,
    taskPacketId: string,
    reason: string,
  ) {
    super(
      `Worker '${subagentId}' failed on task '${taskPacketId}': ${reason}`,
      "SWARM_EXECUTION_ERROR",
      subagentId,
      taskPacketId,
    );
    this.name = "SwarmExecutionError";
  }
}

/** Frozen subagent attempted restricted behavior. */
export class SwarmFrozenViolationError extends SwarmWorkerError {
  constructor(subagentId: string, role: string) {
    super(
      `Frozen violation: subagent '${subagentId}' (role: ${role}) attempted restricted behavior`,
      "SWARM_FROZEN_VIOLATION",
      subagentId,
    );
    this.name = "SwarmFrozenViolationError";
  }
}
