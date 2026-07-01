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
export type RunStatus = z.infer<typeof RunStatusSchema>;

// ── Session Status ──────────────────────────────────────────────────
export const SessionStatusSchema = z.enum([
  "active",
  "archived",
  "completed",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

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
export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;

// ── Approval Status ─────────────────────────────────────────────────
export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "denied",
  "timed_out",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

// ── Event Type ──────────────────────────────────────────────────────
export const EventTypeSchema = z.enum([
  "message",
  "tool_request",
  "tool_result",
  "finish",
  "error",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

// ── Risk Level ──────────────────────────────────────────────────────
export const RiskLevelSchema = z.enum([
  "safe",
  "mutating",
  "destructive",
]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// ── Message Role ────────────────────────────────────────────────────
export const MessageRoleSchema = z.enum([
  "user",
  "assistant",
  "system",
  "tool",
]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// ── Report Status ───────────────────────────────────────────────────
export const ReportStatusSchema = z.enum(["PASS", "FAIL", "PARTIAL"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// ── Finish Reason ───────────────────────────────────────────────────
export const FinishReasonSchema = z.enum([
  "complete",
  "max_turns",
  "error",
  "cancelled",
]);
export type FinishReason = z.infer<typeof FinishReasonSchema>;

// ── Contracts Version ───────────────────────────────────────────────
export const CONTRACTS_VERSION = "0.1.0";

/** Compatibility alias — Stage 1 planned name. Both resolve to "0.1.0". */
export const PACKAGE_CONTRACT_VERSION = CONTRACTS_VERSION;
