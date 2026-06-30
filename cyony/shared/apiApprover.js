export class ApiApprover {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async requestApproval(request) {
        const ctx = request.context ?? {};
        const { promise } = this.queue.enqueue({
            ...request,
            sessionId: ctx.session_id ?? "",
            runId: ctx.run_id ?? "",
        });
        return promise;
    }
}
//# sourceMappingURL=apiApprover.js.map