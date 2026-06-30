/**
 * @tripp-reason/swarm — ReasonLoop-backed worker
 *
 * Executes a single TaskPacket through ReasonLoop, producing a
 * structured ResultPacket. All provider/tool/approval dependencies
 * are injected — swarm does not instantiate concrete implementations.
 *
 * Phase 5E.
 */

import type {
  SubagentSpec,
  TaskPacket,
  ResultPacket,
} from "./types.js";
import type { ReasonLoop, ApprovalGate } from "@tripp-reason/core";
import type {
  ToolDispatcher,
  Approver,
  ApprovalRequest,
  ApprovalResult,
} from "@tripp-reason/shared";
import { buildWorkerPrompt, toReasonLoopPrompt } from "./workerPrompt.js";
import { createFilteredDispatcher } from "./toolFilter.js";
import { mapWorkerResult } from "./workerResultMapper.js";
import { SwarmValidationError } from "./workerErrors.js";
import { createTraceEvent, appendTraceEvent } from "@tripp-os/agent-bus";

// ── Worker Input ─────────────────────────────────────────────────────

export interface ReasonLoopWorkerInput {
  subagent: SubagentSpec;
  taskPacket: TaskPacket;
  /** Injected ReasonLoop instance (with provider wired) */
  reasonLoop: ReasonLoop;
  /** Optional tool dispatcher (wrapped with allow/deny filter) */
  toolDispatcher?: ToolDispatcher;
  /** Optional approval gate (wraps an Approver) */
  approvalGate?: ApprovalGate;
  /** Working directory for tool execution */
  workdir: string;
}

// ── Approval Gate Adapter ────────────────────────────────────────────

/**
 * Swarm-aware Approver that enforces task-level approval rules.
 * Wraps an underlying Approver (pooled from the swarm assembly).
 *
 * Rules:
 *  - If taskPacket.requiresApproval is false: auto-approve safe tools,
 *    block mutating/destructive tools.
 *  - If taskPacket.requiresApproval is true: delegate to underlying approver.
 *  - If no gate configured and requiresApproval is true: fail closed.
 */
export function createSwarmApprover(
  taskPacket: TaskPacket,
  innerApprover?: Approver,
): Approver {
  const requiresApproval = taskPacket.requiresApproval;

  return {
    async requestApproval(req: ApprovalRequest): Promise<ApprovalResult> {
      // No gate available + task requires approval → fail closed
      if (!innerApprover) {
        if (requiresApproval || req.riskLevel === "mutating" || req.riskLevel === "destructive") {
          return {
            approved: false,
            reason: `No ApprovalGate configured. Task "${taskPacket.title}" requires approval for: ${req.toolName}`,
          };
        }
        // Safe tools auto-pass when no gate
        return { approved: true };
      }
      return innerApprover.requestApproval(req);
    },
  };
}

// ── Worker Runner ────────────────────────────────────────────────────

/**
 * Run a single task packet through ReasonLoop.
 *
 * Flow:
 *  1. Build worker prompt
 *  2. Filter tools (if dispatcher provided)
 *  3. Assemble ReasonLoop (with filtered dispatcher + swarm approver)
 *  4. Run ReasonLoop
 *  5. Map result → ResultPacket
 */
