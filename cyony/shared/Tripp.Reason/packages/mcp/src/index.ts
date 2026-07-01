/**
 * @tripp-reason/mcp — barrel exports
 *
 * Public API surface for the MCP bridge package.
 * Cross-package contracts (Tool, ToolContext, etc.) are NOT re-exported —
 * consumers import those from @tripp-reason/shared.
 */

// ── Types ────────────────────────────────────────────────────────────
export type {
  McpServerConfig,
  McpRiskProfile,
  McpToolInfo,
  McpToolDefinition,
  McpInitializeResult,
  McpToolsListResult,
  McpClientOptions,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcErrorObject,
  JsonRpcMessage,
} from "./types.js";

// ── Errors ───────────────────────────────────────────────────────────
export {
  McpError,
  McpStartupError,
  McpTimeoutError,
  McpProtocolError,
  McpServerDisabledError,
  McpServerCrashError,
  McpRemoteError,
} from "./errors.js";

// ── JSON-RPC ─────────────────────────────────────────────────────────
export {
  createRequest,
  createNotification,
  createResponse,
  createErrorResponse,
  serializeMessage,
  parseMessage,
  nextRequestId,
  isRequest,
  isResponse,
  isNotification,
  JSON_RPC_ERRORS,
} from "./jsonRpc.js";

// ── Transport ────────────────────────────────────────────────────────
export { spawnProcess } from "./processTransport.js";
export type { ProcessTransport } from "./processTransport.js";

// ── Registry ─────────────────────────────────────────────────────────
export { McpServerRegistry } from "./registry.js";

// ── Client ───────────────────────────────────────────────────────────
export { McpClient } from "./client.js";

// ── Mock Server ──────────────────────────────────────────────────────
export { runMockServer } from "./mockServer.js";

// ── Schema Conversion ────────────────────────────────────────────────
export { convertJsonSchemaToZod } from "./schemaConversion.js";
export type { ConversionResult } from "./schemaConversion.js";

// ── Tool Risk ────────────────────────────────────────────────────────
export { riskToRequiresApproval, riskLabel } from "./toolRisk.js";

// ── Tool Adapter ─────────────────────────────────────────────────────
export { McpToolAdapter, createMcpToolAdapters } from "./toolAdapter.js";

// ── Config ───────────────────────────────────────────────────────────
export { loadMcpConfig, resolveMcpConfigPath } from "./config.js";
export type { McpConfig } from "./config.js";

// ── Runtime ──────────────────────────────────────────────────────────
export { assembleMcpRuntime } from "./runtime.js";
export type { McpRuntime, McpRuntimeStatus, McpServerStatus } from "./runtime.js";
