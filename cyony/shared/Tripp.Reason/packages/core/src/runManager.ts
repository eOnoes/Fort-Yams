/**
 * @tripp-reason/core — RunManager
 *
 * Minimal run lifecycle manager. This is NOT the full ReasonLoop —
 * it manages session/run creation, message/event recording, and
 * report generation. The actual LLM loop (Phase 1D) will use this.
 *
 * Lifecycle:
 *   createSession(provider, model) → Session
 *   startRun(sessionId) → Run
 *   recordMessage(runId, role, content) → Message
 *   recordEvent(runId, streamEvent) → Event
 *   completeRun(runId, status) → Run (triggers report generation)
 *
 * Design decisions:
 * - Persist-before-emit: events are stored via repos THEN emitted to EventStream
 * - RunManager generates IDs internally using createId(prefix)
 * - ApprovalGate is optional — injected if needed
 * - Report generation happens on completeRun (can be opted out)
 * - No provider calls — this is lifecycle scaffolding only
 * 
 * Phase 2A additions:
 * - Track persistence warnings in-memory (per-run)
 * - Pass warnings to report generator
 * - Warnings are transient (lost on process death) — acceptable for Phase 2
 */
import type {
  Session,
  Run,
  Message,
  Event,
  StreamEvent,
  RunStatus,
  RunReport,
  MessageRole,
  PersistenceWarning,
} from "@tripp-reason/shared";
import type { Repositories } from "@tripp-reason/store";
import type { EventStream } from "./eventStream.js";
import type { ApprovalGate } from "./approvalGate.js";
import { createId } from "./ids.js";
import { nowIso } from "./time.js";
import { generateReport } from "./reportGenerator.js";
import { RunFailedError } from "./errors.js";

export interface RunManagerOptions {
  repos: Repositories;
  eventStream?: EventStream;
  approvalGate?: ApprovalGate;
  /** Working directory for report file paths. Default: process.cwd() */
  workdir?: string;
  /** If false, completeRun skips report generation. Default: true */
  generateReportOnComplete?: boolean;
}

export interface RunManager {
  // ── Session lifecycle ────────────────────────────────────
  createSession(opts: {
    title?: string;
    provider: string;
    model: string;
    mode?: string;
  }): Promise<Session>;

  // ── Run lifecycle ────────────────────────────────────────
  startRun(sessionId: string): Promise<Run>;
  completeRun(runId: string, status: RunStatus): Promise<Run>;

  // ── Recording ────────────────────────────────────────────
  recordMessage(runId: string, role: MessageRole, content: string): Promise<Message>;
  recordEvent(runId: string, streamEvent: StreamEvent): Promise<Event>;
  /** Safe wrapper: catches persistence failures and tracks warnings. */
  safeRecordEvent(runId: string, streamEvent: StreamEvent): Promise<void>;

  // ── Tool Calls (Phase 2E) ────────────────────────────────
  recordToolCall(opts: {
    runId: string;
    sessionId: string;
    toolName: string;
    args: unknown;
    result: unknown;
    status: string;
  }): Promise<void>;

  // ── Persistence Warnings (Phase 2A) ─────────────────────
  addPersistenceWarning(runId: string, warning: Omit<PersistenceWarning, "timestamp">): void;
  getWarnings(runId: string): PersistenceWarning[];

  // ── Report ───────────────────────────────────────────────
  generateReport(runId: string): Promise<RunReport>;
}

/**
 * Create a RunManager bound to the given repos and event stream.
 */
export function createRunManager(options: RunManagerOptions): RunManager {
  const {
    repos,
    eventStream,
    workdir = process.cwd(),
    generateReportOnComplete = true,
  } = options;

  // ── In-memory warning tracking (Phase 2A) ──────────────
  const warningsByRun = new Map<string, PersistenceWarning[]>();

  // ── Helper: safely record event with persistence warning tracking ──
  async function safeRecordEvent(runId: string, event: StreamEvent): Promise<void> {
    try {
      await recordEvent(runId, event);
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      addPersistenceWarning(runId, {
        operation: "recordEvent",
        message: `Failed to persist ${event.type} event: ${cause}`,
        recoverable: true,
      });
    }
  }

  // ── Session lifecycle ──────────────────────────────────

  async function createSession(opts: {
    title?: string;
    provider: string;
    model: string;
    mode?: string;
  }): Promise<Session> {
    const now = nowIso();
    const session: Session = {
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

  async function startRun(sessionId: string): Promise<Run> {
    const session = await repos.getSession(sessionId);
    if (!session) {
      throw new RunFailedError("(none)", `session ${sessionId} not found`);
    }

    const run: Run = {
      id: createId("run"),
      session_id: sessionId,
      status: "running",
      started_at: nowIso(),
      completed_at: undefined,
    };
    return repos.createRun(run);
  }

  async function completeRun(
    runId: string,
    status: RunStatus
  ): Promise<Run> {
    const result = await repos.completeRun(runId, status, nowIso());
    if (!result) {
      throw new RunFailedError(runId, "run not found in store");
    }

    // Auto-generate report on completion (unless opted out)
    if (generateReportOnComplete) {
      try {
        const warnings = getWarnings(runId);
        await generateReport(repos, runId, workdir, warnings.length > 0 ? warnings : undefined);
      } catch {
        // Report generation failure should not block run completion.
        // The error is non-fatal — the run is already marked complete.
      }
    }

    return result;
  }

  // ── Recording ──────────────────────────────────────────

  async function recordMessage(
    runId: string,
    role: MessageRole,
    content: string
  ): Promise<Message> {
    const run = await repos.getRun(runId);
    if (!run) {
      throw new RunFailedError(runId, "run not found");
    }

    const message: Message = {
      id: createId("msg"),
      session_id: run.session_id,
      run_id: runId,
      role,
      content,
      created_at: nowIso(),
    };
    return repos.createMessage(message);
  }

  async function recordEvent(
    runId: string,
    streamEvent: StreamEvent
  ): Promise<Event> {
    const run = await repos.getRun(runId);
    if (!run) {
      throw new RunFailedError(runId, "run not found");
    }

    // Persist to store FIRST (persist-before-emit)
    const event: Event = {
      id: createId("evt"),
      session_id: run.session_id,
      run_id: runId,
      type: streamEvent.type,
      payload: streamEvent as unknown,
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

  function addPersistenceWarning(
    runId: string,
    warning: Omit<PersistenceWarning, "timestamp">
  ): void {
    const warnings = warningsByRun.get(runId) ?? [];
    warnings.push({
      ...warning,
      timestamp: nowIso(),
    });
    warningsByRun.set(runId, warnings);
  }

  function getWarnings(runId: string): PersistenceWarning[] {
    return warningsByRun.get(runId) ?? [];
  }

  // ── Tool Calls (Phase 2E) ──────────────────────────────

  async function recordToolCall(opts: {
    runId: string;
    sessionId: string;
    toolName: string;
    args: unknown;
    result: unknown;
    status: string;
  }): Promise<void> {
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
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      addPersistenceWarning(opts.runId, {
        operation: "createToolCall",
        message: `Failed to persist tool call ${opts.toolName}: ${cause}`,
        recoverable: true,
      });
    }
  }

  // ── Report ─────────────────────────────────────────────

  async function generateRunReport(runId: string): Promise<RunReport> {
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
