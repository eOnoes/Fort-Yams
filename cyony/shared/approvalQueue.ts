/**
 * @tripp-reason/server — In-Memory Approval Queue (Phase 3C)
 */
import type { ApprovalRequest, ApprovalResult } from "@tripp-reason/shared";
import { createTraceEvent, appendTraceEvent } from "@tripp-os/agent-bus";

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

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export class ApprovalQueue {
  private items = new Map<string, ApprovalItem>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  enqueue(
    request: ApprovalRequest & { sessionId: string; runId: string },
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): { item: ApprovalItem; promise: Promise<ApprovalResult> } {
    const id = `appr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + timeoutMs).toISOString();

    let resolver!: (result: ApprovalResult) => void;
    const promise = new Promise<ApprovalResult>((resolve) => { resolver = resolve; });

    const item: ApprovalItem = {
      id, sessionId: request.sessionId, runId: request.runId,
      toolName: request.toolName, argsSummary: summarizeArgs(request.args),
      riskLevel: request.riskLevel, status: "pending", createdAt: now, expiresAt,
      _resolve: resolver,
    };

    this.items.set(id, item);
    const timer = setTimeout(() => {
      if (item.status === "pending") {
        // Emit approval_timeout trace event (best-effort)
        appendTraceEvent(
          createTraceEvent({
            eventType: "approval_timeout" as any,
            severity: "warning",
            actorType: "approvalgate",
            runId: request.runId,
            summary: `Approval timed out for "${request.toolName}" after ${timeoutMs}ms`,
            details: {
              timeoutMs,
              toolName: request.toolName,
              riskLevel: request.riskLevel,
            },
          }),
        ).catch(() => { /* best-effort */ });

        this.resolve(id, { approved: false, reason: "Approval timed out (5 minutes)" });
        item.status = "timed_out";
      }
      this.timers.delete(id);
    }, timeoutMs);
    this.timers.set(id, timer);

    return { item, promise };
  }

  resolve(id: string, result: ApprovalResult): boolean {
    const item = this.items.get(id);
    if (!item || item.status !== "pending") return false;
    item.status = result.approved ? "approved" : "denied";
    item.reason = result.reason;
    item.resolvedAt = new Date().toISOString();
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    item._resolve(result);
    return true;
  }

  listPending(): Array<Omit<ApprovalItem, "_resolve">> {
    const result: Array<Omit<ApprovalItem, "_resolve">> = [];
    const vals = Array.from(this.items.values());
    for (let i = 0; i < vals.length; i++) {
      const item = vals[i];
      if (item.status === "pending") {
        const { _resolve, ...rest } = item;
        result.push(rest);
      }
    }
    return result;
  }

  get(id: string): Omit<ApprovalItem, "_resolve"> | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    const { _resolve, ...rest } = item;
    return rest;
  }

  get pendingCount(): number {
    let count = 0;
    const vals = Array.from(this.items.values());
    for (let i = 0; i < vals.length; i++) {
      if (vals[i].status === "pending") count++;
    }
    return count;
  }
}

function summarizeArgs(args: unknown): string {
  if (args === null || args === undefined) return "(none)";
  if (typeof args === "string") return args.length > 120 ? args.slice(0, 117) + "..." : args;
  if (typeof args === "object") {
    const str = JSON.stringify(args);
    return str.length > 120 ? str.slice(0, 117) + "..." : str;
  }
  return String(args).slice(0, 120);
}
