/**
 * tripp run command implementation
 *
 * Wires together all packages for an end-to-end run:
 * - SQLite store + repositories
 * - RunManager + EventStream
 * - OpenAICompatibleProvider
 * - ToolDispatcher with active read-only tools
 * - ReasonLoop
 * - CLI output
 */
import type { ResolvedConfig } from "./config.js";
export declare function executeRun(prompt: string, config: ResolvedConfig): Promise<void>;
//# sourceMappingURL=runCommand.d.ts.map