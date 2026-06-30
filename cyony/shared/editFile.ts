import { z } from "zod";
import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { Tool, ToolContext, ToolResult } from "@tripp-reason/shared";
import { resolveSafePath } from "./pathSafety.js";
import { toolError, pathError, executionError } from "./errors.js";

/**
 * edit_file — Targeted text replacement tool (Phase 2C)
 *
 * Safety rules:
 * - requiresApproval: true (ApprovalGate must approve before dispatch)
 * - Workdir boundary enforced via pathSafety
 * - File must exist
 * - expected text must be found (fail without writing if not found)
 * - replaceAll controls single vs. all replacements
 * - Empty expected string is rejected
 * - Whole-file replacement requires explicit allowWholeFileReplace:true
 * - Backup before modify — .tripp/backups/<timestamp>/<relative-path>
 */

const EditFileInputSchema = z.object({
  path: z.string().min(1, "path is required"),
  expected: z.string().min(1, "expected text must not be empty"),
  replacement: z.string(),
  replaceAll: z.boolean().optional().default(false),
  allowWholeFileReplace: z.boolean().optional().default(false),
});

interface EditFileOutput {
  path: string;
  replacements: number;
  sizeBefore: number;
  sizeAfter: number;
  backupPath: string;
}

/**
 * Count occurrences of substring in string.
 */
function countOccurrences(text: string, search: string): number {
  if (!search) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}

/**
 * Create a backup of an existing file at .tripp/backups/<timestamp>/<relative-path>
 * Returns backup path or throws on failure.
 */
async function createBackup(
  filePath: string,
  workdir: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relPath = relative(workdir, filePath);
  const backupPath = join(workdir, ".tripp", "backups", timestamp, relPath);

  const content = await readFile(filePath, "utf-8");
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(backupPath, content, "utf-8");

  return backupPath;
}

export const editFileTool: Tool = {
  name: "edit_file",
  description:
    "Replace expected text with replacement in a file. Requires approval. Workdir-bound. Backup before modify. Fails if expected not found.",
  requiresApproval: true,
  inputSchema: EditFileInputSchema,

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = EditFileInputSchema.safeParse(input);
    if (!parsed.success) {
      return toolError(`Invalid input: ${parsed.error.message}`);
    }

    const {
      path: inputPath,
      expected,
      replacement,
      replaceAll,
      allowWholeFileReplace,
    } = parsed.data;

    // 1. Resolve and validate path safety
    const safeResult = resolveSafePath(inputPath, context.workdir);
    if (!safeResult.safe || !safeResult.resolvedPath) {
      return pathError(inputPath, safeResult.error || "Path validation failed");
    }

    const filePath = safeResult.resolvedPath;
    const workdir = context.workdir;

    // 2. File must exist
    let existingContent: string;
    let sizeBefore: number;
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return toolError(`Not a file: ${inputPath}`);
      }
      sizeBefore = stats.size;
      existingContent = await readFile(filePath, "utf-8");
    } catch {
      return executionError("edit_file", `File not found: ${inputPath}`);
    }

    // 3. Check if expected text exists
    const occurrences = countOccurrences(existingContent, expected);
    if (occurrences === 0) {
      return executionError(
        "edit_file",
        `Expected text not found in ${inputPath}. No changes made.`
      );
    }

    // 4. Whole-file replacement guard
    if (!allowWholeFileReplace && expected === existingContent) {
      return executionError(
        "edit_file",
        `Expected text is the entire file. Set allowWholeFileReplace=true to proceed.`
      );
    }

    // 5. Compute replacement count
    const replacements = replaceAll ? occurrences : 1;

    // 6. Perform replacement
    let modifiedContent: string;
    if (replaceAll) {
      modifiedContent = existingContent.replaceAll(expected, replacement);
    } else {
      modifiedContent = existingContent.replace(expected, replacement);
    }

    // 7. Backup before modify
    let backupPath: string;
    try {
      backupPath = await createBackup(filePath, workdir);
    } catch (err) {
      return executionError(
        "edit_file",
        `Backup failed for ${inputPath}: ${err instanceof Error ? err.message : String(err)}. Aborting edit.`
      );
    }

    // 8. Write modified content
    try {
      await writeFile(filePath, modifiedContent, "utf-8");
    } catch (err) {
      return executionError(
        "edit_file",
        `Failed to write edited file: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const sizeAfter = Buffer.byteLength(modifiedContent, "utf-8");

    const output: EditFileOutput = {
      path: inputPath,
      replacements,
      sizeBefore,
      sizeAfter,
      backupPath,
    };

    return {
      status: "ok",
      output,
    };
  },
};
