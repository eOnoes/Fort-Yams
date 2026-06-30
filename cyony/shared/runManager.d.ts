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
import type { Session, Run, Message, Event, StreamEvent, RunStatus, RunReport, MessageRole, PersistenceWarning } from "@tripp-reason/shared";
import type { Repositories } from "@tripp-reason/store";
import type { EventStream } from "./eventStream.js";
import type { ApprovalGate } from "./approvalGate.js";
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
    createSession(opts: {
        title?: string;
        provider: string;
        model: string;
        mode?: string;
    }): Promise<Session>;
    startRun(sessionId: string): Promise<Run>;
    completeRun(runId: string, status: RunStatus): Promise<Run>;
    recordMessage(runId: string, role: MessageRole, content: string): Promise<Message>;
    recordEvent(runId: string, streamEvent: StreamEvent): Promise<Event>;
    /** Safe wrapper: catches persistence failures and tracks warnings. */
    safeRecordEvent(runId: string, streamEvent: StreamEvent): Promise<void>;
    recordToolCall(opts: {
        runId: string;
        sessionId: string;
        toolName: string;
        args: unknown;
        result: unknown;
        status: string;
    }): Promise<void>;
    addPersistenceWarning(runId: string, warning: Omit<PersistenceWarning, "timestamp">): void;
    getWarnings(runId: string): PersistenceWarning[];
    generateReport(runId: string): Promise<RunReport>;
}
/**
 * Create a RunManager bound to the given repos and event stream.
 */
export declare function createRunManager(options: RunManagerOptions): RunManager;
//# sourceMappingURL=runManager.d.ts.map