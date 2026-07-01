/**
 * @tripp-reason/mcp — MCP-specific type definitions
 *
 * These types define the MCP bridge's internal data shapes.
 * Cross-package contracts (Tool, ToolContext, etc.) are imported from shared.
 */
import type { RiskLevel } from "@tripp-reason/shared";

// ── MCP Registry Types ─────────────────────────────────────────────
export interface McpRiskProfile {
  defaultRisk: RiskLevel;
  toolRiskOverrides?: Record<string, RiskLevel>;
}

export interface McpServerConfig {
  id: string;
  displayName: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled?: boolean;
  riskProfile?: McpRiskProfile;
  startupTimeoutMs?: number;
  toolTimeoutMs?: number;
  allowedTools?: string[];
  deniedTools?: string[];
  maxOutputBytes?: number;
}

// ── MCP Tool Discovery ──────────────────────────────────────────────
export interface McpToolInfo {
  /** Server this tool belongs to (e.g. "mock") */
  serverId: string;
  /** Original tool name from the MCP server (e.g. "mock_echo") */
  toolName: string;
  /** Namespaced name: mcp.<serverId>.<toolName> */
  namespacedName: string;
  /** Tool description from the MCP server */
  description: string;
  /** Raw JSON Schema from the MCP server (for later Zod conversion) */
  rawSchema?: Record<string, unknown>;
  /** Risk classification */
  riskLevel: RiskLevel;
  /** Default approval decision */
  requiresApproval: boolean;
}

// ── JSON-RPC 2.0 Types ──────────────────────────────────────────────
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: JsonRpcErrorObject;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcResponse
  | JsonRpcNotification;

// ── MCP Protocol Response Shapes ────────────────────────────────────
export interface McpInitializeResult {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities: {
    tools?: Record<string, unknown>;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolsListResult {
  tools: McpToolDefinition[];
}

// ── MCP Client / Transport ──────────────────────────────────────────
export interface McpClientOptions {
  config: McpServerConfig;
  /** Override startup timeout (default: 10s) */
  startupTimeoutMs?: number;
  /** Override tool call timeout (default: 30s) */
  toolTimeoutMs?: number;
}
