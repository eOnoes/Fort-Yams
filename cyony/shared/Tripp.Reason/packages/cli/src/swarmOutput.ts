/**
 * CLI swarm output formatting — Phase 5F
 */
import type { SwarmRunSummary, ResultPacket, ConflictRecord, WardenVerdict, TaskPacket } from "@tripp-reason/swarm";

export function printSwarmHeader(mode: string, workerCount: number): void {
  console.log("\n" + "═".repeat(60));
  console.log(`🐝 Swarm: ${mode} mode — ${workerCount} workers`);
  console.log("═".repeat(60));
}

export function printSwarmResult(summary: SwarmRunSummary): void {
  console.log("\n" + "─".repeat(60));
  console.log(`📋 Status: ${summary.status.toUpperCase()}`);
  console.log(`🆔 Swarm ID: ${summary.id}`);
  console.log(`🐝 Mode: ${summary.mode} (${summary.workerCount} workers)`);
  console.log("─".repeat(60));

  // Worker table
  if (summary.resultPackets.length > 0) {
    console.log("\n👷 Workers:");
    for (const r of summary.resultPackets) {
      const icon = r.status === "pass" ? "✅" : r.status === "partial" ? "⚠️" : "❌";
      console.log(`  ${icon} ${r.role.padEnd(12)} | ${r.status.padEnd(8)} | ${r.summary.slice(0, 60)}`);
    }
  }

  // Task packets
  if (summary.taskPackets.length > 0) {
    console.log("\n📦 Tasks:");
    for (const t of summary.taskPackets) {
      console.log(`  • [${t.role}] ${t.title}`);
    }
  }

  // Files touched
  const allFiles = new Set<string>();
  for (const r of summary.resultPackets) {
    for (const f of r.filesTouched) allFiles.add(f);
  }
  if (allFiles.size > 0) {
    console.log("\n📁 Files Touched:");
    for (const f of Array.from(allFiles)) console.log(`  • ${f}`);
  }

  // Tool calls
  const allTools = new Set<string>();
  for (const r of summary.resultPackets) {
    for (const t of r.toolCalls) allTools.add(t.tool);
  }
  if (allTools.size > 0) {
    console.log("\n🔧 Tool Calls:");
    for (const t of Array.from(allTools)) console.log(`  • ${t}`);
  }

  // Conflicts
  if (summary.conflicts.length > 0) {
    console.log("\n⚠️  Conflicts:");
    for (const c of summary.conflicts) {
      console.log(`  • ${c.file} (${c.taskIds.join(", ")})`);
    }
  } else {
    console.log("\n✅ No conflicts");
  }

  // Warden verdict
  if (summary.wardenVerdict) {
    const v = summary.wardenVerdict;
    console.log(`\n🛡️  Warden: ${v.status}`);
    if (v.reasoning) console.log(`   ${v.reasoning}`);
    if (v.violations.length > 0) {
      for (const viol of v.violations) {
        const icon = viol.severity === "critical" ? "❌" : viol.severity === "warning" ? "⚠️" : "ℹ️";
        console.log(`   ${icon} ${viol.rule}: ${viol.detail}`);
      }
    }
  }

  // Timing
  if (summary.startedAt && summary.completedAt) {
    const start = new Date(summary.startedAt);
    const end = new Date(summary.completedAt);
    const ms = end.getTime() - start.getTime();
    console.log(`\n⏱️  Duration: ${(ms / 1000).toFixed(1)}s`);
  }

  console.log("\n" + "═".repeat(60) + "\n");
}

export function printSwarmError(message: string): void {
  console.error(`\n❌ Swarm error: ${message}\n`);
}

export function printApprovalDenied(mode: string): void {
  console.error(`\n🛑 Swarm startup denied: ${mode} mode requires operator approval.\n`);
  console.error("   Use --approve to confirm or choose solo/small mode.\n");
}

export function printWorkerCapRejected(count: number, max: number): void {
  console.error(`\n❌ Worker count ${count} exceeds absolute maximum of ${max}.\n`);
}
