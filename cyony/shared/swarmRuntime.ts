/**
 * @tripp-reason/server — swarm runtime (Phase 6B)
 *
 * In-memory swarm state + fake swarm runner.
 * No persistence yet. Real mode gated.
 */
import { runSwarmPipeline, ABSOLUTE_MAX_WORKERS, doesModeRequireApproval, getWorkerCapForMode } from "@tripp-reason/swarm";
import type { SwarmMode, SwarmRunSummary } from "@tripp-reason/swarm";

// ── In-Memory Registry ──────────────────────────────────────────

export interface SwarmRunEntry {
  summary: SwarmRunSummary;
  operatorPrompt: string;
}

const swarms = new Map<string, SwarmRunEntry>();

export function addSwarm(e: SwarmRunEntry): void {
  swarms.set(e.summary.id, e);
}

export function getSwarm(id: string): SwarmRunEntry | undefined {
  return swarms.get(id);
}

export function listSwarms(): SwarmRunEntry[] {
  return Array.from(swarms.values());
}

export function getSwarmCount(): number {
  return swarms.size;
}

// ── Swarm Runner ─────────────────────────────────────────────────

export interface SwarmRunRequest {
  prompt: string;
  mode?: SwarmMode;
  workers?: number;
  fake?: boolean;
  real?: boolean;
  workdir?: string;
}

export interface SwarmRunResponse {
  id: string;
  mode: string;
  workerCount: number;
  status: string;
  startedAt: string;
  completedAt: string;
  wardenStatus?: string;
  reportPath?: string;
  promptSummary: string;
}

export async function runSwarm(request: SwarmRunRequest, workdir: string): Promise<SwarmRunResponse> {
  const mode = (request.mode ?? "small") as SwarmMode;

  // Safety: real mode not yet supported in server
  if (request.real) {
    throw new Error("Real swarm mode not yet supported in server. Use fake mode or CLI --real.");
  }

  // Safety: medium/large/max rejected in Phase 6B
  if (doesModeRequireApproval(mode)) {
    throw new Error(
      `Swarm mode "${mode}" requires operator startup approval. ` +
      `Only solo and small modes are supported in Phase 6B. ` +
      `Use 'tripp swarm run --mode ${mode} --approve' from CLI.`
    );
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

function swarmToResponse(summary: SwarmRunSummary, prompt: string): SwarmRunResponse {
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

export function swarmListDTO(): SwarmRunResponse[] {
  return listSwarms().map((e) => swarmToResponse(e.summary, e.operatorPrompt));
}

export function swarmDetailDTO(e: SwarmRunEntry): Record<string, unknown> {
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
