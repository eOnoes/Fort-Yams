// ── Constructors ────────────────────────────────────────────────────
let _nextId = 1;
export function nextRequestId() {
    return _nextId++;
}
export function createRequest(method, params, id) {
    return {
        jsonrpc: "2.0",
        id: id ?? nextRequestId(),
        method,
        params,
    };
}
export function createNotification(method, params) {
    return {
        jsonrpc: "2.0",
        method,
        params,
    };
}
export function createResponse(id, result) {
    return {
        jsonrpc: "2.0",
        id,
        result,
    };
}
export function createErrorResponse(id, code, message, data) {
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
export function serializeMessage(msg) {
    return JSON.stringify(msg) + "\n";
}
/**
 * Parse a single line of JSON into a JsonRpcMessage.
 * Returns null if the line is empty or whitespace-only.
 * Throws if JSON is invalid or not a JSON-RPC 2.0 message.
 */
export function parseMessage(line) {
    const trimmed = line.trim();
    if (trimmed.length === 0)
        return null;
    const obj = JSON.parse(trimmed);
    if (obj.jsonrpc !== "2.0") {
        throw new Error(`Invalid JSON-RPC version: ${String(obj.jsonrpc)}`);
    }
    return obj;
}
// ── Type Guards ─────────────────────────────────────────────────────
export function isRequest(msg) {
    return "method" in msg && "id" in msg;
}
export function isResponse(msg) {
    return !("method" in msg) && "id" in msg;
}
export function isNotification(msg) {
    return "method" in msg && !("id" in msg);
}
// ── Standard JSON-RPC Error Codes ───────────────────────────────────
export const JSON_RPC_ERRORS = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};
//# sourceMappingURL=jsonRpc.js.map