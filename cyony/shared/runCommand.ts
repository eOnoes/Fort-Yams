/**
 * tripp run command implementation
 *
 * Wires together all packages for an end-to-end run:
 * - SQLite store + repositories
 * - RunManager + EventStream
 * - OpenAICompatibleProvider
 * - ToolDispatcher with active read-only tools
 * - ReasonLoop
 * - CLI output
 */

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
import type { StreamEvent } from "@tripp-reason/shared";
import { assembleMcpRuntime } from "@tripp-reason/mcp";

import type { ResolvedConfig } from "./config.js";
import { CliApprover } from "./approver.js";
import { printEvent, printRunComplete, printError } from "./output.js";

export async function executeRun(prompt: string, config: ResolvedConfig): Promise<void> {
  // Ensure database directory exists
  const dbPath = resolve(config.dbPath);
  const dbDir = dirname(dbPath);
  await mkdir(dbDir, { recursive: true });

  // Initialize store
  console.log(`📦 Store: ${dbPath}`);
  const db = initDb(dbPath);
  const repos = createRepositories(db);

  // Initialize provider
  console.log(`🤖 Provider: ${config.providerName} (model: ${config.model})`);
  console.log(`   Base URL: ${config.baseUrl}`);

  const provider = new OpenAICompatibleProvider({
    name: config.providerName,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    defaultModel: config.model,
  });

  // Initialize tools (read-only + mutation + command execution)
  console.log(`🛠️  Tools: list_dir, read_file, search, git_status, git_diff, write_file, edit_file, shell, run_tests`);
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

  // Initialize approval
  const approver = new CliApprover();
  const approvalGate = createApprovalGate({ approver, throwOnDenial: true });

  // Phase 4E: Load MCP tools from config
  let mcpRuntime = null;
  try {
    mcpRuntime = await assembleMcpRuntime(config.workdir);
    if (mcpRuntime.tools.length > 0) {
      for (const tool of mcpRuntime.tools) {
        dispatcher.register(tool);
      }
      console.log(`🔌 MCP: ${mcpRuntime.status.connectedCount}/${mcpRuntime.status.serverCount} servers, ${mcpRuntime.tools.length} tools loaded`);
    }
  } catch {
    // MCP assembly failure is non-fatal
  }

  // Initialize event stream with terminal output
  const eventStream = createEventStream();
  const unsub = eventStream.subscribe((event: StreamEvent) => {
    printEvent(event);
  });

  // Initialize run manager
  const runManager = createRunManager({
    repos,
    eventStream,
    workdir: config.workdir,
    generateReportOnComplete: true,
  });

  // Initialize reason loop
  const loop = createReasonLoop({
    provider,
    runManager,
    toolDispatcher: dispatcher,
    approvalGate,
    model: config.model,
    providerName: config.providerName,
  });

  // Execute run
  console.log(`\n💬 Running:\n${"─".repeat(60)}\n${prompt}\n${"─".repeat(60)}\n`);

  try {
    const result = await loop.run({
      prompt,
      title: config.title,
      workdir: config.workdir,
    });

    // Query for report path after run completion
    let reportPath: string | undefined;
    try {
      const reportRecord = await repos.getReportByRun(result.runId);
      reportPath = reportRecord?.path;
    } catch {
      // Report record may not exist if report generation failed
    }

    unsub(); // Clean up event listener
    printRunComplete(result.status, reportPath);

    if (result.status === "failed") {
      process.exit(1);
    }
  } catch (error) {
    unsub();
    const message = error instanceof Error ? error.message : String(error);
    printError(`Run failed: ${message}`);
    process.exit(1);
  }
}
