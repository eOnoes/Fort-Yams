const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
export class ApprovalQueue {
    items = new Map();
    timers = new Map();
    enqueue(request, timeoutMs = DEFAULT_TIMEOUT_MS) {
        const id = `appr_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
        let resolver;
        const promise = new Promise((resolve) => { resolver = resolve; });
        const item = {
            id, sessionId: request.sessionId, runId: request.runId,
            toolName: request.toolName, argsSummary: summarizeArgs(request.args),
            riskLevel: request.riskLevel, status: "pending", createdAt: now, expiresAt,
            _resolve: resolver,
        };
        this.items.set(id, item);
        const timer = setTimeout(() => {
            if (item.status === "pending") {
                this.resolve(id, { approved: false, reason: "Approval timed out (5 minutes)" });
                item.status = "timed_out";
            }
            this.timers.delete(id);
        }, timeoutMs);
        this.timers.set(id, timer);
        return { item, promise };
    }
    resolve(id, result) {
        const item = this.items.get(id);
        if (!item || item.status !== "pending")
            return false;
        item.status = result.approved ? "approved" : "denied";
        item.reason = result.reason;
        item.resolvedAt = new Date().toISOString();
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        item._resolve(result);
        return true;
    }
    listPending() {
        const result = [];
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
    get(id) {
        const item = this.items.get(id);
        if (!item)
            return undefined;
        const { _resolve, ...rest } = item;
        return rest;
    }
    get pendingCount() {
        let count = 0;
        const vals = Array.from(this.items.values());
        for (let i = 0; i < vals.length; i++) {
            if (vals[i].status === "pending")
                count++;
        }
        return count;
    }
}
function summarizeArgs(args) {
    if (args === null || args === undefined)
        return "(none)";
    if (typeof args === "string")
        return args.length > 120 ? args.slice(0, 117) + "..." : args;
    if (typeof args === "object") {
        const str = JSON.stringify(args);
        return str.length > 120 ? str.slice(0, 117) + "..." : str;
    }
    return String(args).slice(0, 120);
}
//# sourceMappingURL=approvalQueue.js.map