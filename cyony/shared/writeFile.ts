import { z } from "zod";
import { writeFile, readFile, stat, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { Tool, ToolContext, ToolResult } from "@tripp-reason/shared";
import { resolveSafePath } from "./pathSafety.js";
import { toolError, pathError, executionError } from "./errors.js";

/**
 * write_file — Approved file creation/overwrite tool (Phase 2C)
 *
 * Safety rules:
 * - requiresApproval: true (ApprovalGate must approve before dispatch)
 * - Workdir boundary enforced via pathSafety
 * - No silent overwrite — explicit overwrite:true required
 * - Backup before overwrite — .tripp/backups/<timestamp>/<relative-path>
 * - Parent directory creation requires createParents:true
 * - Structured result with full audit trail
 */

const WriteFileInputSchema = z.object({
  path: z.string().min(1, "path is required"),
  content: z.string(),
  overwrite: z.boolean().optional().default(false),
  createParents: z.boolean().optional().default(false),
});

interface WriteFileOutput {
  path: string;
  created: boolean;
  overwritten: boolean;
  existedBefore: boolean;
  sizeBefore?: number;
  sizeAfter: number;
  backupPath?: string;
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

  // Read original content
  const content = await readFile(filePath, "utf-8");

  // Create backup directory
  await mkdir(dirname(backupPath), { recursive: true });

  // Write backup
  await writeFile(backupPath, content, "utf-8");

  return backupPath;
}

export const writeFileTool: Tool = {
  name: "write_file",
  description:
    "Write content to a file. Requires approval. Workdir-bound. Backup before overwrite. No silent overwrite.",
  requiresApproval: true,
  inputSchema: WriteFileInputSchema,

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = WriteFileInputSchema.safeParse(input);
    if (!parsed.success) {
      return toolError(`Invalid input: ${parsed.error.message}`);
    }

    const { path: inputPath, content, overwrite, createParents } = parsed.data;

    // 1. Resolve and validate path safety
    const safeResult = resolveSafePath(inputPath, context.workdir);
    if (!safeResult.safe || !safeResult.resolvedPath) {
      return pathError(inputPath, safeResult.error || "Path validation failed");
    }

    const filePath = safeResult.resolvedPath;
    const workdir = context.workdir;

    // 2. Check if file exists
    let existedBefore = false;
    let sizeBefore: number | undefined;

    try {
      const stats = await stat(filePath);
      if (stats.isFile()) {
        existedBefore = true;
        sizeBefore = stats.size;
      } else if (stats.isDirectory()) {
        return toolError(`Path is a directory, not a file: ${inputPath}`);
      }
    } catch {
      // File doesn't exist — that's fine for new file creation
      existedBefore = false;
    }

    // 3. No silent overwrite
    if (existedBefore && !overwrite) {
      return executionError(
        "write_file",
        `File already exists: ${inputPath}. Set overwrite=true to replace it.`
      );
    }

    // 4. Check parent directory exists (or createParents is true)
    if (!existedBefore) {
      const parentDir = dirname(filePath);
      try {
        await stat(parentDir);
      } catch {
        if (!createParents) {
          return executionError(
            "write_file",
            `Parent directory does not exist: ${dirname(inputPath)}. Set createParents=true to create it.`
          );
        }
        // Create parent directories
        await mkdir(parentDir, { recursive: true });
      }
    }

    // 5. Backup before overwrite (only for existing files)
    let backupPath: string | undefined;
    if (existedBefore) {
      try {
        backupPath = await createBackup(filePath, workdir);
      } catch (err) {
        // Backup failure → do NOT proceed with mutation
        return executionError(
          "write_file",
          `Backup failed for ${inputPath}: ${err instanceof Error ? err.message : String(err)}. Aborting write.`
        );
      }
    }

    // 6. Write the file
    try {
      await writeFile(filePath, content, "utf-8");
    } catch (err) {
      return executionError(
        "write_file",
        `Failed to write file: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // 7. Get new size
    let sizeAfter: number;
    try {
      const newStats = await stat(filePath);
      sizeAfter = newStats.size;
    } catch {
      sizeAfter = Buffer.byteLength(content, "utf-8");
    }

    const output: WriteFileOutput = {
      path: inputPath,
      created: !existedBefore,
      overwritten: existedBefore,
      existedBefore,
      ...(sizeBefore !== undefined ? { sizeBefore } : {}),
      sizeAfter,
      ...(backupPath ? { backupPath } : {}),
    };

    return {
      status: "ok",
      output,
    };
  },
};
