/**
 * @tripp-reason/swarm — conflict detector
 *
 * Detects write conflicts between ResultPackets.
 * Phase 5D: in-memory only. No file system access.
 */
import type { ResultPacket, ConflictRecord } from "./types.js";
import { createId } from "./ids.js";

/**
 * Detect conflicts: two workers proposing changes to the same file.
 * Read-only overlaps (empty filesTouched) are not conflicts.
 */
export function detectConflicts(results: ResultPacket[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const fileToWorkers = new Map<string, string[]>();

  for (const r of results) {
    // Check proposedChanges
    for (const pc of r.proposedChanges) {
      const existing = fileToWorkers.get(pc.file) ?? [];
      existing.push(r.taskId);
      fileToWorkers.set(pc.file, existing);
    }

    // Check filesTouched (only if worker had mutations)
    if (r.filesTouched.length > 0 && r.proposedChanges.length > 0) {
      for (const f of r.filesTouched) {
        const existing = fileToWorkers.get(f) ?? [];
        if (!existing.includes(r.taskId)) {
          existing.push(r.taskId);
          fileToWorkers.set(f, existing);
        }
      }
    }
  }

  for (const [file, taskIds] of fileToWorkers) {
    if (taskIds.length >= 2) {
      conflicts.push({
        id: createId("conflict"),
        file,
        taskIds,
        status: "open",
      });
    }
  }

  return conflicts;
}
