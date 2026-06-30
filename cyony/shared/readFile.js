import { z } from "zod";
import { readFile as fsReadFile, stat } from "node:fs/promises";
import { resolveSafePath } from "./pathSafety.js";
import { pathError, toolError } from "./errors.js";
/**
 * read_file - Read-only file reading tool
 *
 * Reads UTF-8 text files with size limits and truncation.
 *
 * Safety:
 * - Workdir boundary enforced via pathSafety
 * - Path traversal prevented
 * - File size capped at 256KB max (default)
 * - Directories rejected
 * - Returns truncated flag if file exceeds limit
 */
const DEFAULT_MAX_BYTES = 256 * 1024; // 256KB
const MAX_ALLOWED_BYTES = 10 * 1024 * 1024; // 10MB hard limit
const ReadFileInputSchema = z.object({
    path: z.string().min(1),
    maxBytes: z
        .number()
        .int()
        .min(1)
        .max(MAX_ALLOWED_BYTES)
        .optional()
        .default(DEFAULT_MAX_BYTES)
});
export const readFileTool = {
    name: "read_file",
    description: "Read a UTF-8 text file. Supports size limits with truncation.",
    requiresApproval: false,
    inputSchema: ReadFileInputSchema,
    async execute(input, context) {
        const parsed = ReadFileInputSchema.safeParse(input);
        if (!parsed.success) {
            return toolError(`Invalid input: ${parsed.error.message}`);
        }
        const { path, maxBytes } = parsed.data;
        // Resolve and validate path safety
        const safeResult = resolveSafePath(path, context.workdir);
        if (!safeResult.safe || !safeResult.resolvedPath) {
            return pathError(path, safeResult.error || "Path validation failed");
        }
        const resolvedPath = safeResult.resolvedPath;
        // Check if path exists and is a file
        try {
            const stats = await stat(resolvedPath);
            if (stats.isDirectory()) {
                return toolError(`Cannot read directory: ${path}`);
            }
            if (!stats.isFile()) {
                return toolError(`Not a regular file: ${path}`);
            }
            // Check file size
            if (stats.size > maxBytes) {
                // Read with truncation
                const buffer = Buffer.alloc(maxBytes);
                const { readFile } = await import("node:fs/promises");
                const fd = await import("node:fs/promises").then((fs) => fs.open(resolvedPath, "r"));
                await fd.read(buffer, 0, maxBytes, 0);
                await fd.close();
                const content = buffer.toString("utf-8");
                return {
                    status: "ok",
                    output: {
                        path,
                        content,
                        sizeBytes: stats.size,
                        truncated: true,
                        bytesRead: maxBytes
                    }
                };
            }
            // File fits within limit - read entirely
            const content = await fsReadFile(resolvedPath, "utf-8");
            return {
                status: "ok",
                output: {
                    path,
                    content,
                    sizeBytes: stats.size,
                    truncated: false,
                    bytesRead: stats.size
                }
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes("ENOENT")) {
                return toolError(`File not found: ${path}`);
            }
            return toolError(`Failed to read file: ${message}`);
        }
    }
};
//# sourceMappingURL=readFile.js.map