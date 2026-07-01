/**
 * @tripp-reason/shared — barrel export
 *
 * Single entry point for the entire shared package.
 * All other packages import from "@tripp-reason/shared".
 *
 * This package has ZERO runtime code, ZERO dependencies on other
 * internal packages, and ZERO implementations. Pure contracts only.
 */

// ── Status enums ────────────────────────────────────────────────────
export {
  RunStatusSchema,
  SessionStatusSchema,
  ToolCallStatusSchema,
  ApprovalStatusSchema,
  EventTypeSchema,
  RiskLevelSchema,
  MessageRoleSchema,
  ReportStatusSchema,
  FinishReasonSchema,
} from "./status.js";
export type {
  RunStatus,
  SessionStatus,
  ToolCallStatus,
  ApprovalStatus,
  EventType,
  RiskLevel,
  MessageRole,
  ReportStatus,
  FinishReason,
} from "./status.js";

// ── Core data schemas ───────────────────────────────────────────────
export {
  MessageSchema,
  ChatMessageSchema,
  SessionSchema,
  RunSchema,
  EventSchema,
  ToolCallSchema,
  ApprovalRecordSchema,
  ReportRecordSchema,
  ProviderRequestSchema,
  ApprovalRequestSchema,
  ApprovalResultSchema,
  ToolResultSchema,
} from "./schemas.js";
export type {
  Message,
  ChatMessage,
  Session,
  Run,
  Event,
  ToolCall,
  ApprovalRecord,
  ReportRecord,
  ProviderRequest,
  ApprovalRequest,
  ApprovalResult,
  ToolResult,
} from "./schemas.js";

// ── StreamEvent union ───────────────────────────────────────────────
export {
  StreamEventSchema,
  StreamEventMessageSchema,
  StreamEventToolRequestSchema,
  StreamEventToolResultSchema,
  StreamEventFinishSchema,
  StreamEventErrorSchema,
} from "./events.js";
export type {
  StreamEvent,
  StreamEventMessage,
  StreamEventToolRequest,
  StreamEventToolResult,
  StreamEventFinish,
  StreamEventError,
} from "./events.js";

// ── Contracts (interfaces) ──────────────────────────────────────────
export type {
  ProviderAdapter,
  Tool,
  ToolDispatcher,
  Approver,
  ToolContext,
} from "./contracts.js";

// ── RunReport ───────────────────────────────────────────────────────
export {
  RunReportSchema,
  ToolCallSummarySchema,
  PersistenceWarningSchema,
} from "./report.js";
export type {
  RunReport,
  ToolCallSummary,
  PersistenceWarning,
} from "./report.js";
