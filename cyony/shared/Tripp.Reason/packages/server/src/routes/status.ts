/** GET /status — Runtime visibility. No secrets. Phase 4E: includes MCP status. Phase 6B: swarm API status. */
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";
import type { ApprovalQueue } from "../approvalQueue.js";
import type { McpRuntime } from "@tripp-reason/mcp";

export function statusRoute(
  app: FastifyInstance,
  config: ServerConfig,
  queue?: ApprovalQueue,
  mcp?: McpRuntime | null,
  swarmCount?: number,
): void {
  app.get("/status", async (_req, reply) => {
    const mcpStatus = mcp?.status;
    return {
      providerName: config.provider.name,
      model: config.provider.defaultModel,
      dbPath: ".tripp/reason.sqlite",
      workdir: config.workdir,
      activeTools: ["list_dir","read_file","search","git_status","git_diff","write_file","edit_file","shell","run_tests"],
      readonlyMode: false,
      approvalsEnabled: true,
      pendingApprovals: queue?.pendingCount ?? 0,
      mcp: mcpStatus ?? {
        enabled: false,
        configPath: ".tripp/mcp.config.json",
        serverCount: 0,
        connectedCount: 0,
        totalToolCount: 0,
        servers: [],
      },
      swarmApiEnabled: true,
      swarmRunsCount: swarmCount ?? 0,
      dashboardApiGapsClosed: ["swarms", "reports"],
    };
  });
}
