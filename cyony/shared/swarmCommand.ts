/**
 * tripp swarm run command — Phase 5F
 *
 * Wires the swarm pipeline into CLI. Supports fake-mode (default)
 * and real mode (--real) with injected ReasonLoop dependencies.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  runSwarmPipeline,
  ABSOLUTE_MAX_WORKERS,
  doesModeRequireApproval,
  getWorkerCapForMode,
} from "@tripp-reason/swarm";
import type { SwarmMode, SwarmRunSummary } from "@tripp-reason/swarm";

// Real-mode deps (mirrors runCommand.ts wiring)
import {
  createReasonLoop,
  createRunManager,
  createEventStream,
  createApprovalGate,
} from "@tripp-reason/core";
import { initDb, createRepositories } from "@tripp-reason/store";
import { OpenAICompatibleProvider } from "@tripp-reason/providers";
import {
  createDispatcher,
  listDirTool,
  readFileTool,
  searchTool,
  gitStatusTool,
  gitDiffTool,
  writeFileTool,
  editFileTool,
  shellTool,
  runTestsTool,
} from "@tripp-reason/tools";
import { assembleMcpRuntime } from "@tripp-reason/mcp";
import type { StreamEvent } from "@tripp-reason/shared";

import { loadEnv, validateRequiredEnv } from "./env.js";
import { resolveConfig } from "./config.js";
import { CliApprover } from "./approver.js";
import {
  printSwarmHeader,
  printSwarmResult,
  printSwarmError,
  printApprovalDenied,
  printWorkerCapRejected,
} from "./swarmOutput.js";
import { printEvent } from "./output.js";

export interface SwarmOptions {
  mode?: string;
  workers?: number;
  fake?: boolean;
  real?: boolean;
  workdir: string;
  db?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  model?: string;
  providerName?: string;
  mcpConfig?: string;
  approve?: boolean;
  denyAll?: boolean;
  reportOnly?: boolean;
}

export async function executeSwarm(
  prompt: string,
  options: SwarmOptions,
): Promise<void> {
  // Resolve mode
  const mode = (options.mode ?? "small") as SwarmMode;
  const validModes = ["solo", "small", "medium", "large", "max"];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(", ")}`);
  }

  // Validate worker count
  const cap = getWorkerCapForMode(mode);
  const maxCap = cap.max;
  if (options.workers !== undefined && options.workers > maxCap) {
    printWorkerCapRejected(options.workers, maxCap);
    process.exit(1);
  }
  if (options.workers !== undefined && options.workers > ABSOLUTE_MAX_WORKERS) {
    printWorkerCapRejected(options.workers, ABSOLUTE_MAX_WORKERS);
    process.exit(1);
  }

  // Startup approval for medium/large/max
  if (doesModeRequireApproval(mode)) {
    if (options.denyAll) {
      printApprovalDenied(mode);
      process.exit(1);
    }
    if (!options.approve) {
      const approved = await promptStartupApproval(mode, maxCap);
      if (!approved) {
        printApprovalDenied(mode);
        process.exit(1);
      }
    }
  }

  const isReal = options.real === true && !options.fake;
  const displayCap = options.workers ?? maxCap;

  printSwarmHeader(mode, displayCap);

  // ── Fake mode (default) ────────────────────────────────────────
  if (!isReal) {
    console.log("🧪 Fake mode: deterministic pipeline (no providers)\n");

    try {
      const summary = await runSwarmPipeline({
        operatorPrompt: prompt,
        workdir: options.workdir,
      });

      const reportPath = await writeSwarmReport(summary, options.workdir);
      printSwarmResult(summary);
      console.log(`📄 Report: ${reportPath}\n`);

      if (summary.status === "fail") {
        process.exit(1);
      }
    } catch (err) {
      printSwarmError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  // ── Real mode (--real) ─────────────────────────────────────────
  console.log("⚡ Real mode: ReasonLoop-backed workers\n");

  const env = loadEnv();
  validateRequiredEnv(env);
  const config = resolveConfig(
    {
      workdir: options.workdir,
      db: options.db ?? '.tripp/reason.sqlite',
      baseUrl: options.baseUrl,
      apiKeyEnv: options.apiKeyEnv,
      model: options.model,
      providerName: options.providerName,
    },
    env,
  );

  const dbPath = resolve(config.dbPath);
  await mkdir(dirname(dbPath), { recursive: true });

  const db = initDb(dbPath);
  const repos = createRepositories(db);

  const provider = new OpenAICompatibleProvider({
    name: config.providerName,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    defaultModel: config.model,
  });

  const dispatcher = createDispatcher([
    listDirTool,
    readFileTool,
    searchTool,
    gitStatusTool,
    gitDiffTool,
    writeFileTool,
    editFileTool,
    shellTool,
    runTestsTool,
  ]);

  const approver = new CliApprover();
  const approvalGate = createApprovalGate({
    approver,
    throwOnDenial: false,
  });

  try {
    const mcpRuntime = await assembleMcpRuntime(config.workdir);
    if (mcpRuntime.tools.length > 0) {
      for (const tool of mcpRuntime.tools) {
        dispatcher.register(tool);
      }
    }
  } catch {
    // non-fatal
  }

  const eventStream = createEventStream();
  const unsub = eventStream.subscribe((event: StreamEvent) => {
    printEvent(event);
  });

  const runManager = createRunManager({
    repos,
    eventStream,
    workdir: config.workdir,
    generateReportOnComplete: true,
  });

  const loop = createReasonLoop({
    provider,
    runManager,
    toolDispatcher: dispatcher,
    approvalGate,
    model: config.model,
    providerName: config.providerName,
  });

  try {
    const summary = await runSwarmPipeline({
      operatorPrompt: prompt,
      workdir: options.workdir,
      reasonLoop: loop,
      toolDispatcher: dispatcher,
      approvalGate,
    });

    unsub();
    const reportPath = await writeSwarmReport(summary, options.workdir);

    printSwarmResult(summary);
    console.log(`📄 Report: ${reportPath}\n`);

    if (summary.status === "fail") {
      process.exit(1);
    }
  } catch (err) {
    unsub();
    printSwarmError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ── Startup Approval ──────────────────────────────────────────────

async function promptStartupApproval(
  mode: string,
  maxWorkers: number,
): Promise<boolean> {
  const { createInterface } = await import("node:readline");
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = `\n⚠️  Swarm mode "${mode}" (up to ${maxWorkers} workers) requires operator approval.\n\nApprove swarm startup? (y/N): `;

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });

    setTimeout(() => {
      rl.close();
      resolve(false);
    }, 30000);
  });
}

// ── Swarm Report Writer ───────────────────────────────────────────

async function writeSwarmReport(
  summary: SwarmRunSummary,
  workdir: string,
): Promise<string> {
  const dateDir = new Date().toISOString().slice(0, 10);
  const reportDir = join(workdir, "reports", dateDir);
  await mkdir(reportDir, { recursive: true });

  const reportPath = join(reportDir, `${summary.id}.md`);

  const lines: string[] = [];
  lines.push(`# Tripp.Reason Swarm Report`);
  lines.push("");
  lines.push(`**Status:** ${summary.status.toUpperCase()}`);
  lines.push(`**Swarm ID:** ${summary.id}`);
  lines.push(`**Mode:** ${summary.mode} — ${summary.workerCount} workers`);
  lines.push(`**Started:** ${summary.startedAt}`);
  lines.push(`**Completed:** ${summary.completedAt || "N/A"}`);
  lines.push("");

  if (summary.taskPackets.length > 0) {
    lines.push("## Tasks");
    lines.push("");
    for (const t of summary.taskPackets) {
      lines.push(`- **[${t.role}]** ${t.title} — ${t.objective}`);
    }
    lines.push("");
  }

  if (summary.resultPackets.length > 0) {
    lines.push("## Workers");
    lines.push("");
    for (const r of summary.resultPackets) {
      const icon = r.status === "pass" ? "✅" : r.status === "partial" ? "⚠️" : "❌";
      lines.push(`- ${icon} **${r.role}** (${r.status}): ${r.summary}`);
    }
    lines.push("");
  }

  const allFiles = new Set<string>();
  for (const r of summary.resultPackets) {
    for (const f of r.filesTouched) allFiles.add(f);
  }
  if (allFiles.size > 0) {
    lines.push("## Files Touched");
    lines.push("");
    for (const f of Array.from(allFiles)) lines.push(`- ${f}`);
    lines.push("");
  }

  if (summary.conflicts.length > 0) {
    lines.push("## Conflicts");
    lines.push("");
    for (const c of summary.conflicts) {
      lines.push(`- **${c.file}** — tasks: ${c.taskIds.join(", ")}`);
    }
    lines.push("");
  }

  if (summary.wardenVerdict) {
    const v = summary.wardenVerdict;
    lines.push("## Warden Verdict");
    lines.push("");
    lines.push(`**Status:** ${v.status}`);
    lines.push(`**Reasoning:** ${v.reasoning || "N/A"}`);
    if (v.violations.length > 0) {
      for (const viol of v.violations) {
        lines.push(`- [${viol.severity}] ${viol.rule}: ${viol.detail}`);
      }
    }
    lines.push("");
  }

  lines.push("## Next Step");
  lines.push(summary.status === "pass"
    ? "Swarm run completed successfully. Review results and merge."
    : "Review partial/failed results and retry or adjust scope.");
  lines.push("");

  await writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}
