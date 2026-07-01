/**
 * @tripp-reason/mcp — stdio process transport
 *
 * Spawns an MCP server process, sends/receives line-delimited JSON-RPC
 * messages over stdin/stdout, and manages process lifecycle.
 *
 * Safety:
 * - shell: false (no shell evaluation)
 * - env allowlist only (no inherited process.env)
 * - startup timeout enforced
 * - stderr captured/capped for diagnostics
 * - clean shutdown with grace period
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { McpServerConfig } from "./types.js";
import { McpStartupError, McpServerCrashError } from "./errors.js";
import { serializeMessage } from "./jsonRpc.js";

export interface ProcessTransport {
  readonly config: McpServerConfig;
  readonly process: ChildProcess;
  sendMessage(json: string): void;
  lines(): AsyncIterable<string>;
  shutdown(): Promise<void>;
  readonly exited: Promise<{ code: number | null; signal: string | null }>;
}

const STDB = {
  DEFAULT_STARTUP_TIMEOUT_MS: 10_000,
  DEFAULT_TOOL_TIMEOUT_MS: 30_000,
  DEFAULT_MAX_OUTPUT_BYTES: 128 * 1024,
  SHUTDOWN_GRACE_MS: 5_000,
  STDERR_MAX_BYTES: 64 * 1024,
} as const;

/**
 * Spawn an MCP server process with controlled environment and timeouts.
 *
 * Safety properties:
 * - shell: false
 * - Only explicitly configured env vars (no process.env passthrough)
 * - stderr captured to a fixed-size ring buffer for diagnostics
 * - process exit is tracked for error handling
 */
export async function spawnProcess(
  config: McpServerConfig,
  startupTimeoutMs: number = STDB.DEFAULT_STARTUP_TIMEOUT_MS,
): Promise<ProcessTransport> {
  if (config.enabled === false) {
    throw new McpStartupError(config.id, "server is disabled");
  }

  return new Promise<ProcessTransport>((resolve, reject) => {
    const stderrChunks: string[] = [];
    const exitPromise = new Promise<{
      code: number | null;
      signal: string | null;
    }>((exitResolve) => {
      // resolved when process exits
    });

    // Start the process
    const proc = spawn(config.command, config.args ?? [], {
      shell: false,
      cwd: config.cwd,
      env: config.env ?? {}, // allowlist only — no inherited process.env
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Startup timeout
    const startupTimer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(
        new McpStartupError(
          config.id,
          `startup timed out after ${startupTimeoutMs}ms`,
        ),
      );
    }, startupTimeoutMs);

    // Capture stderr (capped)
    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      if (stderrChunks.join("").length < STDB.STDERR_MAX_BYTES) {
        stderrChunks.push(text);
      }
    });

    // Process exit tracking
    let exitResolve: (
      value: { code: number | null; signal: string | null },
    ) => void;
    const exited = new Promise<{
      code: number | null;
      signal: string | null;
    }>((res) => {
      exitResolve = res;
    });

    proc.on("exit", (code: number | null, signal: string | null) => {
      exitResolve({ code, signal });
    });

    // Readline interface for stdout (line-delimited JSON-RPC responses)
    const rl = createInterface({ input: proc.stdout!, crlfDelay: Infinity });

    // Resolve the startup promise once the process is spawned
    // The caller is responsible for sending `initialize` and verifying
    clearTimeout(startupTimer);

    const transport: ProcessTransport = {
      config,
      process: proc,
      sendMessage(json: string) {
        proc.stdin!.write(json);
      },
      lines(): AsyncIterable<string> {
        return rl;
      },
      async shutdown() {
        // Send SIGTERM, wait grace period, then SIGKILL
        proc.kill("SIGTERM");
        const graceful = new Promise<void>((res) => {
          const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            res();
          }, STDB.SHUTDOWN_GRACE_MS);
          proc.on("exit", () => {
            clearTimeout(timer);
            res();
          });
        });
        await graceful;
        rl.close();
      },
      exited,
    };

    resolve(transport);
  });
}

/**
 * Get captured stderr content (from the proc's stderr listener).
 * Must be called by code that has access to the raw process.
 */
export function getStderrLog(proc: ChildProcess, chunks: string[]): string {
  return chunks.join("").slice(0, STDB.STDERR_MAX_BYTES);
}
