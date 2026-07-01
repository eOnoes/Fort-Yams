/**
 * @tripp-reason/tools - Phase 2D
 *
 * Active read-only tools (Phase 1E + Phase 2B):
 * - list_dir: List directory contents
 * - read_file: Read UTF-8 text files
 * - search: Text search across files
 * - git_status: Read-only git status
 * - git_diff: Read-only git diff
 *
 * Active mutation tools (Phase 2C):
 * - write_file: Write/create files (requires approval, backup, workdir-bound)
 * - edit_file: Targeted text replacement (requires approval, backup, workdir-bound)
 *
 * Active command execution tools (Phase 2D):
 * - shell: Bounded command execution (requires approval, allowlist, timeout, caps)
 * - run_tests: Test runner (requires approval, auto-detect, timeout, caps)
 *
 * All tools enforce workdir boundary via pathSafety module.
 * ToolDispatcher routes calls by name, validates input, but does NOT check approval.
 * Approval is ReasonLoop's responsibility (Phase 1F+).
 */

export { listDirTool } from "./listDir.js";
export { readFileTool } from "./readFile.js";
export { searchTool } from "./search.js";
export { gitStatusTool } from "./gitStatus.js";
export { gitDiffTool } from "./gitDiff.js";
export { writeFileTool } from "./writeFile.js";
export { editFileTool } from "./editFile.js";
export { shellTool } from "./shell.js";
export { runTestsTool } from "./runTests.js";
export { validateCommand, detectChaining, resolveCwd } from "./commandSafety.js";
export { ToolDispatcherImpl, createDispatcher } from "./dispatcher.js";
export { resolveSafePath, shouldSkipDirectory } from "./pathSafety.js";
export { toolError, pathError, executionError } from "./errors.js";

import type { Tool } from "@tripp-reason/shared";
import { listDirTool } from "./listDir.js";
import { readFileTool } from "./readFile.js";
import { searchTool } from "./search.js";
import { gitStatusTool } from "./gitStatus.js";
import { gitDiffTool } from "./gitDiff.js";
import { writeFileTool } from "./writeFile.js";
import { editFileTool } from "./editFile.js";
import { shellTool } from "./shell.js";
import { runTestsTool } from "./runTests.js";

/**
 * All active tools (read-only + mutation + command execution) in default order.
 * Use this list to populate a dispatcher with the full Phase 2D tool set.
 */
export const activeTools: Tool[] = [
  listDirTool,
  readFileTool,
  searchTool,
  gitStatusTool,
  gitDiffTool,
  writeFileTool,
  editFileTool,
  shellTool,
  runTestsTool,
];
