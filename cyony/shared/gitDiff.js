import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveSafePath } from "./pathSafety.js";
import { toolError, executionError } from "./errors.js";
/**
 * git_diff — Read-only git diff tool
 *
 * Runs controlled `git diff` commands in the resolved workdir.
 * Defaults to --stat (safe summary). Full diff (statOnly=false) requires
 * a path to be specified for scoping.
 *
 * Safety:
 * - Strict read-only commands only (git diff / git diff --cached)
 * - No shell string execution (execFile, no shell: true)
 * - No shell chaining
 * - cwd always within workdir boundary
 * - path filtered through pathSafety if provided
 * - Output capped (default 64KB)
 * - Timeout enforced (10s)
 * - Controlled errors: no raw stack traces
 */
const execFileAsync = promisify(execFile);
const DEFAULT_MAX_BYTES = 64 * 1024; // 64KB
const DEFAULT_TIMEOUT_MS = 10_000;
const GitDiffInputSchema = z.object({
    path: z.string().optional(),
    staged: z.boolean().optional().default(false),
    statOnly: z.boolean().optional().default(true),
    maxBytes: z.number().int().positive().optional().default(DEFAULT_MAX_BYTES),
});
/**
 * Build the args array deterministically — no string concatenation.
 * Only the exact shapes below ever reach execFile.
 */
function buildArgs(opts) {
    const args = ["diff"];
    if (opts.staged) {
        args.push("--cached");
    }
    if (opts.statOnly) {
        args.push("--stat");
    }
    // Path separator + safe path (must be last)
    if (opts.gitPath) {
        args.push("--");
        args.push(opts.gitPath);
    }
    return args;
}
export const gitDiffTool = {
    name: "git_diff",
    description: "Read-only git diff: returns --stat summary by default (set statOnly=false for full diff with a path, no approval required).",
    requiresApproval: false,
    inputSchema: GitDiffInputSchema,
    async execute(input, context) {
        const parsed = GitDiffInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { path, staged, statOnly, maxBytes } = parsed.data;
        // Resolve cwd: always workdir root (git operations are repo-wide)
        // If a path filter is provided, resolve it against workdir for safety.
        let gitPath;
        if (path) {
            const pathResult = resolveSafePath(path, context.workdir);
            if (!pathResult.safe || !pathResult.resolvedPath) {
                return toolError([
                    `Path '${path}' is outside workdir or unsafe: ${pathResult.error}`,
                    `workdir: ${context.workdir}`,
                ].join("\n"));
            }
            // git diff -- expects a repo-relative path, not absolute.
            // Compute relative to workdir.
            const normalized = pathResult.resolvedPath.replace(/\/+$/, "");
            const wd = context.workdir.replace(/\/+$/, "");
            if (normalized === wd) {
                gitPath = undefined; // path is workdir root, no filter needed
            }
            else if (normalized.startsWith(wd + "/")) {
                gitPath = normalized.slice(wd.length + 1);
            }
            else {
                return toolError(`Path '${path}' resolved outside workdir: ${normalized}`);
            }
        }
        const args = buildArgs({ staged, statOnly, gitPath });
        const cwd = context.workdir;
        try {
            const { stdout, stderr } = await execFileAsync("git", args, {
                cwd,
                timeout: DEFAULT_TIMEOUT_MS,
                maxBuffer: maxBytes,
                killSignal: "SIGKILL",
            });
            // Suppress non-fatal stderr but note if present
            if (stderr && stderr.trim().length > 0) {
                // e.g. "warning: LF will be replaced by CRLF..."
                // Continue — not a hard failure.
            }
            const raw = stdout;
            const truncated = raw.length >= maxBytes;
            const output = {
                staged,
                statOnly,
                ...(gitPath !== undefined ? { path: gitPath } : {}),
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
            if (e.code === "ENOENT") {
                return executionError("git_diff", "git executable not found on PATH");
            }
            if (e.killed || e.signal === "SIGKILL" || e.code === "ERR_CHILD_PROCESS_EXEC_TIMEOUT") {
                return executionError("git_diff", `Timed out after ${DEFAULT_TIMEOUT_MS}ms`);
            }
            const exitCode = typeof e.code === "number" ? e.code : -1;
            const stderrSnippet = (e.stderr ?? "").trim().slice(0, 256);
            if (exitCode !== 0 && /not a git repository/i.test(stderrSnippet)) {
                return executionError("git_diff", `Not a git repository: ${cwd}`);
            }
            return executionError("git_diff", `git exited with code ${exitCode}: ${stderrSnippet || "(no stderr)"}`);
        }
    },
};
//# sourceMappingURL=gitDiff.js.map