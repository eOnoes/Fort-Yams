/**
 * @tripp-reason/server — swarm runtime (Phase 6B)
 *
 * In-memory swarm state + fake swarm runner.
 * No persistence yet. Real mode gated.
 */
import { runSwarmPipeline, ABSOLUTE_MAX_WORKERS, doesModeRequireApproval, getWorkerCapForMode } from "@tripp-reason/swarm";
const swarms = new Map();
export function addSwarm(e) {
    swarms.set(e.summary.id, e);
}
export function getSwarm(id) {
    return swarms.get(id);
}
export function listSwarms() {
    return Array.from(swarms.values());
}
export function getSwarmCount() {
    return swarms.size;
}
export async function runSwarm(request, workdir) {
    const mode = (request.mode ?? "small");
    // Safety: real mode not yet supported in server
    if (request.real) {
        throw new Error("Real swarm mode not yet supported in server. Use fake mode or CLI --real.");
    }
    // Safety: medium/large/max rejected in Phase 6B
    if (doesModeRequireApproval(mode)) {
        throw new Error(`Swarm mode "${mode}" requires operator startup approval. ` +
            `Only solo and small modes are supported in Phase 6B. ` +
            `Use 'tripp swarm run --mode ${mode} --approve' from CLI.`);
    }
    // Worker count validation
    const cap = getWorkerCapForMode(mode);
    const maxCap = cap.max;
    if (request.workers !== undefined) {
        if (request.workers > maxCap) {
            throw new Error(`Worker count ${request.workers} exceeds mode cap ${maxCap} for ${mode}.`);
        }
        if (request.workers > ABSOLUTE_MAX_WORKERS) {
            throw new Error(`Worker count ${request.workers} exceeds absolute maximum ${ABSOLUTE_MAX_WORKERS}.`);
        }
    }
    // Run fake swarm pipeline
    const summary = await runSwarmPipeline({
        operatorPrompt: request.prompt,
        workdir,
    });
    // Store in memory
    addSwarm({ summary, operatorPrompt: request.prompt });
    return swarmToResponse(summary, request.prompt);
}
function swarmToResponse(summary, prompt) {
    return {
        id: summary.id,
        mode: summary.mode,
        workerCount: summary.workerCount,
        status: summary.status,
        startedAt: summary.startedAt,
        completedAt: summary.completedAt ?? summary.startedAt,
        wardenStatus: summary.wardenVerdict?.status,
        promptSummary: prompt.slice(0, 200),
    };
}
// ── List/DTO Helpers ─────────────────────────────────────────────
export function swarmListDTO() {
    return listSwarms().map((e) => swarmToResponse(e.summary, e.operatorPrompt));
}
export function swarmDetailDTO(e) {
    const s = e.summary;
    return {
        id: s.id,
        mode: s.mode,
        workerCount: s.workerCount,
        status: s.status,
        operatorPrompt: e.operatorPrompt,
        taskPackets: s.taskPackets,
        resultPackets: s.resultPackets,
        conflicts: s.conflicts,
        wardenVerdict: s.wardenVerdict ?? null,
        startedAt: s.startedAt,
        completedAt: s.completedAt ?? null,
    };
}
//# sourceMappingURL=swarmRuntime.js.map