/**
 * Swarm API routes — Phase 6B
 *
 * GET  /swarms        — list swarm runs
 * GET  /swarms/:id    — swarm detail
 * POST /swarms/run    — execute a swarm run (fake mode, solo/small)
 */
import type { FastifyInstance } from "fastify";
interface SwarmRouter {
    listSwarms(): import("../swarmRuntime.js").SwarmRunEntry[];
    getSwarm(id: string): import("../swarmRuntime.js").SwarmRunEntry | undefined;
    runSwarm(req: import("../swarmRuntime.js").SwarmRunRequest, workdir: string): Promise<import("../swarmRuntime.js").SwarmRunResponse>;
    swarmListDTO(): import("../swarmRuntime.js").SwarmRunResponse[];
    swarmDetailDTO(e: import("../swarmRuntime.js").SwarmRunEntry): Record<string, unknown>;
}
export declare function swarmsRoute(app: FastifyInstance, swarmRouter: SwarmRouter, workdir: string): void;
export {};
//# sourceMappingURL=swarms.d.ts.map