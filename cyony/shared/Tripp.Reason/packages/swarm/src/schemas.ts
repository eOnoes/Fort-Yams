/**
 * @tripp-reason/swarm — Zod schemas for validation
 *
 * Provides runtime validation for TaskPacket, ResultPacket, and
 * supporting types. Used by validation helpers and future workers.
 */
import { z } from "zod";
import { WORKER_ROLES, SWARM_MODES, MODEL_TIER_LABELS } from "./types.js";

// ── Enums ────────────────────────────────────────────────────────────
export const WorkerRoleSchema = z.enum(WORKER_ROLES);
export const SwarmModeSchema = z.enum(SWARM_MODES);
export const ModelTierLabelSchema = z.enum(MODEL_TIER_LABELS);

export const TaskStatusSchema = z.enum([
  "pending", "running", "pass", "partial", "fail", "cancelled", "timed_out",
]);
export const ResultStatusSchema = z.enum(["pass", "partial", "fail"]);
export const SwarmStatusSchema = z.enum([
  "pending", "running", "pass", "partial", "fail", "cancelled", "timed_out",
]);
export const ConflictStatusSchema = z.enum(["open", "resolved", "blocked"]);

// ── Supporting Schemas ───────────────────────────────────────────────
export const FindingSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1).max(2000),
  source: z.string().min(1).max(500),
});

export const ProposedChangeSchema = z.object({
  file: z.string().min(1).max(500),
  diff: z.string().max(10_240), // 10KB cap
  reason: z.string().min(1).max(1000),
});

export const RiskNoteSchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  description: z.string().min(1).max(2000),
  mitigation: z.string().max(2000).optional(),
});

export const ToolCallSummarySchema = z.object({
  tool: z.string().min(1).max(200),
  status: z.enum(["ok", "error"]),
  summary: z.string().max(500),
});

// ── Task Packet Schema ───────────────────────────────────────────────
export const TaskPacketSchema = z.object({
  id: z.string().min(1).max(100),
  role: WorkerRoleSchema,
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(2000),
  scope: z.string().min(1).max(2000),
  allowedFiles: z.array(z.string().max(500)).max(200).optional(),
  forbiddenFiles: z.array(z.string().max(500)).max(200).optional(),
  allowedTools: z.array(z.string().max(200)).max(100).optional(),
  forbiddenTools: z.array(z.string().max(200)).max(100).optional(),
  modelTier: ModelTierLabelSchema,
  riskLevel: z.enum(["safe", "mutating", "destructive"]),
  timeoutMs: z.number().int().positive().max(600_000), // max 10 minutes
  requiresApproval: z.boolean(),
  contextRefs: z.array(z.string().max(100)).max(50).optional(),
  expectedOutput: z.string().min(1).max(2000),
  dependsOn: z.array(z.string().max(100)).max(50).optional(),
});

// ── Result Packet Schema ─────────────────────────────────────────────
export const ResultPacketSchema = z.object({
  taskId: z.string().min(1).max(100),
  role: WorkerRoleSchema,
  status: ResultStatusSchema,
  summary: z.string().min(1).max(2000),
  findings: z.array(FindingSchema).max(200),
  filesTouched: z.array(z.string().max(500)).max(200),
  toolCalls: z.array(ToolCallSummarySchema).max(500),
  proposedChanges: z.array(ProposedChangeSchema).max(100),
  validation: z.string().max(2000),
  risks: z.array(RiskNoteSchema).max(100),
  nextRecommendation: z.string().min(1).max(2000),
  rawArtifacts: z.unknown().optional(),
});

// ── Warden ───────────────────────────────────────────────────────────
export const WardenViolationSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  rule: z.string().min(1).max(200),
  detail: z.string().min(1).max(2000),
  taskId: z.string().max(100).optional(),
});

export const WardenVerdictSchema = z.object({
  status: z.enum(["PASS", "PARTIAL", "FAIL"]),
  reasoning: z.string().min(1).max(2000),
  violations: z.array(WardenViolationSchema).max(100),
  recommendations: z.array(z.string().max(500)).max(50),
});

