/** GET /tools — List active read-only tools. */
import type { FastifyInstance } from "fastify";
import type { ToolDispatcher } from "@tripp-reason/shared";

export function toolsRoute(app: FastifyInstance, dispatcher: ToolDispatcher): void {
  app.get("/tools", async (_req, reply) => {
    const tools = dispatcher.listTools().map((t) => ({
      name: t.name,
      description: t.description,
      requiresApproval: t.requiresApproval,
    }));
    return { tools };
  });
}
