/**
 * @tripp-reason/swarm — barrel exports
 *
 * Public API surface for the swarm package.
 * Phase 5B: types, schemas, constants, validation only.
 * Phase 5C: worker runner + fake workers.
 * Phase 5D: orchestrator, planner, merger, conflict detector, warden, summary.
 * Phase 5E: ReasonLoop-backed worker execution, tool filter, prompt builder, result mapper.
 */

// ── Types ────────────────────────────────────────────────────────────
export {
  WORKER_ROLES,
  SWARM_MODES,
  MODEL_TIER_LABELS,
} from "./types.js";
export type {
  WorkerRole,
  SwarmMode,
  TaskStatus,
  ResultStatus,
  SwarmStatus,
  ConflictStatus,
  ModelTierLabel,
  TaskPacket,
  ResultPacket,
  Finding,
  ProposedChange,
  RiskNote,
  ToolCallSummary,
  WardenVerdict,
  WardenViolation,
  ConflictRecord,
  SwarmConfig,
  SwarmRunSummary,
  SubagentSpec,
  SubagentAssignment,
  CriticalPathMetrics,
  OrchestrationDecision,
  SwarmRunPlan,
} from "./types.js";

// ── Schemas ──────────────────────────────────────────────────────────
export {
  WorkerRoleSchema,
  SwarmModeSchema,
  ModelTierLabelSchema,
  TaskStatusSchema,
  ResultStatusSchema,
  SwarmStatusSchema,
  ConflictStatusSchema,
  FindingSchema,
  ProposedChangeSchema,
  RiskNoteSchema,
  ToolCallSummarySchema,
  TaskPacketSchema,
  ResultPacketSchema,
  WardenViolationSchema,
  WardenVerdictSchema,
  ConflictRecordSchema,
  SwarmConfigSchema,
  SubagentSpecSchema,
  SubagentAssignmentSchema,
  CriticalPathMetricsSchema,
  OrchestrationDecisionSchema,
  SwarmRunPlanSchema,
} from "./schemas.js";

// ── Constants ────────────────────────────────────────────────────────
export {
  SOLO_MAX_WORKERS,
  SMALL_MIN_WORKERS,
  SMALL_MAX_WORKERS,
  MEDIUM_MIN_WORKERS,
  MEDIUM_MAX_WORKERS,
  LARGE_MIN_WORKERS,
  LARGE_MAX_WORKERS,
  ABSOLUTE_MAX_WORKERS,
  DEFAULT_INITIAL_SWARM_MAX,
  APPROVAL_REQUIRED_MODES,
  MANUAL_APPROVAL_MODES,
  DEFAULT_WORKER_TIMEOUT_MS,
  MAX_WORKER_TIMEOUT_MS,
} from "./constants.js";

// ── Validation ───────────────────────────────────────────────────────
export {
  getWorkerCapForMode,
  doesModeRequireApproval,
  doesModeRequireManualApproval,
  validateWorkerCount,
  validateTaskPacket,
  validateResultPacket,
  validateSwarmConfig,
  validateSubagentSpec,
  validateSubagentAssignment,
  validateSwarmRunPlan,
  detectSerialCollapseRisk,
  detectSwarmSpamRisk,
  calculateCriticalPathMetrics,
} from "./validation.js";

// ── Worker Errors ────────────────────────────────────────────────────
export {
  SwarmWorkerError,
  SwarmValidationError,
  SwarmRoleMismatchError,
  SwarmTimeoutError,
  SwarmExecutionError,
  SwarmFrozenViolationError,
} from "./workerErrors.js";

// ── Worker Runner ────────────────────────────────────────────────────
export { runWorker } from "./workerRunner.js";
export type { WorkerRunner, WorkerExecutionContext } from "./workerRunner.js";

// ── Fake Workers ─────────────────────────────────────────────────────
export { runFakeWorker } from "./fakeWorkers.js";

// ── ReasonLoop Worker (Phase 5E) ─────────────────────────────────────
export {
  runReasonLoopWorker,
  createSwarmApprover,
  getFilteredToolList,
} from "./reasonLoopWorker.js";
export type { ReasonLoopWorkerInput } from "./reasonLoopWorker.js";

// ── Worker Prompt Builder (Phase 5E) ─────────────────────────────────
export { buildWorkerPrompt, toReasonLoopPrompt } from "./workerPrompt.js";
export type { WorkerPromptParts } from "./workerPrompt.js";

// ── Tool Filter (Phase 5E) ───────────────────────────────────────────
export { filterTools, createFilteredDispatcher } from "./toolFilter.js";
export type { FilteredToolDispatcher } from "./toolFilter.js";

// ── Worker Result Mapper (Phase 5E) ──────────────────────────────────
export { mapWorkerResult } from "./workerResultMapper.js";
export type { MapperInput } from "./workerResultMapper.js";

// ── Orchestrator ─────────────────────────────────────────────────────
export { runSwarmPipeline } from "./orchestrator.js";
export type { OrchestratorInput } from "./orchestrator.js";

// ── Planner ──────────────────────────────────────────────────────────
export { createPlan } from "./planner.js";
export type { PlannerInput } from "./planner.js";

// ── Merger ───────────────────────────────────────────────────────────
export { mergeResults } from "./merger.js";
export type { MergedResult } from "./merger.js";

// ── Conflict Detector ────────────────────────────────────────────────
export { detectConflicts } from "./conflictDetector.js";

// ── Warden ───────────────────────────────────────────────────────────
export { runWarden } from "./warden.js";

// ── Swarm Summary ────────────────────────────────────────────────────
export { buildSwarmSummary } from "./swarmSummary.js";
export type { BuildSummaryInput } from "./swarmSummary.js";
