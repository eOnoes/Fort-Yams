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
import { type ChildProcess } from "node:child_process";
import type { McpServerConfig } from "./types.js";
export interface ProcessTransport {
    readonly config: McpServerConfig;
    readonly process: ChildProcess;
    sendMessage(json: string): void;
    lines(): AsyncIterable<string>;
    shutdown(): Promise<void>;
    readonly exited: Promise<{
        code: number | null;
        signal: string | null;
    }>;
}
/**
 * Spawn an MCP server process with controlled environment and timeouts.
 *
 * Safety properties:
 * - shell: false
 * - Only explicitly configured env vars (no process.env passthrough)
 * - stderr captured to a fixed-size ring buffer for diagnostics
 * - process exit is tracked for error handling
 */
export declare function spawnProcess(config: McpServerConfig, startupTimeoutMs?: number): Promise<ProcessTransport>;
/**
 * Get captured stderr content (from the proc's stderr listener).
 * Must be called by code that has access to the raw process.
 */
export declare function getStderrLog(proc: ChildProcess, chunks: string[]): string;
//# sourceMappingURL=processTransport.d.ts.map