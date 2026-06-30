import { z } from "zod";
import { spawn } from "node:child_process";
import { toolError, executionError } from "./errors.js";
import { validateCommand, resolveCwd } from "./commandSafety.js";
/**
 * shell — Approval-gated bounded command execution (Phase 2D)
 *
 * Safety rules:
 * - requiresApproval: true (ApprovalGate must approve before dispatch)
 * - Allowlist-first strategy (only whitelisted commands)
 * - Denylist for dangerous commands (rm, curl, wget, etc.)
 * - No shell chaining (&&, ||, ;, |, backticks, $(), redirects)
 * - Workdir-bound cwd
 * - Timeout enforced (default 30s)
 * - Output capped (default 128KB per stream)
 * - No shell: true — spawn only with args arrays
 * - Controlled errors: no raw stack traces
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT = 128 * 1024; // 128KB
const ShellInputSchema = z.object({
    command: z.string().min(1, "command is required"),
    args: z.array(z.string()).optional().default([]),
    cwd: z.string().optional(),
    timeoutMs: z.number().int().positive().optional().default(DEFAULT_TIMEOUT_MS),
    maxOutputBytes: z.number().int().positive().optional().default(DEFAULT_MAX_OUTPUT),
});
export const shellTool = {
    name: "shell",
    description: "Execute a bounded command. Requires approval. Allowlist-only. No chaining. Workdir-bound. Timeout + output caps.",
    requiresApproval: true,
    inputSchema: ShellInputSchema,
    async execute(input, context) {
        const parsed = ShellInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { command, args, cwd: cwdInput, timeoutMs, maxOutputBytes } = parsed.data;
        // 1. Validate command safety
        const validation = validateCommand(command, args);
        if (!validation.safe) {
            return executionError("shell", validation.error);
        }
        // 2. Resolve cwd
        const cwdResult = resolveCwd(cwdInput, context.workdir);
        if (!cwdResult.safe) {
            return executionError("shell", cwdResult.error);
        }
        const cwd = cwdResult.cwd;
        // 3. Execute via spawn (no shell: true)
        const startTime = Date.now();
        let stdout = "";
        let stderr = "";
        let stdoutTruncated = false;
        let stderrTruncated = false;
        let timedOut = false;
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                cwd,
                timeout: timeoutMs,
                stdio: ["ignore", "pipe", "pipe"],
                shell: false, // NEVER shell
            });
            child.stdout?.on("data", (data) => {
                if (stdout.length < maxOutputBytes) {
                    const chunk = data.toString("utf-8");
                    stdout += chunk;
                    if (stdout.length > maxOutputBytes) {
                        stdout = stdout.slice(0, maxOutputBytes);
                        stdoutTruncated = true;
                    }
                }
                else {
                    stdoutTruncated = true;
                }
            });
            child.stderr?.on("data", (data) => {
                if (stderr.length < maxOutputBytes) {
                    const chunk = data.toString("utf-8");
                    stderr += chunk;
                    if (stderr.length > maxOutputBytes) {
                        stderr = stderr.slice(0, maxOutputBytes);
                        stderrTruncated = true;
                    }
                }
                else {
                    stderrTruncated = true;
                }
            });
            child.on("error", (err) => {
                const durationMs = Date.now() - startTime;
                resolve(executionError("shell", `Failed to spawn: ${err.message}`));
            });
            child.on("close", (code, signal) => {
                const durationMs = Date.now() - startTime;
                // Check if timed out (signal is SIGTERM from timeout, or code === null with signal)
                if (signal === "SIGTERM" && durationMs >= timeoutMs - 100) {
                    timedOut = true;
                }
                const output = {
                    command,
                    args,
                    cwd,
                    exitCode: code,
                    ...(signal ? { signal } : {}),
                    stdout,
                    stderr: stderr.slice(0, 1024), // limit stderr in output
                    stdoutTruncated,
                    stderrTruncated,
                    durationMs,
                    timedOut,
                };
                if (timedOut) {
                    resolve({
                        status: "error",
                        output,
                        error: `Command timed out after ${timeoutMs}ms`,
                    });
                }
                else {
                    resolve({
                        status: "ok",
                        output,
                    });
                }
            });
        });
    },
};
//# sourceMappingURL=shell.js.map