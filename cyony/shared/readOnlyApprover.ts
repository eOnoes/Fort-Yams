/**
 * @tripp-reason/server — Read-Only HTTP Approver
 *
 * Phase 3B: Denies all approval requests. Mutations are not allowed
 * over HTTP until Phase 3C approval queue is implemented.
 */
import type { Approver, ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";

export class ReadOnlyApprover implements Approver {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    return {
      approved: false,
      reason: `Tool "${request.toolName}" requires approval. HTTP approval queue is not available in Phase 3B (read-only mode). Use CLI for mutations.`,
    };
  }
}
