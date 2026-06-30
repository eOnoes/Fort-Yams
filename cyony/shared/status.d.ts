/**
 * @tripp-os/contracts — generic status enums
 *
 * All status values as string literal unions + Zod schemas.
 * These are the portable primitives shared across Tripp.OS packages.
 */
import { z } from "zod";
export declare const RunStatusSchema: z.ZodEnum<["pending", "running", "completed", "failed", "cancelled"]>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export declare const SessionStatusSchema: z.ZodEnum<["active", "archived", "completed"]>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export declare const ToolCallStatusSchema: z.ZodEnum<["pending", "awaiting_approval", "executing", "completed", "failed", "cancelled", "denied"]>;
export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;
export declare const ApprovalStatusSchema: z.ZodEnum<["pending", "approved", "denied", "timed_out"]>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export declare const EventTypeSchema: z.ZodEnum<["message", "tool_request", "tool_result", "finish", "error"]>;
export type EventType = z.infer<typeof EventTypeSchema>;
export declare const RiskLevelSchema: z.ZodEnum<["safe", "mutating", "destructive"]>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export declare const MessageRoleSchema: z.ZodEnum<["user", "assistant", "system", "tool"]>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export declare const ReportStatusSchema: z.ZodEnum<["PASS", "FAIL", "PARTIAL"]>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export declare const FinishReasonSchema: z.ZodEnum<["complete", "max_turns", "error", "cancelled"]>;
export type FinishReason = z.infer<typeof FinishReasonSchema>;
export declare const CONTRACTS_VERSION = "0.1.0";
/** Compatibility alias — Stage 1 planned name. Both resolve to "0.1.0". */
export declare const PACKAGE_CONTRACT_VERSION = "0.1.0";
//# sourceMappingURL=status.d.ts.map