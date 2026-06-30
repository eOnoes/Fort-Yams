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
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, JsonRpcMessage } from "./types.js";
export declare function nextRequestId(): number;
export declare function createRequest(method: string, params?: Record<string, unknown>, id?: number | string): JsonRpcRequest;
export declare function createNotification(method: string, params?: Record<string, unknown>): JsonRpcNotification;
export declare function createResponse(id: number | string, result: unknown): JsonRpcResponse;
export declare function createErrorResponse(id: number | string, code: number, message: string, data?: unknown): JsonRpcResponse;
/**
 * Serialize a JSON-RPC message to a line-delimited JSON string.
 * Each message is a single line terminated by newline.
 */
export declare function serializeMessage(msg: JsonRpcMessage): string;
/**
 * Parse a single line of JSON into a JsonRpcMessage.
 * Returns null if the line is empty or whitespace-only.
 * Throws if JSON is invalid or not a JSON-RPC 2.0 message.
 */
export declare function parseMessage(line: string): JsonRpcMessage | null;
export declare function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest;
export declare function isResponse(msg: JsonRpcMessage): msg is JsonRpcResponse;
export declare function isNotification(msg: JsonRpcMessage): msg is JsonRpcNotification;
export declare const JSON_RPC_ERRORS: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
};
//# sourceMappingURL=jsonRpc.d.ts.map