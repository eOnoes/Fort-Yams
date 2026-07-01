/** GET /sessions, GET /sessions/:id — Session listing and detail. */
import type { FastifyInstance } from "fastify";
import type { Repositories } from "@tripp-reason/store";
import { notFound } from "../errors.js";

export function sessionsRoute(app: FastifyInstance, repos: Repositories): void {
  app.get("/sessions", async (_req, reply) => {
    const sessions = await repos.listSessions();
    return { sessions };
  });

  app.get<{ Params: { id: string } }>("/sessions/:id", async (req, reply) => {
    const session = await repos.getSession(req.params.id);
    if (!session) return notFound(reply, `session ${req.params.id} not found`);
    const reports = await repos.listReportsBySession(req.params.id);
    return { session, runCount: reports.length };
  });
}
