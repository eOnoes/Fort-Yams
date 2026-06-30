/**
 * @tripp-reason/server — Fastify Server App (Phase 6B)
 *
 * Registers all routes including swarm endpoints + reports index.
 */
import Fastify from "fastify";
import type { ServerConfig } from "./config.js";
import { assembleRuntime, type ServerRuntime } from "./runtime.js";
import { healthRoute } from "./routes/health.js";
import { statusRoute } from "./routes/status.js";
import { toolsRoute } from "./routes/tools.js";
import { sessionsRoute } from "./routes/sessions.js";
import { runsRoute } from "./routes/runs.js";
import { replyRoute } from "./routes/reply.js";
import { approvalsRoute } from "./routes/approvals.js";
import { swarmsRoute } from "./routes/swarms.js";
import { reportsRoute } from "./routes/reports.js";
import {
  agentsStatusRoute,
  agentsInboxRoute,
  agentsOutboxRoute,
  agentsReviewsRoute,
  agentsTraceRoute,
  agentsTraceChainRoute,
  agentsReadRoute,
  agentsArchiveRoute,
  agentsRejectRoute,
} from "./routes/agents.js";
import * as swarmRuntime from "./swarmRuntime.js";

export async function createServer(config: ServerConfig) {
  const app = Fastify({
    logger: false,
    maxParamLength: 100,
    bodyLimit: 1_048_576,
  });

  app.addHook("onSend", (_req, reply, _payload, done) => {
    reply.header("access-control-allow-origin", "http://localhost:*");
    done();
  });

  const runtime = await assembleRuntime(config);

  healthRoute(app);
  statusRoute(app, config, runtime.approvalQueue, runtime.mcp, swarmRuntime.getSwarmCount());
  toolsRoute(app, runtime.dispatcher);
  sessionsRoute(app, runtime.repos);
  runsRoute(app, runtime.repos, config.workdir);
  replyRoute(app, runtime);
  approvalsRoute(app, runtime.approvalQueue);
  swarmsRoute(app, swarmRuntime, config.workdir);
  reportsRoute(app, config.workdir);

  // Phase 7G — Agent Bus API
  agentsStatusRoute(app, config.workdir);
  agentsInboxRoute(app, config.workdir);
  agentsOutboxRoute(app, config.workdir);
  agentsReviewsRoute(app, config.workdir);
  agentsTraceRoute(app, config.workdir);
  agentsTraceChainRoute(app, config.workdir);
  agentsReadRoute(app, config.workdir);
  agentsArchiveRoute(app, config.workdir);
  agentsRejectRoute(app, config.workdir);

  app.addHook("onClose", async () => {
    if (runtime.mcp) {
      await runtime.mcp.shutdown();
    }
  });

  return { app, runtime };
}

export async function startServer(config: ServerConfig) {
  const { app, runtime } = await createServer(config);
  await app.listen({ host: config.host, port: config.port });

  const mcpInfo = runtime.mcp?.status;
  const mcpLine = mcpInfo?.enabled
    ? `\n   MCP: ${mcpInfo.connectedCount}/${mcpInfo.serverCount} servers, ${mcpInfo.totalToolCount} tools`
    : "\n   MCP: disabled (no config)";

  console.log(`🚀 Tripp.Reason server running at http://${config.host}:${config.port}`);
  console.log(`   Mode: HTTP Approval Queue (Phase 3C) + MCP Bridge (Phase 4E) + Swarm API (Phase 6B)`);
  console.log(`   Tools: 9 local, ${runtime.dispatcher.listTools().length - 9} MCP = ${runtime.dispatcher.listTools().length} total`);
  console.log(`   DB: ${config.dbPath}${mcpLine}`);
  console.log(`   Swarm: fake mode, ${swarmRuntime.getSwarmCount()} runs in memory`);
  return app;
}
