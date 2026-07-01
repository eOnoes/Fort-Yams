/**
 * @tripp-reason/mcp — MCP Runtime Assembly
 *
 * Loads MCP config, starts enabled servers, discovers tools,
 * creates McpToolAdapters, and returns tools + status + shutdown.
 *
 * Partial failure handling: if one server fails, record the error
 * and continue loading others. Don't crash the whole runtime.
 */
import type { Tool } from "@tripp-reason/shared";
import type { McpServerConfig } from "./types.js";
import { loadMcpConfig, resolveMcpConfigPath, type McpConfig } from "./config.js";
import { McpClient } from "./client.js";
import { createMcpToolAdapters } from "./toolAdapter.js";

// ── Status types ─────────────────────────────────────────────────────

export interface McpServerStatus {
  id: string;
  displayName: string;
  enabled: boolean;
  connected: boolean;
  toolCount: number;
  toolNames: string[];
  error?: string;
}

export interface McpRuntimeStatus {
  enabled: boolean;
  configPath: string;
  serverCount: number;
  connectedCount: number;
  totalToolCount: number;
  servers: McpServerStatus[];
}

// ── Runtime type ─────────────────────────────────────────────────────

export interface McpRuntime {
  /** All MCP tools (for dispatcher registration). */
  tools: Tool[];
  /** Connected clients (for lifecycle management). */
  clients: McpClient[];
  /** Runtime status for /status endpoint. */
  status: McpRuntimeStatus;
  /** Graceful shutdown of all MCP servers. */
  shutdown(): Promise<void>;
}

// ── Assembly ─────────────────────────────────────────────────────────

/**
 * Assemble the MCP runtime from config.
 *
 * Loads config, starts enabled servers, discovers tools,
 * creates adapters, returns runtime with tools + status + shutdown.
 *
 * Partial failure: if one server fails, its status reflects the error
 * but other servers continue loading.
 *
 * @param workdir — working directory for config resolution
 * @param explicitConfigPath — optional CLI/server --mcp-config flag
 * @returns McpRuntime with tools, clients, status, and shutdown
 */
export async function assembleMcpRuntime(
  workdir: string,
  explicitConfigPath?: string,
): Promise<McpRuntime> {
  const configPath = resolveMcpConfigPath(workdir, explicitConfigPath);

  // Load config
  let mcpConfig: McpConfig | null;
  try {
    mcpConfig = loadMcpConfig(workdir, explicitConfigPath);
  } catch (err) {
    // Invalid config → MCP disabled with error
    return disabledRuntime(configPath, `Config error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!mcpConfig || mcpConfig.servers.length === 0) {
    return disabledRuntime(configPath);
  }

  // Filter enabled servers
  const enabledServers = mcpConfig.servers.filter((s) => s.enabled !== false);

  if (enabledServers.length === 0) {
    return disabledRuntime(configPath);
  }

  // Start servers, discover tools
  const allClients: McpClient[] = [];
  const allTools: Tool[] = [];
  const serverStatuses: McpServerStatus[] = [];

  for (const srv of mcpConfig.servers) {
    if (srv.enabled === false) {
      serverStatuses.push({
        id: srv.id,
        displayName: srv.displayName,
        enabled: false,
        connected: false,
        toolCount: 0,
        toolNames: [],
      });
      continue;
    }

    const status: McpServerStatus = {
      id: srv.id,
      displayName: srv.displayName,
      enabled: true,
      connected: false,
      toolCount: 0,
      toolNames: [],
    };

    try {
      const client = new McpClient({ config: srv });
      await client.connect(srv);

      const discovered = await client.discoverTools();

      // Filter by allowed/denied lists
      const filtered = filterTools(discovered, srv);

      const adapters = createMcpToolAdapters(client, filtered);

      status.connected = true;
      status.toolCount = adapters.length;
      status.toolNames = adapters.map((a) => a.name);

      allClients.push(client);
      allTools.push(...adapters);
    } catch (err) {
      status.error = err instanceof Error ? err.message : String(err);
      // Continue loading other servers
    }

    serverStatuses.push(status);
  }

  return {
    tools: allTools,
    clients: allClients,
    status: buildStatus(configPath, mcpConfig.servers, serverStatuses, allTools.length),
    async shutdown() {
      const results = await Promise.allSettled(
        allClients.map((c) => c.disconnect().catch(() => {})),
      );
      // All settled — no unhandled rejections
      void results;
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function disabledRuntime(configPath: string, error?: string): McpRuntime {
  const status: McpRuntimeStatus = {
    enabled: false,
    configPath,
    serverCount: 0,
    connectedCount: 0,
    totalToolCount: 0,
    servers: [],
  };
  if (error) {
    (status as unknown as Record<string, unknown>)["error"] = error;
  }
  return {
    tools: [],
    clients: [],
    status,
    async shutdown() {},
  };
}

function buildStatus(
  configPath: string,
  allServers: McpServerConfig[],
  statuses: McpServerStatus[],
  totalTools: number,
): McpRuntimeStatus {
  return {
    enabled: totalTools > 0 || statuses.some((s) => s.connected),
    configPath,
    serverCount: allServers.length,
    connectedCount: statuses.filter((s) => s.connected).length,
    totalToolCount: totalTools,
    servers: statuses,
  };
}

function filterTools(
  discovered: import("./types.js").McpToolInfo[],
  config: McpServerConfig,
): import("./types.js").McpToolInfo[] {
  let result = discovered;

  if (config.allowedTools && config.allowedTools.length > 0) {
    const allowed = new Set(config.allowedTools);
    result = result.filter((t) => allowed.has(t.toolName));
  }

  if (config.deniedTools && config.deniedTools.length > 0) {
    const denied = new Set(config.deniedTools);
    result = result.filter((t) => !denied.has(t.toolName));
  }

  return result;
}
