/**
 * @tripp-reason/core — Report Generator
 *
 * Generates a Markdown run report from stored data and writes it to disk.
 *
 * Flow:
 *   1. Query store for run, session, messages, events, tool calls
 *   2. Build RunReport data structure
 *   3. Render Markdown text
 *   4. Write file to reports/<session-id>/<run-id>.md
 *   5. Create ReportRecord via store
 *   6. Return RunReport
 *
 * Design decisions:
 * - ReportGenerator is a pure function over store data (no LLM calls)
 * - Uses store's reportPath helper for consistent path computation
 * - Creates directories with mkdirSync (recursive) before writing
 * - Summary for ReportRecord is the first 200 chars of the prompt
 * - Validation section is left as placeholder (CLI runs validation)
 *
 * Phase 2A additions:
 * - Accept persistenceWarnings parameter
 * - Compute status: completed + warnings → PARTIAL
 * - Render "Persistence Warnings" section if applicable
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { reportPath } from "@tripp-reason/store";
import { createId } from "./ids.js";
import { nowIso } from "./time.js";
import { ReportGenerationError } from "./errors.js";
/**
 * Generate a run report from stored data.
 *
 * @param repos - Store repositories bound to a db instance
 * @param runId - The run to generate a report for
 * @param workdir - Working directory for resolving relative report paths
 * @param persistenceWarnings - Phase 2A: warnings from failed persistence operations
 * @returns The RunReport data + the path where it was written
 */
