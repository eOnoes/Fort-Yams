/**
 * CLI approval implementation
 *
 * Prompts the user in the terminal for tool approval.
 * Implements the shared Approver interface.
 * Default to deny on empty/invalid input or timeout.
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
export declare class CliApprover implements Approver {
    requestApproval(operation: ApprovalRequest): Promise<ApprovalResult>;
}
//# sourceMappingURL=approver.d.ts.map