/**
 * Swarm API routes — Phase 6B
 *
 * GET  /swarms        — list swarm runs
 * GET  /swarms/:id    — swarm detail
 * POST /swarms/run    — execute a swarm run (fake mode, solo/small)
 */
import type { FastifyInstance } from "fastify";
import { notFound, badRequest } from "../errors.js";

// Accept any object with the swarmRuntime methods (duck-typed for simplicity)
interface SwarmRouter {
  listSwarms(): import("../swarmRuntime.js").SwarmRunEntry[];
  getSwarm(id: string): import("../swarmRuntime.js").SwarmRunEntry | undefined;
  runSwarm(req: import("../swarmRuntime.js").SwarmRunRequest, workdir: string): Promise<import("../swarmRuntime.js").SwarmRunResponse>;
  swarmListDTO(): import("../swarmRuntime.js").SwarmRunResponse[];
  swarmDetailDTO(e: import("../swarmRuntime.js").SwarmRunEntry): Record<string, unknown>;
}

export function swarmsRoute(app: FastifyInstance, swarmRouter: SwarmRouter, workdir: string): void {
  // GET /swarms
  app.get("/swarms", async (_req, reply) => {
    return { swarms: swarmRouter.swarmListDTO() };
  });

  // GET /swarms/:id
  app.get<{ Params: { id: string } }>("/swarms/:id", async (req, reply) => {
    const entry = swarmRouter.getSwarm(req.params.id);
    if (!entry) return notFound(reply, `swarm ${req.params.id} not found`);
    return swarmRouter.swarmDetailDTO(entry);
  });

  // POST /swarms/run
  app.post("/swarms/run", async (req, reply) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
      return badRequest(reply, "Missing 'prompt' field in request body");
    }

    const request = {
      prompt: String(body.prompt).trim(),
      mode: typeof body.mode === "string" ? (body.mode as any) : undefined,
      workers: typeof body.workers === "number" ? body.workers : undefined,
      fake: body.fake !== false,
      real: body.real === true,
      workdir: typeof body.workdir === "string" ? body.workdir : undefined,
    };

    try {
      const result = await swarmRouter.runSwarm(request, workdir);
      reply.status(201).send(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return badRequest(reply, msg);
    }
  });
}
