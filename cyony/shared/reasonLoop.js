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
import { RunFailedError, ApprovalDeniedError } from "./errors.js";
// ── Factory ──────────────────────────────────────────────────────────
export function createReasonLoop(options) {
    const { provider, runManager, toolDispatcher, approvalGate, model: defaultModel, providerName: defaultProviderName, } = options;
    async function run(input) {
        const { prompt, sessionId: existingSessionId, title, model: inputModel, provider: inputProviderName, workdir = process.cwd(), } = input;
        const model = inputModel ?? defaultModel;
        const providerName = inputProviderName ?? defaultProviderName ?? provider.name;
        // ── Step 1: Get or create session ────────────────────────────────
        let sessionId = existingSessionId;
        if (!sessionId) {
            const session = await runManager.createSession({
                title: title ?? "Untitled Session",
                provider: providerName,
                model,
            });
            sessionId = session.id;
        }
        // ── Step 2: Start run ────────────────────────────────────────────
        let runRecord;
        try {
            runRecord = await runManager.startRun(sessionId);
        }
        catch (err) {
            throw new RunFailedError("(none)", `Failed to start run in session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
        }
        const runId = runRecord.id;
        // ── Step 3: Record user message ──────────────────────────────────
        try {
            await runManager.recordMessage(runId, "user", prompt);
        }
        catch (err) {
            // Non-fatal: user message recording failure triggers persistence warning
            const cause = err instanceof Error ? err.message : String(err);
            runManager.addPersistenceWarning(runId, {
                operation: "recordMessage",
                message: `Failed to persist user message: ${cause}`,
                recoverable: true,
            });
        }
        // ── Helper: safely record event with persistence warning tracking ──
        async function safeRecordEvent(event) {
            try {
                await runManager.recordEvent(runId, event);
            }
            catch (err) {
                const cause = err instanceof Error ? err.message : String(err);
                runManager.addPersistenceWarning(runId, {
                    operation: "recordEvent",
                    message: `Failed to persist ${event.type} event: ${cause}`,
                    recoverable: true,
                });
            }
        }
        // ── Step 4: Build ProviderRequest ────────────────────────────────
        const chatMessages = [
            { role: "user", content: prompt },
        ];
        // Include tool schemas if dispatcher is available
        const toolSchemas = toolDispatcher?.listTools().map((t) => ({
            name: t.name,
            description: t.description,
            parameters: {}, // Phase 1F: simplified schema passthrough
        }));
        const providerRequest = {
            model,
            messages: chatMessages,
            tools: toolSchemas && toolSchemas.length > 0 ? toolSchemas : undefined,
            maxTokens: 4096,
            temperature: 0.7,
        };
        // ── Step 5: Stream from provider and process events ──────────────
        let assistantContent = "";
        let hasError = false;
        let finishReason = "complete";
        try {
            const stream = provider.stream(providerRequest);
            for await (const event of stream) {
                // Record every event (persist-before-emit via RunManager)
                try {
                    await runManager.recordEvent(runId, event);
                }
                catch (err) {
                    // Persistence failure — track warning but continue processing
                    const cause = err instanceof Error ? err.message : String(err);
                    runManager.addPersistenceWarning(runId, {
                        operation: "recordEvent",
                        message: `Failed to persist event [${event.type}]: ${cause}`,
                        recoverable: true,
                    });
                }
                // Process by type
                switch (event.type) {
                    case "message":
                        // Accumulate assistant text (persist as single message at end)
                        assistantContent += event.content;
                        break;
                    case "tool_request":
                        await handleToolRequest(event, runId, sessionId, workdir);
                        break;
                    case "error":
                        if (!event.recoverable) {
                            hasError = true;
                            finishReason = "error";
                        }
                        break;
                    case "tool_result":
                        // Provider shouldn't emit tool_result directly (it's loop-generated).
                        // Defensive: just pass through.
                        break;
                    case "finish":
                        // Provider should NOT emit finish events (Phase 1D boundary).
                        // If we receive one anyway, ignore it — ReasonLoop owns finish.
                        break;
                }
            }
        }
        catch (err) {
            // Provider stream threw — fail the run.
            const cause = err instanceof Error ? err.message : String(err);
            const errorEvent = {
                type: "error",
                message: `Provider stream failed: ${cause}`,
                recoverable: false,
            };
            try {
                await runManager.recordEvent(runId, errorEvent);
            }
            catch (persistErr) {
                // Even the error event failed to persist — track warning
                const persistCause = persistErr instanceof Error ? persistErr.message : String(persistErr);
                runManager.addPersistenceWarning(runId, {
                    operation: "recordEvent",
                    message: `Failed to persist error event: ${persistCause}`,
                    recoverable: true,
                });
            }
            hasError = true;
            finishReason = "error";
        }
        // ── Step 6: Record accumulated assistant message ─────────────────
        if (assistantContent) {
            try {
                await runManager.recordMessage(runId, "assistant", assistantContent);
            }
            catch (err) {
                // Non-fatal: assistant message recording failure triggers persistence warning
                const cause = err instanceof Error ? err.message : String(err);
                runManager.addPersistenceWarning(runId, {
                    operation: "recordMessage",
                    message: `Failed to persist assistant message: ${cause}`,
                    recoverable: true,
                });
            }
        }
        // ── Step 7: Emit finish event (ReasonLoop owns this) ─────────────
        const finishEvent = {
            type: "finish",
            reason: finishReason,
            runId,
        };
        try {
            await runManager.recordEvent(runId, finishEvent);
        }
        catch (err) {
            // Finish event persistence failure — track warning
            const cause = err instanceof Error ? err.message : String(err);
            runManager.addPersistenceWarning(runId, {
                operation: "recordEvent",
                message: `Failed to persist finish event: ${cause}`,
                recoverable: true,
            });
        }
        // ── Step 8: Complete run (triggers auto-report) ──────────────────
        const status = hasError ? "failed" : "completed";
        let completedRun;
        try {
            completedRun = await runManager.completeRun(runId, status);
        }
        catch (err) {
            // Run completion failure — try to mark it failed directly.
            throw new RunFailedError(runId, `Failed to complete run: ${err instanceof Error ? err.message : String(err)}`);
        }
        // Report path comes from the report generator (called by RunManager.completeRun).
        // We don't have direct access here — the report path is available via the store.
        // For Phase 1F, we return undefined for reportPath (caller can query store).
        return {
            sessionId,
            runId,
            status,
            assistantMessage: assistantContent,
            reportPath: undefined,
        };
    }
    // ── Tool Request Handler ──────────────────────────────────────────
    async function handleToolRequest(event, runId, sessionId, workdir) {
        const { tool: toolName, args, requiresApproval } = event;
        // No dispatcher → controlled error result
        if (!toolDispatcher) {
            const errorResult = {
                status: "error",
                output: null,
                error: `No tool dispatcher configured. Cannot execute "${toolName}".`,
            };
            const resultEvent = {
                type: "tool_result",
                tool: toolName,
                result: errorResult,
                status: "error",
            };
            await runManager.safeRecordEvent(runId, resultEvent);
            // Phase 2E: persist tool call for audit/report visibility
            await runManager.recordToolCall({
                runId, sessionId, toolName, args, result: errorResult, status: "error",
            });
            return;
        }
        // Look up tool
        const tool = toolDispatcher.listTools().find((t) => t.name === toolName);
        if (!tool) {
            const errorResult = {
                status: "error",
                output: null,
                error: `Unknown tool: "${toolName}"`,
            };
            const resultEvent = {
                type: "tool_result",
                tool: toolName,
                result: errorResult,
                status: "error",
            };
            await runManager.safeRecordEvent(runId, resultEvent);
            // Phase 2E: persist tool call for audit/report visibility
            await runManager.recordToolCall({
                runId, sessionId, toolName, args, result: errorResult, status: "error",
            });
            return;
        }
        // Tool context for execution
        const context = { sessionId, runId, workdir };
        // Check approval if required (by tool flag OR event flag)
        if (tool.requiresApproval || requiresApproval) {
            // FAIL CLOSED: if no approvalGate exists, refuse to dispatch
            if (!approvalGate) {
                const closedResult = {
                    status: "error",
                    output: null,
                    error: `Tool "${toolName}" requires approval but no ApprovalGate is configured. Refusing to dispatch (fail-closed).`,
                };
                const resultEvent = {
                    type: "tool_result",
                    tool: toolName,
                    result: closedResult,
                    status: "error",
                };
                await runManager.safeRecordEvent(runId, resultEvent);
                // Phase 2E: persist tool call for audit/report visibility
                await runManager.recordToolCall({
                    runId, sessionId, toolName, args, result: closedResult, status: "error",
                });
                return;
            }
            try {
                // ApprovalGate wraps the approver internally. Just pass the request.
                const approvalResult = await approvalGate.check({
                    toolName,
                    args,
                    riskLevel: tool.requiresApproval ? "destructive" : "mutating",
                    context: { session_id: sessionId, run_id: runId },
                });
                if (!approvalResult.approved) {
                    const deniedResult = {
                        status: "error",
                        output: null,
                        error: `Approval denied for "${toolName}": ${approvalResult.reason}`,
                    };
                    const resultEvent = {
                        type: "tool_result",
                        tool: toolName,
                        result: deniedResult,
                        status: "error",
                    };
                    await runManager.safeRecordEvent(runId, resultEvent);
                    // Phase 2E: persist tool call for audit/report visibility
                    await runManager.recordToolCall({
                        runId, sessionId, toolName, args, result: deniedResult, status: "error",
                    });
                    return;
                }
            }
            catch (err) {
                // ApprovalDeniedError is thrown by gate with throwOnDenial=true (default).
                if (err instanceof ApprovalDeniedError) {
                    const deniedResult = {
                        status: "error",
                        output: null,
                        error: err.message,
                    };
                    const resultEvent = {
                        type: "tool_result",
                        tool: toolName,
                        result: deniedResult,
                        status: "error",
                    };
                    await runManager.safeRecordEvent(runId, resultEvent);
                    // Phase 2E: persist tool call for audit/report visibility
                    await runManager.recordToolCall({
                        runId, sessionId, toolName, args, result: deniedResult, status: "error",
                    });
                    return;
                }
                // Other errors — record and continue.
                const errorResult = {
                    status: "error",
                    output: null,
                    error: `Approval check failed: ${err instanceof Error ? err.message : String(err)}`,
                };
                const resultEvent = {
                    type: "tool_result",
                    tool: toolName,
                    result: errorResult,
                    status: "error",
                };
                await runManager.safeRecordEvent(runId, resultEvent);
                // Phase 2E: persist tool call for audit/report visibility
                await runManager.recordToolCall({
                    runId, sessionId, toolName, args, result: errorResult, status: "error",
                });
                return;
            }
        }
        // Dispatch tool
        try {
            const result = await toolDispatcher.dispatch(toolName, args, context);
            const resultEvent = {
                type: "tool_result",
                tool: toolName,
                result,
                status: result.status === "ok" ? "ok" : "error",
            };
            await runManager.safeRecordEvent(runId, resultEvent);
            // Phase 2E: persist tool call for audit/report visibility
            await runManager.recordToolCall({
                runId, sessionId, toolName, args, result,
                status: result.status === "ok" ? "ok" : "error",
            });
        }
        catch (err) {
            const errorResult = {
                status: "error",
                output: null,
                error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
            };
            const resultEvent = {
                type: "tool_result",
                tool: toolName,
                result: errorResult,
                status: "error",
            };
            await runManager.safeRecordEvent(runId, resultEvent);
            // Phase 2E: persist tool call for audit/report visibility
            await runManager.recordToolCall({
                runId, sessionId, toolName, args, result: errorResult, status: "error",
            });
        }
    }
    return { run };
}
//# sourceMappingURL=reasonLoop.js.map