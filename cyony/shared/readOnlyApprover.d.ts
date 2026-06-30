/**
 * @tripp-reason/server — Read-Only HTTP Approver
 *
 * Phase 3B: Denies all approval requests. Mutations are not allowed
 * over HTTP until Phase 3C approval queue is implemented.
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
export declare class ReadOnlyApprover implements Approver {
    requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
}
//# sourceMappingURL=readOnlyApprover.d.ts.map