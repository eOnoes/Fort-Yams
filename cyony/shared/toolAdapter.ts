/**
 * @tripp-reason/mcp — MCP tool adapter
 *
 * Wraps a discovered MCP tool as a standard Tripp Tool implementation
 * from @tripp-reason/shared. This is the bridge between MCP protocol
 * tools and the ReasonLoop's Tool interface.
 *
 * Phase 4C: adapter + factory. Dispatcher integration in Phase 4D.
 */
import type { z } from "zod";
import type {
  Tool,
  ToolContext,
  ToolResult,
} from "@tripp-reason/shared";
import type { McpToolInfo } from "./types.js";
import type { McpClient } from "./client.js";
import { convertJsonSchemaToZod } from "./schemaConversion.js";
import { riskToRequiresApproval } from "./toolRisk.js";
import { McpRemoteError, McpTimeoutError, McpProtocolError } from "./errors.js";

/**
 * MCP tool adapter implementing the shared Tool interface.
 *
 * Each adapter wraps a single MCP tool from a connected server.
 * Execution goes through McpClient.callTool() which sends JSON-RPC
 * tools/call to the MCP server process.
 */
export class McpToolAdapter implements Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<unknown>;
  readonly requiresApproval: boolean;

  private readonly serverId: string;
  private readonly toolName: string;
  private readonly client: McpClient;
  private readonly schemaWarnings: string[];

  constructor(info: McpToolInfo, client: McpClient) {
    this.name = info.namespacedName;
    this.description = info.description;
    this.requiresApproval = info.requiresApproval;
    this.serverId = info.serverId;
    this.toolName = info.toolName;
    this.client = client;

    // Convert JSON Schema to Zod for input validation
    const result = convertJsonSchemaToZod(info.rawSchema);
    this.inputSchema = result.schema;
    this.schemaWarnings = result.warnings;
  }

  /**
   * Execute the MCP tool through the client.
   *
   * Flow:
   * 1. Input is already validated by ToolDispatcher.dispatch() before this is called
   * 2. Send tools/call JSON-RPC request via McpClient
   * 3. Map response to ToolResult
   * 4. Never throws raw errors — always returns ToolResult
   */
  async execute(input: unknown, _context: ToolContext): Promise<ToolResult> {
    try {
      // Input validation happens upstream in ToolDispatcher — we trust it here
      const rawResult = await this.client.callTool(
        this.toolName,
        input,
      );

      return {
        status: "ok",
        output: rawResult,
        error: undefined,
      };
    } catch (err) {
      // Controlled error mapping — no raw stack traces
      const errorMessage = this.mapError(err);

      return {
        status: "error",
        output: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Get schema conversion warnings (for diagnostics).
   */
  getWarnings(): string[] {
    return [...this.schemaWarnings];
  }

  // ── Private helpers ────────────────────────────────────────────────

  private mapError(err: unknown): string {
    if (err instanceof McpRemoteError) {
      return `MCP tool '${this.name}' remote error: ${err.message}`;
    }
    if (err instanceof McpTimeoutError) {
      return `MCP tool '${this.name}' timed out`;
    }
    if (err instanceof McpProtocolError) {
      return `MCP tool '${this.name}' protocol error: ${err.message}`;
    }
    if (err instanceof Error) {
      return `MCP tool '${this.name}' error: ${err.message}`;
    }
    return `MCP tool '${this.name}' unknown error`;
  }
}

/**
 * Create McpToolAdapter instances from discovered tool metadata.
 *
 * Rules:
 * - Names stay namespaced (mcp.<serverId>.<toolName>)
 * - Duplicate names are rejected
 * - Disabled server tools are not included (caller must filter)
 *
 * Returns an array of Tool instances ready for ToolDispatcher registration
 * (in Phase 4D).
 */
export function createMcpToolAdapters(
  client: McpClient,
  discoveredTools: McpToolInfo[],
): Tool[] {
  const seenNames = new Set<string>();
  const adapters: Tool[] = [];

  for (const info of discoveredTools) {
    if (seenNames.has(info.namespacedName)) {
      // Duplicate — skip with warning (don't crash)
      continue;
    }

    seenNames.add(info.namespacedName);
    adapters.push(new McpToolAdapter(info, client));
  }

  return adapters;
}
