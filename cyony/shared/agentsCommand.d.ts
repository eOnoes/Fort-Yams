/**
 * tripp agents — Agent Bus CLI commands (Phase 7D)
 *
 * Commands: init, inbox, outbox, read, create-task, archive, reject
 *
 * Import boundary: CLI may import @tripp-reason/external-agents.
 * No live agents, no adapters, no watchers, no mutation authority.
 */
import { Command } from "commander";
export declare function executeAgentsInit(workdir?: string): Promise<void>;
export declare function executeAgentsInbox(workdir?: string): Promise<void>;
export declare function executeAgentsOutbox(workdir?: string): Promise<void>;
export declare function executeAgentsRead(filePath: string, workdir?: string): Promise<void>;
export declare function executeAgentsCreateTask(options: {
    agent: string;
    taskType: string;
    title: string;
    objective: string;
    scope: string;
    runId?: string;
    parentRunId?: string;
    allowedPath?: string[];
    deniedPath?: string[];
    constraint?: string[];
    requiredOutputFormat?: string;
    reportRequired?: string;
    contextBudget?: string;
    includeRepoSummary?: string;
    includeFileContents?: string;
    workdir?: string;
}): Promise<void>;
export declare function executeAgentsArchive(filePath: string, workdir?: string): Promise<void>;
export declare function executeAgentsReject(filePath: string, reason: string, workdir?: string): Promise<void>;
export declare function executeAgentsReview(resultFile: string, options: {
    verdict: string;
    summary: string;
    issue?: string[];
    boundaryFinding?: string[];
    doctrineFinding?: string[];
    safetyFinding?: string[];
    recommendedNextAction?: string;
    workdir?: string;
}): Promise<void>;
export declare function executeAgentsReviews(workdir?: string): Promise<void>;
export declare function executeAgentsReviewRead(filePath: string, workdir?: string): Promise<void>;
export declare function executeAgentsTraceAppend(options: {
    eventType: string;
    summary: string;
    severity?: string;
    actor?: string;
    runId?: string;
    parentRunId?: string;
    packetId?: string;
    resultId?: string;
    reviewId?: string;
    parentEventId?: string;
    rootCauseEventId?: string;
    agentRole?: string;
    parentAgentRole?: string;
    subagentId?: string;
    subagentRole?: string;
    tool?: string[];
    sourcePath?: string;
    targetPath?: string;
    tag?: string[];
    workdir?: string;
}): Promise<void>;
export declare function executeAgentsTraceList(options: {
    limit?: string;
    eventType?: string;
    packetId?: string;
    resultId?: string;
    reviewId?: string;
    runId?: string;
    severity?: string;
    workdir?: string;
}): Promise<void>;
export declare function executeAgentsTraceValidate(workdir?: string): Promise<void>;
export declare function executeAgentsTraceChain(eventId: string, workdir?: string): Promise<void>;
export declare function executeAgentsTransportDefaults(): Promise<void>;
export declare function executeAgentsTransportDispatch(taskFile: string, options: {
    transport?: string;
    mode?: string;
    dryRun?: string;
    trace?: string;
    workdir?: string;
}): Promise<void>;
export declare function executeAgentsTransportStatus(workdir?: string): Promise<void>;
export declare function registerAgentsCommands(program: Command): void;
//# sourceMappingURL=agentsCommand.d.ts.map