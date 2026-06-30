/**
 * @tripp-reason/swarm — conflict detector
 *
 * Detects write conflicts between ResultPackets.
 * Phase 5D: in-memory only. No file system access.
 */
import type { ResultPacket, ConflictRecord } from "./types.js";
/**
 * Detect conflicts: two workers proposing changes to the same file.
 * Read-only overlaps (empty filesTouched) are not conflicts.
 */
export declare function detectConflicts(results: ResultPacket[]): ConflictRecord[];
//# sourceMappingURL=conflictDetector.d.ts.map