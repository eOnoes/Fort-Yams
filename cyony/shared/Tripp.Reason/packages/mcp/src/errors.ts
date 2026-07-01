/**
 * @tripp-reason/mcp — controlled error types
 *
 * All MCP errors are typed and controlled. No raw stack traces escape.
 */

export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly serverId?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "McpError";
  }
}

/** Server process failed to start or respond to initialize within timeout. */
export class McpStartupError extends McpError {
  constructor(serverId: string, detail?: string) {
    super(
      `MCP server '${serverId}' failed to start: ${detail ?? "unknown error"}`,
      "MCP_STARTUP_FAILED",
      serverId,
    );
    this.name = "McpStartupError";
  }
}

/** Tool call or request exceeded timeout. */
export class McpTimeoutError extends McpError {
  constructor(serverId: string, toolName?: string, timeoutMs?: number) {
    const scope = toolName
      ? `Tool call '${toolName}' on server '${serverId}'`
      : `Request to server '${serverId}'`;
    super(
      `${scope} timed out after ${timeoutMs ?? "unknown"}ms`,
      "MCP_TIMEOUT",
      serverId,
    );
    this.name = "McpTimeoutError";
  }
}

/** JSON-RPC protocol error (malformed message, unexpected response). */
export class McpProtocolError extends McpError {
  constructor(serverId: string, detail: string) {
    super(
      `MCP protocol error from '${serverId}': ${detail}`,
      "MCP_PROTOCOL_ERROR",
      serverId,
    );
    this.name = "McpProtocolError";
  }
}

/** Attempted to start a disabled server. */
export class McpServerDisabledError extends McpError {
  constructor(serverId: string) {
    super(
      `MCP server '${serverId}' is disabled and cannot be started`,
      "MCP_SERVER_DISABLED",
      serverId,
    );
    this.name = "McpServerDisabledError";
  }
}

/** MCP server process crashed or exited unexpectedly. */
export class McpServerCrashError extends McpError {
  constructor(serverId: string, exitCode: number | null, signal: string | null) {
    const reason = signal
      ? `killed by signal ${signal}`
      : `exited with code ${exitCode}`;
    super(
      `MCP server '${serverId}' ${reason}`,
      "MCP_SERVER_CRASHED",
      serverId,
    );
    this.name = "McpServerCrashError";
  }
}

/** MCP server returned a JSON-RPC error. */
export class McpRemoteError extends McpError {
  constructor(
    serverId: string,
    public readonly rpcCode: number,
    message: string,
  ) {
    super(
      `MCP server '${serverId}' returned error (${rpcCode}): ${message}`,
      "MCP_REMOTE_ERROR",
      serverId,
    );
    this.name = "McpRemoteError";
  }
}
