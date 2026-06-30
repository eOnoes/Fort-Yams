/**
 * @tripp-reason/mcp — local server registry
 *
 * Manages MCP server configurations and tracks which servers are
 * loaded, active, or disabled.
 *
 * Phase 4B: registry shape only. Hardcoded entries accepted for testing.
 * Phase 4E: config file loading (.tripp/mcp.config.json).
 */
import type { McpServerConfig } from "./types.js";
export declare class McpServerRegistry {
    private readonly servers;
    /**
     * Register a server configuration.
     * Throws if a server with the same ID already exists.
     */
    register(config: McpServerConfig): void;
    /**
     * Get a server configuration by ID.
     * Returns undefined if not found.
     */
    get(id: string): McpServerConfig | undefined;
    /**
     * List all registered servers (enabled and disabled).
     */
    list(): McpServerConfig[];
    /**
     * List only enabled servers.
     */
    listEnabled(): McpServerConfig[];
    /**
     * Check if a server is registered and enabled.
     */
    isEnabled(id: string): boolean;
    /**
     * Remove a server from the registry.
     */
    unregister(id: string): boolean;
    /**
     * Number of registered servers.
     */
    get size(): number;
}
//# sourceMappingURL=registry.d.ts.map