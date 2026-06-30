/** GET /health — Liveness check. */
import type { FastifyInstance } from "fastify";

export function healthRoute(app: FastifyInstance): void {
  const startTime = Date.now();
  app.get("/health", async (_req, reply) => {
    return {
      status: "ok",
      uptimeMs: Date.now() - startTime,
      phase: "3B",
      mode: "readonly-http-sse",
    };
  });
}
