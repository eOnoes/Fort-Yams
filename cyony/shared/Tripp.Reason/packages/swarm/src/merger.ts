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
  toolCallSummaries: { tool: string; status: "ok" | "error"; summary: string }[];
  conflicts: ConflictRecord[];
  workerCount: number;
  passCount: number;
  partialCount: number;
  failCount: number;
}

/**
 * Merge result packets into a consolidated summary.
 */
export function mergeResults(
  results: ResultPacket[],
  conflicts?: ConflictRecord[],
): MergedResult {
  const passCount = results.filter((r) => r.status === "pass").length;
  const partialCount = results.filter((r) => r.status === "partial").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  // Status: any fail → fail, any partial → partial, all pass → pass
  let status: "pass" | "partial" | "fail";
  if (failCount > 0) status = "fail";
  else if (partialCount > 0) status = "partial";
  else status = "pass";

  // Aggregate findings
  const findings: Finding[] = [];
  for (const r of results) {
    findings.push(...r.findings);
  }

  // Aggregate files touched (deduplicated)
  const filesSet = new Set<string>();
  for (const r of results) {
    for (const f of r.filesTouched) {
      filesSet.add(f);
    }
  }

  // Aggregate tool calls
  const toolCalls: MergedResult["toolCallSummaries"] = [];
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
