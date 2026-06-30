/**
 * Path Safety Module
 *
 * Provides workdir boundary enforcement and path traversal prevention.
 * All tools must use these utilities to ensure paths stay within workdir.
 */

const MAX_PATH_LENGTH = 4096;

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
export function resolveSafePath(
  requestedPath: string,
  workdir: string
): SafePathResult {
  // Check path length
  if (requestedPath.length > MAX_PATH_LENGTH) {
    return {
      safe: false,
      error: `Path exceeds maximum length (${MAX_PATH_LENGTH} chars)`
    };
  }

  // Normalize workdir
  const normalizedWorkdir = workdir.replace(/\/+$/, "");

  // Handle absolute paths
  if (requestedPath.startsWith("/")) {
    // Absolute path must be within workdir
    const resolved = requestedPath;
    if (!resolved.startsWith(normalizedWorkdir)) {
      return {
        safe: false,
        error: `Absolute path outside workdir: ${requestedPath}`
      };
    }
    // Check for traversal after resolution
    if (resolved.includes("..")) {
      return {
        safe: false,
        error: `Path traversal detected: ${requestedPath}`
      };
    }
    return { safe: true, resolvedPath: resolved };
  }

  // Relative path - resolve against workdir
  const resolved = `${normalizedWorkdir}/${requestedPath}`;

  // Check for traversal
  if (resolved.includes("..")) {
    return {
      safe: false,
      error: `Path traversal detected: ${requestedPath}`
    };
  }

  // Final check: resolved must start with workdir
  if (!resolved.startsWith(normalizedWorkdir)) {
    return {
      safe: false,
      error: `Resolved path outside workdir: ${resolved}`
    };
  }

  return { safe: true, resolvedPath: resolved };
}

/**
 * Check if a path is a directory that should be skipped during traversal.
 * Used by list_dir and search to avoid node_modules, .git, dist, reports.
 */
export function shouldSkipDirectory(name: string): boolean {
  const skipDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "reports",
    ".next",
    ".cache"
  ]);
  return skipDirs.has(name);
}
