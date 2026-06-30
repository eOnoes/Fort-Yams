/**
 * @tripp-os/contracts — generic interfaces
 *
 * Portable contract interfaces shared across Tripp.OS packages.
 * No Tripp.Reason-specific types. No runtime imports beyond zod.
 */
import { z } from "zod";
// ── StreamEvent (generic protocol types) ─────────────────────────────
import { MessageRoleSchema, FinishReasonSchema, } from "./status.js";
export const StreamEventMessageSchema = z.object({
    type: z.literal("message"),
    content: z.string(),
    role: MessageRoleSchema,
    sessionId: z.string().optional(),
    runId: z.string().optional(),
});
export const StreamEventToolRequestSchema = z.object({
    type: z.literal("tool_request"),
    tool: z.string(),
    args: z.unknown(),
    requiresApproval: z.boolean(),
    sessionId: z.string().optional(),
    runId: z.string().optional(),
});
export const StreamEventToolResultSchema = z.object({
    type: z.literal("tool_result"),
    tool: z.string(),
    result: z.unknown(),
    status: z.enum(["ok", "error"]),
    sessionId: z.string().optional(),
    runId: z.string().optional(),
});
export const StreamEventFinishSchema = z.object({
    type: z.literal("finish"),
    reason: FinishReasonSchema,
    runId: z.string(),
    reportPath: z.string().optional(),
    sessionId: z.string().optional(),
});
export const StreamEventErrorSchema = z.object({
    type: z.literal("error"),
    message: z.string(),
    recoverable: z.boolean(),
    sessionId: z.string().optional(),
    runId: z.string().optional(),
});
export const StreamEventSchema = z.discriminatedUnion("type", [
    StreamEventMessageSchema,
    StreamEventToolRequestSchema,
    StreamEventToolResultSchema,
    StreamEventFinishSchema,
    StreamEventErrorSchema,
]);
//# sourceMappingURL=contracts.js.map