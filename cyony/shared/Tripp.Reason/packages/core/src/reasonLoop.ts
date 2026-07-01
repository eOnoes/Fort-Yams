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

import type {
  ProviderAdapter,
  ToolDispatcher,
  StreamEvent,
  ProviderRequest,
  ChatMessage,
  ToolResult,
  RunStatus,
  FinishReason,
  ToolContext,
} from "@tripp-reason/shared";
import type { RunManager } from "./runManager.js";
import type { ApprovalGate } from "./approvalGate.js";
import { RunFailedError, ApprovalDeniedError } from "./errors.js";

// ── ReasonLoop Types ─────────────────────────────────────────────────

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

// ── ReasonLoop Interface ─────────────────────────────────────────────

export interface ReasonLoop {
  /**
   * Run a single prompt through the reasoning loop.
   * Creates session/run, streams from provider, handles tools, generates report.
   */
  run(input: ReasonLoopInput): Promise<ReasonLoopResult>;
}

// ── Factory ──────────────────────────────────────────────────────────

export function createReasonLoop(options: ReasonLoopOptions): ReasonLoop {
  const {
    provider,
    runManager,
    toolDispatcher,
    approvalGate,
    model: defaultModel,
    providerName: defaultProviderName,
  } = options;

  async function run(input: ReasonLoopInput): Promise<ReasonLoopResult> {
    const {
      prompt,
      sessionId: existingSessionId,
      title,
      model: inputModel,
      provider: inputProviderName,
      workdir = process.cwd(),
    } = input;

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
    } catch (err) {
      throw new RunFailedError(
        "(none)",
        `Failed to start run in session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    const runId = runRecord.id;

    // ── Step 3: Record user message ──────────────────────────────────
    try {
      await runManager.recordMessage(runId, "user", prompt);
    } catch (err) {
      // Non-fatal: user message recording failure triggers persistence warning
      const cause = err instanceof Error ? err.message : String(err);
      runManager.addPersistenceWarning(runId, {
        operation: "recordMessage",
        message: `Failed to persist user message: ${cause}`,
        recoverable: true,
      });
    }

    // ── Helper: safely record event with persistence warning tracking ──
    async function safeRecordEvent(event: StreamEvent): Promise<void> {
      try {
        await runManager.recordEvent(runId, event);
      } catch (err) {
        const cause = err instanceof Error ? err.message : String(err);
        runManager.addPersistenceWarning(runId, {
          operation: "recordEvent",
          message: `Failed to persist ${event.type} event: ${cause}`,
          recoverable: true,
        });
      }
    }

    // ── Step 4: Build ProviderRequest ────────────────────────────────
    const chatMessages: ChatMessage[] = [
      { role: "user", content: prompt },
    ];

    // Include tool schemas if dispatcher is available
    const toolSchemas = toolDispatcher?.listTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: {}, // Phase 1F: simplified schema passthrough
    }));

    const providerRequest: ProviderRequest = {
      model,
      messages: chatMessages,
      tools: toolSchemas && toolSchemas.length > 0 ? toolSchemas : undefined,
      maxTokens: 4096,
      temperature: 0.7,
    };

    // ── Step 5: Stream from provider and process events ──────────────
    let assistantContent = "";
    let hasError = false;
    let finishReason: FinishReason = "complete";

    try {
      const stream = provider.stream(providerRequest);

      for await (const event of stream) {
        // Record every event (persist-before-emit via RunManager)
        try {
          await runManager.recordEvent(runId, event);
        } catch (err) {
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
    } catch (err) {
      // Provider stream threw — fail the run.
      const cause = err instanceof Error ? err.message : String(err);
      const errorEvent: StreamEvent = {
        type: "error",
        message: `Provider stream failed: ${cause}`,
        recoverable: false,
      };
      try {
        await runManager.recordEvent(runId, errorEvent);
      } catch (persistErr) {
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
      } catch (err) {
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
    const finishEvent: StreamEvent = {
      type: "finish",
      reason: finishReason,
      runId,
    };
    try {
      await runManager.recordEvent(runId, finishEvent);
    } catch (err) {
      // Finish event persistence failure — track warning
      const cause = err instanceof Error ? err.message : String(err);
      runManager.addPersistenceWarning(runId, {
        operation: "recordEvent",
        message: `Failed to persist finish event: ${cause}`,
        recoverable: true,
      });
    }

    // ── Step 8: Complete run (triggers auto-report) ──────────────────
    const status: RunStatus = hasError ? "failed" : "completed";
    let completedRun;
    try {
      completedRun = await runManager.completeRun(runId, status);
    } catch (err) {
      // Run completion failure — try to mark it failed directly.
      throw new RunFailedError(
        runId,
        `Failed to complete run: ${err instanceof Error ? err.message : String(err)}`
      );
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

  async function handleToolRequest(
    event: Extract<StreamEvent, { type: "tool_request" }>,
    runId: string,
    sessionId: string,
    workdir: string
  ): Promise<void> {
    const { tool: toolName, args, requiresApproval } = event;

    // No dispatcher → controlled error result
    if (!toolDispatcher) {
      const errorResult: ToolResult = {
        status: "error",
        output: null,
        error: `No tool dispatcher configured. Cannot execute "${toolName}".`,
      };
      const resultEvent: StreamEvent = {
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
      const errorResult: ToolResult = {
        status: "error",
        output: null,
        error: `Unknown tool: "${toolName}"`,
      };
      const resultEvent: StreamEvent = {
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
    const context: ToolContext = { sessionId, runId, workdir };

    // Check approval if required (by tool flag OR event flag)
    if (tool.requiresApproval || requiresApproval) {
      // FAIL CLOSED: if no approvalGate exists, refuse to dispatch
      if (!approvalGate) {
        const closedResult: ToolResult = {
          status: "error",
          output: null,
          error: `Tool "${toolName}" requires approval but no ApprovalGate is configured. Refusing to dispatch (fail-closed).`,
        };
        const resultEvent: StreamEvent = {
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
          const deniedResult: ToolResult = {
            status: "error",
            output: null,
            error: `Approval denied for "${toolName}": ${approvalResult.reason}`,
          };
          const resultEvent: StreamEvent = {
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
      } catch (err) {
        // ApprovalDeniedError is thrown by gate with throwOnDenial=true (default).
        if (err instanceof ApprovalDeniedError) {
          const deniedResult: ToolResult = {
            status: "error",
            output: null,
            error: err.message,
          };
          const resultEvent: StreamEvent = {
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
        const errorResult: ToolResult = {
          status: "error",
          output: null,
          error: `Approval check failed: ${err instanceof Error ? err.message : String(err)}`,
        };
        const resultEvent: StreamEvent = {
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
      const resultEvent: StreamEvent = {
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
    } catch (err) {
      const errorResult: ToolResult = {
        status: "error",
        output: null,
        error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
      };
      const resultEvent: StreamEvent = {
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
