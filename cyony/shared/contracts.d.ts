/**
 * @tripp-os/contracts — generic interfaces
 *
 * Portable contract interfaces shared across Tripp.OS packages.
 * No Tripp.Reason-specific types. No runtime imports beyond zod.
 */
import { z } from "zod";
export interface ToolContext {
    sessionId: string;
    runId: string;
    workdir: string;
}
export interface ToolResult {
    status: "ok" | "error";
    output?: unknown;
    error?: string;
    toolCallId?: string;
}
export interface ProviderRequest {
    messages: Array<{
        role: string;
        content: string;
    }>;
    model?: string;
    tools?: unknown[];
    maxTurns?: number;
    systemPrompt?: string;
    temperature?: number;
}
export interface ApprovalRequest {
    toolName: string;
    riskLevel: string;
    args: unknown;
    sessionId: string;
    runId: string;
    toolCallId?: string;
}
export interface ApprovalResult {
    approved: boolean;
    reason?: string;
}
export declare const StreamEventMessageSchema: z.ZodObject<{
    type: z.ZodLiteral<"message">;
    content: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system", "tool"]>;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "message";
    content: string;
    role: "user" | "assistant" | "system" | "tool";
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    type: "message";
    content: string;
    role: "user" | "assistant" | "system" | "tool";
    sessionId?: string | undefined;
    runId?: string | undefined;
}>;
export type StreamEventMessage = z.infer<typeof StreamEventMessageSchema>;
export declare const StreamEventToolRequestSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_request">;
    tool: z.ZodString;
    args: z.ZodUnknown;
    requiresApproval: z.ZodBoolean;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    type: "tool_request";
    requiresApproval: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
    args?: unknown;
}, {
    tool: string;
    type: "tool_request";
    requiresApproval: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
    args?: unknown;
}>;
export type StreamEventToolRequest = z.infer<typeof StreamEventToolRequestSchema>;
export declare const StreamEventToolResultSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    tool: z.ZodString;
    result: z.ZodUnknown;
    status: z.ZodEnum<["ok", "error"]>;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    type: "tool_result";
    status: "error" | "ok";
    sessionId?: string | undefined;
    runId?: string | undefined;
    result?: unknown;
}, {
    tool: string;
    type: "tool_result";
    status: "error" | "ok";
    sessionId?: string | undefined;
    runId?: string | undefined;
    result?: unknown;
}>;
export type StreamEventToolResult = z.infer<typeof StreamEventToolResultSchema>;
export declare const StreamEventFinishSchema: z.ZodObject<{
    type: z.ZodLiteral<"finish">;
    reason: z.ZodEnum<["complete", "max_turns", "error", "cancelled"]>;
    runId: z.ZodString;
    reportPath: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "finish";
    runId: string;
    reason: "cancelled" | "error" | "complete" | "max_turns";
    sessionId?: string | undefined;
    reportPath?: string | undefined;
}, {
    type: "finish";
    runId: string;
    reason: "cancelled" | "error" | "complete" | "max_turns";
    sessionId?: string | undefined;
    reportPath?: string | undefined;
}>;
export type StreamEventFinish = z.infer<typeof StreamEventFinishSchema>;
export declare const StreamEventErrorSchema: z.ZodObject<{
    type: z.ZodLiteral<"error">;
    message: z.ZodString;
    recoverable: z.ZodBoolean;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "error";
    recoverable: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    message: string;
    type: "error";
    recoverable: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
}>;
export type StreamEventError = z.infer<typeof StreamEventErrorSchema>;
export declare const StreamEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"message">;
    content: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system", "tool"]>;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "message";
    content: string;
    role: "user" | "assistant" | "system" | "tool";
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    type: "message";
    content: string;
    role: "user" | "assistant" | "system" | "tool";
    sessionId?: string | undefined;
    runId?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool_request">;
    tool: z.ZodString;
    args: z.ZodUnknown;
    requiresApproval: z.ZodBoolean;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    type: "tool_request";
    requiresApproval: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
    args?: unknown;
}, {
    tool: string;
    type: "tool_request";
    requiresApproval: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
    args?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    tool: z.ZodString;
    result: z.ZodUnknown;
    status: z.ZodEnum<["ok", "error"]>;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    type: "tool_result";
    status: "error" | "ok";
    sessionId?: string | undefined;
    runId?: string | undefined;
    result?: unknown;
}, {
    tool: string;
    type: "tool_result";
    status: "error" | "ok";
    sessionId?: string | undefined;
    runId?: string | undefined;
    result?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"finish">;
    reason: z.ZodEnum<["complete", "max_turns", "error", "cancelled"]>;
    runId: z.ZodString;
    reportPath: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "finish";
    runId: string;
    reason: "cancelled" | "error" | "complete" | "max_turns";
    sessionId?: string | undefined;
    reportPath?: string | undefined;
}, {
    type: "finish";
    runId: string;
    reason: "cancelled" | "error" | "complete" | "max_turns";
    sessionId?: string | undefined;
    reportPath?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    message: z.ZodString;
    recoverable: z.ZodBoolean;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "error";
    recoverable: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    message: string;
    type: "error";
    recoverable: boolean;
    sessionId?: string | undefined;
    runId?: string | undefined;
}>]>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
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
    dispatch(toolName: string, input: unknown, context: ToolContext): Promise<ToolResult>;
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
//# sourceMappingURL=contracts.d.ts.map