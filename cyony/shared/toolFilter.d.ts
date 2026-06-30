/**
 * @tripp-reason/swarm — tool filter
 *
 * Wraps a ToolDispatcher with allowlist/denylist filtering per TaskPacket.
 * Phase 5E. No modification to packages/tools.
 */
import type { ToolDispatcher, Tool } from "@tripp-reason/shared";
/**
 * Filter a list of tools by allowedTools and forbiddenTools.
 * If allowedTools is undefined, all tools are allowed (subject to forbidden).
 * forbiddenTools takes priority over allowedTools.
 */
export declare function filterTools(tools: Tool[], allowedTools?: string[], forbiddenTools?: string[]): Tool[];
/**
 * A ToolDispatcher that enforces allowlist/denylist from a TaskPacket.
 * Delegates dispatch to the original dispatcher; blocks calls
 * to tools outside the filtered set.
 */
export interface FilteredToolDispatcher extends ToolDispatcher {
    /** The underlying dispatcher (for debugging/audit). */
    readonly inner: ToolDispatcher;
    /** The filtered tool list. */
    readonly filteredTools: Tool[];
}
/**
 * Create a filtered dispatcher wrapping an existing ToolDispatcher.
 *
 * @param inner - The real ToolDispatcher to delegate to.
 * @param allowedTools - Tools to allow (undefined = all).
 * @param forbiddenTools - Tools to block (priority over allowlist).
 */
export declare function createFilteredDispatcher(inner: ToolDispatcher, allowedTools?: string[], forbiddenTools?: string[]): FilteredToolDispatcher;
//# sourceMappingURL=toolFilter.d.ts.map