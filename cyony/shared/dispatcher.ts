import type { Tool, ToolContext, ToolDispatcher, ToolResult } from "@tripp-reason/shared";
import { toolError } from "./errors.js";

/**
 * ToolDispatcher Implementation
 *
 * Routes tool calls to registered tools by name.
 * Validates input against tool schemas before execution.
 *
 * Design:
 * - Map of toolName → Tool instance
 * - listTools() returns all registered tools
 * - dispatch() validates input schema, then executes
 * - Does NOT perform approval checks (that's ReasonLoop's job)
 * - Returns controlled error for unknown tools
 */

export class ToolDispatcherImpl implements ToolDispatcher {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool with the dispatcher.
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * List all registered tools.
   */
  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Dispatch a tool call by name.
   * Validates input against tool schema, then executes.
   *
   * Does NOT check approval - that's ReasonLoop's responsibility.
   */
  async dispatch(
    toolName: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return toolError(`Unknown tool: ${toolName}`);
    }

    // Validate input against tool schema
    const parseResult = tool.inputSchema.safeParse(input);
    if (!parseResult.success) {
      return toolError(
        `Invalid input for ${toolName}: ${parseResult.error.message}`
      );
    }

    // Execute tool
    try {
      return await tool.execute(parseResult.data, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return toolError(`Tool execution failed: ${message}`);
    }
  }
}

/**
 * Create a ToolDispatcher with optional pre-registered tools.
 */
export function createDispatcher(tools?: Tool[]): ToolDispatcherImpl {
  const dispatcher = new ToolDispatcherImpl();
  if (tools) {
    for (const tool of tools) {
      dispatcher.register(tool);
    }
  }
  return dispatcher;
}
