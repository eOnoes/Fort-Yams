/**
 * @tripp-os/agent-bus — Trace Ledger Schemas
 *
 * Append-only Agent Bus trace event types.
 * Trace events are evidence only — they never authorize mutation.
 */
import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import { ExternalAgentRoleSchema } from "./schemas.js";
// ── 1. AgentBusTraceEventType ─────────────────────────────────────────
export const AgentBusTraceEventTypeSchema = z.enum([
    // Packet lifecycle
    "packet_created",
    "packet_read",
    "packet_claimed",
    "result_written",
    "result_read",
    "schema_validation_failed",
    "packet_rejected",
    "packet_archived",
    // Echo / Warden review
    "warden_review_started",
    "warden_verdict_recorded",
    "warden_stop_issued",
    "warden_stop_resolved",
    // Subagent lifecycle
    "subagent_spawned",
    "subagent_completed",
    "subagent_killed",
    "subagent_audited",
    "task_timeout",
    // JIT tool lifecycle
    "tools_loaded",
    "tools_unloaded",
    "tool_timeout",
    // Human / approval
    "human_decision_recorded",
    "mutation_requested",
    "approvalgate_required",
    "mutation_applied",
    "validation_failed_later",
    "root_cause_linked",
    "approval_timeout",
]);
// ── 2. AgentBusTraceSeverity ──────────────────────────────────────────
export const AgentBusTraceSeveritySchema = z.enum([
    "debug",
    "info",
    "warning",
    "error",
    "critical",
]);
// ── 3. AgentBusTraceActorType ─────────────────────────────────────────
export const AgentBusTraceActorTypeSchema = z.enum([
    "cli",
    "openclaw_tripp",
    "hermes_cyony",
    "openclaw_echo",
    "operator",
    "approvalgate",
    "system",
    "unknown",
]);
// ── 4. AgentBusTraceEvent ─────────────────────────────────────────────
export const AgentBusTraceEventSchema = z.object({
    schemaVersion: z.string().default(SCHEMA_VERSION),
    eventId: z.string().min(1, "eventId is required"),
    eventType: AgentBusTraceEventTypeSchema,
    severity: AgentBusTraceSeveritySchema.default("info"),
    createdAt: z.string().datetime(),
    actorType: AgentBusTraceActorTypeSchema,
    actorId: z.string().optional(),
    runId: z.string().optional(),
    parentRunId: z.string().optional(),
    packetId: z.string().optional(),
    resultId: z.string().optional(),
    reviewId: z.string().optional(),
    parentEventId: z.string().optional(),
    rootCauseEventId: z.string().optional(),
    agentRole: ExternalAgentRoleSchema.optional(),
    parentAgentRole: ExternalAgentRoleSchema.optional(),
    subagentId: z.string().optional(),
    subagentRole: z.string().optional(),
    toolNames: z.array(z.string()).default([]),
    sourcePath: z.string().optional(),
    targetPath: z.string().optional(),
    summary: z.string().min(1, "summary is required"),
    details: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).default([]),
});
// ── Runtime validators ────────────────────────────────────────────────
function validateEventTypeRules(data, ctx) {
    // root_cause_linked must include rootCauseEventId
    if (data.eventType === "root_cause_linked" && !data.rootCauseEventId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "root_cause_linked event must include rootCauseEventId",
            path: ["rootCauseEventId"],
        });
    }
    // subagent events must include subagentId
    const subagentTypes = [
        "subagent_spawned",
        "subagent_completed",
        "subagent_killed",
        "subagent_audited",
    ];
    if (subagentTypes.includes(data.eventType) && !data.subagentId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${data.eventType} must include subagentId`,
            path: ["subagentId"],
        });
    }
    // tools_loaded / tools_unloaded must include at least one toolName
    if ((data.eventType === "tools_loaded" || data.eventType === "tools_unloaded") &&
        data.toolNames.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${data.eventType} must include at least one toolName`,
            path: ["toolNames"],
        });
    }
    // warden_stop_resolved needs parentEventId or details
    if (data.eventType === "warden_stop_resolved" &&
        !data.parentEventId &&
        (!data.details || Object.keys(data.details).length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "warden_stop_resolved must include parentEventId or resolution details",
            path: ["parentEventId"],
        });
    }
    // validation_failed_later should link back when known
    if (data.eventType === "validation_failed_later" &&
        !data.parentEventId &&
        !data.rootCauseEventId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "validation_failed_later should include parentEventId or rootCauseEventId when known",
            path: ["parentEventId"],
        });
    }
    // task_timeout must include packetId or subagentId
    if (data.eventType === "task_timeout" &&
        !data.packetId &&
        !data.subagentId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "task_timeout must include packetId or subagentId",
            path: ["packetId"],
        });
    }
    // tool_timeout must include toolNames
    if (data.eventType === "tool_timeout" && data.toolNames.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "tool_timeout must include at least one toolName",
            path: ["toolNames"],
        });
    }
    // approval_timeout must include packetId, reviewId, or runId
    if (data.eventType === "approval_timeout" &&
        !data.packetId &&
        !data.reviewId &&
        !data.runId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "approval_timeout must include packetId, reviewId, or runId",
            path: ["packetId"],
        });
    }
}
/** Validated trace event schema with runtime checks */
export const ValidatedTraceEventSchema = AgentBusTraceEventSchema.superRefine(validateEventTypeRules);
// ── 5. TraceLedgerValidationResult ────────────────────────────────────
export const TraceLedgerValidationResultSchema = z.object({
    totalLines: z.number().int().min(0),
    validEvents: z.number().int().min(0),
    malformedLines: z.number().int().min(0),
    malformedLineNumbers: z.array(z.number().int().positive()),
    ledgerPath: z.string(),
    isValid: z.boolean(),
});
//# sourceMappingURL=traceSchemas.js.map