/**
 * Merge result packets into a consolidated summary.
 */
export function mergeResults(results, conflicts) {
    const passCount = results.filter((r) => r.status === "pass").length;
    const partialCount = results.filter((r) => r.status === "partial").length;
    const failCount = results.filter((r) => r.status === "fail").length;
    // Status: any fail → fail, any partial → partial, all pass → pass
    let status;
    if (failCount > 0)
        status = "fail";
    else if (partialCount > 0)
        status = "partial";
    else
        status = "pass";
    // Aggregate findings
    const findings = [];
    for (const r of results) {
        findings.push(...r.findings);
    }
    // Aggregate files touched (deduplicated)
    const filesSet = new Set();
    for (const r of results) {
        for (const f of r.filesTouched) {
            filesSet.add(f);
        }
    }
    // Aggregate tool calls
    const toolCalls = [];
    for (const r of results) {
        toolCalls.push(...r.toolCalls);
    }
    // Summary
    const summary = `Merged ${results.length} workers: ${passCount} pass, ${partialCount} partial, ${failCount} fail.`;
    return {
        status,
        summary,
        findings,
        filesTouched: Array.from(filesSet),
        toolCallSummaries: toolCalls,
        conflicts: conflicts ?? [],
        workerCount: results.length,
        passCount,
        partialCount,
        failCount,
    };
}
//# sourceMappingURL=merger.js.map