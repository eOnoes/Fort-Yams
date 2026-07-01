/**
 * @tripp-reason/core — barrel export
 *
 * Public API surface for the core package:
 * - createReasonLoop — main orchestration loop (Phase 1F)
 * - createRunManager — run lifecycle orchestrator
 * - createEventStream — in-process event pub/sub
 * - createApprovalGate — risk-based approval routing
 * - generateReport — standalone report generator
 * - Error classes for typed catches
 * - Utility helpers (createId, nowIso)
 *
 * Dependencies:
 * - @tripp-reason/shared (all contracts and schemas)
 * - @tripp-reason/store (persistence layer)
 */

// ── Factories ───────────────────────────────────────────────────────
export { createReasonLoop } from "./reasonLoop.js";
export type {
  ReasonLoop,
  ReasonLoopOptions,
  ReasonLoopInput,
  ReasonLoopResult,
} from "./reasonLoop.js";

export { createRunManager } from "./runManager.js";
export type { RunManager, RunManagerOptions } from "./runManager.js";

export { createEventStream } from "./eventStream.js";
export type { EventStream, EventSubscriber } from "./eventStream.js";

export { createApprovalGate } from "./approvalGate.js";
export type { ApprovalGate, ApprovalGateOptions } from "./approvalGate.js";

export { generateReport } from "./reportGenerator.js";

// ── Errors ──────────────────────────────────────────────────────────
export {
  TrippCoreError,
  ApprovalDeniedError,
  RunFailedError,
  ReportGenerationError,
} from "./errors.js";

// ── Utilities ───────────────────────────────────────────────────────
export { createId } from "./ids.js";
export { nowIso } from "./time.js";
