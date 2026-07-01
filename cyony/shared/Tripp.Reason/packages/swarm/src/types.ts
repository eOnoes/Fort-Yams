/**
 * @tripp-reason/swarm — core type definitions
 *
 * Kimi-style bounded multi-worker orchestration types.
 * Workers are role-bounded; packets are structured, not prose.
 */
import type { RiskLevel } from "@tripp-reason/shared";

// ── Worker Roles ─────────────────────────────────────────────────────
export const WORKER_ROLES = [
  "planner",
  "researcher",
  "coder",
  "reviewer",
  "tester",
  "merger",
  "reporter",
  "warden",
] as const;
export type WorkerRole = (typeof WORKER_ROLES)[number];

// ── Swarm Modes ──────────────────────────────────────────────────────
export const SWARM_MODES = ["solo", "small", "medium", "large", "max"] as const;
export type SwarmMode = (typeof SWARM_MODES)[number];

// ── Status Enums ─────────────────────────────────────────────────────
export type TaskStatus =
  | "pending"
  | "running"
  | "pass"
  | "partial"
  | "fail"
  | "cancelled"
  | "timed_out";

export type ResultStatus = "pass" | "partial" | "fail";

export type SwarmStatus =
  | "pending"
  | "running"
  | "pass"
  | "partial"
  | "fail"
  | "cancelled"
  | "timed_out";

export type ConflictStatus = "open" | "resolved" | "blocked";

// ── Model Tier Labels (from MODEL_TIERS.md) ──────────────────────────
export const MODEL_TIER_LABELS = [
  "Heavy Technical Thinking",
  "Fast Technical Builder",
  "Creative Architecture Scout",
  "Budget Daily Driver",
  "Code Review / Warden Pass",
  "Vision / Image Analysis",
  "Research / Search Assist",
  "Direct API Fallback",
] as const;
export type ModelTierLabel = (typeof MODEL_TIER_LABELS)[number];

// ── Task Packet ──────────────────────────────────────────────────────
export interface TaskPacket {
  id: string;
  role: WorkerRole;
  title: string;
  objective: string;
  scope: string;
  allowedFiles?: string[];
  forbiddenFiles?: string[];
  allowedTools?: string[];
  forbiddenTools?: string[];
  modelTier: ModelTierLabel;
  riskLevel: RiskLevel;
  timeoutMs: number;
  requiresApproval: boolean;
  contextRefs?: string[];
  expectedOutput: string;
  dependsOn?: string[];
}

// ── Result Packet ────────────────────────────────────────────────────
export interface Finding {
  severity: "info" | "warning" | "critical";
  message: string;
  source: string;
}

export interface ProposedChange {
  file: string;
  diff: string;
  reason: string;
}

export interface RiskNote {
  level: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

export interface ResultPacket {
  taskId: string;
  role: WorkerRole;
  status: ResultStatus;
  summary: string;
  findings: Finding[];
  filesTouched: string[];
  toolCalls: ToolCallSummary[];
  proposedChanges: ProposedChange[];
  validation: string;
  risks: RiskNote[];
  nextRecommendation: string;
  rawArtifacts?: unknown;
}

// ── Tool Call Summary (swarm-local, compatible with shared reports) ──
export interface ToolCallSummary {
  tool: string;
  status: "ok" | "error";
  summary: string;
}

// ── Warden ───────────────────────────────────────────────────────────
export interface WardenVerdict {
  status: "PASS" | "PARTIAL" | "FAIL";
  reasoning: string;
  violations: WardenViolation[];
  recommendations: string[];
}

export interface WardenViolation {
  severity: "info" | "warning" | "critical";
  rule: string;
  detail: string;
  taskId?: string;
}

// ── Conflicts ────────────────────────────────────────────────────────
export interface ConflictRecord {
  id: string;
  file: string;
  taskIds: string[];
  status: ConflictStatus;
  resolution?: string;
}

// ── Swarm Configuration ──────────────────────────────────────────────
export interface SwarmConfig {
  mode: SwarmMode;
  maxWorkers: number;
  requireApproval: boolean;
  defaultTimeoutMs: number;
  workdir: string;
}

// ── Swarm Run Summary ────────────────────────────────────────────────
export interface SwarmRunSummary {
  id: string;
  mode: SwarmMode;
  workerCount: number;
  status: SwarmStatus;
  taskPackets: TaskPacket[];
  resultPackets: ResultPacket[];
  wardenVerdict?: WardenVerdict;
  conflicts: ConflictRecord[];
  startedAt: string;
  completedAt?: string;
}

// ── Phase 5B.1: Dynamic Subagent Types (Kimi-style) ──────────────────

/** Specification for a dynamically-created subagent. The orchestrator creates these on demand — no predefined roster. */
export interface SubagentSpec {
  id: string;
  name: string;
  role: WorkerRole;
  /** Custom system prompt written by the orchestrator for this specific subagent */
  systemPrompt: string;
  modelTier: ModelTierLabel;
  allowedTools?: string[];
  forbiddenTools?: string[];
  allowedFiles?: string[];
  forbiddenFiles?: string[];
  /** Maximum reasoning steps for this subagent (default: 100) */
  maxSteps?: number;
  timeoutMs: number;
  /** When true, subagent cannot rewrite its role or spawn other workers. Default true. */
  frozenBehavior: boolean;
}

/** Binds a SubagentSpec to a TaskPacket for execution. Represents the assign_task operation. */
export interface SubagentAssignment {
  id: string;
  subagentId: string;
  taskPacketId: string;
  /** Execution wave — determines parallelism order. Workers in same wave run concurrently. */
  wave: number;
  /** Task IDs this assignment depends on before it can start */
  dependsOn?: string[];
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
}

/** Critical path timing metrics — measures wall-clock efficiency, not total worker steps. */
export interface CriticalPathMetrics {
  orchestratorPlanningMs?: number;
  workerWaveMs?: number[];
  maxWorkerWaveMs?: number;
  mergerMs?: number;
  wardenMs?: number;
  /** orchestratorPlanningMs + max(workerWaveMs) + mergerMs + wardenMs */
  totalCriticalPathMs?: number;
  totalWorkerMs?: number;
  /** totalWorkerMs / (totalCriticalPathMs * workerCount) — how much parallelism helped */
  parallelEfficiencyRatio?: number;
}

/** Lightweight orchestration decision metadata for audit/debugging. */
export interface OrchestrationDecision {
  shouldParallelize: boolean;
  reason: string;
  workerCount: number;
  selectedMode: SwarmMode;
  /** Risk that orchestrator falls back to sequential when parallel would help */
  serialCollapseRisk?: boolean;
  /** Risk that orchestrator spawns more workers than tasks justify */
  swarmSpamRisk?: boolean;
  assumptions: string[];
  rejectedAlternatives?: string[];
}

/** Complete swarm run plan — the orchestrator's full pre-execution blueprint. */
export interface SwarmRunPlan {
  id: string;
  operatorPrompt: string;
  shouldParallelize: boolean;
  reasonForParallelism: string;
  selectedMode: SwarmMode;
  workerCount: number;
  subagents: SubagentSpec[];
  taskPackets: TaskPacket[];
  assignments: SubagentAssignment[];
  /** taskPacketId → dependsOn taskPacketId[] */
  dependencyGraph: Record<string, string[]>;
  criticalPathEstimate?: CriticalPathMetrics;
  approvalRequired: boolean;
  /** Risk flag: orchestrator chose sequential when tasks are independent */
  serialCollapseRisk?: boolean;
  /** Risk flag: worker count exceeds meaningful task count */
  swarmSpamRisk?: boolean;
  createdAt: string;
}
