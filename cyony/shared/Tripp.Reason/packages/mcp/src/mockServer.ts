/**
 * @tripp-reason/mcp — mock MCP server
 *
 * A lightweight mock MCP server that speaks JSON-RPC 2.0 over stdio.
 * Used for Phase 4B testing — no real MCP tools, no file mutations.
 *
 * Responds to:
 * - initialize      → server info
 * - tools/list      → mock tool definitions
 * - shutdown         → graceful exit
 * - unknown methods  → JSON-RPC error response
 *
 * Exposed mock tools:
 * - mock_echo       → safe/read-only (echoes input)
 * - mock_mutate     → destructive marker (requires approval)
 *
 * Run as: node packages/mcp/dist/mockServer.js
 */
import { createInterface } from "node:readline";
import type { JsonRpcRequest } from "./types.js";
import {
  createResponse,
  createErrorResponse,
  serializeMessage,
  parseMessage,
  isRequest,
  JSON_RPC_ERRORS,
} from "./jsonRpc.js";

// ── Mock Server Info ────────────────────────────────────────────
const SERVER_INFO = {
  name: "mock-echo",
  version: "1.0.0",
};

const MOCK_TOOLS = [
  {
    name: "mock_echo",
    description:
      "Echo back the input. Safe read-only tool for testing. Non-mutating.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to echo back",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "mock_mutate",
    description:
      "Mock destructive operation. Requires approval. Does not actually mutate files.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "Target resource to mutate (simulated)",
        },
        action: {
          type: "string",
          description: "Action: create, update, delete",
        },
      },
      required: ["target", "action"],
    },
  },
];

// ── Request Handlers ────────────────────────────────────────────
function handleInitialize(
  request: JsonRpcRequest,
): string {
  return serializeMessage(
    createResponse(request.id, {
      protocolVersion: "2024-11-05",
      serverInfo: SERVER_INFO,
      capabilities: {
        tools: {},
      },
    }),
  );
}

function handleToolsList(request: JsonRpcRequest): string {
  return serializeMessage(
    createResponse(request.id, {
      tools: MOCK_TOOLS,
    }),
  );
}

function handleToolCall(request: JsonRpcRequest): string {
  const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
  const toolName = params?.name;
  const args = params?.arguments ?? {};

  // Find the tool
  const tool = MOCK_TOOLS.find((t) => t.name === toolName);

  if (!tool) {
    return serializeMessage(
      createErrorResponse(
        request.id,
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        `Tool not found: ${toolName ?? "unknown"}`,
      ),
    );
  }

  // Execute mock tool logic
  switch (toolName) {
    case "mock_echo": {
      const message = typeof args["message"] === "string" ? args["message"] : String(args["message"] ?? "");
      return serializeMessage(
        createResponse(request.id, {
          echoed: message,
        }),
      );
    }
    case "mock_mutate": {
      // Mock mutation — does NOT touch any real files
      const target = String(args["target"] ?? "unknown");
      const action = String(args["action"] ?? "unknown");
      return serializeMessage(
        createResponse(request.id, {
          accepted: true,
          target,
          action,
          note: "mock only; no real mutation performed",
        }),
      );
    }
    default:
      return serializeMessage(
        createErrorResponse(
          request.id,
          JSON_RPC_ERRORS.INTERNAL_ERROR,
          `Tool '${toolName}' has no mock implementation`,
        ),
      );
  }
}

function handleShutdown(request: JsonRpcRequest): string {
  return serializeMessage(createResponse(request.id, {}));
}

function handleMethodNotFound(request: JsonRpcRequest): string {
  return serializeMessage(
    createErrorResponse(
      request.id,
      JSON_RPC_ERRORS.METHOD_NOT_FOUND,
      `Method not found: ${request.method}`,
    ),
  );
}

// ── Message Processing ──────────────────────────────────────────
function processLine(line: string): string | null {
  try {
    const msg = parseMessage(line);
    if (!msg) return null;

    if (isRequest(msg)) {
      switch (msg.method) {
        case "initialize":
          return handleInitialize(msg);
        case "tools/list":
          return handleToolsList(msg);
        case "tools/call":
          return handleToolCall(msg);
        case "shutdown":
          return handleShutdown(msg);
        default:
          return handleMethodNotFound(msg);
      }
    }

    // Notifications: acknowledge silently. `initialized` is a common one.
    return null;
  } catch (err) {
    // Malformed JSON — return parse error if we can extract an id
    const errorMsg =
      err instanceof Error ? err.message : "Parse error";
    return serializeMessage(
      createErrorResponse(null!, JSON_RPC_ERRORS.PARSE_ERROR, errorMsg),
    );
  }
}

// ── Main ────────────────────────────────────────────────────────
/**
 * Run the mock server as a standalone process.
 * Reads line-delimited JSON-RPC from stdin, writes responses to stdout.
 * Exits when stdin closes or shutdown is received.
 */
export function runMockServer(): void {
  const rl = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  let shuttingDown = false;

  rl.on("line", (line: string) => {
    if (shuttingDown) return;

    // Handle shutdown: write response and close stdin to trigger exit
    if (line.includes('"shutdown"')) {
      shuttingDown = true;
    }

    const response = processLine(line);
    if (response) {
      process.stdout.write(response);
    }

    if (shuttingDown) {
      rl.close();
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });

  // Handle unexpected errors gracefully
  process.on("uncaughtException", (err: Error) => {
    process.stderr.write(
      `Mock MCP server error: ${err.message}\n`,
    );
    process.exit(1);
  });
}

// When run directly (not imported), start the server
// Check if this is the main module by comparing argv
const isMainModule =
  process.argv[1]?.includes("mockServer") ?? false;

if (isMainModule) {
  runMockServer();
}
