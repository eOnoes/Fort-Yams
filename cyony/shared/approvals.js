import { badRequest, notFound } from "../errors.js";
export function approvalsRoute(app, queue) {
    app.get("/approvals", async (_req, reply) => {
        return { approvals: queue.listPending() };
    });
    app.post("/approvals/:id/resolve", async (req, reply) => {
        const { id } = req.params;
        let body;
        try {
            body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        }
        catch {
            return badRequest(reply, "Invalid JSON body");
        }
        if (typeof body.approved !== "boolean") {
            return badRequest(reply, "Missing 'approved' boolean field");
        }
        const existing = queue.get(id);
        if (!existing)
            return notFound(reply, `approval ${id} not found`);
        if (existing.status !== "pending") {
            return badRequest(reply, `approval ${id} already ${existing.status}`);
        }
        const ok = queue.resolve(id, {
            approved: body.approved,
            reason: body.reason ?? (body.approved ? "Approved by operator" : "Denied by operator"),
        });
        if (!ok)
            return badRequest(reply, `failed to resolve ${id}`);
        const resolved = queue.get(id);
        return { status: "ok", approval: resolved };
    });
}
//# sourceMappingURL=approvals.js.map