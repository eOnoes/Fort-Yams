import { z } from "zod";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveSafePath, shouldSkipDirectory } from "./pathSafety.js";
import { pathError, toolError } from "./errors.js";
/**
 * list_dir - Read-only directory listing tool
 *
 * Lists files and directories within a specified path.
 * Supports optional recursion with depth limits.
 *
 * Safety:
 * - Workdir boundary enforced via pathSafety
 * - Path traversal prevented
 * - Depth capped at 3 levels max
 * - Skips node_modules, .git, dist, reports
 */
const ListDirInputSchema = z.object({
    path: z.string().optional().default("."),
    recursive: z.boolean().optional().default(false),
    maxDepth: z.number().int().min(1).max(3).optional().default(1)
});
export const listDirTool = {
    name: "list_dir",
    description: "List files and directories under a path. Supports optional recursion with depth cap (max 3).",
    requiresApproval: false,
    inputSchema: ListDirInputSchema,
    async execute(input, context) {
        const parsed = ListDirInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { path, recursive, maxDepth } = parsed.data;
        // Resolve and validate path safety
        const safeResult = resolveSafePath(path, context.workdir);
        if (!safeResult.safe || !safeResult.resolvedPath) {
            return pathError(path, safeResult.error || "Path validation failed");
        }
        const resolvedPath = safeResult.resolvedPath;
        // Check if path exists and is a directory
        try {
            const stats = await stat(resolvedPath);
            if (!stats.isDirectory()) {
                return toolError(`Not a directory: ${path}`);
            }
        }
        catch {
            return toolError(`Directory not found: ${path}`);
        }
        // List directory contents
        try {
            const entries = await listDirectoryRecursive(resolvedPath, recursive, maxDepth, 0, context.workdir);
            return {
                status: "ok",
                output: {
                    path,
                    entries
                }
            };
        }
        catch (err) {
            return toolError(`Failed to list directory: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
/**
 * Recursively list directory contents.
 * Returns array of { name, path, type } entries.
 */
async function listDirectoryRecursive(dirPath, recursive, maxDepth, currentDepth, workdir) {
    if (currentDepth >= maxDepth) {
        return [];
    }
    const entries = await readdir(dirPath, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
        const name = entry.name;
        const fullPath = join(dirPath, name);
        const relativePath = fullPath.slice(workdir.length + 1); // Remove workdir prefix + "/"
        if (entry.isDirectory()) {
            // Skip certain directories
            if (shouldSkipDirectory(name)) {
                continue;
            }
            results.push({
                name,
                path: relativePath,
                type: "directory"
            });
            // Recurse if requested
            if (recursive) {
                const subEntries = await listDirectoryRecursive(fullPath, recursive, maxDepth, currentDepth + 1, workdir);
                results.push(...subEntries);
            }
        }
        else if (entry.isFile()) {
            results.push({
                name,
                path: relativePath,
                type: "file"
            });
        }
    }
    // Sort: directories first, then files, alphabetically
    results.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    return results;
}
//# sourceMappingURL=listDir.js.map