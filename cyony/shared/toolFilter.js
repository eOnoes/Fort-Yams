/**
 * @tripp-reason/swarm — tool filter
 *
 * Wraps a ToolDispatcher with allowlist/denylist filtering per TaskPacket.
 * Phase 5E. No modification to packages/tools.
 */
// ── Filter Helpers ───────────────────────────────────────────────────
/**
 * Match a tool name against an allowlist or denylist.
 * Supports MCP namespaced names (mcp.<server>.<tool>) and plain names.
 */
function toolMatches(name, list) {
    return list.some((entry) => {
        // Exact match
        if (entry === name)
            return true;
        // Namespace prefix match: "mcp.*" matches all MCP tools
        if (entry === "mcp.*" && name.startsWith("mcp."))
            return true;
        // Glob suffix: "mcp.mock.*" matches "mcp.mock.echo", "mcp.mock.mutate"
        if (entry.endsWith(".*")) {
            const prefix = entry.slice(0, -2);
            if (name.startsWith(prefix + "."))
                return true;
        }
        return false;
    });
}
/**
 * Filter a list of tools by allowedTools and forbiddenTools.
 * If allowedTools is undefined, all tools are allowed (subject to forbidden).
 * forbiddenTools takes priority over allowedTools.
 */
export function filterTools(tools, allowedTools, forbiddenTools) {
    return tools.filter((tool) => {
        const name = tool.name;
        // Forbidden overrides everything
        if (forbiddenTools && forbiddenTools.length > 0) {
            if (toolMatches(name, forbiddenTools))
                return false;
        }
        // Check allowlist (if defined)
        if (allowedTools && allowedTools.length > 0) {
            if (!toolMatches(name, allowedTools))
                return false;
        }
        return true;
    });
}
/**
 * Create a filtered dispatcher wrapping an existing ToolDispatcher.
 *
 * @param inner - The real ToolDispatcher to delegate to.
 * @param allowedTools - Tools to allow (undefined = all).
 * @param forbiddenTools - Tools to block (priority over allowlist).
 */
export function createFilteredDispatcher(inner, allowedTools, forbiddenTools) {
    const allTools = inner.listTools();
    const filteredTools = filterTools(allTools, allowedTools, forbiddenTools);
    // Build a map of allowed tool names for fast dispatch check
    const allowedNameSet = new Set(filteredTools.map((t) => t.name));
    async function dispatch(toolName, input, context) {
        if (!allowedNameSet.has(toolName)) {
            return {
                status: "error",
                output: null,
                error: `Tool "${toolName}" is not in the worker's allowed tool set. ` +
                    `Allowed: [${filteredTools.map((t) => t.name).join(", ")}]`,
            };
        }
        return inner.dispatch(toolName, input, context);
    }
    function listTools() {
        return [...filteredTools];
    }
    return {
        inner,
        filteredTools,
        dispatch,
        listTools,
    };
}
//# sourceMappingURL=toolFilter.js.map