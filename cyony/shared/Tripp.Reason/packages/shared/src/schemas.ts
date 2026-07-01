/**
 * @tripp-reason/shared — core data schemas
 *
 * Zod schemas for all persisted data shapes. Derived TypeScript types
 * are exported alongside each schema.
 *
 * Design notes:
 * - Message has two shapes: stored (DB record) and chat (provider request)
 * - All timestamps are ISO 8601 datetime strings
 * - IDs are string type (UUIDv7 recommended at creation time)
 * - JSON payload fields (args, result, parameters) are z.unknown()
 */
import { z } from "zod";
import {
  RunStatusSchema,
  SessionStatusSchema,
  ToolCallStatusSchema,
  ApprovalStatusSchema,
  EventTypeSchema,
  RiskLevelSchema,
  MessageRoleSchema,
} from "./status.js";

// ── Message (stored DB record) ──────────────────────────────────────
export const MessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  run_id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  created_at: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

// ── ChatMessage (sent to providers, no DB fields) ───────────────────
export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ── Session ─────────────────────────────────────────────────────────
export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  status: SessionStatusSchema,
  provider: z.string(),
  model: z.string(),
  mode: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

// ── Run ─────────────────────────────────────────────────────────────
export const RunSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  status: RunStatusSchema,
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
});
export type Run = z.infer<typeof RunSchema>;

// ── Event ───────────────────────────────────────────────────────────
export const EventSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  run_id: z.string(),
  type: EventTypeSchema,
  payload: z.unknown(),
  created_at: z.string().datetime(),
});
export type Event = z.infer<typeof EventSchema>;

// ── ToolCall ────────────────────────────────────────────────────────
export const ToolCallSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  run_id: z.string(),
  tool_name: z.string(),
  args: z.unknown(),
  result: z.unknown().nullable().optional(),
  status: ToolCallStatusSchema,
  created_at: z.string().datetime(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

// ── Approval ────────────────────────────────────────────────────────
export const ApprovalRecordSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  run_id: z.string(),
  tool_call_id: z.string(),
  status: ApprovalStatusSchema,
  reason: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().optional(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;

// ── Report (persisted record) ───────────────────────────────────────
export const ReportRecordSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  run_id: z.string(),
  path: z.string(),
  summary: z.string(),
  created_at: z.string().datetime(),
});
export type ReportRecord = z.infer<typeof ReportRecordSchema>;

// ── ProviderRequest (sent to provider adapter) ──────────────────────
export const ProviderRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()).optional(),
  })).optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type ProviderRequest = z.infer<typeof ProviderRequestSchema>;

// ── ApprovalRequest (sent to approver) ──────────────────────────────
export const ApprovalRequestSchema = z.object({
  toolName: z.string(),
  args: z.unknown(),
  riskLevel: RiskLevelSchema,
  context: z.object({
    session_id: z.string(),
    run_id: z.string(),
  }),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

// ── ApprovalResult (returned by approver) ───────────────────────────
export const ApprovalResultSchema = z.discriminatedUnion("approved", [
  z.object({
    approved: z.literal(true),
    reason: z.string().optional(),
  }),
  z.object({
    approved: z.literal(false),
    reason: z.string(),
  }),
]);
export type ApprovalResult = z.infer<typeof ApprovalResultSchema>;

// ── ToolResult (returned by tool execution) ─────────────────────────
export const ToolResultSchema = z.object({
  status: z.enum(["ok", "error"]),
  output: z.unknown().nullable(),
  error: z.string().optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;
