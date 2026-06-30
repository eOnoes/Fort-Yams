/**
 * @tripp-reason/server — API Approver (Phase 3C)
 *
 * Creates pending approval items in the in-memory queue.
 * Returns a Promise that resolves when operator approves/denies.
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
import { ApprovalQueue } from "./approvalQueue.js";
export declare class ApiApprover implements Approver {
    private queue;
    constructor(queue: ApprovalQueue);
    requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
}
//# sourceMappingURL=apiApprover.d.ts.map