import { createId } from "./ids.js";
import { nowIso } from "./time.js";
import { generateReport } from "./reportGenerator.js";
import { RunFailedError } from "./errors.js";
/**
 * Create a RunManager bound to the given repos and event stream.
 */
export function createRunManager(options) {
    const { repos, eventStream, workdir = process.cwd(), generateReportOnComplete = true, } = options;
    // ── In-memory warning tracking (Phase 2A) ──────────────
    const warningsByRun = new Map();
    // ── Helper: safely record event with persistence warning tracking ──
    async function safeRecordEvent(runId, event) {
        try {
            await recordEvent(runId, event);
        }
        catch (err) {
            const cause = err instanceof Error ? err.message : String(err);
            addPersistenceWarning(runId, {
                operation: "recordEvent",
                message: `Failed to persist ${event.type} event: ${cause}`,
                recoverable: true,
            });
        }
    }
    // ── Session lifecycle ──────────────────────────────────
    async function createSession(opts) {
        const now = nowIso();
        const session = {
            id: createId("sess"),
            title: opts.title ?? "Untitled Session",
            created_at: now,
            updated_at: now,
            status: "active",
            provider: opts.provider,
            model: opts.model,
            mode: opts.mode,
        };
        return repos.createSession(session);
    }
    // ── Run lifecycle ──────────────────────────────────────
    async function startRun(sessionId) {
        const session = await repos.getSession(sessionId);
        if (!session) {
            throw new RunFailedError("(none)", `session ${sessionId} not found`);
        }
        const run = {
            id: createId("run"),
            session_id: sessionId,
            status: "running",
            started_at: nowIso(),
            completed_at: undefined,
        };
        return repos.createRun(run);
    }
    async function completeRun(runId, status) {
        const result = await repos.completeRun(runId, status, nowIso());
        if (!result) {
            throw new RunFailedError(runId, "run not found in store");
        }
        // Auto-generate report on completion (unless opted out)
        if (generateReportOnComplete) {
            try {
                const warnings = getWarnings(runId);
                await generateReport(repos, runId, workdir, warnings.length > 0 ? warnings : undefined);
            }
            catch {
                // Report generation failure should not block run completion.
                // The error is non-fatal — the run is already marked complete.
            }
        }
        return result;
    }
    // ── Recording ──────────────────────────────────────────
    async function recordMessage(runId, role, content) {
        const run = await repos.getRun(runId);
        if (!run) {
            throw new RunFailedError(runId, "run not found");
        }
        const message = {
            id: createId("msg"),
            session_id: run.session_id,
            run_id: runId,
            role,
            content,
            created_at: nowIso(),
        };
        return repos.createMessage(message);
    }
    async function recordEvent(runId, streamEvent) {
        const run = await repos.getRun(runId);
        if (!run) {
            throw new RunFailedError(runId, "run not found");
        }
        // Persist to store FIRST (persist-before-emit)
        const event = {
            id: createId("evt"),
            session_id: run.session_id,
            run_id: runId,
            type: streamEvent.type,
            payload: streamEvent,
            created_at: nowIso(),
        };
        const persisted = await repos.createEvent(event);
        // THEN emit to subscribers (if EventStream was provided)
        if (eventStream) {
            eventStream.emit(streamEvent);
        }
        return persisted;
    }
    // ── Persistence Warnings (Phase 2A) ───────────────────
    function addPersistenceWarning(runId, warning) {
        const warnings = warningsByRun.get(runId) ?? [];
        warnings.push({
            ...warning,
            timestamp: nowIso(),
        });
        warningsByRun.set(runId, warnings);
    }
    function getWarnings(runId) {
        return warningsByRun.get(runId) ?? [];
    }
    // ── Tool Calls (Phase 2E) ──────────────────────────────
    async function recordToolCall(opts) {
        try {
            await repos.createToolCall({
                id: createId("tc"),
                session_id: opts.sessionId,
                run_id: opts.runId,
                tool_name: opts.toolName,
                args: opts.args,
                result: opts.result,
                status: opts.status === "ok" ? "completed" : "failed",
                created_at: nowIso(),
            });
        }
        catch (err) {
            const cause = err instanceof Error ? err.message : String(err);
            addPersistenceWarning(opts.runId, {
                operation: "createToolCall",
                message: `Failed to persist tool call ${opts.toolName}: ${cause}`,
                recoverable: true,
            });
        }
    }
    // ── Report ─────────────────────────────────────────────
    async function generateRunReport(runId) {
        const warnings = getWarnings(runId);
        return generateReport(repos, runId, workdir, warnings.length > 0 ? warnings : undefined);
    }
    return {
        createSession,
        startRun,
        completeRun,
        recordMessage,
        recordEvent,
        safeRecordEvent,
        recordToolCall,
        addPersistenceWarning,
        getWarnings,
        generateReport: generateRunReport,
    };
}
//# sourceMappingURL=runManager.js.map