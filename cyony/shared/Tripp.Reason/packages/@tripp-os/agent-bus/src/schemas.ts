/**
 * @tripp-os/agent-bus — Zod Schemas
 *
 * Typed contracts for the file-based Agent Bus.
 * All external-agent communication validates through these schemas.
 */
import { z } from "zod";
import { SCHEMA_VERSION, DEFAULT_DENIED_PATHS } from "./constants.js";

// ── 1. ExternalAgentRole ──────────────────────────────────────────────
//
// Provider-specific role keys (legacy — kept for backward compatibility).
// Prefer NamedAgent + BackingAdapter for new code.

export const ExternalAgentRoleSchema = z.enum([
  "openclaw_tripp",
  "hermes_cyony",
  "openclaw_echo",
  "hermes_echo",
]);

export type ExternalAgentRole = z.infer<typeof ExternalAgentRoleSchema>;

// ── 1a. NamedAgent (Phase 8G — provider-agnostic identity) ───────────
//
// Stable named-agent identities. Do not encode provider/runtime here.

export const NamedAgentSchema = z.enum([
  "tripp",
  "cyony",
  "echo",
]);

export type NamedAgent = z.infer<typeof NamedAgentSchema>;

// ── 1b. BackingAdapter (Phase 8G — provider/runtime) ─────────────────
//
// Backing runtime/provider for a named agent.
// May change over time without affecting agent identity or authority.

export const BackingAdapterSchema = z.enum([
  "fake",
  "manual",
  "hermes",
  "openclaw",
  "local_process_experimental",
  "cloud_http_experimental",
]);

export type BackingAdapter = z.infer<typeof BackingAdapterSchema>;

// ── 1c. AgentIdentity (Phase 8G — resolved view) ──────────────────────
//
// Resolved agent identity: who, what role, and how they run.

export const AgentIdentitySchema = z.object({
  namedAgent: NamedAgentSchema,
  assignedRole: z.string().optional(),
  backingAdapter: BackingAdapterSchema,
  compatibilityAlias: ExternalAgentRoleSchema.optional(),
});

export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

// ── 1d. Normalization (Phase 8G — provider key → identity) ────────────
//
// Maps legacy provider-specific role keys to stable agent identity.

const ROLE_IDENTITY_MAP: Record<ExternalAgentRole, AgentIdentity> = {
  "openclaw_tripp": {
    namedAgent: "tripp",
    assignedRole: "controller/supervisor",
    backingAdapter: "openclaw",
    compatibilityAlias: "openclaw_tripp",
  },
  "hermes_cyony": {
    namedAgent: "cyony",
    assignedRole: "builder/creative",
    backingAdapter: "hermes",
    compatibilityAlias: "hermes_cyony",
  },
  "openclaw_echo": {
    namedAgent: "echo",
    assignedRole: "warden/auditor/trace",
    backingAdapter: "openclaw",
    compatibilityAlias: "openclaw_echo",
  },
  "hermes_echo": {
    namedAgent: "echo",
    assignedRole: "warden/auditor/trace",
    backingAdapter: "hermes",
    compatibilityAlias: "hermes_echo",
  },
};

export function resolveAgentIdentity(role: ExternalAgentRole): AgentIdentity {
  return ROLE_IDENTITY_MAP[role];
}

export function normalizeAgentIdentity(role: ExternalAgentRole): {
  namedAgent: NamedAgent;
  backingAdapter: BackingAdapter;
  assignedRole: string;
  isLegacyAlias: boolean;
} {
  const identity = ROLE_IDENTITY_MAP[role];
  return {
    namedAgent: identity.namedAgent,
    backingAdapter: identity.backingAdapter,
    assignedRole: identity.assignedRole ?? "unknown",
    isLegacyAlias: true,
  };
}

// ── 2. ExternalAgentTrustZone ─────────────────────────────────────────

export const ExternalAgentTrustZoneSchema = z.enum([
  "cloud_controlled_reasoning",
  "cloud_sandbox_proposal",
  "local_audit_warden",
  "human_approval",
]);

export type ExternalAgentTrustZone = z.infer<typeof ExternalAgentTrustZoneSchema>;

// ── 3. ExternalAgentTaskType ──────────────────────────────────────────

export const ExternalAgentTaskTypeSchema = z.enum([
  "plan",
  "review",
  "audit",
  "prototype",
  "proposal",
  "implementation_proposal",
  "warden_review",
  "swarm_decomposition",
  "report_review",
  "drift_check",
]);

export type ExternalAgentTaskType = z.infer<typeof ExternalAgentTaskTypeSchema>;

// ── 4. ExternalAgentPacketStatus ──────────────────────────────────────

