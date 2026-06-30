/**
 * @tripp-reason/swarm — worker runner
 *
 * Executes a SubagentSpec + TaskPacket through a role-specific
 * fake or real (ReasonLoop-backed) worker, returning a ResultPacket.
 *
 * Phase 5C: fake workers only. No providers, tools, file I/O.
 * Phase 5E: ReasonLoop-backed real workers added.
 */
import type { WorkerRole, SubagentSpec, TaskPacket, ResultPacket } from "./types.js";
import type { ReasonLoop, ApprovalGate } from "@tripp-reason/core";
import type { ToolDispatcher } from "@tripp-reason/shared";
import { validateSubagentSpec, validateTaskPacket } from "./validation.js";
import {
  SwarmValidationError,
  SwarmRoleMismatchError,
} from "./workerErrors.js";
import { runFakeWorker } from "./fakeWorkers.js";
import { runReasonLoopWorker } from "./reasonLoopWorker.js";

// ── Worker Context ───────────────────────────────────────────────────

export interface WorkerExecutionContext {
  swarmId: string;
  startedAt: string;
  workdir: string;
  /** Phase 5C: must be true — real execution not yet implemented.
   *  Phase 5E: set false for ReasonLoop-backed execution. */
  fakeExecution: boolean;
  /** Simulate timeout for testing (fake workers only). */
  simulateTimeout?: boolean;
  /** Simulate failure for testing (fake workers only). */
  simulateFail?: boolean;
  /** Phase 5E: injected ReasonLoop for real execution. */
  reasonLoop?: ReasonLoop;
  /** Phase 5E: injected tool dispatcher for real execution. */
  toolDispatcher?: ToolDispatcher;
  /** Phase 5E: injected approval gate for real execution. */
  approvalGate?: ApprovalGate;
}

// ── Worker Runner ────────────────────────────────────────────────────

export interface WorkerRunner {
  role: WorkerRole;
  /** Execute a subagent against a task packet, returning a ResultPacket. */
  run(
    subagent: SubagentSpec,
    taskPacket: TaskPacket,
    context: WorkerExecutionContext,
  ): Promise<ResultPacket>;
}

// ── Implementation ───────────────────────────────────────────────────

/**
 * Run a worker (fake or real based on context).
 *
 * Phase 5C: all workers are fake. context.fakeExecution must be true.
 * Phase 5E: context.fakeExecution=false enables ReasonLoop-backed execution.
 *   Requires context.reasonLoop to be injected.
 */
export async function runWorker(
  subagent: SubagentSpec,
  taskPacket: TaskPacket,
  context: WorkerExecutionContext,
): Promise<ResultPacket> {
  // Validate inputs
  const specErr = validateSubagentSpec(subagent);
  if (specErr) {
    throw new SwarmValidationError(specErr, subagent.id, taskPacket.id);
  }

  const taskErr = validateTaskPacket(taskPacket);
  if (taskErr) {
    throw new SwarmValidationError(taskErr, subagent.id, taskPacket.id);
  }

  // Role must match
  if (subagent.role !== taskPacket.role) {
    throw new SwarmRoleMismatchError(
      subagent.id,
      subagent.role,
      taskPacket.role,
    );
  }

  // Phase 5C: fake execution
  if (context.fakeExecution) {
    return runFakeWorker(subagent, taskPacket, context);
  }

  // Phase 5E: ReasonLoop-backed execution
  const reasonLoop = context.reasonLoop;
  if (!reasonLoop) {
    throw new SwarmValidationError(
      "Real worker execution requires injected ReasonLoop (context.reasonLoop)",
      subagent.id,
      taskPacket.id,
    );
  }

  return runReasonLoopWorker({
    subagent,
    taskPacket,
    reasonLoop,
    toolDispatcher: context.toolDispatcher,
    approvalGate: context.approvalGate,
    workdir: context.workdir,
  });
}
