import type { RunReport, PersistenceWarning } from "@tripp-reason/shared";
import type { Repositories } from "@tripp-reason/store";
/**
 * Generate a run report from stored data.
 *
 * @param repos - Store repositories bound to a db instance
 * @param runId - The run to generate a report for
 * @param workdir - Working directory for resolving relative report paths
 * @param persistenceWarnings - Phase 2A: warnings from failed persistence operations
 * @returns The RunReport data + the path where it was written
 */
export declare function generateReport(repos: Repositories, runId: string, workdir?: string, persistenceWarnings?: PersistenceWarning[]): Promise<RunReport>;
//# sourceMappingURL=reportGenerator.d.ts.map