/**
 * @tripp-reason/swarm — fake workers
 *
 * Deterministic role-specific fake workers for Phase 5C testing.
 * No providers, no tools, no file I/O. Each returns a valid ResultPacket.
 *
 * Simulation markers in taskPacket.objective:
 * - "[simulate-timeout]" → returns PARTIAL with timeout finding
 * - "[simulate-fail]" → returns FAIL with critical finding
 */

import type { SubagentSpec, TaskPacket, ResultPacket, Finding, ProposedChange, RiskNote } from "./types.js";
import type { WorkerExecutionContext } from "./workerRunner.js";

// ── Role handlers ────────────────────────────────────────────────────

interface FakeWorkerFn {
  (subagent: SubagentSpec, task: TaskPacket, ctx: WorkerExecutionContext): ResultPacket;
}

const roleHandlers: Record<string, FakeWorkerFn> = {};

function register(role: string, fn: FakeWorkerFn) {
  roleHandlers[role] = fn;
}

// ── Planner ──────────────────────────────────────────────────────────
register("planner", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Planned decomposition for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake planner: task analyzed and decomposed into sub-tasks.",
    source: "fake-planner",
  });
  r.validation = "Fake planner — deterministic output. No real planning executed.";
  r.nextRecommendation = "Proceed to worker execution phase.";
  return r;
});

// ── Researcher ───────────────────────────────────────────────────────
register("researcher", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Research findings for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: `Fake researcher: found relevant information in scope "${task.scope}".`,
    source: "fake-researcher",
  });
  r.validation = "Fake researcher — deterministic output. No real search executed.";
  r.nextRecommendation = "Pass findings to coder for implementation.";
  return r;
});

// ── Coder ────────────────────────────────────────────────────────────
register("coder", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Code changes for: ${task.objective.slice(0, 100)}`;

  if (!isSimulated(ctx)) {
    r.proposedChanges.push({
      file: `${task.scope}/fake-implementation.ts`,
      diff: `// Fake coder: mock implementation for "${task.title}"\n// This is a deterministic fake — no real file written.`,
      reason: `Implement: ${task.objective.slice(0, 80)}`,
    });
  }

  r.validation = "Fake coder — deterministic output. No real files modified.";
  r.nextRecommendation = "Review changes and run tests.";
  r.filesTouched = [];
  return r;
});

// ── Reviewer ─────────────────────────────────────────────────────────
register("reviewer", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Code review for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake reviewer: code looks good, no issues found.",
    source: "fake-reviewer",
  });
  r.validation = "Fake reviewer — deterministic output. No real review executed.";
  r.nextRecommendation = "Approve changes and proceed to testing.";
  return r;
});

// ── Tester ───────────────────────────────────────────────────────────
register("tester", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Test results for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake tester: all tests passed (deterministic).",
    source: "fake-tester",
  });
  r.validation = "Fake tester — deterministic output. No real tests executed.";
  r.nextRecommendation = "Tests pass. Ready for merge.";
  return r;
});

// ── Merger ───────────────────────────────────────────────────────────
register("merger", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Merge consolidation for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake merger: results consolidated, no conflicts detected.",
    source: "fake-merger",
  });
  r.validation = "Fake merger — deterministic output. No real merge executed.";
  r.nextRecommendation = "Submit for warden review.";
  return r;
});

// ── Reporter ─────────────────────────────────────────────────────────
register("reporter", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Swarm report for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake reporter: swarm run summary generated.",
    source: "fake-reporter",
  });
  r.validation = "Fake reporter — deterministic output. No real report generated.";
  r.nextRecommendation = "Deliver report to operator.";
  return r;
});

// ── Warden ───────────────────────────────────────────────────────────
register("warden", (_sub, task, ctx) => {
  const r = baseResult(task, ctx);
  r.summary = `Warden safety review for: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "info",
    message: "Fake warden: safety check passed. No violations detected.",
    source: "fake-warden",
  });
  r.validation = "Fake warden — deterministic output. No real safety review executed.";
  r.nextRecommendation = "Swarm run approved. Deliver final report.";
  return r;
});

// ── Shared helpers ───────────────────────────────────────────────────

function baseResult(task: TaskPacket, ctx: WorkerExecutionContext): ResultPacket {
  return {
    taskId: task.id,
    role: task.role,
    status: "pass",
    summary: "",
    findings: [],
    filesTouched: [],
    toolCalls: [],
    proposedChanges: [],
    validation: "",
    risks: [],
    nextRecommendation: "",
  };
}

function isSimulated(ctx: WorkerExecutionContext): boolean {
  return ctx.simulateTimeout === true || ctx.simulateFail === true;
}

function makeTimeoutResult(task: TaskPacket, ctx: WorkerExecutionContext): ResultPacket {
  const r = baseResult(task, ctx);
  r.status = "partial";
  r.summary = `Worker timed out on: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "warning",
    message: `Timeout after ${task.timeoutMs}ms. Partial results returned.`,
    source: "worker-runner",
  });
  r.risks.push({
    level: "medium",
    description: "Worker timeout — results may be incomplete.",
    mitigation: "Increase timeout or simplify task.",
  });
  r.validation = "Fake timeout — deterministic simulation.";
  r.nextRecommendation = "Retry with increased timeout or delegate to another worker.";
  return r;
}

function makeFailResult(task: TaskPacket, ctx: WorkerExecutionContext): ResultPacket {
  const r = baseResult(task, ctx);
  r.status = "fail";
  r.summary = `Worker failed on: ${task.objective.slice(0, 100)}`;
  r.findings.push({
    severity: "critical",
    message: "Simulated worker failure. Task could not be completed.",
    source: "worker-runner",
  });
  r.risks.push({
    level: "high",
    description: "Worker failure — task results unavailable.",
    mitigation: "Re-delegate task to a different worker or adjust scope.",
  });
  r.validation = "Fake failure — deterministic simulation.";
  r.nextRecommendation = "Investigate failure reason and re-delegate.";
  return r;
}

// ── Main entry point ─────────────────────────────────────────────────

/**
 * Run a deterministic fake worker.
 *
 * Simulation markers in taskPacket.objective:
 * - "[simulate-timeout]" → returns PARTIAL
 * - "[simulate-fail]" → returns FAIL
 * - ctx.simulateTimeout / ctx.simulateFail → same behavior
 */
export function runFakeWorker(
  subagent: SubagentSpec,
  task: TaskPacket,
  ctx: WorkerExecutionContext,
): ResultPacket {
  // Timeout / failure simulation takes priority
  const hasTimeoutMarker = task.objective.includes("[simulate-timeout]");
  const hasFailMarker = task.objective.includes("[simulate-fail]");

  if (ctx.simulateTimeout || hasTimeoutMarker) {
    return makeTimeoutResult(task, ctx);
  }
  if (ctx.simulateFail || hasFailMarker) {
    return makeFailResult(task, ctx);
  }

  // Route to role-specific handler
  const handler = roleHandlers[task.role];
  if (handler) {
    return handler(subagent, task, ctx);
  }

  // Unknown role — return generic pass result
  const r = baseResult(task, ctx);
  r.summary = `Executed task: ${task.title}`;
  r.validation = `Unknown role '${task.role}' — generic pass result.`;
  r.nextRecommendation = "Review task role assignment.";
  return r;
}
