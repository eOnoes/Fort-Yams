import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveSafePath } from "./pathSafety.js";
import { toolError, executionError } from "./errors.js";
/**
 * git_status — Read-only git status tool
 *
 * Runs `git status --short --branch` in the resolved workdir.
 * No approval required (read-only).
 *
 * Safety:
 * - Strict read-only command: git status --short --branch
 * - No shell string execution (execFile, no shell: true)
 * - No shell chaining
 * - cwd always within workdir boundary
 * - Output capped (default 64KB)
 * - Timeout enforced (10s)
 * - Controlled errors: no raw stack traces
 */
const execFileAsync = promisify(execFile);
const DEFAULT_MAX_BYTES = 64 * 1024; // 64KB
const DEFAULT_TIMEOUT_MS = 10_000;
/** Allowed git commands — nothing else ever runs. */
const ALLOWED_STATUS_ARGS = ["status", "--short", "--branch"];
const GitStatusInputSchema = z.object({
    path: z.string().optional().default("."),
    maxBytes: z.number().int().positive().optional().default(DEFAULT_MAX_BYTES),
});
function parseGitStatusOutput(raw) {
    const lines = raw.split("\n").filter((l) => l.length > 0);
    let branchLine;
    const entries = [];
    for (const line of lines) {
        // Branch line is prefixed with "## " in --short --branch output
        if (line.startsWith("## ")) {
            branchLine = line;
        }
        else {
            entries.push(line);
        }
    }
    return { branchLine, entries };
}
export const gitStatusTool = {
    name: "git_status",
    description: "Read-only git status: returns branch info and file state summary (no approval required, read-only).",
    requiresApproval: false,
    inputSchema: GitStatusInputSchema,
    async execute(input, context) {
        const parsed = GitStatusInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { path, maxBytes } = parsed.data;
        // Resolve cwd: must be within workdir
        const cwdResult = resolveSafePath(path, context.workdir);
        if (!cwdResult.safe || !cwdResult.resolvedPath) {
            return toolError([
                `Path '${path}' is outside workdir or unsafe: ${cwdResult.error}`,
                `workdir: ${context.workdir}`,
            ].join("\n"));
        }
        const cwd = cwdResult.resolvedPath;
        // Execute git status --short --branch via execFile (no shell: true)
        try {
            const { stdout, stderr } = await execFileAsync("git", [...ALLOWED_STATUS_ARGS], {
                cwd,
                timeout: DEFAULT_TIMEOUT_MS,
                maxBuffer: maxBytes,
                killSignal: "SIGKILL",
            });
            if (stderr && stderr.trim().length > 0) {
                // Git may emit warnings to stderr even on success — surface truncated
                const warning = stderr.trim().slice(0, 512);
                // Continue but note the warning in output
            }
            const raw = stdout;
            const truncated = raw.length >= maxBytes;
            const { branchLine, entries } = parseGitStatusOutput(raw);
            const output = {
                ...(branchLine !== undefined ? { branchLine } : {}),
                entries,
                raw: truncated ? raw.slice(0, maxBytes) : raw,
                truncated,
                cwd,
            };
            return {
                status: "ok",
                output,
            };
        }
        catch (err) {
            const e = err;
            // Git executable not found
            if (e.code === "ENOENT") {
                return executionError("git_status", "git executable not found on PATH");
            }
            // Timeout / killed
            if (e.killed || e.signal === "SIGKILL" || e.code === "ERR_CHILD_PROCESS_EXEC_TIMEOUT") {
                return executionError("git_status", `Timed out after ${DEFAULT_TIMEOUT_MS}ms`);
            }
            // Non-zero exit: likely not a git repo or invalid cwd
            const exitCode = typeof e.code === "number" ? e.code : -1;
            const stderrSnippet = (e.stderr ?? "").trim().slice(0, 256);
            if (exitCode !== 0 && /not a git repository/i.test(stderrSnippet)) {
                return executionError("git_status", `Not a git repository: ${cwd}`);
            }
            return executionError("git_status", `git exited with code ${exitCode}: ${stderrSnippet || "(no stderr)"}`);
        }
    },
};
//# sourceMappingURL=gitStatus.js.map