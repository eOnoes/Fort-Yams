import type { TrippDb } from "./db.js";
import type { Session, Run, Message, Event, ToolCall, ApprovalRecord, ReportRecord, RunStatus, ApprovalStatus, ToolCallStatus } from "@tripp-reason/shared";
/**
 * Create a set of repository functions bound to the given db.
 */
export declare function createRepositories(db: TrippDb): {
    createSession: (input: Session) => Promise<Session>;
    getSession: (id: string) => Promise<Session | null>;
    listSessions: () => Promise<Session[]>;
    createRun: (input: Run) => Promise<Run>;
    getRun: (id: string) => Promise<Run | null>;
    completeRun: (id: string, status: RunStatus, completedAt?: string) => Promise<Run | null>;
    createMessage: (input: Message) => Promise<Message>;
    listMessagesBySession: (sessionId: string) => Promise<Message[]>;
    listMessagesByRun: (runId: string) => Promise<Message[]>;
    createEvent: (input: Event) => Promise<Event>;
    listEventsByRun: (runId: string) => Promise<Event[]>;
    createToolCall: (input: ToolCall) => Promise<ToolCall>;
    updateToolCallResult: (id: string, result: unknown, status: ToolCallStatus) => Promise<ToolCall | null>;
    listToolCallsByRun: (runId: string) => Promise<ToolCall[]>;
    createApproval: (input: ApprovalRecord) => Promise<ApprovalRecord>;
    resolveApproval: (id: string, status: ApprovalStatus, reason?: string, resolvedAt?: string) => Promise<ApprovalRecord | null>;
    listApprovalsByRun: (runId: string) => Promise<ApprovalRecord[]>;
    createReportRecord: (input: ReportRecord) => Promise<ReportRecord>;
    getReportByRun: (runId: string) => Promise<ReportRecord | null>;
    listReportsBySession: (sessionId: string) => Promise<ReportRecord[]>;
};
/** Convenience type for consumer code. */
export type Repositories = ReturnType<typeof createRepositories>;
//# sourceMappingURL=repositories.d.ts.map