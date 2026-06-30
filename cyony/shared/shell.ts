import { z } from "zod";
import { spawn } from "node:child_process";
import type { Tool, ToolContext, ToolResult } from "@tripp-reason/shared";
import { toolError, executionError } from "./errors.js";
import { validateCommand, resolveCwd } from "./commandSafety.js";
import { createTraceEvent, appendTraceEvent } from "@tripp-os/agent-bus";

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

interface ShellOutput {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal?: string;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  durationMs: number;
  timedOut: boolean;
}

export const shellTool: Tool = {
  name: "shell",
  description:
    "Execute a bounded command. Requires approval. Allowlist-only. No chaining. Workdir-bound. Timeout + output caps.",
  requiresApproval: true,
  inputSchema: ShellInputSchema,

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = ShellInputSchema.safeParse(input);
    if (!parsed.success) {
      return toolError(`Invalid input: ${parsed.error.message}`);
    }

    const { command, args, cwd: cwdInput, timeoutMs, maxOutputBytes } = parsed.data;

    // 1. Validate command safety
    const validation = validateCommand(command, args);
    if (!validation.safe) {
      return executionError("shell", validation.error!);
    }

    // 2. Resolve cwd
    const cwdResult = resolveCwd(cwdInput, context.workdir);
    if (!cwdResult.safe) {
      return executionError("shell", cwdResult.error!);
    }
    const cwd = cwdResult.cwd!;

    // 3. Execute via spawn (no shell: true)
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    const emitWorkdir = context.workdir;

    return new Promise<ToolResult>((resolve) => {
      const child = spawn(command, args, {
        cwd,
        timeout: timeoutMs,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false, // NEVER shell
      });

      child.stdout?.on("data", (data: Buffer) => {
        if (stdout.length < maxOutputBytes) {
          const chunk = data.toString("utf-8");
          stdout += chunk;
          if (stdout.length > maxOutputBytes) {
            stdout = stdout.slice(0, maxOutputBytes);
            stdoutTruncated = true;
          }
        } else {
          stdoutTruncated = true;
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        if (stderr.length < maxOutputBytes) {
          const chunk = data.toString("utf-8");
          stderr += chunk;
          if (stderr.length > maxOutputBytes) {
            stderr = stderr.slice(0, maxOutputBytes);
            stderrTruncated = true;
          }
        } else {
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

        const output: ShellOutput = {
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
          // Emit tool_timeout trace event (fire-and-forget, best-effort)
          appendTraceEvent(
            createTraceEvent({
              eventType: "tool_timeout" as any,
              severity: "warning",
              actorType: "approvalgate",
              toolNames: [command],
              summary: `Tool "${command}" timed out after ${timeoutMs}ms`,
              details: { timeoutMs, command, exitCode: code, signal },
            }),
            emitWorkdir,
          ).catch(() => { /* best-effort */ });

          resolve({
            status: "error",
            output,
            error: `Command timed out after ${timeoutMs}ms`,
          });
        } else {
          resolve({
            status: "ok",
            output,
          });
        }
      });
    });
  },
};
