/**
 * @tripp-reason/mcp — MCP client
 *
 * Connects to an MCP server over stdio, sends initialize + tools/list,
 * and returns discovered tool metadata with namespaced names.
 *
 * Phase 4B: discovery only. No tool execution (callTool stub only).
 * Phase 4C+: McpToolAdapter + ToolDispatcher integration.
 */
import type {
  McpServerConfig,
  McpToolInfo,
  McpInitializeResult,
  McpToolsListResult,
  JsonRpcResponse,
  McpClientOptions,
} from "./types.js";
import {
  McpStartupError,
  McpProtocolError,
  McpTimeoutError,
  McpRemoteError,
  McpServerCrashError,
} from "./errors.js";
import {
  createRequest,
  createNotification,
  serializeMessage,
  parseMessage,
  isResponse,
} from "./jsonRpc.js";
import { spawnProcess, type ProcessTransport } from "./processTransport.js";

const DEFAULT_STARTUP_MS = 10_000;
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

/**
 * MCP client that connects to a local MCP server over stdio.
 *
 * Lifecycle:
 *   1. connect() — spawns process, sends initialize, sends initialized notification
 *   2. discoverTools() — sends tools/list, returns namespaced tool metadata
 *   3. disconnect() — sends shutdown, kills process
 */
export class McpClient {
  private transport: ProcessTransport | null = null;
  private serverId: string;
  private displayName: string;
  private startTimeoutMs: number;
  private toolTimeoutMs: number;
  private pendingRequests = new Map<
    number | string,
    {
      resolve: (response: JsonRpcResponse) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  // Accumulated stderr chunks (for diagnostics)
  private stderrChunks: string[] = [];

  constructor(opts: McpClientOptions) {
    this.serverId = opts.config.id;
    this.displayName = opts.config.displayName;
    this.startTimeoutMs = opts.startupTimeoutMs ?? DEFAULT_STARTUP_MS;
    this.toolTimeoutMs = opts.toolTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
  }

  /**
   * Connect to the MCP server.
   * Spawns the process, sends initialize request, and sends initialized notification.
   */
  async connect(config: McpServerConfig): Promise<void> {
    // Spawn and start the process
    this.transport = await spawnProcess(config, this.startTimeoutMs);

    // Start reading responses from stdout
    this.startReading();

    // Track stderr
    this.transport.process.stderr?.on("data", (chunk: Buffer) => {
      this.stderrChunks.push(chunk.toString("utf-8"));
    });

    // Send initialize
    await this.sendInitialize();

    // Send initialized notification (no response expected)
    this.sendNotification("notifications/initialized");
  }

  /**
   * Discover tools from the connected MCP server.
   * Returns tool metadata with namespaced names: mcp.<serverId>.<toolName>
   */
  async discoverTools(): Promise<McpToolInfo[]> {
    if (!this.transport) {
      throw new McpProtocolError(this.serverId, "client not connected");
    }

    const response = await this.sendRequest(
      "tools/list",
      undefined,
      this.toolTimeoutMs,
    );

    if (response.error) {
      throw new McpRemoteError(
        this.serverId,
        response.error.code,
        response.error.message,
      );
    }

    const result = response.result as McpToolsListResult;
    if (!result || !Array.isArray(result.tools)) {
      throw new McpProtocolError(
        this.serverId,
        "tools/list returned invalid result shape",
      );
    }

    return result.tools.map((tool) => this.toolToInfo(tool));
  }

  /**
   * Call a tool on the connected MCP server.
   *
   * Sends JSON-RPC tools/call with the tool name and arguments.
   * Returns the raw result from the server.
   * Throws McpRemoteError on remote errors, McpTimeoutError on timeout.
   *
   * Phase 4C: added for McpToolAdapter execution.
   */
  async callTool(
    toolName: string,
    input: unknown,
  ): Promise<unknown> {
    if (!this.transport) {
      throw new McpProtocolError(this.serverId, "client not connected");
    }

    const response = await this.sendRequest(
      "tools/call",
      {
        name: toolName,
        arguments: input,
      },
      this.toolTimeoutMs,
    );

    if (response.error) {
      throw new McpRemoteError(
        this.serverId,
        response.error.code,
        response.error.message,
      );
    }

    return response.result;
  }

  /**
   * Disconnect and clean up the MCP server process.
   */
  async disconnect(): Promise<void> {
    if (!this.transport) return;

    try {
      // Try graceful shutdown
      await this.sendRequest("shutdown", undefined, 5_000).catch(() => {});
      this.sendNotification("exit");
    } catch {
      // Process may already be dead
    }

    await this.transport.shutdown();
    this.transport = null;
    this.pendingRequests.clear();
  }

  /**
   * Check if the client is connected.
   */
  get isConnected(): boolean {
    return this.transport !== null;
  }

  // ── Private methods ─────────────────────────────────────────────

  private toolToInfo(tool: {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
  }): McpToolInfo {
    const namespacedName = `mcp.${this.serverId}.${tool.name}`;

    // Risk classification based on tool description hints
    const riskLevel = this.classifyRisk(tool.name, tool.description);

    return {
      serverId: this.serverId,
      toolName: tool.name,
      namespacedName,
      description: tool.description.slice(0, 500), // cap at 500 chars per contract
      rawSchema: tool.inputSchema,
      riskLevel,
      requiresApproval: riskLevel !== "safe",
    };
  }

  private classifyRisk(
    toolName: string,
    description: string,
  ): "safe" | "mutating" | "destructive" {
    const lower = `${toolName} ${description}`.toLowerCase();

    // Explicit destructive markers
    if (
      /\bdestructive\b|\bdelete\b|\bremove\b|\boverwrite\b/.test(lower)
    ) {
      return "destructive";
    }

    // Explicit safe/read-only markers
    if (
      /\bread.only\b|\breadonly\b|\bsafe\b|\bnon.mutating\b|\becho\b/i.test(
        lower,
      )
    ) {
      return "safe";
    }

    // Write-like patterns → mutating
    if (
      /\bwrite\b|\bmutate\b|\bcreate\b|\bedit\b|\bupdate\b|\bpatch\b/.test(
        lower,
      )
    ) {
      return "mutating";
    }

    // Default: unknown → mutating (requires approval — safety first)
    return "mutating";
  }

  private async sendInitialize(): Promise<void> {
    const response = await this.sendRequest(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "tripp-reason",
          version: "0.1.0",
        },
      },
      this.startTimeoutMs,
    );

