/**
 * @tripp-os/agent-bus — Transport Schemas
 *
 * Bounded transport abstraction for routing packets to external workers.
 * All transports are fake/manual by default. Live/cloud is opt-in only.
 */
import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import {
  ExternalAgentRoleSchema,
  ExternalAgentTaskPacketSchema,
  ExternalAgentResultPacketSchema,
} from "./schemas.js";

// ── 1. ExternalAgentTransportKind ────────────────────────────────────

export const ExternalAgentTransportKindSchema = z.enum([
  "manual_file",
  "fake_agent",
  "local_process_experimental",
  "cloud_http_experimental",
]);

export type ExternalAgentTransportKind = z.infer<
  typeof ExternalAgentTransportKindSchema
>;

// ── 2. ExternalAgentTransportMode ────────────────────────────────────

export const ExternalAgentTransportModeSchema = z.enum([
  "disabled",
  "dry_run",
  "fake",
  "manual",
  "experimental_live",
]);

export type ExternalAgentTransportMode = z.infer<
  typeof ExternalAgentTransportModeSchema
>;

// ── 3. ExternalAgentTransportConfig ──────────────────────────────────

export const ExternalAgentTransportConfigSchema = z.object({
  transportId: z.string().min(1),
  name: z.string().min(1),
  kind: ExternalAgentTransportKindSchema,
  mode: ExternalAgentTransportModeSchema,
  agentRole: ExternalAgentRoleSchema,
  enabled: z.boolean().default(false),
  allowNetwork: z.boolean().default(false),
  allowSecrets: z.boolean().default(false),
  allowRepoAccess: z.boolean().default(false),
  allowDirectMutation: z.boolean().default(false),
  requireEchoReview: z.boolean().default(true),
  requireApprovalGate: z.boolean().default(true),
  timeoutSeconds: z.number().int().min(1).max(3600).default(300),
  maxContextTokens: z.number().int().min(1000).max(256000).default(8000),
  endpoint: z.string().optional(),
  command: z.string().optional(),
  notes: z.string().optional(),
});

export type ExternalAgentTransportConfig = z.infer<
  typeof ExternalAgentTransportConfigSchema
>;

// ── Runtime validators ───────────────────────────────────────────────

function transportSafetyRules(
  data: ExternalAgentTransportConfig,
  ctx: z.RefinementCtx
): void {
  // allowDirectMutation must always be false
  if (data.allowDirectMutation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "allowDirectMutation must always be false — all mutations flow through ApprovalGate",
      path: ["allowDirectMutation"],
    });
  }

  // Cloud HTTP safety
  if (data.kind === "cloud_http_experimental") {
    if (data.allowSecrets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cloud HTTP transport must not allow secrets",
        path: ["allowSecrets"],
      });
    }
    if (data.allowRepoAccess) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cloud HTTP transport must not allow repo access",
        path: ["allowRepoAccess"],
      });
    }
  }

  // Hermes: proposal-only
  if (data.agentRole === "hermes_cyony" && !data.requireApprovalGate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Hermes transport must require ApprovalGate",
      path: ["requireApprovalGate"],
    });
  }

  // experimental_live requirements
  if (data.mode === "experimental_live") {
    if (!data.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "experimental_live mode requires enabled: true",
        path: ["enabled"],
      });
    }
    if (!data.requireEchoReview) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "experimental_live mode requires requireEchoReview: true",
        path: ["requireEchoReview"],
      });
    }
    if (!data.requireApprovalGate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "experimental_live mode requires requireApprovalGate: true",
        path: ["requireApprovalGate"],
      });
    }
  }

  // Unknown transport kind — reject at schema level already (enum)
}

export const ValidatedTransportConfigSchema =
  ExternalAgentTransportConfigSchema.superRefine(transportSafetyRules);

// ── 4. ExternalAgentDispatchRequest ──────────────────────────────────

export const ExternalAgentDispatchRequestSchema = z
  .object({
    dispatchId: z.string().min(1),
    packetId: z.string().min(1),
    runId: z.string().min(1),
    agentRole: ExternalAgentRoleSchema,
    transportId: z.string().min(1),
    mode: ExternalAgentTransportModeSchema,
    taskPacket: ExternalAgentTaskPacketSchema,
    createdAt: z.string().datetime(),
    requestedBy: z.string().default("cli"),
    dryRun: z.boolean().default(true),
    traceEnabled: z.boolean().default(true),
  })
  .refine((d) => d.agentRole === d.taskPacket.agentRole, {
    message: "dispatchRequest.agentRole must match taskPacket.agentRole",
    path: ["agentRole"],
  });

export type ExternalAgentDispatchRequest = z.infer<
  typeof ExternalAgentDispatchRequestSchema
>;

// ── 5. ExternalAgentDispatchStatus ───────────────────────────────────

export const ExternalAgentDispatchStatusSchema = z.enum([
  "skipped",
  "dry_run",
  "fake_completed",
  "manual_required",
  "completed",
  "failed",
  "blocked",
  "unsafe",
]);

export type ExternalAgentDispatchStatus = z.infer<
  typeof ExternalAgentDispatchStatusSchema
>;

// ── 6. ExternalAgentDispatchResult ───────────────────────────────────

export const ExternalAgentDispatchResultSchema = z.object({
  dispatchId: z.string().min(1),
  packetId: z.string().min(1),
  resultId: z.string().optional(),
  runId: z.string().min(1),
  agentRole: ExternalAgentRoleSchema,
  transportId: z.string().min(1),
  mode: ExternalAgentTransportModeSchema,
  status: ExternalAgentDispatchStatusSchema,
  summary: z.string().min(1),
  resultPacket: ExternalAgentResultPacketSchema.optional(),
  outboxPath: z.string().optional(),
  traceEventIds: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type ExternalAgentDispatchResult = z.infer<
  typeof ExternalAgentDispatchResultSchema
>;

// ── Runtime validators ───────────────────────────────────────────────

export const ValidatedDispatchResultSchema =
  ExternalAgentDispatchResultSchema.superRefine((data, ctx) => {
    // completed/fake_completed with resultPacket must validate
    if (
      (data.status === "completed" || data.status === "fake_completed") &&
      data.resultPacket
    ) {
      const parsed = ExternalAgentResultPacketSchema.safeParse(
        data.resultPacket
      );
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Result packet validation failed: ${parsed.error.message}`,
          path: ["resultPacket"],
        });
      }
    }

    // failed/blocked/unsafe should include errors
    if (
      (data.status === "failed" ||
        data.status === "blocked" ||
        data.status === "unsafe") &&
      data.errors.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.status} dispatch must include at least one error`,
        path: ["errors"],
      });
    }
  });