export const ExternalAgentPacketStatusSchema = z.enum([
  "pending",
  "claimed",
  "completed",
  "rejected",
  "blocked",
  "malformed",
  "archived",
]);

export type ExternalAgentPacketStatus = z.infer<typeof ExternalAgentPacketStatusSchema>;

// ── 5. ExternalAgentToolPolicy ────────────────────────────────────────

export const ExternalAgentToolPolicySchema = z.object({
  allowShell: z.boolean().default(false),
  allowWrite: z.boolean().default(false),
  allowNetwork: z.boolean().default(false),
  allowSecrets: z.boolean().default(false),
  allowedTools: z.array(z.string()).default([]),
  deniedTools: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type ExternalAgentToolPolicy = z.infer<typeof ExternalAgentToolPolicySchema>;

// ── 6. ExternalAgentApprovalPolicy ────────────────────────────────────

export const ExternalAgentApprovalPolicySchema = z.object({
  requiresHumanApproval: z.boolean().default(true),
  requiresApprovalGate: z.boolean().default(true),
  agentMayApprove: z.boolean().default(false).refine((v) => v !== true, {
    message: "agentMayApprove must not be true — Eddie is the final approver",
  }),
  echoReviewRequired: z.boolean().default(false),
  notes: z.string().optional(),
});

export type ExternalAgentApprovalPolicy = z.infer<typeof ExternalAgentApprovalPolicySchema>;

// ── 7. ExternalAgentContextPolicy ─────────────────────────────────────

export const ExternalAgentContextPolicySchema = z.object({
  contextBudgetTokens: z.number().int().positive(),
  redactSecrets: z.boolean().default(true),
  includeRepoSummary: z.boolean().default(false),
  includeFileContents: z.boolean().default(false),
  allowedContextPaths: z.array(z.string()).default([]),
  deniedContextPaths: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type ExternalAgentContextPolicy = z.infer<typeof ExternalAgentContextPolicySchema>;

// ── 8. ExternalAgentTaskPacket ────────────────────────────────────────

export const ExternalAgentTaskPacketSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  packetId: z.string().min(1, "packetId is required"),
  runId: z.string().min(1, "runId is required"),
  parentRunId: z.string().optional(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  agentRole: ExternalAgentRoleSchema,
  trustZone: ExternalAgentTrustZoneSchema,
  taskType: ExternalAgentTaskTypeSchema,
  title: z.string().min(1, "title is required"),
  objective: z.string().min(1, "objective is required"),
  scope: z.string(),
  allowedPaths: z.array(z.string()).default([]),
  deniedPaths: z.array(z.string()).default([...DEFAULT_DENIED_PATHS]),
  toolPolicy: ExternalAgentToolPolicySchema.default({
    allowShell: false,
    allowWrite: false,
    allowNetwork: false,
    allowSecrets: false,
  }),
  approvalPolicy: ExternalAgentApprovalPolicySchema.default({
    requiresHumanApproval: true,
    requiresApprovalGate: true,
    agentMayApprove: false,
    echoReviewRequired: false,
  }),
  contextPolicy: ExternalAgentContextPolicySchema.default({
    contextBudgetTokens: 8000,
    redactSecrets: true,
  }),
  constraints: z.array(z.string()).default([]),
  requiredOutputFormat: z.string().default("json"),
  reportRequired: z.boolean().default(false),
  status: ExternalAgentPacketStatusSchema.default("pending"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalAgentTaskPacket = z.infer<typeof ExternalAgentTaskPacketSchema>;

// ── Runtime validators ────────────────────────────────────────────────

/**
 * Validate that a Hermes packet uses sandbox trust zone.
 */
function hermesTrustZoneCheck(data: ExternalAgentTaskPacket, ctx: z.RefinementCtx): void {
  if (data.agentRole === "hermes_cyony" && data.trustZone !== "cloud_sandbox_proposal") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Hermes packets must use trustZone 'cloud_sandbox_proposal'",
      path: ["trustZone"],
    });
  }
}

/**
 * Validate that Hermes packets do not allow write, shell, or secrets.
 */
function hermesToolPolicyCheck(data: ExternalAgentTaskPacket, ctx: z.RefinementCtx): void {
  if (data.agentRole === "hermes_cyony") {
    if (data.toolPolicy.allowShell) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hermes must not allow shell", path: ["toolPolicy", "allowShell"] });
    }
    if (data.toolPolicy.allowWrite) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hermes must not allow write access", path: ["toolPolicy", "allowWrite"] });
    }
    if (data.toolPolicy.allowSecrets) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hermes must not allow secrets", path: ["toolPolicy", "allowSecrets"] });
    }
  }
}

/**
 * Validate that cloud agents do not receive secrets.
 */
