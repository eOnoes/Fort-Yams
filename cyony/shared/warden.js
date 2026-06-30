import { ABSOLUTE_MAX_WORKERS } from "./constants.js";
/**
 * Run the Warden review pass.
 *
 * Rules:
 * - PASS: all pass, no conflicts, worker cap respected
 * - PARTIAL: partial results or open conflicts
 * - FAIL: critical worker failure, hard cap violation, or recursive spawn detected
 */
export function runWarden(plan, results, merged, conflicts) {
    const violations = [];
    const recommendations = [];
    // ── Hard cap check ────────────────────────────────────────────────
    if (plan.workerCount > ABSOLUTE_MAX_WORKERS) {
        violations.push({
            severity: "critical",
            rule: "MAX_WORKERS_EXCEEDED",
            detail: `Worker count ${plan.workerCount} exceeds absolute max ${ABSOLUTE_MAX_WORKERS}`,
        });
    }
    // ── Recursive spawn check ─────────────────────────────────────────
    for (const r of results) {
        const allText = r.summary + r.validation + r.findings.map((f) => f.message).join(" ");
        if (allText.toLowerCase().includes("spawn")) {
            violations.push({
                severity: "critical",
                rule: "RECURSIVE_SPAWN_DETECTED",
                detail: `Worker '${r.taskId}' may have attempted recursive spawn`,
                taskId: r.taskId,
            });
        }
    }
    // ── Worker count consistency ──────────────────────────────────────
    if (plan.workerCount !== results.length) {
        violations.push({
            severity: "warning",
            rule: "WORKER_COUNT_MISMATCH",
            detail: `Planned ${plan.workerCount} workers but received ${results.length} results`,
        });
    }
    // ── Conflict check ────────────────────────────────────────────────
    const openConflicts = conflicts.filter((c) => c.status === "open");
    if (openConflicts.length > 0) {
        violations.push({
            severity: "warning",
            rule: "OPEN_CONFLICTS",
            detail: `${openConflicts.length} file write conflict(s) detected`,
        });
        recommendations.push("Resolve conflicts before merging changes");
    }
    // ── Mutation safety check ─────────────────────────────────────────
    for (const r of results) {
        if (r.proposedChanges.length > 0 && r.role !== "coder" && r.role !== "planner") {
            violations.push({
                severity: "warning",
                rule: "UNEXPECTED_MUTATION",
                detail: `Worker '${r.taskId}' (role: ${r.role}) proposed changes but is not a coder`,
                taskId: r.taskId,
            });
        }
    }
    // ── Determine status ──────────────────────────────────────────────
    const hasCritical = violations.some((v) => v.severity === "critical");
    const hasFailures = results.some((r) => r.status === "fail");
    const hasPartials = results.some((r) => r.status === "partial");
    let status;
    if (hasCritical || hasFailures) {
        status = "FAIL";
    }
    else if (hasPartials || openConflicts.length > 0) {
        status = "PARTIAL";
    }
    else {
        status = "PASS";
    }
    // ── Build reasoning ───────────────────────────────────────────────
    const reasoning = [
        `Reviewed ${results.length} worker results.`,
        `Status: ${merged.passCount} pass, ${merged.partialCount} partial, ${merged.failCount} fail.`,
        `Conflicts: ${conflicts.length} total, ${openConflicts.length} open.`,
        `Violations: ${violations.filter((v) => v.severity === "critical").length} critical, ${violations.filter((v) => v.severity === "warning").length} warning.`,
    ].join(" ");
    if (recommendations.length === 0) {
        recommendations.push("No issues found. Swarm results are clean.");
    }
    return { status, reasoning, violations, recommendations };
}
//# sourceMappingURL=warden.js.map