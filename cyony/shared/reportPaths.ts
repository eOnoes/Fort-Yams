/**
 * @tripp-reason/store — report path helpers
 *
 * Computes the on-disk path for run report markdown files.
 * Path format: reports/<session-id>/<run-id>.md
 *
 * This module does NOT create directories or files. That belongs in
 * core/RunManager, which uses these helpers to compute the target path
 * and then performs the filesystem writes.
 */
import { join } from "node:path";

const REPORTS_ROOT = "reports";

/**
 * Compute the report file path for a given session/run pair.
 * Returns a POSIX-style path relative to the repo root:
 *   reports/<sessionId>/<runId>.md
 *
 * Callers must ensure the directory exists before writing
 * (e.g. via `fs.mkdirSync(dirname(path), { recursive: true })`).
 */
export function reportPath(sessionId: string, runId: string): string {
  return join(REPORTS_ROOT, sessionId, `${runId}.md`).replace(/\\/g, "/");
}

/**
 * Compute the directory where a session's reports live.
 */
export function reportDir(sessionId: string): string {
  return join(REPORTS_ROOT, sessionId).replace(/\\/g, "/");
}

/**
 * Root directory for all reports.
 */
export const reportsRoot = REPORTS_ROOT;
