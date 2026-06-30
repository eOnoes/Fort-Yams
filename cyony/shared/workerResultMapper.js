/**
 * @tripp-reason/swarm — worker result mapper
 *
 * Maps ReasonLoop output to a structured ResultPacket.
 * Phase 5E. Pure data transformation — no I/O, no providers.
 */
// ── JSON Extraction ──────────────────────────────────────────────────
/**
 * Try to extract a JSON object from the assistant message.
 * Handles markdown code fences and stray text.
 */
function extractJson(text) {
    if (!text || text.trim().length === 0)
        return null;
    // Try direct parse first
    try {
        return JSON.parse(text.trim());
    }
    catch {
        // Fall through
    }
    // Try extracting from ```json fence
    const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonBlock && jsonBlock[1]) {
        try {
            return JSON.parse(jsonBlock[1].trim());
        }
        catch {
            // Fall through
        }
    }
    // Try extracting from ``` fence (no language)
    const codeBlock = text.match(/```\s*([\s\S]*?)\s*```/i);
    if (codeBlock && codeBlock[1]) {
        try {
            return JSON.parse(codeBlock[1].trim());
        }
        catch {
            // Fall through
        }
    }
    // Try finding a JSON object in the text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try {
            return JSON.parse(objMatch[0]);
        }
        catch {
            // Fall through
        }
    }
    return null;
}
// ── Mapper ───────────────────────────────────────────────────────────
/**
 * Map a ReasonLoopResult to a structured ResultPacket.
 *
 * If the worker output is valid structured JSON, it populates
 * the ResultPacket fields. If not, it creates a partial result
 * with the raw output preserved.
 */