function cloudNoSecretsCheck(data: ExternalAgentTaskPacket, ctx: z.RefinementCtx): void {
  if (
    (data.trustZone === "cloud_controlled_reasoning" || data.trustZone === "cloud_sandbox_proposal") &&
    data.toolPolicy.allowSecrets
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cloud agents must not allow secrets", path: ["toolPolicy", "allowSecrets"] });
  }
  if (
    (data.trustZone === "cloud_controlled_reasoning" || data.trustZone === "cloud_sandbox_proposal") &&
    !data.contextPolicy.redactSecrets
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cloud agents must have redactSecrets enabled", path: ["contextPolicy", "redactSecrets"] });
  }
}

/** Validated task packet schema with runtime checks */
export const ValidatedTaskPacketSchema = ExternalAgentTaskPacketSchema.superRefine((data, ctx) => {
  hermesTrustZoneCheck(data, ctx);
  hermesToolPolicyCheck(data, ctx);
  cloudNoSecretsCheck(data, ctx);
});

// ── 9. ExternalAgentResultStatus ──────────────────────────────────────

export const ExternalAgentResultStatusSchema = z.enum([
  "success",
  "partial",
  "failed",
  "blocked",
  "rejected",
  "unsafe",
  "malformed",
]);

export type ExternalAgentResultStatus = z.infer<typeof ExternalAgentResultStatusSchema>;

// ── 10. ExternalAgentProposedChange ───────────────────────────────────

export const ExternalAgentProposedChangeSchema = z.object({
  path: z.string().min(1),
  changeType: z.enum(["create", "modify", "delete", "rename", "review_only"]),
  summary: z.string().min(1),
  patch: z.string().optional(),
  risk: z.enum(["low", "medium", "high"]).optional(),
  requiresApproval: z.boolean().default(true),
});

export type ExternalAgentProposedChange = z.infer<typeof ExternalAgentProposedChangeSchema>;

// ── 11. ExternalAgentResultPacket ─────────────────────────────────────

export const ExternalAgentResultPacketSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  packetId: z.string().min(1, "packetId is required"),
  resultId: z.string().min(1, "resultId is required"),
  runId: z.string().min(1, "runId is required"),
  parentRunId: z.string().optional(),
  createdAt: z.string().datetime(),
  agentRole: ExternalAgentRoleSchema,
  trustZone: ExternalAgentTrustZoneSchema,
  status: ExternalAgentResultStatusSchema,
  summary: z.string().min(1, "summary is required"),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  proposedChanges: z.array(ExternalAgentProposedChangeSchema).default([]),
  filesReferenced: z.array(z.string()).default([]),
  validationPerformed: z.array(z.string()).default([]),
  requestedApprovals: z.array(z.string()).default([]),
  nextRecommendedAction: z.string().default(""),
  reportPath: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalAgentResultPacket = z.infer<typeof ExternalAgentResultPacketSchema>;

// ── 12. ExternalAgentReviewVerdict ─────────────────────────────────────

export const ExternalAgentReviewVerdictSchema = z.enum([
  "pass",
  "pass_with_notes",
  "revise",
  "block",
  "escalate",
]);

export type ExternalAgentReviewVerdict = z.infer<typeof ExternalAgentReviewVerdictSchema>;

// ── 13. ExternalAgentReviewPacket ──────────────────────────────────────

export const ExternalAgentReviewPacketSchema = z.object({
  schemaVersion: z.string().default(SCHEMA_VERSION),
  reviewId: z.string().min(1, "reviewId is required"),
  packetId: z.string().min(1, "packetId is required"),
  resultId: z.string().optional(),
  runId: z.string().min(1, "runId is required"),
  createdAt: z.string().datetime(),
  reviewerRole: ExternalAgentRoleSchema,
  verdict: ExternalAgentReviewVerdictSchema,
  summary: z.string().min(1, "summary is required"),
  issues: z.array(z.string()).default([]),
  boundaryFindings: z.array(z.string()).default([]),
  doctrineFindings: z.array(z.string()).default([]),
  safetyFindings: z.array(z.string()).default([]),
  recommendedNextAction: z.string().default(""),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalAgentReviewPacket = z.infer<typeof ExternalAgentReviewPacketSchema>;

// ── Runtime validators for review packets ─────────────────────────────

/** Validate that block/escalate verdicts include at least one finding */
function blockRequiresFinding(data: z.infer<typeof ExternalAgentReviewPacketSchema>, ctx: z.RefinementCtx): void {
  if (
    (data.verdict === "block" || data.verdict === "escalate") &&
    data.issues.length === 0 &&
    data.safetyFindings.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "block/escalate verdict must include at least one issue or safety finding",
      path: ["verdict"],
    });
  }
}

/** Validated review packet schema */
export const ValidatedReviewPacketSchema = ExternalAgentReviewPacketSchema.superRefine(blockRequiresFinding);
