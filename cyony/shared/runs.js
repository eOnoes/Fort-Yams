/** GET /sessions/:id/events, GET /runs/:id, GET /runs/:id/report */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { notFound } from "../errors.js";
export function runsRoute(app, repos, workdir) {
    // GET /sessions/:id/events — events for a specific run
    app.get("/sessions/:id/events", async (req, reply) => {
        const session = await repos.getSession(req.params.id);
        if (!session)
            return notFound(reply, `session ${req.params.id} not found`);
        const runId = req.query.runId;
        if (!runId) {
            return { events: [], note: "Provide ?runId= to fetch events for a specific run" };
        }
        const events = await repos.listEventsByRun(runId);
        return { events };
    });
    // GET /runs/:id — full run detail
    app.get("/runs/:id", async (req, reply) => {
        const run = await repos.getRun(req.params.id);
        if (!run)
            return notFound(reply, `run ${req.params.id} not found`);
        const messages = await repos.listMessagesByRun(req.params.id);
        const events = await repos.listEventsByRun(req.params.id);
        const toolCalls = await repos.listToolCallsByRun(req.params.id);
        const reportRecord = await repos.getReportByRun(req.params.id);
        return {
            run,
            messages,
            events,
            toolCalls,
            reportPath: reportRecord?.path ?? null,
        };
    });
    // GET /runs/:id/report — generated report content
    app.get("/runs/:id/report", async (req, reply) => {
        const reportRecord = await repos.getReportByRun(req.params.id);
        if (!reportRecord)
            return notFound(reply, `report for run ${req.params.id} not found`);
        const absPath = resolve(workdir, reportRecord.path);
        if (!existsSync(absPath))
            return notFound(reply, `report file not found`);
        const content = readFileSync(absPath, "utf-8");
        if (req.query.format === "json") {
            return { report: content, path: reportRecord.path };
        }
        reply.header("content-type", "text/markdown; charset=utf-8");
        return content;
    });
}
//# sourceMappingURL=runs.js.map