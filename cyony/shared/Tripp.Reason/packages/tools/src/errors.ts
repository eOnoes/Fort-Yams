/**
 * Tool Error Helpers
 *
 * Controlled error responses for tool execution.
 * Tools return ToolResult with status="error" rather than throwing.
 */

export interface ToolError {
  status: "error";
  output: null;
  error: string;
}

export function toolError(message: string): ToolError {
  return {
    status: "error",
    output: null,
    error: message
  };
}

export function pathError(path: string, reason: string): ToolError {
  return toolError(`Path error [${path}]: ${reason}`);
}

export function executionError(toolName: string, reason: string): ToolError {
  return toolError(`[${toolName}] ${reason}`);
}
