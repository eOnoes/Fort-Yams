export class McpServerRegistry {
    servers = new Map();
    /**
     * Register a server configuration.
     * Throws if a server with the same ID already exists.
     */
    register(config) {
        if (this.servers.has(config.id)) {
            throw new Error(`MCP server '${config.id}' is already registered`);
        }
        this.servers.set(config.id, config);
    }
    /**
     * Get a server configuration by ID.
     * Returns undefined if not found.
     */
    get(id) {
        return this.servers.get(id);
    }
    /**
     * List all registered servers (enabled and disabled).
     */
    list() {
        return Array.from(this.servers.values());
    }
    /**
     * List only enabled servers.
     */
    listEnabled() {
        return this.list().filter((s) => s.enabled !== false);
    }
    /**
     * Check if a server is registered and enabled.
     */
    isEnabled(id) {
        const server = this.servers.get(id);
        return server != null && server.enabled !== false;
    }
    /**
     * Remove a server from the registry.
     */
    unregister(id) {
        return this.servers.delete(id);
    }
    /**
     * Number of registered servers.
     */
    get size() {
        return this.servers.size;
    }
}
//# sourceMappingURL=registry.js.map