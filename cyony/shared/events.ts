/**
 * @tripp-reason/shared — StreamEvent union
 *
 * Discriminated union of all event types that flow through the
 * EventStream. Every event is persisted before emission.
 *
 * Variants:
 * - message: assistant response chunk
 * - tool_request: tool invocation requested by the model
 * - tool_result: tool execution completed
 * - finish: run completed (for any reason)
 * - error: unrecoverable or recoverable error
 */
import { z } from "zod";
import { FinishReasonSchema } from "./status.js";

export const StreamEventMessageSchema = z.object({
  type: z.literal("message"),
  content: z.string(),
  role: z.literal("assistant"),
});

export const StreamEventToolRequestSchema = z.object({
  type: z.literal("tool_request"),
  tool: z.string(),
  args: z.unknown(),
  requiresApproval: z.boolean(),
});

export const StreamEventToolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool: z.string(),
  result: z.unknown(),
  status: z.enum(["ok", "error"]),
});

export const StreamEventFinishSchema = z.object({
  type: z.literal("finish"),
  reason: FinishReasonSchema,
  runId: z.string(),
});

export const StreamEventErrorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
  recoverable: z.boolean(),
});

export const StreamEventSchema = z.discriminatedUnion("type", [
  StreamEventMessageSchema,
  StreamEventToolRequestSchema,
  StreamEventToolResultSchema,
  StreamEventFinishSchema,
  StreamEventErrorSchema,
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type StreamEventMessage = z.infer<typeof StreamEventMessageSchema>;
export type StreamEventToolRequest = z.infer<typeof StreamEventToolRequestSchema>;
export type StreamEventToolResult = z.infer<typeof StreamEventToolResultSchema>;
export type StreamEventFinish = z.infer<typeof StreamEventFinishSchema>;
export type StreamEventError = z.infer<typeof StreamEventErrorSchema>;
