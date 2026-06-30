/**
 * @tripp-reason/swarm — worker result mapper
 *
 * Maps ReasonLoop output to a structured ResultPacket.
 * Phase 5E. Pure data transformation — no I/O, no providers.
 */
import type { WorkerRole, ResultPacket } from "./types.js";
import type { ReasonLoopResult } from "@tripp-reason/core";
export interface MapperInput {
    taskId: string;
    role: WorkerRole;
    /** ReasonLoop result from the worker run. */
    loopResult: ReasonLoopResult;
    /** Timeout information if the worker timed out. */
    timedOut?: boolean;
    timeoutMs?: number;
}
/**
 * Map a ReasonLoopResult to a structured ResultPacket.
 *
 * If the worker output is valid structured JSON, it populates
 * the ResultPacket fields. If not, it creates a partial result
 * with the raw output preserved.
 */
export declare function mapWorkerResult(input: MapperInput): ResultPacket;
//# sourceMappingURL=workerResultMapper.d.ts.map