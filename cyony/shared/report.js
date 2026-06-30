/**
 * @tripp-reason/shared — RunReport schema
 *
 * Every completed run produces a structured report. This schema defines
 * the data shape. The Markdown rendering is handled by core/RunManager
 * using this data as input.
 *
 * Report path: reports/<session-id>/<run-id>.md
 */
import { z } from "zod";
import { ReportStatusSchema } from "./status.js";
// ── ToolCallSummary (one entry per tool invocation in the run) ──────
export const ToolCallSummarySchema = z.object({
    tool: z.string(),
    argsSummary: z.string(),
    status: z.enum(["ok", "error"]),
    duration: z.number().optional(),
});
// ── PersistenceWarning (Phase 2A: audit gaps from failed persistence) ──
export const PersistenceWarningSchema = z.object({
    operation: z.string(), // e.g., "recordEvent", "recordMessage", "createReportRecord"
    message: z.string(), // controlled error message (no stack traces)
    timestamp: z.string().datetime(), // when the failure occurred
    recoverable: z.boolean(), // whether the run could continue
});
// ── RunReport (structured report data) ──────────────────────────────
export const RunReportSchema = z.object({
    sessionId: z.string(),
    runId: z.string(),
    status: ReportStatusSchema,
    prompt: z.string(),
    provider: z.string(),
    model: z.string(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    elapsed: z.number(), // milliseconds
    events: z.record(z.string(), z.number()), // { message: 5, tool_request: 2, ... }
    toolCalls: z.array(ToolCallSummarySchema),
    filesChanged: z.array(z.string()),
    validation: z.string().optional(),
    nextStep: z.string(),
    path: z.string(), // file path on disk: reports/<session-id>/<run-id>.md
    persistenceWarnings: z.array(PersistenceWarningSchema).optional(), // Phase 2A: audit gaps
});
//# sourceMappingURL=report.js.map