    if (response.error) {
      throw new McpStartupError(
        this.serverId,
        `initialize failed: ${response.error.message}`,
      );
    }

    const initResult = response.result as McpInitializeResult | undefined;
    if (!initResult?.serverInfo) {
      throw new McpProtocolError(
        this.serverId,
        "initialize response missing serverInfo",
      );
    }
  }

  private sendNotification(
    method: string,
    params?: Record<string, unknown>,
  ): void {
    if (!this.transport) return;
    const msg = createNotification(method, params);
    this.transport.sendMessage(serializeMessage(msg));
  }

  private sendRequest(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs: number = this.toolTimeoutMs,
  ): Promise<JsonRpcResponse> {
    if (!this.transport) {
      throw new McpProtocolError(this.serverId, "client not connected");
    }

    const request = createRequest(method, params);

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(
          new McpTimeoutError(
            this.serverId,
            method,
            timeoutMs,
          ),
        );
      }, timeoutMs);

      this.pendingRequests.set(request.id, { resolve, reject, timer });
      this.transport!.sendMessage(serializeMessage(request));
    });
  }

  /**
   * Start the background read loop that processes responses from stdout.
   * Runs asynchronously — responses are routed to pending request promises.
   */
  private startReading(): void {
    if (!this.transport) return;

    const readLoop = async () => {
      try {
        for await (const line of this.transport!.lines()) {
          try {
            const msg = parseMessage(line);
            if (!msg) continue;

            if (isResponse(msg)) {
              const pending = this.pendingRequests.get(msg.id);
              if (pending) {
                clearTimeout(pending.timer);
                this.pendingRequests.delete(msg.id);
                pending.resolve(msg);
              }
            }
            // Notifications and requests from server to client are ignored in Phase 4B
          } catch {
            // Skip malformed lines silently (stderr captured for diagnostics)
          }
        }
      } catch {
        // Readline closed
      }
    };

    // Fire and forget — responses resolve pending promises
    readLoop().catch(() => {});

    // Also watch for process exit
    this.transport.process.on("exit", (code: number | null, signal: string | null) => {
      if (code !== 0 && code !== null) {
        // Reject all pending requests
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(
            new McpServerCrashError(this.serverId, code, signal),
          );
        }
        this.pendingRequests.clear();
      }
    });
  }
}