export async function generateReport(repos, runId, workdir = process.cwd(), persistenceWarnings) {
    // 1. Fetch run data
    const run = await repos.getRun(runId);
    if (!run) {
        throw new ReportGenerationError(runId, "run not found");
    }
    const session = await repos.getSession(run.session_id);
    if (!session) {
        throw new ReportGenerationError(runId, "session not found");
    }
    const messages = await repos.listMessagesByRun(runId);
    const events = await repos.listEventsByRun(runId);
    const toolCalls = await repos.listToolCallsByRun(runId);
    // 2. Derive report fields
    const startedAt = run.started_at;
    const completedAt = run.completed_at ?? nowIso();
    const elapsed = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    // Count events by type
    const eventCounts = {};
    for (const e of events) {
        eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
    }
    // Summarize tool calls
    const toolCallSummaries = toolCalls.map((tc) => ({
        tool: tc.tool_name,
        argsSummary: summarizeArgs(tc.args),
        status: tc.status === "completed" ? "ok" : "error",
    }));
    // Extract files changed from tool call results (heuristic: look for file paths)
    const filesChanged = extractFilesChanged(toolCalls);
    // Determine status from run status + warnings (Phase 2A)
    const hasWarnings = persistenceWarnings && persistenceWarnings.length > 0;
    const status = run.status === "completed"
        ? hasWarnings
            ? "PARTIAL"
            : "PASS"
        : "FAIL";
    // Find the original user prompt (first user message)
    const prompt = messages.find((m) => m.role === "user")?.content ?? "(no prompt recorded)";
    // 3. Compute path
    const relPath = reportPath(session.id, runId);
    const absPath = `${workdir}/${relPath}`.replace(/\/\//g, "/");
    // 4. Determine next step
    let nextStep;
    if (run.status === "completed" && hasWarnings) {
        nextStep = "Review persistence warnings — audit trail is incomplete";
    }
    else if (run.status === "completed") {
        nextStep = "Ready for next task";
    }
    else {
        nextStep = "Review error events and retry or debug";
    }
    // 5. Build RunReport
    const report = {
        sessionId: session.id,
        runId,
        status,
        prompt,
        provider: session.provider,
        model: session.model,
        startedAt,
        completedAt,
        elapsed,
        events: eventCounts,
        toolCalls: toolCallSummaries,
        filesChanged,
        validation: "Pending CLI validation",
        nextStep,
        path: relPath,
        persistenceWarnings: hasWarnings ? persistenceWarnings : undefined,
    };
    // 6. Write markdown to disk
    const markdown = renderMarkdown(report);
    try {
        mkdirSync(dirname(absPath), { recursive: true });
        writeFileSync(absPath, markdown, "utf-8");
    }
    catch (err) {
        throw new ReportGenerationError(runId, `failed to write report file: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
    // 7. Persist report record
    const record = {
        id: createId("rpt"),
        session_id: session.id,
        run_id: runId,
        path: relPath,
        summary: prompt.length > 200 ? prompt.slice(0, 197) + "..." : prompt,
        created_at: nowIso(),
    };
    await repos.createReportRecord(record);
    return report;
}
// ── Helpers (internal) ──────────────────────────────────────────────
function summarizeArgs(args) {
    if (args === null || args === undefined)
        return "(none)";
    if (typeof args === "string")
        return args.length > 80 ? args.slice(0, 77) + "..." : args;
    if (typeof args === "object") {
        const str = JSON.stringify(args);
        return str.length > 80 ? str.slice(0, 77) + "..." : str;
    }
    return String(args);
}
function extractFilesChanged(toolCalls) {
    const files = new Set();
    for (const tc of toolCalls) {
        if (tc.result && typeof tc.result === "object" && tc.result !== null) {
            const r = tc.result;
            if (typeof r.path === "string")
                files.add(r.path);
            if (typeof r.file === "string")
                files.add(r.file);
            // Phase 2E: some tools nest path under output (ToolResult shape)
            const output = r.output;
            if (output && typeof output === "object") {
                const o = output;
                if (typeof o.path === "string")
                    files.add(o.path);
                if (typeof o.file === "string")
                    files.add(o.file);
            }
        }
    }
    return [...files].sort();
}
function renderMarkdown(r) {
    const lines = [];
    lines.push("# Run Report");
    lines.push("");
    lines.push("## STATUS");
    lines.push(`**${r.status}**`);
    lines.push("");
    lines.push("## SESSION");
    lines.push(`- Session: \`${r.sessionId}\``);
    lines.push(`- Run: \`${r.runId}\``);
    lines.push(`- Provider: ${r.provider}`);
    lines.push(`- Model: ${r.model}`);
    lines.push("");
    lines.push("## PROMPT");
    lines.push("```");
    lines.push(r.prompt);
    lines.push("```");
    lines.push("");
    lines.push("## DURATION");
    lines.push(`- Started: ${r.startedAt}`);
    lines.push(`- Completed: ${r.completedAt}`);
    lines.push(`- Elapsed: ${(r.elapsed / 1000).toFixed(1)}s`);
    lines.push("");
    lines.push("## EVENTS");
    const eventEntries = Object.entries(r.events);
    if (eventEntries.length === 0) {
        lines.push("(no events)");
    }
    else {
        for (const [type, count] of eventEntries) {
            lines.push(`- ${type}: ${count}`);
        }
    }
    lines.push("");
    lines.push("## TOOL CALLS");
    if (r.toolCalls.length === 0) {
        lines.push("(no tool calls)");
    }
    else {
        for (const tc of r.toolCalls) {
            const icon = tc.status === "ok" ? "✅" : "❌";
            lines.push(`- ${icon} **${tc.tool}** — ${tc.argsSummary}`);
        }
    }
    lines.push("");
    lines.push("## FILES CHANGED");
    if (r.filesChanged.length === 0) {
        lines.push("(none)");
    }
    else {
        for (const f of r.filesChanged) {
            lines.push(`- \`${f}\``);
        }
    }
    lines.push("");
    // Phase 2A: Persistence Warnings section
    if (r.persistenceWarnings && r.persistenceWarnings.length > 0) {
        lines.push("## PERSISTENCE WARNINGS");
        lines.push("");
        lines.push(`> ⚠️ ${r.persistenceWarnings.length} persistence operation(s) failed. Audit trail is incomplete.`);
        lines.push("");
        for (const w of r.persistenceWarnings) {
            const icon = w.recoverable ? "⚠️" : "❌";
            lines.push(`- ${icon} **${w.operation}** (${w.timestamp}): ${w.message}`);
        }
        lines.push("");
    }
    lines.push("## VALIDATION");
    lines.push(r.validation ?? "N/A");
    lines.push("");
    lines.push("## NEXT STEP");
    lines.push(r.nextStep);
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=reportGenerator.js.map