# Phase 6B Server Swarm Assembly Pattern

## Architecture

```
POST /swarms/run → swarmsRoute → swarmRuntime.runSwarm() → runSwarmPipeline() (fake)
GET  /swarms     → swarmsRoute → swarmRuntime.swarmListDTO()
GET  /swarms/:id → swarmsRoute → swarmRuntime.swarmDetailDTO()
```

## swarmRuntime.ts pattern (in-memory, safety-gated)

```typescript
import { runSwarmPipeline, ABSOLUTE_MAX_WORKERS, doesModeRequireApproval, getWorkerCapForMode } from "@tripp-reason/swarm";

// In-memory state
const swarms = new Map<string, SwarmRunEntry>();

export async function runSwarm(request, workdir) {
  // Gate: real mode
  if (request.real) throw new Error("Real swarm mode not yet supported in server...");
  
  // Gate: medium/large/max
  if (doesModeRequireApproval(mode)) throw new Error("requires operator startup approval...");
  
  // Gate: worker caps
  const cap = getWorkerCapForMode(mode); // cap.max — NOT a raw number!
  if (workers > cap.max || workers > ABSOLUTE_MAX_WORKERS) throw new Error(...);
  
  // Execute fake pipeline
  const summary = await runSwarmPipeline({ operatorPrompt, workdir });
  addSwarm({ summary, operatorPrompt: prompt });
  return swarmToResponse(summary, prompt);
}
```

## Routes pattern (duck-typed interface)

```typescript
// Accept any object with the required methods — no concrete type import
interface SwarmRouter {
  listSwarms(): SwarmRunEntry[];
  getSwarm(id: string): SwarmRunEntry | undefined;
  runSwarm(req): Promise<SwarmRunResponse>;
  swarmListDTO(): SwarmRunResponse[];
  swarmDetailDTO(e: SwarmRunEntry): Record<string, unknown>;
}

export function swarmsRoute(app, swarmRouter, workdir) {
  app.get("/swarms", async () => ({ swarms: swarmRouter.swarmListDTO() }));
  app.get("/swarms/:id", async (req, reply) => {
    const e = swarmRouter.getSwarm(req.params.id);
    if (!e) return notFound(reply, "...");
    return swarmRouter.swarmDetailDTO(e);
  });
  app.post("/swarms/run", async (req, reply) => {
    // Parse body, validate prompt, call swarmRouter.runSwarm()
    try {
      const result = await swarmRouter.runSwarm(request, workdir);
      reply.status(201).send(result);
    } catch (err) {
      return badRequest(reply, err.message);
    }
  });
}
```

## Server wiring

```typescript
import * as swarmRuntime from "./swarmRuntime.js";

export async function createServer(config) {
  // ...assemble runtime...
  swarmsRoute(app, swarmRuntime, config.workdir);  // pass module directly
  reportsRoute(app, config.workdir);
  // ...
}
```

## Server smoke test pattern

```javascript
// Set env vars BEFORE importing config module
process.env.TRIPP_SERVER_HOST = "127.0.0.1";
process.env.TRIPP_SERVER_PORT = "13031";
process.env.TRIPP_DB_PATH = ":memory:";
process.env.TRIPP_OPENAI_COMPATIBLE_BASE_URL = "http://localhost:9999"; // fake
process.env.TRIPP_OPENAI_COMPATIBLE_API_KEY = "test-key";
process.env.TRIPP_MODEL = "test";

const serverMod = await import(`${REPO}/packages/server/dist/server.js`);
const configMod = await import(`${REPO}/packages/server/dist/config.js`);
const config = configMod.loadConfig(); // reads process.env, zero args

const { app } = await serverMod.createServer(config);
await app.listen({ host: "127.0.0.1", port: 13031 });

// Run tests...
// await app.close() in finally block
```

## Safety gates table

| Input | Response | Gate mechanism |
|-------|----------|---------------|
| `real: true` | 400 "not yet supported" | Explicit check in runSwarm() |
| `mode: "medium"` | 400 "requires approval" | `doesModeRequireApproval()` |
| `workers: 26` | 400 "exceeds maximum" | `ABSOLUTE_MAX_WORKERS` |
| `workers > mode cap` | 400 "exceeds mode cap" | `getWorkerCapForMode().max` |
| Missing prompt | 400 "Missing 'prompt'" | Request body validation |
| Unknown swarm ID | 404 | `getSwarm()` returns undefined |

## /status additions

```typescript
return {
  // ...existing fields...
  swarmApiEnabled: true,
  swarmRunsCount: swarmRuntime.getSwarmCount(),
  dashboardApiGapsClosed: ["swarms", "reports"],
};
```
