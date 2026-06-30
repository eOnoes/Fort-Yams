/**
 * @tripp-os/contracts — generic status enums
 *
 * All status values as string literal unions + Zod schemas.
 * These are the portable primitives shared across Tripp.OS packages.
 */
import { z } from "zod";
// ── Run Status ──────────────────────────────────────────────────────
export const RunStatusSchema = z.enum([
    "pending",
    "running",
    "completed",
    "failed",
    "cancelled",
]);
// ── Session Status ──────────────────────────────────────────────────
export const SessionStatusSchema = z.enum([
    "active",
    "archived",
    "completed",
]);
// ── Tool Call Status ────────────────────────────────────────────────
export const ToolCallStatusSchema = z.enum([
    "pending",
    "awaiting_approval",
    "executing",
    "completed",
    "failed",
    "cancelled",
    "denied",
]);
// ── Approval Status ─────────────────────────────────────────────────
export const ApprovalStatusSchema = z.enum([
    "pending",
    "approved",
    "denied",
    "timed_out",
]);
// ── Event Type ──────────────────────────────────────────────────────
export const EventTypeSchema = z.enum([
    "message",
    "tool_request",
    "tool_result",
    "finish",
    "error",
]);
// ── Risk Level ──────────────────────────────────────────────────────
export const RiskLevelSchema = z.enum([
    "safe",
    "mutating",
    "destructive",
]);
// ── Message Role ────────────────────────────────────────────────────
export const MessageRoleSchema = z.enum([
    "user",
    "assistant",
    "system",
    "tool",
]);
// ── Report Status ───────────────────────────────────────────────────
export const ReportStatusSchema = z.enum(["PASS", "FAIL", "PARTIAL"]);
// ── Finish Reason ───────────────────────────────────────────────────
export const FinishReasonSchema = z.enum([
    "complete",
    "max_turns",
    "error",
    "cancelled",
]);
// ── Contracts Version ───────────────────────────────────────────────
export const CONTRACTS_VERSION = "0.1.0";
/** Compatibility alias — Stage 1 planned name. Both resolve to "0.1.0". */
export const PACKAGE_CONTRACT_VERSION = CONTRACTS_VERSION;
//# sourceMappingURL=status.js.map