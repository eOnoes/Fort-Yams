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

export class McpServerRegistry {
  private readonly servers = new Map<string, McpServerConfig>();

  /**
   * Register a server configuration.
   * Throws if a server with the same ID already exists.
   */
  register(config: McpServerConfig): void {
    if (this.servers.has(config.id)) {
      throw new Error(
        `MCP server '${config.id}' is already registered`,
      );
    }
    this.servers.set(config.id, config);
  }

  /**
   * Get a server configuration by ID.
   * Returns undefined if not found.
   */
  get(id: string): McpServerConfig | undefined {
    return this.servers.get(id);
  }

  /**
   * List all registered servers (enabled and disabled).
   */
  list(): McpServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * List only enabled servers.
   */
  listEnabled(): McpServerConfig[] {
    return this.list().filter((s) => s.enabled !== false);
  }

  /**
   * Check if a server is registered and enabled.
   */
  isEnabled(id: string): boolean {
    const server = this.servers.get(id);
    return server != null && server.enabled !== false;
  }

  /**
   * Remove a server from the registry.
   */
  unregister(id: string): boolean {
    return this.servers.delete(id);
  }

  /**
   * Number of registered servers.
   */
  get size(): number {
    return this.servers.size;
  }
}
