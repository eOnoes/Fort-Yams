export function buildSwarmSummary(input) {
    let status;
    switch (input.verdict.status) {
        case "PASS":
            status = "pass";
            break;
        case "PARTIAL":
            status = "partial";
            break;
        default:
            status = "fail";
    }
    return {
        id: input.plan.id,
        mode: input.plan.selectedMode,
        workerCount: input.plan.workerCount,
        status,
        taskPackets: input.plan.taskPackets,
        resultPackets: input.resultPackets,
        wardenVerdict: input.verdict,
        conflicts: input.conflicts,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
    };
}
//# sourceMappingURL=swarmSummary.js.map