// ── Conflicts ────────────────────────────────────────────────────────
export const ConflictRecordSchema = z.object({
  id: z.string().min(1).max(100),
  file: z.string().min(1).max(500),
  taskIds: z.array(z.string().max(100)).min(2).max(50),
  status: ConflictStatusSchema,
  resolution: z.string().max(1000).optional(),
});

// ── Config ───────────────────────────────────────────────────────────
export const SwarmConfigSchema = z.object({
  mode: SwarmModeSchema,
  maxWorkers: z.number().int().min(1).max(25),
  requireApproval: z.boolean(),
  defaultTimeoutMs: z.number().int().positive().max(600_000),
  workdir: z.string().min(1),
});

// ── Phase 5B.1: Dynamic Subagent Schemas ─────────────────────────────

export const SubagentSpecSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  role: WorkerRoleSchema,
  systemPrompt: z.string().min(1).max(8000),
  modelTier: ModelTierLabelSchema,
  allowedTools: z.array(z.string().max(200)).max(100).optional(),
  forbiddenTools: z.array(z.string().max(200)).max(100).optional(),
  allowedFiles: z.array(z.string().max(500)).max(200).optional(),
  forbiddenFiles: z.array(z.string().max(500)).max(200).optional(),
  maxSteps: z.number().int().min(1).max(200).optional(),
  timeoutMs: z.number().int().positive().max(600_000),
  frozenBehavior: z.boolean(),
});

export const SubagentAssignmentSchema = z.object({
  id: z.string().min(1).max(100),
  subagentId: z.string().min(1).max(100),
  taskPacketId: z.string().min(1).max(100),
  wave: z.number().int().min(0).max(100),
  dependsOn: z.array(z.string().max(100)).max(50).optional(),
  status: TaskStatusSchema,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const CriticalPathMetricsSchema = z.object({
  orchestratorPlanningMs: z.number().int().nonnegative().optional(),
  workerWaveMs: z.array(z.number().int().nonnegative()).max(100).optional(),
  maxWorkerWaveMs: z.number().int().nonnegative().optional(),
  mergerMs: z.number().int().nonnegative().optional(),
  wardenMs: z.number().int().nonnegative().optional(),
  totalCriticalPathMs: z.number().int().nonnegative().optional(),
  totalWorkerMs: z.number().int().nonnegative().optional(),
  parallelEfficiencyRatio: z.number().min(0).optional(),
});

export const OrchestrationDecisionSchema = z.object({
  shouldParallelize: z.boolean(),
  reason: z.string().min(1).max(2000),
  workerCount: z.number().int().min(1).max(25),
  selectedMode: SwarmModeSchema,
  serialCollapseRisk: z.boolean().optional(),
  swarmSpamRisk: z.boolean().optional(),
  assumptions: z.array(z.string().max(500)).max(50),
  rejectedAlternatives: z.array(z.string().max(500)).max(20).optional(),
});

export const SwarmRunPlanSchema = z.object({
  id: z.string().min(1).max(100),
  operatorPrompt: z.string().min(1).max(10000),
  shouldParallelize: z.boolean(),
  reasonForParallelism: z.string().min(1).max(2000),
  selectedMode: SwarmModeSchema,
  workerCount: z.number().int().min(1).max(25),
  subagents: z.array(SubagentSpecSchema).min(1).max(25),
  taskPackets: z.array(TaskPacketSchema).min(1).max(25),
  assignments: z.array(SubagentAssignmentSchema).min(1).max(25),
  dependencyGraph: z.record(z.string(), z.array(z.string())),
  criticalPathEstimate: CriticalPathMetricsSchema.optional(),
  approvalRequired: z.boolean(),
  serialCollapseRisk: z.boolean().optional(),
  swarmSpamRisk: z.boolean().optional(),
  createdAt: z.string().datetime(),
});
