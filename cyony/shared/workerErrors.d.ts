/**
 * @tripp-reason/swarm — worker errors
 *
 * Controlled error types for worker execution.
 * All errors are typed — no raw stack traces escape.
 */
export declare class SwarmWorkerError extends Error {
    readonly code: string;
    readonly subagentId?: string | undefined;
    readonly taskPacketId?: string | undefined;
    constructor(message: string, code: string, subagentId?: string | undefined, taskPacketId?: string | undefined);
}
/** SubagentSpec failed validation. */
export declare class SwarmValidationError extends SwarmWorkerError {
    constructor(reason: string, subagentId?: string, taskPacketId?: string);
}
/** Role mismatch: subagent.role != taskPacket.role. */
export declare class SwarmRoleMismatchError extends SwarmWorkerError {
    constructor(subagentId: string, expectedRole: string, actualRole: string);
}
/** Worker execution timed out. */
export declare class SwarmTimeoutError extends SwarmWorkerError {
    constructor(subagentId: string, taskPacketId: string, timeoutMs: number);
}
/** Worker execution failed. */
export declare class SwarmExecutionError extends SwarmWorkerError {
    constructor(subagentId: string, taskPacketId: string, reason: string);
}
/** Frozen subagent attempted restricted behavior. */
export declare class SwarmFrozenViolationError extends SwarmWorkerError {
    constructor(subagentId: string, role: string);
}
//# sourceMappingURL=workerErrors.d.ts.map