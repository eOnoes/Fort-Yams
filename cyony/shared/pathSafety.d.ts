/**
 * Path Safety Module
 *
 * Provides workdir boundary enforcement and path traversal prevention.
 * All tools must use these utilities to ensure paths stay within workdir.
 */
export interface SafePathResult {
    safe: boolean;
    resolvedPath?: string;
    error?: string;
}
/**
 * Resolve and validate a path against workdir boundary.
 * Returns resolved absolute path if safe, error otherwise.
 *
 * Prevention rules:
 * - Resolve relative paths against workdir
 * - Check for path traversal attempts (.., absolute paths outside workdir)
 * - Cap path length to prevent DoS
 */
export declare function resolveSafePath(requestedPath: string, workdir: string): SafePathResult;
/**
 * Check if a path is a directory that should be skipped during traversal.
 * Used by list_dir and search to avoid node_modules, .git, dist, reports.
 */
export declare function shouldSkipDirectory(name: string): boolean;
//# sourceMappingURL=pathSafety.d.ts.map