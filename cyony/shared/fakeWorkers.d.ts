/**
 * @tripp-reason/swarm — fake workers
 *
 * Deterministic role-specific fake workers for Phase 5C testing.
 * No providers, no tools, no file I/O. Each returns a valid ResultPacket.
 *
 * Simulation markers in taskPacket.objective:
 * - "[simulate-timeout]" → returns PARTIAL with timeout finding
 * - "[simulate-fail]" → returns FAIL with critical finding
 */
import type { SubagentSpec, TaskPacket, ResultPacket } from "./types.js";
import type { WorkerExecutionContext } from "./workerRunner.js";
/**
 * Run a deterministic fake worker.
 *
 * Simulation markers in taskPacket.objective:
 * - "[simulate-timeout]" → returns PARTIAL
 * - "[simulate-fail]" → returns FAIL
 * - ctx.simulateTimeout / ctx.simulateFail → same behavior
 */
export declare function runFakeWorker(subagent: SubagentSpec, task: TaskPacket, ctx: WorkerExecutionContext): ResultPacket;
//# sourceMappingURL=fakeWorkers.d.ts.map