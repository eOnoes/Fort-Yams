import { z } from "zod";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toolError, executionError } from "./errors.js";
import { validateCommand, resolveCwd } from "./commandSafety.js";
/**
 * run_tests — Approval-gated test runner (Phase 2D)
 *
 * Safety rules:
 * - requiresApproval: true
 * - Default command: pnpm test (if test script exists) or pnpm typecheck
 * - Same command safety as shell (allowlist, no chaining, no install)
 * - Workdir-bound
 * - Timeout enforced (default 120s)
 * - Output capped (default 128KB per stream)
 * - Returns passed boolean based on exitCode
 */
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT = 128 * 1024; // 128KB
const RunTestsInputSchema = z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional().default([]),
    cwd: z.string().optional(),
    timeoutMs: z.number().int().positive().optional().default(DEFAULT_TIMEOUT_MS),
    maxOutputBytes: z.number().int().positive().optional().default(DEFAULT_MAX_OUTPUT),
});
/**
 * Determine default test command by checking package.json for test script.
 */
async function getDefaultCommand(workdir) {
    try {
        const pkgPath = join(workdir, "package.json");
        const raw = await readFile(pkgPath, "utf-8");
        const pkg = JSON.parse(raw);
        // Check scripts
        if (pkg.scripts?.test && pkg.scripts.test !== "echo \"Error: no test specified\" && exit 1") {
            return { command: "pnpm", args: ["test"] };
        }
        if (pkg.scripts?.typecheck) {
            return { command: "pnpm", args: ["typecheck"] };
        }
        if (pkg.scripts?.build) {
            return { command: "pnpm", args: ["build"] };
        }
    }
    catch {
        // package.json not found or unparseable
    }
    // Ultimate fallback
    return { command: "pnpm", args: ["typecheck"] };
}
export const runTestsTool = {
    name: "run_tests",
    description: "Run test/typecheck commands. Requires approval. Auto-detects test command from package.json. Workdir-bound. Timeout + output caps.",
    requiresApproval: true,
    inputSchema: RunTestsInputSchema,
    async execute(input, context) {
        const parsed = RunTestsInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { command: inputCommand, args: inputArgs, cwd: cwdInput, timeoutMs, maxOutputBytes } = parsed.data;
        // 1. Determine command to run
        let command;
        let args;
        if (inputCommand) {
            // User provided explicit command — validate it
            command = inputCommand;
            args = inputArgs;
        }
        else {
            // Auto-detect from package.json
            const defaults = await getDefaultCommand(context.workdir);
            command = defaults.command;
            args = defaults.args;
        }
        // 2. Validate command safety
        const validation = validateCommand(command, args);
        if (!validation.safe) {
            return executionError("run_tests", validation.error);
        }
        // 3. Resolve cwd
        const cwdResult = resolveCwd(cwdInput, context.workdir);
        if (!cwdResult.safe) {
            return executionError("run_tests", cwdResult.error);
        }
        const cwd = cwdResult.cwd;
        // 4. Execute
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
                shell: false,
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
                resolve(executionError("run_tests", `Failed to spawn: ${err.message}`));
            });
            child.on("close", (code, signal) => {
                const durationMs = Date.now() - startTime;
                if (signal === "SIGTERM" && durationMs >= timeoutMs - 100) {
                    timedOut = true;
                }
                const passed = code === 0 && !timedOut;
                const output = {
                    command,
                    args,
                    cwd,
                    exitCode: code,
                    stdout,
                    stderr: stderr.slice(0, 2048),
                    stdoutTruncated,
                    stderrTruncated,
                    durationMs,
                    timedOut,
                    passed,
                };
                if (timedOut) {
                    resolve({
                        status: "error",
                        output,
                        error: `Test command timed out after ${timeoutMs}ms`,
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
//# sourceMappingURL=runTests.js.map