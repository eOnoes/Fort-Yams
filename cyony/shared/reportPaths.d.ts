/**
 * Compute the report file path for a given session/run pair.
 * Returns a POSIX-style path relative to the repo root:
 *   reports/<sessionId>/<runId>.md
 *
 * Callers must ensure the directory exists before writing
 * (e.g. via `fs.mkdirSync(dirname(path), { recursive: true })`).
 */
export declare function reportPath(sessionId: string, runId: string): string;
/**
 * Compute the directory where a session's reports live.
 */
export declare function reportDir(sessionId: string): string;
/**
 * Root directory for all reports.
 */
export declare const reportsRoot = "reports";
//# sourceMappingURL=reportPaths.d.ts.map