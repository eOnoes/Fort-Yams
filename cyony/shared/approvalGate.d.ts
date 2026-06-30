/**
 * @tripp-reason/core — ApprovalGate
 *
 * Routes tool approval requests through risk-level classification:
 * - "safe"       → auto-approve (no approver call)
 * - "mutating"   → route to Approver for confirmation
 * - "destructive" → route to Approver for confirmation
 *
 * Core only CONSUMES the Approver interface from shared.
 * CLI/server implementations provide the actual Approver.
 *
 * Design decisions:
 * - Safe operations skip the approver entirely (zero overhead)
 * - ApprovalGate does NOT persist approval records — RunManager does
 * - ApprovalGate returns ApprovalResult for the caller to act on
 * - Denied approvals throw ApprovalDeniedError by default
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
export interface ApprovalGateOptions {
    /** The approver implementation (from CLI, server, or swarm). */
    approver: Approver;
    /**
     * Whether to throw ApprovalDeniedError when approval is denied.
     * Default: true. Set false to return the denial result instead.
     */
    throwOnDenial?: boolean;
}
export interface ApprovalGate {
    /**
     * Check if an operation requires approval and route accordingly.
     *
     * @param request - The approval request with tool name, args, and risk level
     * @returns The approval result (always approved for safe, may be denied for mutating/destructive)
     * @throws ApprovalDeniedError if throwOnDenial=true and approval is denied
     */
    check(request: ApprovalRequest): Promise<ApprovalResult>;
}
/**
 * Create an ApprovalGate that routes requests through risk-level classification.
 */
export declare function createApprovalGate(options: ApprovalGateOptions): ApprovalGate;
//# sourceMappingURL=approvalGate.d.ts.map