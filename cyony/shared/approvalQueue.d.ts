/**
 * @tripp-reason/server — In-Memory Approval Queue (Phase 3C)
 */
import type { ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
export type ApprovalStatus = "pending" | "approved" | "denied" | "timed_out";
export interface ApprovalItem {
    readonly id: string;
    readonly sessionId: string;
    readonly runId: string;
    readonly toolName: string;
    readonly argsSummary: string;
    readonly riskLevel: string;
    status: ApprovalStatus;
    reason?: string;
    readonly createdAt: string;
    resolvedAt?: string;
    readonly expiresAt: string;
    _resolve: (result: ApprovalResult) => void;
}
export declare class ApprovalQueue {
    private items;
    private timers;
    enqueue(request: ApprovalRequest & {
        sessionId: string;
        runId: string;
    }, timeoutMs?: number): {
        item: ApprovalItem;
        promise: Promise<ApprovalResult>;
    };
    resolve(id: string, result: ApprovalResult): boolean;
    listPending(): Array<Omit<ApprovalItem, "_resolve">>;
    get(id: string): Omit<ApprovalItem, "_resolve"> | undefined;
    get pendingCount(): number;
}
//# sourceMappingURL=approvalQueue.d.ts.map