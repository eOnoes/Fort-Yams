import { type AgentBusTraceEvent, type AgentBusTraceEventType, type AgentBusTraceSeverity, type AgentBusTraceActorType, type TraceLedgerValidationResult } from "./traceSchemas.js";
import type { ExternalAgentRole } from "./schemas.js";
export declare function getTraceLedgerPath(workdir?: string): string;
/** Ensure the trace ledger folder and file exist. Idempotent. */
export declare function ensureTraceLedger(workdir?: string): Promise<string>;
export interface CreateTraceEventInput {
    eventType: AgentBusTraceEventType;
    severity?: AgentBusTraceSeverity;
    actorType?: AgentBusTraceActorType;
    actorId?: string;
    runId?: string;
    parentRunId?: string;
    packetId?: string;
    resultId?: string;
    reviewId?: string;
    parentEventId?: string;
    rootCauseEventId?: string;
    agentRole?: ExternalAgentRole;
    parentAgentRole?: ExternalAgentRole;
    subagentId?: string;
    subagentRole?: string;
    toolNames?: string[];
    sourcePath?: string;
    targetPath?: string;
    summary: string;
    details?: Record<string, unknown>;
    tags?: string[];
}
/** Create a validated trace event object (does NOT write to disk). */
export declare function createTraceEvent(input: CreateTraceEventInput): AgentBusTraceEvent;
/** Append a validated trace event to the JSONL ledger. Returns the event. */
export declare function appendTraceEvent(event: AgentBusTraceEvent, workdir?: string): Promise<AgentBusTraceEvent>;
export interface ReadTraceOptions {
    workdir?: string;
    limit?: number;
}
/** Read and validate trace events from the JSONL ledger. */
export declare function readTraceEvents(options?: ReadTraceOptions): Promise<AgentBusTraceEvent[]>;
/** Validate the trace ledger, reporting malformed lines. */
export declare function validateTraceLedger(workdir?: string): Promise<TraceLedgerValidationResult>;
export interface FindTraceOptions {
    workdir?: string;
    limit?: number;
}
export declare function findTraceEventsByPacketId(packetId: string, options?: FindTraceOptions): Promise<AgentBusTraceEvent[]>;
export declare function findTraceEventsByResultId(resultId: string, options?: FindTraceOptions): Promise<AgentBusTraceEvent[]>;
export declare function findTraceEventsByReviewId(reviewId: string, options?: FindTraceOptions): Promise<AgentBusTraceEvent[]>;
export declare function findTraceEventsByRunId(runId: string, options?: FindTraceOptions): Promise<AgentBusTraceEvent[]>;
/** Follow parentEventId/rootCauseEventId to build a causal chain. */
export declare function findRootCauseChain(eventId: string, workdir?: string): Promise<AgentBusTraceEvent[]>;
//# sourceMappingURL=traceLedger.d.ts.map