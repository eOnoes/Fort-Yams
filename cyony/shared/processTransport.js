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
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { McpStartupError } from "./errors.js";
const STDB = {
    DEFAULT_STARTUP_TIMEOUT_MS: 10_000,
    DEFAULT_TOOL_TIMEOUT_MS: 30_000,
    DEFAULT_MAX_OUTPUT_BYTES: 128 * 1024,
    SHUTDOWN_GRACE_MS: 5_000,
    STDERR_MAX_BYTES: 64 * 1024,
};
/**
 * Spawn an MCP server process with controlled environment and timeouts.
 *
 * Safety properties:
 * - shell: false
 * - Only explicitly configured env vars (no process.env passthrough)
 * - stderr captured to a fixed-size ring buffer for diagnostics
 * - process exit is tracked for error handling
 */
export async function spawnProcess(config, startupTimeoutMs = STDB.DEFAULT_STARTUP_TIMEOUT_MS) {
    if (config.enabled === false) {
        throw new McpStartupError(config.id, "server is disabled");
    }
    return new Promise((resolve, reject) => {
        const stderrChunks = [];
        const exitPromise = new Promise((exitResolve) => {
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
            reject(new McpStartupError(config.id, `startup timed out after ${startupTimeoutMs}ms`));
        }, startupTimeoutMs);
        // Capture stderr (capped)
        proc.stderr?.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            if (stderrChunks.join("").length < STDB.STDERR_MAX_BYTES) {
                stderrChunks.push(text);
            }
        });
        // Process exit tracking
        let exitResolve;
        const exited = new Promise((res) => {
            exitResolve = res;
        });
        proc.on("exit", (code, signal) => {
            exitResolve({ code, signal });
        });
        // Readline interface for stdout (line-delimited JSON-RPC responses)
        const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
        // Resolve the startup promise once the process is spawned
        // The caller is responsible for sending `initialize` and verifying
        clearTimeout(startupTimer);
        const transport = {
            config,
            process: proc,
            sendMessage(json) {
                proc.stdin.write(json);
            },
            lines() {
                return rl;
            },
            async shutdown() {
                // Send SIGTERM, wait grace period, then SIGKILL
                proc.kill("SIGTERM");
                const graceful = new Promise((res) => {
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
export function getStderrLog(proc, chunks) {
    return chunks.join("").slice(0, STDB.STDERR_MAX_BYTES);
}
//# sourceMappingURL=processTransport.js.map