/**
 * @tripp-reason/mcp — lightweight JSON-RPC 2.0 message handling
 *
 * Implements only what the MCP bridge needs:
 * - request, response, notification types
 * - serialization/deserialization over line-delimited JSON
 * - type guards
 *
 * No heavy framework. No extra dependencies.
 */
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  JsonRpcErrorObject,
  JsonRpcMessage,
} from "./types.js";

// ── Constructors ────────────────────────────────────────────────────
let _nextId = 1;

export function nextRequestId(): number {
  return _nextId++;
}

export function createRequest(
  method: string,
  params?: Record<string, unknown>,
  id?: number | string,
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? nextRequestId(),
    method,
    params,
  };
}

export function createNotification(
  method: string,
  params?: Record<string, unknown>,
): JsonRpcNotification {
  return {
    jsonrpc: "2.0",
    method,
    params,
  };
}

export function createResponse(
  id: number | string,
  result: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

export function createErrorResponse(
  id: number | string,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, data },
  };
}

// ── Serialization ───────────────────────────────────────────────────
/**
 * Serialize a JSON-RPC message to a line-delimited JSON string.
 * Each message is a single line terminated by newline.
 */
export function serializeMessage(msg: JsonRpcMessage): string {
  return JSON.stringify(msg) + "\n";
}

/**
 * Parse a single line of JSON into a JsonRpcMessage.
 * Returns null if the line is empty or whitespace-only.
 * Throws if JSON is invalid or not a JSON-RPC 2.0 message.
 */
export function parseMessage(line: string): JsonRpcMessage | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  const obj = JSON.parse(trimmed) as Record<string, unknown>;

  if (obj.jsonrpc !== "2.0") {
    throw new Error(`Invalid JSON-RPC version: ${String(obj.jsonrpc)}`);
  }

  return obj as unknown as JsonRpcMessage;
}

// ── Type Guards ─────────────────────────────────────────────────────
export function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return "method" in msg && "id" in msg;
}

export function isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse {
  return !("method" in msg) && "id" in msg;
}

export function isNotification(
  msg: JsonRpcMessage,
): msg is JsonRpcNotification {
  return "method" in msg && !("id" in msg);
}

// ── Standard JSON-RPC Error Codes ───────────────────────────────────
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;
