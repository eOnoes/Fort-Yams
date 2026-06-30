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
import type { Tool, ToolContext, ToolResult } from "@tripp-reason/shared";
import type { McpToolInfo } from "./types.js";
import type { McpClient } from "./client.js";
/**
 * MCP tool adapter implementing the shared Tool interface.
 *
 * Each adapter wraps a single MCP tool from a connected server.
 * Execution goes through McpClient.callTool() which sends JSON-RPC
 * tools/call to the MCP server process.
 */
export declare class McpToolAdapter implements Tool {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: z.ZodType<unknown>;
    readonly requiresApproval: boolean;
    private readonly serverId;
    private readonly toolName;
    private readonly client;
    private readonly schemaWarnings;
    constructor(info: McpToolInfo, client: McpClient);
    /**
     * Execute the MCP tool through the client.
     *
     * Flow:
     * 1. Input is already validated by ToolDispatcher.dispatch() before this is called
     * 2. Send tools/call JSON-RPC request via McpClient
     * 3. Map response to ToolResult
     * 4. Never throws raw errors — always returns ToolResult
     */
    execute(input: unknown, _context: ToolContext): Promise<ToolResult>;
    /**
     * Get schema conversion warnings (for diagnostics).
     */
    getWarnings(): string[];
    private mapError;
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
export declare function createMcpToolAdapters(client: McpClient, discoveredTools: McpToolInfo[]): Tool[];
//# sourceMappingURL=toolAdapter.d.ts.map