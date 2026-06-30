/**
 * @tripp-reason/core — ReasonLoop Integration
 *
 * The main orchestration loop that wires:
 * - ProviderAdapter streaming
 * - RunManager lifecycle (session/run/message/event recording)
 * - ToolDispatcher for tool execution
 * - ApprovalGate for approval-required tools
 * - EventStream (via RunManager) for persist-before-emit
 *
 * ReasonLoop owns finish event emission because only it knows the runId.
 * Providers emit message/error events only (Phase 1D boundary).
 *
 * Flow:
 * 1. Get or create session
 * 2. Start run
 * 3. Record user message
 * 4. Build ProviderRequest with current prompt
 * 5. Stream from provider
 * 6. Process each StreamEvent:
 *    - message: accumulate text, record event
 *    - tool_request: check approval, dispatch, record tool_result
 *    - error: record event, potentially fail run
 * 7. After stream: record assistant message, emit finish, complete run, generate report
 * 8. Return result
 *
 * IMPORTANT: This file does NOT import concrete providers or tools.
 * It depends only on shared interfaces (ProviderAdapter, ToolDispatcher, Approver).
 * Concrete instances are injected by future CLI/server code.
 */
import type { ProviderAdapter, ToolDispatcher, RunStatus } from "@tripp-reason/shared";
import type { RunManager } from "./runManager.js";
import type { ApprovalGate } from "./approvalGate.js";
export interface ReasonLoopOptions {
    /** The provider adapter to stream responses from. */
    provider: ProviderAdapter;
    /** The run manager for session/run lifecycle. */
    runManager: RunManager;
    /** Optional tool dispatcher for tool execution. */
    toolDispatcher?: ToolDispatcher;
    /** Optional approval gate (wraps the approver). */
    approvalGate?: ApprovalGate;
    /** Model to use for this loop instance. */
    model: string;
    /** Provider name for session metadata. */
    providerName?: string;
}
export interface ReasonLoopInput {
    /** The user prompt to send. */
    prompt: string;
    /** Existing session ID to continue (or omit to create new). */
    sessionId?: string;
    /** Optional session title. */
    title?: string;
    /** Override model for this run. */
    model?: string;
    /** Override provider name for this run. */
    provider?: string;
    /** Working directory for tool execution. Default: process.cwd(). */
    workdir?: string;
}
export interface ReasonLoopResult {
    /** The session ID. */
    sessionId: string;
    /** The run ID. */
    runId: string;
    /** Final run status (completed or failed). */
    status: RunStatus;
    /** Full accumulated assistant text. */
    assistantMessage: string;
    /** Path to the generated report file (if report generation succeeded). */
    reportPath?: string;
}
export interface ReasonLoop {
    /**
     * Run a single prompt through the reasoning loop.
     * Creates session/run, streams from provider, handles tools, generates report.
     */
    run(input: ReasonLoopInput): Promise<ReasonLoopResult>;
}
export declare function createReasonLoop(options: ReasonLoopOptions): ReasonLoop;
//# sourceMappingURL=reasonLoop.d.ts.map