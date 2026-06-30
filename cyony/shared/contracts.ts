/**
 * @tripp-os/contracts — generic interfaces
 *
 * Portable contract interfaces shared across Tripp.OS packages.
 * No Tripp.Reason-specific types. No runtime imports beyond zod.
 */
import { z } from "zod";

// ── ToolContext ──────────────────────────────────────────────────────
export interface ToolContext {
  sessionId: string;
  runId: string;
  workdir: string;
}

// ── ToolResult (generic) ─────────────────────────────────────────────
export interface ToolResult {
  status: "ok" | "error";
  output?: unknown;
  error?: string;
  toolCallId?: string;
}

// ── ProviderRequest (generic) ────────────────────────────────────────
export interface ProviderRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  tools?: unknown[];
  maxTurns?: number;
  systemPrompt?: string;
  temperature?: number;
}

// ── ApprovalRequest (generic) ────────────────────────────────────────
export interface ApprovalRequest {
  toolName: string;
  riskLevel: string;
  args: unknown;
  sessionId: string;
  runId: string;
  toolCallId?: string;
}

// ── ApprovalResult (generic) ─────────────────────────────────────────
export interface ApprovalResult {
  approved: boolean;
  reason?: string;
}

// ── StreamEvent (generic protocol types) ─────────────────────────────
import {
  EventTypeSchema,
  MessageRoleSchema,
  FinishReasonSchema,
} from "./status.js";

export const StreamEventMessageSchema = z.object({
  type: z.literal("message"),
  content: z.string(),
  role: MessageRoleSchema,
  sessionId: z.string().optional(),
  runId: z.string().optional(),
});
export type StreamEventMessage = z.infer<typeof StreamEventMessageSchema>;

export const StreamEventToolRequestSchema = z.object({
  type: z.literal("tool_request"),
  tool: z.string(),
  args: z.unknown(),
  requiresApproval: z.boolean(),
  sessionId: z.string().optional(),
  runId: z.string().optional(),
});
export type StreamEventToolRequest = z.infer<typeof StreamEventToolRequestSchema>;

export const StreamEventToolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool: z.string(),
  result: z.unknown(),
  status: z.enum(["ok", "error"]),
  sessionId: z.string().optional(),
  runId: z.string().optional(),
});
export type StreamEventToolResult = z.infer<typeof StreamEventToolResultSchema>;

export const StreamEventFinishSchema = z.object({
  type: z.literal("finish"),
  reason: FinishReasonSchema,
  runId: z.string(),
  reportPath: z.string().optional(),
  sessionId: z.string().optional(),
});
export type StreamEventFinish = z.infer<typeof StreamEventFinishSchema>;

export const StreamEventErrorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
  recoverable: z.boolean(),
  sessionId: z.string().optional(),
  runId: z.string().optional(),
});
export type StreamEventError = z.infer<typeof StreamEventErrorSchema>;

export const StreamEventSchema = z.discriminatedUnion("type", [
  StreamEventMessageSchema,
  StreamEventToolRequestSchema,
  StreamEventToolResultSchema,
  StreamEventFinishSchema,
  StreamEventErrorSchema,
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ── Core Interfaces ──────────────────────────────────────────────────

/**
 * What a Tool looks like to the runtime.
 */
export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<unknown>;
  readonly requiresApproval: boolean;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

/**
 * Aggregates multiple Tool instances and routes dispatch calls.
 */
export interface ToolDispatcher {
  listTools(): Tool[];
  dispatch(
    toolName: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult>;
}

/**
 * What core expects from an LLM provider.
 */
export interface ProviderAdapter {
  readonly name: string;
  stream(request: ProviderRequest): AsyncIterable<StreamEvent>;
  listModels(): Promise<string[]>;
}

/**
 * What core expects from the approval layer.
 */
export interface Approver {
  requestApproval(operation: ApprovalRequest): Promise<ApprovalResult>;
}