export async function runReasonLoopWorker(
  input: ReasonLoopWorkerInput,
): Promise<ResultPacket> {
  const { subagent, taskPacket, reasonLoop, toolDispatcher, approvalGate, workdir } = input;

  // 1. Build prompt
  const promptParts = buildWorkerPrompt(subagent, taskPacket);
  const prompt = toReasonLoopPrompt(promptParts);

  // 2. Filter tools for this worker
  // NOTE: We don't currently re-create ReasonLoop with filtered tools.
  // ReasonLoop is already wired with provider/toolDispatcher/approvalGate.
  // The tool filtering happens at the swarm assembly level when the
  // filtered dispatcher is injected. For now, we document this expectation
  // and the caller is responsible for providing a pre-filtered dispatcher.
  // The createFilteredDispatcher helper is available for the assembly layer.

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  try {
    // Run with timeout enforcement
    const resultPromise = reasonLoop.run({
      prompt,
      title: taskPacket.title,
      workdir,
    });

    // Apply per-worker timeout
    let loopResult;
    if (taskPacket.timeoutMs > 0) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Worker timeout after ${taskPacket.timeoutMs}ms`));
        }, taskPacket.timeoutMs);
      });

      try {
        loopResult = await Promise.race([resultPromise, timeoutPromise]);
      } catch (err) {
        if (timedOut) {
          // Emit task_timeout trace event (best-effort, never blocks)
          try {
            await appendTraceEvent(
              createTraceEvent({
                eventType: "task_timeout" as any,
                severity: "error",
                actorType: "system",
                packetId: taskPacket.id,
                subagentId: subagent.id,
                summary: `Worker timeout after ${taskPacket.timeoutMs}ms for task "${taskPacket.title}"`,
                details: {
                  timeoutMs: taskPacket.timeoutMs,
                  role: taskPacket.role,
                },
              }),
              workdir,
            );
          } catch {
            // Trace emission is best-effort — never block timeout handling
          }

          // Timeout — return partial result
          return mapWorkerResult({
            taskId: taskPacket.id,
            role: taskPacket.role,
            loopResult: {
              sessionId: "",
              runId: "",
              status: "failed",
              assistantMessage: "",
            },
            timedOut: true,
            timeoutMs: taskPacket.timeoutMs,
          });
        }
        throw err;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } else {
      loopResult = await resultPromise;
    }

    // 5. Map result
    return mapWorkerResult({
      taskId: taskPacket.id,
      role: taskPacket.role,
      loopResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Distinguish timeout from other errors
    if (timedOut || message.includes("timeout")) {
      return mapWorkerResult({
        taskId: taskPacket.id,
        role: taskPacket.role,
        loopResult: {
          sessionId: "",
          runId: "",
          status: "failed",
          assistantMessage: "",
        },
        timedOut: true,
        timeoutMs: taskPacket.timeoutMs,
      });
    }

    // Unexpected error → fail
    return {
      taskId: taskPacket.id,
      role: taskPacket.role,
      status: "fail",
      summary: `Worker execution error: ${message}`,
      findings: [{
        severity: "critical",
        message: `ReasonLoop execution failed: ${message}`,
        source: "reason-loop-worker",
      }],
      filesTouched: [],
      toolCalls: [],
      proposedChanges: [],
      validation: `Error: ${message}`,
      risks: [{
        level: "high",
        description: `Worker crashed: ${message}`,
        mitigation: "Investigate error and re-delegate task.",
      }],
      nextRecommendation: "Investigate crash and re-delegate.",
    };
  }
}

/**
 * Convenience: run a worker with pre-filtered tool dispatcher.
 *
 * Creates a filtered dispatcher from the TaskPacket's allow/deny lists
 * and passes it to runReasonLoopWorker via the assembly layer.
 *
 * NOTE: In Phase 5E, ReasonLoop is created once with a dispatcher.
 * Tool filtering happens here by passing the filtered tools as context
 * in the prompt (the worker prompt already encodes allowed/forbidden tools).
 * The actual dispatch blocking requires assembly-level injection of a
 * FilteredToolDispatcher into ReasonLoop, which is the server/CLI
 * assembly layer's responsibility in Phase 5F.
 */
export function getFilteredToolList(
  taskPacket: TaskPacket,
  dispatcher: ToolDispatcher,
): string[] {
  const allTools = dispatcher.listTools();
  const { filterTools } = require("./toolFilter.js");
  const filtered = filterTools(
    allTools,
    taskPacket.allowedTools,
    taskPacket.forbiddenTools,
  );
  return filtered.map((t: { name: string }) => t.name);
}