export function mapWorkerResult(input) {
    const { taskId, role, loopResult, timedOut, timeoutMs } = input;
    // Timeout → partial/partial
    if (timedOut) {
        return buildTimedOutResult(taskId, role, loopResult, timeoutMs);
    }
    // Failed run → fail
    if (loopResult.status === "failed" || loopResult.status === "cancelled") {
        return buildFailedResult(taskId, role, loopResult);
    }
    // Try structured extraction
    const json = extractJson(loopResult.assistantMessage);
    if (json && typeof json === "object") {
        return buildStructuredResult(taskId, role, loopResult, json);
    }
    // Unstructured → partial with raw
    return buildPartialResult(taskId, role, loopResult);
}
// ── Result Builders ──────────────────────────────────────────────────
function buildStructuredResult(taskId, role, loopResult, json) {
    const status = validateStatus(String(json.status ?? "pass"));
    const summary = String(json.summary ?? loopResult.assistantMessage.slice(0, 2000));
    const findings = safeFindings(json.findings);
    const filesTouched = safeStringArray(json.filesTouched);
    const toolCalls = safeToolCallSummaries(json.toolCalls);
    const proposedChanges = safeProposedChanges(json.proposedChanges);
    const validation = String(json.validation ?? "");
    const risks = safeRisks(json.risks);
    const nextRecommendation = String(json.nextRecommendation ?? "");
    return {
        taskId,
        role,
        status,
        summary: capped(summary, 2000),
        findings,
        filesTouched,
        toolCalls,
        proposedChanges,
        validation: capped(validation, 2000),
        risks,
        nextRecommendation: capped(nextRecommendation, 500),
        rawArtifacts: loopResult.assistantMessage.length > 2000
            ? loopResult.assistantMessage.slice(0, 5000)
            : undefined,
    };
}
function buildPartialResult(taskId, role, loopResult) {
    return {
        taskId,
        role,
        status: "partial",
        summary: "Worker output was not structured JSON. See rawArtifacts.",
        findings: [{
                severity: "warning",
                message: "Worker output was not structured. Raw output preserved in rawArtifacts.",
                source: "worker-result-mapper",
            }],
        filesTouched: [],
        toolCalls: [],
        proposedChanges: [],
        validation: "Result mapper could not parse structured output.",
        risks: [{
                level: "medium",
                description: "Unstructured worker output — results may be incomplete or malformed.",
                mitigation: "Review rawArtifacts. Adjust worker prompt to enforce JSON output format.",
            }],
        nextRecommendation: "Review raw output and re-run with improved prompt if needed.",
        rawArtifacts: loopResult.assistantMessage.slice(0, 5000),
    };
}
function buildTimedOutResult(taskId, role, loopResult, timeoutMs) {
    return {
        taskId,
        role,
        status: "partial",
        summary: `Worker timed out${timeoutMs ? ` after ${timeoutMs}ms` : ""}.`,
        findings: [{
                severity: "warning",
                message: `Worker exceeded the timeout limit${timeoutMs ? ` (${timeoutMs}ms)` : ""}. Partial results may be available.`,
                source: "worker-runner",
            }],
        filesTouched: [],
        toolCalls: [],
        proposedChanges: [],
        validation: "Worker timeout — execution interrupted.",
        risks: [{
                level: "medium",
                description: "Worker timeout — results may be incomplete.",
                mitigation: "Increase timeoutMs or simplify task scope.",
            }],
        nextRecommendation: "Retry with increased timeout or delegate to another worker.",
        rawArtifacts: loopResult.assistantMessage.slice(0, 2000),
    };
}
function buildFailedResult(taskId, role, loopResult) {
    return {
        taskId,
        role,
        status: "fail",
        summary: `Worker execution failed with status: ${loopResult.status}`,
        findings: [{
                severity: "critical",
                message: `ReasonLoop run failed (status: ${loopResult.status}).`,
                source: "worker-runner",
            }],
        filesTouched: [],
        toolCalls: [],
        proposedChanges: [],
        validation: `Run failed: ${loopResult.status}`,
        risks: [{
                level: "high",
                description: `Worker run failed with status: ${loopResult.status}`,
                mitigation: "Investigate ReasonLoop error and re-delegate.",
            }],
        nextRecommendation: "Investigate failure and re-delegate task.",
        rawArtifacts: loopResult.assistantMessage.slice(0, 2000),
    };
}
// ── Safe Extractors ──────────────────────────────────────────────────
function validateStatus(raw) {
    if (raw === "pass" || raw === "partial" || raw === "fail")
        return raw;
    return "partial";
}
function safeFindings(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((f) => {
        if (f && typeof f === "object") {
            const item = f;
            const severity = ["info", "warning", "critical"].includes(String(item.severity))
                ? item.severity
                : "info";
            return {
                severity,
                message: String(item.message ?? ""),
                source: String(item.source ?? "unknown"),
            };
        }
        return { severity: "info", message: String(f), source: "unknown" };
    });
}
function safeStringArray(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map(String);
}
function safeToolCallSummaries(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((t) => {
        if (t && typeof t === "object") {
            const item = t;
            const status = item.status === "error" ? "error" : "ok";
            return {
                tool: String(item.tool ?? "unknown"),
                status,
                summary: String(item.summary ?? ""),
            };
        }
        return { tool: "unknown", status: "ok", summary: String(t) };
    });
}
function safeProposedChanges(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((c) => {
        if (c && typeof c === "object") {
            const item = c;
            return {
                file: String(item.file ?? ""),
                diff: String(item.diff ?? "").slice(0, 10000),
                reason: String(item.reason ?? ""),
            };
        }
        return { file: "", diff: "", reason: String(c) };
    }).filter((c) => c.file.length > 0);
}
function safeRisks(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((r) => {
        if (r && typeof r === "object") {
            const item = r;
            const level = ["low", "medium", "high"].includes(String(item.level))
                ? item.level
                : "low";
            return {
                level,
                description: String(item.description ?? ""),
                mitigation: item.mitigation ? String(item.mitigation) : undefined,
            };
        }
        return { level: "low", description: String(r) };
    });
}
function capped(text, limit) {
    if (text.length <= limit)
        return text;
    return text.slice(0, limit - 3) + "...";
}
//# sourceMappingURL=workerResultMapper.js.map