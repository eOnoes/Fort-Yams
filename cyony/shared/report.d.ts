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
export declare const ToolCallSummarySchema: z.ZodObject<{
    tool: z.ZodString;
    argsSummary: z.ZodString;
    status: z.ZodEnum<["ok", "error"]>;
    duration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "ok" | "error";
    tool: string;
    argsSummary: string;
    duration?: number | undefined;
}, {
    status: "ok" | "error";
    tool: string;
    argsSummary: string;
    duration?: number | undefined;
}>;
export type ToolCallSummary = z.infer<typeof ToolCallSummarySchema>;
export declare const PersistenceWarningSchema: z.ZodObject<{
    operation: z.ZodString;
    message: z.ZodString;
    timestamp: z.ZodString;
    recoverable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    message: string;
    recoverable: boolean;
    operation: string;
    timestamp: string;
}, {
    message: string;
    recoverable: boolean;
    operation: string;
    timestamp: string;
}>;
export type PersistenceWarning = z.infer<typeof PersistenceWarningSchema>;
export declare const RunReportSchema: z.ZodObject<{
    sessionId: z.ZodString;
    runId: z.ZodString;
    status: z.ZodEnum<["PASS", "FAIL", "PARTIAL"]>;
    prompt: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
    startedAt: z.ZodString;
    completedAt: z.ZodString;
    elapsed: z.ZodNumber;
    events: z.ZodRecord<z.ZodString, z.ZodNumber>;
    toolCalls: z.ZodArray<z.ZodObject<{
        tool: z.ZodString;
        argsSummary: z.ZodString;
        status: z.ZodEnum<["ok", "error"]>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "ok" | "error";
        tool: string;
        argsSummary: string;
        duration?: number | undefined;
    }, {
        status: "ok" | "error";
        tool: string;
        argsSummary: string;
        duration?: number | undefined;
    }>, "many">;
    filesChanged: z.ZodArray<z.ZodString, "many">;
    validation: z.ZodOptional<z.ZodString>;
    nextStep: z.ZodString;
    path: z.ZodString;
    persistenceWarnings: z.ZodOptional<z.ZodArray<z.ZodObject<{
        operation: z.ZodString;
        message: z.ZodString;
        timestamp: z.ZodString;
        recoverable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        message: string;
        recoverable: boolean;
        operation: string;
        timestamp: string;
    }, {
        message: string;
        recoverable: boolean;
        operation: string;
        timestamp: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "PASS" | "FAIL" | "PARTIAL";
    path: string;
    runId: string;
    provider: string;
    model: string;
    sessionId: string;
    prompt: string;
    startedAt: string;
    completedAt: string;
    elapsed: number;
    events: Record<string, number>;
    toolCalls: {
        status: "ok" | "error";
        tool: string;
        argsSummary: string;
        duration?: number | undefined;
    }[];
    filesChanged: string[];
    nextStep: string;
    validation?: string | undefined;
    persistenceWarnings?: {
        message: string;
        recoverable: boolean;
        operation: string;
        timestamp: string;
    }[] | undefined;
}, {
    status: "PASS" | "FAIL" | "PARTIAL";
    path: string;
    runId: string;
    provider: string;
    model: string;
    sessionId: string;
    prompt: string;
    startedAt: string;
    completedAt: string;
    elapsed: number;
    events: Record<string, number>;
    toolCalls: {
        status: "ok" | "error";
        tool: string;
        argsSummary: string;
        duration?: number | undefined;
    }[];
    filesChanged: string[];
    nextStep: string;
    validation?: string | undefined;
    persistenceWarnings?: {
        message: string;
        recoverable: boolean;
        operation: string;
        timestamp: string;
    }[] | undefined;
}>;
export type RunReport = z.infer<typeof RunReportSchema>;
//# sourceMappingURL=report.d.ts.map