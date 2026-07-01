/**
 * @tripp-reason/server — Runtime Assembly (Phase 6B)
 *
 * Phase 3C: All 9 tools registered. ApiApprover with approval queue.
 * Phase 4E: MCP tools appended to dispatcher.
 * Phase 6B: Swarm runtime (fake mode, in-memory state).
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  createReasonLoop,
  createRunManager,
  createEventStream,
  createApprovalGate,
} from "@tripp-reason/core";
import { initDb, createRepositories } from "@tripp-reason/store";
import { OpenAICompatibleProvider } from "@tripp-reason/providers";
import {
  createDispatcher,
  activeTools,
} from "@tripp-reason/tools";
import { assembleMcpRuntime } from "@tripp-reason/mcp";
import type { McpRuntime } from "@tripp-reason/mcp";
import type { ServerConfig } from "./config.js";
import { ApiApprover } from "./apiApprover.js";
import { ApprovalQueue } from "./approvalQueue.js";

export interface ServerRuntime {
  repos: ReturnType<typeof createRepositories>;
  dispatcher: ReturnType<typeof createDispatcher>;
  eventStream: ReturnType<typeof createEventStream>;
  approvalQueue: ApprovalQueue;
  reasonLoop: ReturnType<typeof createReasonLoop>;
  runManager: ReturnType<typeof createRunManager>;
  config: ServerConfig;
  mcp: McpRuntime | null;
  swarmCount: number;
}

export async function assembleRuntime(config: ServerConfig): Promise<ServerRuntime> {
  const dbPath = resolve(config.dbPath);
  const dbDir = dirname(dbPath);
  mkdirSync(dbDir, { recursive: true });

  const db = initDb(dbPath);
  const repos = createRepositories(db);

  const provider = new OpenAICompatibleProvider({
    name: config.provider.name,
    baseUrl: config.provider.baseUrl,
    apiKey: config.provider.apiKey,
    defaultModel: config.provider.defaultModel,
  });

  const dispatcher = createDispatcher([...activeTools]);

  let mcp: McpRuntime | null = null;
  try {
    mcp = await assembleMcpRuntime(config.workdir);
    if (mcp.tools.length > 0) {
      for (const tool of mcp.tools) {
        dispatcher.register(tool);
      }
    }
  } catch {
    mcp = null;
  }

  const approvalQueue = new ApprovalQueue();
  const approver = new ApiApprover(approvalQueue);
  const approvalGate = createApprovalGate({ approver, throwOnDenial: true });

  const eventStream = createEventStream();

  const runManager = createRunManager({
    repos,
    eventStream,
    workdir: config.workdir,
    generateReportOnComplete: true,
  });

  const reasonLoop = createReasonLoop({
    provider,
    runManager,
    toolDispatcher: dispatcher,
    approvalGate,
    model: config.provider.defaultModel,
    providerName: config.provider.name,
  });

  return {
    repos,
    dispatcher,
    eventStream,
    approvalQueue,
    reasonLoop,
    runManager,
    config,
    mcp,
    swarmCount: 0,
  };
}
