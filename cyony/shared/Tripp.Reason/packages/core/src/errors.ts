/**
 * @tripp-reason/core — error types
 *
 * Minimal error hierarchy for core operations.
 * All extend TrippCoreError for `instanceof` checks.
 */

/** Base error for all core operations. */
export class TrippCoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TrippCoreError";
  }
}

/** Thrown when an approval request is denied by the Approver. */
export class ApprovalDeniedError extends TrippCoreError {
  public readonly toolName: string;
  public readonly reason: string;

  constructor(toolName: string, reason: string) {
    super(`Approval denied for tool "${toolName}": ${reason}`);
    this.name = "ApprovalDeniedError";
    this.toolName = toolName;
    this.reason = reason;
  }
}

/** Thrown when a run fails during execution. */
export class RunFailedError extends TrippCoreError {
  public readonly runId: string;

  constructor(runId: string, message: string, options?: ErrorOptions) {
    super(`Run ${runId} failed: ${message}`, options);
    this.name = "RunFailedError";
    this.runId = runId;
  }
}

/** Thrown when report generation fails. */
export class ReportGenerationError extends TrippCoreError {
  public readonly runId: string;

  constructor(runId: string, message: string, options?: ErrorOptions) {
    super(`Report generation for run ${runId} failed: ${message}`, options);
    this.name = "ReportGenerationError";
    this.runId = runId;
  }
}
