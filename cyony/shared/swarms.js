import { notFound, badRequest } from "../errors.js";
export function swarmsRoute(app, swarmRouter, workdir) {
    // GET /swarms
    app.get("/swarms", async (_req, reply) => {
        return { swarms: swarmRouter.swarmListDTO() };
    });
    // GET /swarms/:id
    app.get("/swarms/:id", async (req, reply) => {
        const entry = swarmRouter.getSwarm(req.params.id);
        if (!entry)
            return notFound(reply, `swarm ${req.params.id} not found`);
        return swarmRouter.swarmDetailDTO(entry);
    });
    // POST /swarms/run
    app.post("/swarms/run", async (req, reply) => {
        const body = req.body;
        if (!body || typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
            return badRequest(reply, "Missing 'prompt' field in request body");
        }
        const request = {
            prompt: String(body.prompt).trim(),
            mode: typeof body.mode === "string" ? body.mode : undefined,
            workers: typeof body.workers === "number" ? body.workers : undefined,
            fake: body.fake !== false,
            real: body.real === true,
            workdir: typeof body.workdir === "string" ? body.workdir : undefined,
        };
        try {
            const result = await swarmRouter.runSwarm(request, workdir);
            reply.status(201).send(result);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return badRequest(reply, msg);
        }
    });
}
//# sourceMappingURL=swarms.js.map