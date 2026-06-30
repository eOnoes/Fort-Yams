import { z } from "zod";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tool, ToolContext, ToolResult } from "@tripp-reason/shared";
import { resolveSafePath, shouldSkipDirectory } from "./pathSafety.js";
import { pathError, toolError } from "./errors.js";

/**
 * search - Read-only text search tool
 *
 * Searches for text matching in files under a path.
 * Case-insensitive substring match (not regex in Phase 1).
 *
 * Safety:
 * - Workdir boundary enforced via pathSafety
 * - Path traversal prevented
 * - Result count capped at 100 (default)
 * - Skips node_modules, .git, dist, reports
 * - File size capped at 1MB per file
 * - Uses Node built-ins only (no external grep)
 */

const DEFAULT_MAX_RESULTS = 100;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file

const SearchInputSchema = z.object({
  query: z.string().min(1),
  path: z.string().optional().default("."),
  maxResults: z.number().int().min(1).max(1000).optional().default(DEFAULT_MAX_RESULTS),
  includeExtensions: z.array(z.string()).optional()
});

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  preview: string;
}

export const searchTool: Tool = {
  name: "search",
  description:
    "Search for text in files under a path. Case-insensitive substring match. Returns file, line, column, and preview.",
  requiresApproval: false,
  inputSchema: SearchInputSchema,

  async execute(input: unknown, context: ToolContext): Promise<ToolResult> {
    const parsed = SearchInputSchema.safeParse(input);
    if (!parsed.success) {
      return toolError(`Invalid input: ${parsed.error.message}`);
    }

    const { query, path, maxResults, includeExtensions } = parsed.data;

    // Resolve and validate path safety
    const safeResult = resolveSafePath(path, context.workdir);
    if (!safeResult.safe || !safeResult.resolvedPath) {
      return pathError(path, safeResult.error || "Path validation failed");
    }

    const resolvedPath = safeResult.resolvedPath;
    const queryLower = query.toLowerCase();

    // Search for matches
    try {
      const results = await searchDirectory(
        resolvedPath,
        queryLower,
        maxResults,
        includeExtensions,
        context.workdir
      );

      return {
        status: "ok",
        output: {
          query,
          path,
          matches: results,
          count: results.length,
          truncated: results.length >= maxResults
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("ENOENT")) {
        return toolError(`Path not found: ${path}`);
      }
      return toolError(`Search failed: ${message}`);
    }
  }
};

/**
 * Recursively search directory for text matches.
 * Returns array of SearchResult objects up to maxResults.
 */
async function searchDirectory(
  dirPath: string,
  queryLower: string,
  maxResults: number,
  includeExtensions: string[] | undefined,
  workdir: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  await searchRecursive(
    dirPath,
    queryLower,
    maxResults,
    includeExtensions,
    workdir,
    results
  );

  return results;
}

async function searchRecursive(
  dirPath: string,
  queryLower: string,
  maxResults: number,
  includeExtensions: string[] | undefined,
  workdir: string,
  results: SearchResult[]
): Promise<void> {
  // Early exit if we've hit the limit
  if (results.length >= maxResults) {
    return;
  }

  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= maxResults) {
      return;
    }

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip certain directories
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      // Recurse
      await searchRecursive(
        fullPath,
        queryLower,
        maxResults,
        includeExtensions,
        workdir,
        results
      );
    } else if (entry.isFile()) {
      // Check extension filter
      if (includeExtensions && includeExtensions.length > 0) {
        const ext = entry.name.includes(".")
          ? "." + entry.name.split(".").pop()
          : "";
        if (!includeExtensions.includes(ext)) {
          continue;
        }
      }

      // Search file for matches
      try {
        const fileResults = await searchFile(
          fullPath,
          queryLower,
          maxResults - results.length,
          workdir
        );
        results.push(...fileResults);
      } catch {
        // Skip files that can't be read (binary, permissions, etc.)
        continue;
      }
    }
  }
}

/**
 * Search a single file for text matches.
 * Returns array of SearchResult objects.
 */
async function searchFile(
  filePath: string,
  queryLower: string,
  maxResults: number,
  workdir: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Check file size
  const { stat } = await import("node:fs/promises");
  const stats = await stat(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    return results; // Skip large files
  }

  // Read file
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const relativePath = filePath.slice(workdir.length + 1);

  // Search each line
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    if (results.length >= maxResults) {
      return results;
    }

    const line = lines[lineNum];
    const lineLower = line.toLowerCase();
    const column = lineLower.indexOf(queryLower);

    if (column !== -1) {
      // Extract preview (50 chars before and after match)
      const start = Math.max(0, column - 50);
      const end = Math.min(line.length, column + queryLower.length + 50);
      const preview = line.slice(start, end);

      results.push({
        file: relativePath,
        line: lineNum + 1, // 1-indexed
        column: column + 1, // 1-indexed
        preview
      });
    }
  }

  return results;
}
