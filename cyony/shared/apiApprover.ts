/**
 * @tripp-reason/server — API Approver (Phase 3C)
 *
 * Creates pending approval items in the in-memory queue.
 * Returns a Promise that resolves when operator approves/denies.
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
import { ApprovalQueue } from "./approvalQueue.js";

export class ApiApprover implements Approver {
  constructor(private queue: ApprovalQueue) {}

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    const ctx = (request as any).context ?? {};
    const { promise } = this.queue.enqueue({
      ...request,
      sessionId: ctx.session_id ?? "",
      runId: ctx.run_id ?? "",
    });
    return promise;
  }
}
