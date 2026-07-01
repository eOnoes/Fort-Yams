/**
 * @tripp-reason/shared — cross-package contracts (interfaces)
 *
 * These interfaces define the boundaries between packages.
 * - core imports ProviderAdapter, ToolDispatcher, Approver from here
 * - providers implements ProviderAdapter
 * - tools implements Tool and ToolDispatcher
 * - cli implements Approver (CliApprover)
 * - server implements Approver (ApiApprover)
 *
 * No package may define its own duplicate of these contracts.
 */
import type { z } from "zod";
import type { StreamEvent } from "./events.js";
import type {
  ProviderRequest,
  ApprovalRequest,
  ApprovalResult,
  ToolResult,
} from "./schemas.js";

// ── ToolContext (passed to every tool execution) ────────────────────
export interface ToolContext {
  sessionId: string;
  runId: string;
  workdir: string;
}

// ── ProviderAdapter ─────────────────────────────────────────────────
/**
 * What core expects from a provider package.
 * Implementations live in packages/providers (e.g., OpenAICompatibleProvider).
 */
export interface ProviderAdapter {
  readonly name: string;

  /**
   * Stream a response from the provider.
   * Returns an async iterable of StreamEvents consumed in-process by ReasonLoop.
   * This is NOT HTTP/SSE — it's an in-memory async generator.
   */
  stream(request: ProviderRequest): AsyncIterable<StreamEvent>;

  /** List available model IDs for this provider. */
  listModels(): Promise<string[]>;
}

// ── Tool ────────────────────────────────────────────────────────────
/**
 * What core expects from a tool package.
 * Implementations live in packages/tools (e.g., ReadFileTool, SearchTool).
 */
export interface Tool {
  readonly name: string;
  readonly description: string;

  /** Zod schema for validating tool input. */
  readonly inputSchema: z.ZodType<unknown>;

  /** Whether this tool requires ApprovalGate before execution. */
  readonly requiresApproval: boolean;

  /** Execute the tool with validated input. */
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}

// ── ToolDispatcher ──────────────────────────────────────────────────
/**
 * What core expects from the tool layer.
 * Aggregates multiple Tool instances and routes dispatch calls.
 */
export interface ToolDispatcher {
  /** Return all registered tools. */
  listTools(): Tool[];

  /** Dispatch a tool call by name with raw input. */
  dispatch(
    toolName: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult>;
}

// ── Approver ────────────────────────────────────────────────────────
/**
 * What core expects from the approval layer.
 * Implementations:
 * - CliApprover (packages/cli) — terminal prompts
 * - ApiApprover (packages/server) — HTTP endpoint
 * - AutoApprover (packages/swarm) — policy-based
 */
export interface Approver {
  requestApproval(operation: ApprovalRequest): Promise<ApprovalResult>;
}
