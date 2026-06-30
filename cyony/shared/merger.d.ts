/**
 * @tripp-reason/swarm — merger
 *
 * Consolidates ResultPackets into a merged summary.
 * Phase 5D: deterministic status aggregation. No file I/O.
 */
import type { ResultPacket, ConflictRecord, Finding } from "./types.js";
export interface MergedResult {
    status: "pass" | "partial" | "fail";
    summary: string;
    findings: Finding[];
    filesTouched: string[];
    toolCallSummaries: {
        tool: string;
        status: "ok" | "error";
        summary: string;
    }[];
    conflicts: ConflictRecord[];
    workerCount: number;
    passCount: number;
    partialCount: number;
    failCount: number;
}
/**
 * Merge result packets into a consolidated summary.
 */
export declare function mergeResults(results: ResultPacket[], conflicts?: ConflictRecord[]): MergedResult;
//# sourceMappingURL=merger.d.ts.map