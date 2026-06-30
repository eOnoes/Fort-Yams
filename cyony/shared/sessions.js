import { notFound } from "../errors.js";
export function sessionsRoute(app, repos) {
    app.get("/sessions", async (_req, reply) => {
        const sessions = await repos.listSessions();
        return { sessions };
    });
    app.get("/sessions/:id", async (req, reply) => {
        const session = await repos.getSession(req.params.id);
        if (!session)
            return notFound(reply, `session ${req.params.id} not found`);
        const reports = await repos.listReportsBySession(req.params.id);
        return { session, runCount: reports.length };
    });
}
//# sourceMappingURL=sessions.js.map