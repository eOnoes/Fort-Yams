import { randomUUID } from "node:crypto";
import { resolve, basename } from "node:path";
import { ensureAgentBus, getAgentBusPaths, writeTaskPacket, readTaskPacket, readResultPacket, readReviewPacket as readReviewPacketFromBus, listInboxPackets, listOutboxPackets, listReviewPackets, listReportFiles, movePacketToArchive, movePacketToRejected, writeReviewPacket, SCHEMA_VERSION, DEFAULT_DENIED_PATHS, 
// Trace ledger (Phase 7F)
createTraceEvent, appendTraceEvent, getTraceLedgerPath, readTraceEvents, validateTraceLedger, findRootCauseChain, 
// Transport (Phase 7H)
createDefaultTransportConfig, createDispatchRequest, dispatchToFakeAgent, dispatchToManualFileTransport, } from "@tripp-reason/external-agents";
import { printError } from "./output.js";
// ── Trace event emission helper (Phase 7F) ────────────────────────────
/** Emit a trace event silently. Never throws — trace failures must not block operations. */
async function emitTrace(input, workdir) {
    try {
        const event = createTraceEvent(input);
        await appendTraceEvent(event, workdir);
    }
    catch {
        // Trace emission is best-effort; never block the main operation
    }
}
// ── Agent-specific defaults ──────────────────────────────────────────
const AGENT_DEFAULTS = {
    openclaw_tripp: { trustZone: "cloud_controlled_reasoning" },
    hermes_cyony: { trustZone: "cloud_sandbox_proposal" },
    openclaw_echo: { trustZone: "local_audit_warden" },
};
const VALID_ROLES = [
    "openclaw_tripp",
    "hermes_cyony",
    "openclaw_echo",
];
const VALID_TASK_TYPES = [
    "plan", "review", "audit", "prototype", "proposal",
    "implementation_proposal", "warden_review", "swarm_decomposition",
    "report_review", "drift_check",
];
// ── Safe Path Helpers ─────────────────────────────────────────────────
function safeResolve(filePath, workdir) {
    const paths = getAgentBusPaths(workdir);
    const resolved = resolve(filePath);
    const root = resolve(paths.root);
    if (!resolved.startsWith(root + "/") && resolved !== root) {
        throw new Error(`Path traversal rejected: ${filePath} is outside Agent Bus root (${root})`);
    }
    return resolved;
}
// ── Output helpers ────────────────────────────────────────────────────
function printHeader(title) {
    console.log(`\n${title}`);
    console.log("─".repeat(title.length));
}
function printKeyValue(key, value) {
    if (value !== undefined && value !== "") {
        console.log(`  ${key}: ${value}`);
    }
}
// ── 1. tripp agents init ──────────────────────────────────────────────
export async function executeAgentsInit(workdir) {
    const paths = await ensureAgentBus(workdir);
    console.log("Agent Bus initialized.");
    console.log(`  Root:     ${paths.root}`);
    console.log(`  Inbox:    ${paths.inbox}`);
    console.log(`  Outbox:   ${paths.outbox}`);
    console.log(`  Reports:  ${paths.reports}`);
    console.log(`  Archive:  ${paths.archive}`);
    console.log(`  Rejected: ${paths.rejected}`);
}
// ── 2. tripp agents inbox ─────────────────────────────────────────────
export async function executeAgentsInbox(workdir) {
    const files = await listInboxPackets({ workdir });
    if (files.length === 0) {
        console.log("No inbox packets.");
        return;
    }
    printHeader(`Inbox (${files.length} packet${files.length > 1 ? "s" : ""})`);
    for (const f of files) {
        try {
            const p = await readTaskPacket(f);
            console.log(`  ${basename(f)}`);
            printKeyValue("packetId", p.packetId);
            printKeyValue("agentRole", p.agentRole);
            printKeyValue("taskType", p.taskType);
            printKeyValue("title", p.title);
            printKeyValue("status", p.status);
            printKeyValue("createdAt", p.createdAt);
            console.log();
        }
        catch {
            console.log(`  ${basename(f)}  ⚠️ MALFORMED — schema validation failed (skipped, not executed)`);
            console.log();
        }
    }
}
// ── 3. tripp agents outbox ────────────────────────────────────────────
export async function executeAgentsOutbox(workdir) {
    const files = await listOutboxPackets({ workdir });
    if (files.length === 0) {
        console.log("No outbox packets.");
        return;
    }
    printHeader(`Outbox (${files.length} packet${files.length > 1 ? "s" : ""})`);
    for (const f of files) {
        try {
            const p = await readResultPacket(f);
            console.log(`  ${basename(f)}`);
            printKeyValue("resultId", p.resultId);
            printKeyValue("packetId", p.packetId);
            printKeyValue("agentRole", p.agentRole);
            printKeyValue("status", p.status);
            printKeyValue("summary", p.summary);
            printKeyValue("createdAt", p.createdAt);
            console.log();
        }
        catch {
            console.log(`  ${basename(f)}  ⚠️ MALFORMED — schema validation failed (skipped, not executed)`);
            console.log();
        }
    }
}
// ── 4. tripp agents read ──────────────────────────────────────────────
export async function executeAgentsRead(filePath, workdir) {
    const resolved = safeResolve(filePath, workdir);
    // Try task packet first, then result
    let tryTask = false;
    let tryResult = false;
    const name = basename(resolved);
    if (name.startsWith("task-"))
        tryTask = true;
    else if (name.startsWith("result-"))
        tryResult = true;
    else {
        tryTask = true;
        tryResult = true;
    } // try both
    let found = false;
    if (tryTask) {
        try {
            const p = await readTaskPacket(resolved);
            console.log(JSON.stringify(p, null, 2));
            console.log(`\n✅ Schema validation: PASS (task packet)`);
            console.log(`⚠️  This packet is NOT approval and NOT mutation authority.`);
            found = true;
        }
        catch { /* not a valid task packet */ }
    }
    if (!found && tryResult) {
        try {
            const p = await readResultPacket(resolved);
            console.log(JSON.stringify(p, null, 2));
            console.log(`\n✅ Schema validation: PASS (result packet)`);
            console.log(`⚠️  This result is NOT approval and NOT mutation authority.`);
            found = true;
        }
        catch { /* not a valid result packet */ }
    }
    if (!found) {
        console.error(`❌ Schema validation: FAIL — file is not a valid task or result packet.`);
        console.error(`   File was NOT executed. Contents are preserved.`);
    }
}
// ── 5. tripp agents create-task ───────────────────────────────────────
export async function executeAgentsCreateTask(options) {
    // Validate required options
    if (!VALID_ROLES.includes(options.agent)) {
        throw new Error(`Invalid agent role "${options.agent}". Must be one of: ${VALID_ROLES.join(", ")}`);
    }
    if (!VALID_TASK_TYPES.includes(options.taskType)) {
        throw new Error(`Invalid task type "${options.taskType}". Must be one of: ${VALID_TASK_TYPES.join(", ")}`);
    }
    const agentRole = options.agent;
    const defaults = AGENT_DEFAULTS[agentRole];
    const reportRequired = options.reportRequired === "false" ? false : true;
    const packet = {
        schemaVersion: SCHEMA_VERSION,
        packetId: randomUUID(),
        runId: options.runId ?? randomUUID(),
        parentRunId: options.parentRunId,
        createdAt: new Date().toISOString(),
        createdBy: "cli",
        agentRole,
        trustZone: defaults.trustZone,
        taskType: options.taskType,
        title: options.title,
        objective: options.objective,
        scope: options.scope,
        allowedPaths: options.allowedPath ?? [],
        deniedPaths: [
            ...DEFAULT_DENIED_PATHS,
            ...(options.deniedPath ?? []),
        ],
        toolPolicy: {
            allowShell: false,
            allowWrite: false,
            allowNetwork: false,
            allowSecrets: false,
            allowedTools: [],
            deniedTools: [],
        },
        approvalPolicy: {
            requiresHumanApproval: true,
            requiresApprovalGate: true,
            agentMayApprove: false,
            echoReviewRequired: false,
        },
        contextPolicy: {
            contextBudgetTokens: options.contextBudget
                ? parseInt(options.contextBudget, 10)
                : 8000,
            redactSecrets: true,
            includeRepoSummary: options.includeRepoSummary === "true",
            includeFileContents: options.includeFileContents === "true",
            allowedContextPaths: [],
            deniedContextPaths: [],
        },
        constraints: options.constraint ?? [],
        requiredOutputFormat: options.requiredOutputFormat ?? "json_packet_plus_markdown_report",
        reportRequired,
        status: "pending",
    };
    const filePath = await writeTaskPacket(packet, { workdir: options.workdir });
    // Emit trace event (best-effort)
    await emitTrace({
        eventType: "packet_created",
        severity: "info",
        actorType: "cli",
        actorId: "cli",
        packetId: packet.packetId,
        runId: packet.runId,
        agentRole: agentRole,
        summary: `Task packet created: ${packet.title}`,
    }, options.workdir);
    console.log("Task packet created.");
    printKeyValue("Path", filePath);
    printKeyValue("packetId", packet.packetId);
    console.log(`  Schema validation: PASS`);
    console.log();
    console.log("⚠️  This packet is a task request — it is NOT approval.");
    console.log("⚠️  This packet does NOT grant mutation authority.");
    console.log("⚠️  All mutations still require Tripp.Reason ApprovalGate.");
}
// ── 6. tripp agents archive ───────────────────────────────────────────
export async function executeAgentsArchive(filePath, workdir) {
    const resolved = safeResolve(filePath, workdir);
    const dest = await movePacketToArchive(resolved, { workdir });
    // Emit trace event (best-effort)
    await emitTrace({
        eventType: "packet_archived",
        severity: "info",
        actorType: "cli",
        actorId: "cli",
        sourcePath: resolved,
        targetPath: dest,
        summary: `Packet archived: ${basename(resolved)}`,
    }, workdir);
    console.log(`Archived: ${basename(filePath)}`);
    console.log(`  Source → ${filePath}`);
    console.log(`  Dest   → ${dest}`);
}
// ── 7. tripp agents reject ────────────────────────────────────────────
export async function executeAgentsReject(filePath, reason, workdir) {
    if (!reason || !reason.trim()) {
        throw new Error("--reason is required for rejection");
    }
    const resolved = safeResolve(filePath, workdir);
    const dest = await movePacketToRejected(resolved, reason, { workdir });
    // Emit trace event (best-effort)
    await emitTrace({
        eventType: "packet_rejected",
        severity: "warning",
        actorType: "cli",
        actorId: "cli",
        sourcePath: resolved,
        targetPath: dest,
        summary: `Packet rejected: ${basename(resolved)} — ${reason}`,
        details: { reason },
    }, workdir);
    console.log(`Rejected: ${basename(filePath)}`);
    console.log(`  Reason: ${reason}`);
    console.log(`  Source → ${filePath}`);
    console.log(`  Dest   → ${dest}`);
    console.log(`  Trace:  ${dest.replace(/\.json$/, ".rejection.md")}`);
}
// ── 8. tripp agents review ────────────────────────────────────────────
const VALID_VERDICTS = [
    "pass", "pass_with_notes", "revise", "block", "escalate",
];
/**
 * Read a result packet and extract metadata for review linking.
 */
async function readResultForReview(filePath, workdir) {
    const resolved = safeResolve(filePath, workdir);
    const result = await readResultPacket(resolved);
    return { resolved, result };
}
export async function executeAgentsReview(resultFile, options) {
    // Validate verdict
    if (!VALID_VERDICTS.includes(options.verdict)) {
        throw new Error(`Invalid verdict "${options.verdict}". Must be one of: ${VALID_VERDICTS.join(", ")}`);
    }
    const verdict = options.verdict;
    const { resolved, result } = await readResultForReview(resultFile, options.workdir);
    // Validate block/escalate must have findings
    if ((verdict === "block" || verdict === "escalate") &&
        (!options.issue || options.issue.length === 0) &&
        (!options.safetyFinding || options.safetyFinding.length === 0)) {
        throw new Error(`Verdict "${verdict}" requires at least one --issue or --safety-finding`);
    }
    // Build review packet
    const reviewPacket = {
        schemaVersion: SCHEMA_VERSION,
        reviewId: randomUUID(),
        packetId: result.packetId,
        resultId: result.resultId,
        runId: result.runId,
        createdAt: new Date().toISOString(),
        reviewerRole: "openclaw_echo",
        verdict,
        summary: options.summary,
        issues: options.issue ?? [],
        boundaryFindings: options.boundaryFinding ?? [],
        doctrineFindings: options.doctrineFinding ?? [],
        safetyFindings: options.safetyFinding ?? [],
        recommendedNextAction: options.recommendedNextAction ?? "",
        metadata: {
            sourceFile: resolved,
            agentRole: result.agentRole,
            trustZone: result.trustZone,
            resultStatus: result.status,
        },
    };
    const { jsonPath, mdPath, reviewId } = await writeReviewPacket(reviewPacket, {
        workdir: options.workdir,
    });
    // Emit trace events (best-effort)
    await emitTrace({
        eventType: "warden_review_started",
        severity: "info",
        actorType: "openclaw_echo",
        packetId: result.packetId,
        resultId: result.resultId,
        runId: result.runId,
        reviewId,
        agentRole: result.agentRole,
        sourcePath: resolved,
        summary: `Echo review started for result: ${result.summary}`,
    }, options.workdir);
    await emitTrace({
        eventType: "warden_verdict_recorded",
        severity: verdict === "block" || verdict === "escalate" ? "warning" : "info",
        actorType: "openclaw_echo",
        packetId: result.packetId,
        resultId: result.resultId,
        runId: result.runId,
        reviewId,
        agentRole: result.agentRole,
        summary: `Echo verdict: ${verdict} — ${options.summary}`,
        details: {
            verdict,
            issueCount: reviewPacket.issues.length,
            safetyFindingCount: reviewPacket.safetyFindings.length,
        },
    }, options.workdir);
    console.log("Echo Warden review created.");
    printKeyValue("reviewId", reviewId);
    printKeyValue("verdict", verdict);
    printKeyValue("Report (JSON)", jsonPath);
    printKeyValue("Report (MD)", mdPath);
    console.log();
    console.log("⚠️  This Echo review is ADVISORY only.");
    console.log("⚠️  This review does NOT approve mutation.");
    console.log("⚠️  Tripp.Reason ApprovalGate remains authoritative.");
    console.log("⚠️  Eddie remains the final approver.");
}
// ── 9. tripp agents reviews ───────────────────────────────────────────
export async function executeAgentsReviews(workdir) {
    const jsonFiles = await listReviewPackets({ workdir });
    const mdFiles = await listReportFiles({ workdir });
    if (jsonFiles.length === 0 && mdFiles.length === 0) {
        console.log("No review files.");
        return;
    }
    printHeader(`Reviews (${jsonFiles.length} JSON + ${mdFiles.length} MD)`);
    for (const f of jsonFiles) {
        try {
            const r = await readReviewPacketFromBus(f);
            console.log(`  ${basename(f)}`);
            printKeyValue("reviewId", r.reviewId);
            printKeyValue("packetId", r.packetId);
            printKeyValue("resultId", r.resultId);
            printKeyValue("verdict", r.verdict);
            printKeyValue("createdAt", r.createdAt);
            console.log();
        }
        catch {
            console.log(`  ${basename(f)}  ⚠️ MALFORMED — schema validation failed (skipped, not executed)`);
            console.log();
        }
    }
    if (mdFiles.length > 0) {
        console.log("Markdown reports:");
        for (const f of mdFiles) {
            console.log(`  ${basename(f)}`);
        }
        console.log();
    }
}
// ── 10. tripp agents review-read ──────────────────────────────────────
export async function executeAgentsReviewRead(filePath, workdir) {
    const resolved = safeResolve(filePath, workdir);
    // Detect JSON vs MD
    if (resolved.endsWith(".json")) {
        try {
            const r = await readReviewPacketFromBus(resolved);
            console.log(JSON.stringify(r, null, 2));
            console.log();
            console.log("✅ Schema validation: PASS (review packet)");
        }
        catch {
            console.error("❌ Schema validation: FAIL — file is not a valid review packet.");
            console.error("   File was NOT executed. Contents are preserved.");
        }
    }
    else if (resolved.endsWith(".md")) {
        const { readFile } = await import("node:fs/promises");
        const content = await readFile(resolved, "utf-8");
        console.log(content);
    }
    else {
        console.error("❌ Unknown file type. Expected .json (review packet) or .md (review report).");
    }
    console.log();
    console.log("⚠️  This Echo review is ADVISORY only.");
    console.log("⚠️  This review does NOT approve mutation.");
    console.log("⚠️  Eddie remains final approver.");
}
// ── 11. tripp agents trace append ─────────────────────────────────────
export async function executeAgentsTraceAppend(options) {
    const { createTraceEvent, appendTraceEvent } = await import("@tripp-reason/external-agents");
    const event = createTraceEvent({
        eventType: options.eventType,
        severity: options.severity,
        actorType: options.actor ?? "cli",
        runId: options.runId,
        parentRunId: options.parentRunId,
        packetId: options.packetId,
        resultId: options.resultId,
        reviewId: options.reviewId,
        parentEventId: options.parentEventId,
        rootCauseEventId: options.rootCauseEventId,
        agentRole: options.agentRole,
        parentAgentRole: options.parentAgentRole,
        subagentId: options.subagentId,
        subagentRole: options.subagentRole,
        toolNames: options.tool ?? [],
        sourcePath: options.sourcePath,
        targetPath: options.targetPath,
        summary: options.summary,
        tags: options.tag ?? [],
    });
    await appendTraceEvent(event, options.workdir);
    console.log("Trace event appended.");
    printKeyValue("eventId", event.eventId);
    printKeyValue("eventType", event.eventType);
    printKeyValue("ledgerPath", getTraceLedgerPath(options.workdir));
    console.log();
    console.log("⚠️  Trace event is EVIDENCE only — it does NOT approve mutation.");
}
// ── 12. tripp agents trace list ───────────────────────────────────────
export async function executeAgentsTraceList(options) {
    let events = await readTraceEvents({
        workdir: options.workdir,
        limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });
    // Apply filters
    if (options.eventType) {
        events = events.filter((e) => e.eventType === options.eventType);
    }
    if (options.packetId) {
        events = events.filter((e) => e.packetId === options.packetId);
    }
    if (options.resultId) {
        events = events.filter((e) => e.resultId === options.resultId);
    }
    if (options.reviewId) {
        events = events.filter((e) => e.reviewId === options.reviewId);
    }
    if (options.runId) {
        events = events.filter((e) => e.runId === options.runId);
    }
    if (options.severity) {
        events = events.filter((e) => e.severity === options.severity);
    }
    if (events.length === 0) {
        console.log("No trace events.");
        return;
    }
    printHeader(`Trace Events (${events.length})`);
    for (const e of events) {
        const sev = e.severity === "critical" || e.severity === "error"
            ? `🔴 ${e.severity}`
            : e.severity === "warning"
                ? `🟡 ${e.severity}`
                : `${e.severity}`;
        console.log(`  [${e.createdAt}] ${sev} ${e.eventType}`);
        printKeyValue("eventId", e.eventId);
        printKeyValue("summary", e.summary);
        printKeyValue("actorType", e.actorType);
        if (e.packetId)
            printKeyValue("packetId", e.packetId);
        if (e.resultId)
            printKeyValue("resultId", e.resultId);
        if (e.reviewId)
            printKeyValue("reviewId", e.reviewId);
        console.log();
    }
}
// ── 13. tripp agents trace validate ───────────────────────────────────
export async function executeAgentsTraceValidate(workdir) {
    const result = await validateTraceLedger(workdir);
    console.log("Trace Ledger Validation");
    console.log("─".repeat(25));
    printKeyValue("Ledger path", result.ledgerPath);
    printKeyValue("Total lines", result.totalLines);
    printKeyValue("Valid events", result.validEvents);
    printKeyValue("Malformed lines", result.malformedLines);
    console.log();
    if (result.malformedLines > 0) {
        console.log(`⚠️  ${result.malformedLines} malformed line(s) at: ${result.malformedLineNumbers.join(", ")}`);
        console.log("   Malformed lines are NOT rewritten. Manual review recommended.");
    }
    else {
        console.log("✅ Ledger is valid.");
    }
    console.log();
    console.log("⚠️  Trace events are evidence — they do not authorize mutation.");
}
// ── 14. tripp agents trace chain ──────────────────────────────────────
export async function executeAgentsTraceChain(eventId, workdir) {
    const chain = await findRootCauseChain(eventId, workdir);
    if (chain.length === 0) {
        console.log(`No trace events found for eventId: ${eventId}`);
        return;
    }
    printHeader(`Causal Chain (${chain.length} events)`);
    for (let i = 0; i < chain.length; i++) {
        const e = chain[i];
        const marker = i === 0 ? "┌─ ROOT" : i === chain.length - 1 ? "└─ TARGET" : "├─";
        console.log(`  ${marker} [${e.createdAt}] ${e.eventType}`);
        console.log(`  │  ${e.summary}`);
        console.log(`  │  eventId: ${e.eventId}`);
        if (e.parentEventId)
            console.log(`  │  parentEventId: ${e.parentEventId}`);
        if (e.rootCauseEventId)
            console.log(`  │  rootCauseEventId: ${e.rootCauseEventId}`);
        console.log();
    }
    console.log("⚠️  This chain shows causal relationships — not approvals.");
}
// ── 15. tripp agents transport defaults ───────────────────────────────
export async function executeAgentsTransportDefaults() {
    const tripp = createDefaultTransportConfig("openclaw_tripp", "fake_agent", "fake");
    const hermes = createDefaultTransportConfig("hermes_cyony", "fake_agent", "fake");
    const echo = createDefaultTransportConfig("openclaw_echo", "manual_file", "manual");
    console.log("Default Transport Configs\n");
    for (const [label, cfg] of [
        ["OpenClaw Tripp", tripp],
        ["Hermes Cyony", hermes],
        ["OpenClaw Echo", echo],
    ]) {
        console.log(`${label}:`);
        printKeyValue("  transportId", cfg.transportId);
        printKeyValue("  kind", cfg.kind);
        printKeyValue("  mode", cfg.mode);
        printKeyValue("  allowNetwork", cfg.allowNetwork ? "true" : "false");
        printKeyValue("  allowSecrets", cfg.allowSecrets ? "true" : "false");
        printKeyValue("  allowDirectMutation", cfg.allowDirectMutation ? "true" : "false");
        printKeyValue("  requireEchoReview", cfg.requireEchoReview ? "true" : "false");
        printKeyValue("  requireApprovalGate", cfg.requireApprovalGate ? "true" : "false");
        console.log();
    }
    console.log("⚠️  Live/cloud transport is DISABLED by default.");
    console.log("⚠️  All configs are fake/manual only — no real execution.");
}
// ── 16. tripp agents transport dispatch ──────────────────────────────
export async function executeAgentsTransportDispatch(taskFile, options) {
    const resolved = safeResolve(taskFile, options.workdir);
    const taskPacket = await readTaskPacket(resolved);
    const config = createDefaultTransportConfig(taskPacket.agentRole, options.transport ?? "fake_agent", options.mode ?? "fake");
    const request = createDispatchRequest(taskPacket, config, {
        dryRun: options.dryRun !== "false",
        traceEnabled: options.trace !== "false",
        requestedBy: "cli",
    });
    let result;
    if (config.kind === "fake_agent") {
        result = await dispatchToFakeAgent(request, options.workdir);
    }
    else {
        result = await dispatchToManualFileTransport(request, options.workdir);
    }
    console.log("Dispatch complete.");
    printKeyValue("dispatchId", result.dispatchId);
    printKeyValue("packetId", result.packetId);
    printKeyValue("resultId", result.resultId);
    printKeyValue("status", result.status);
    printKeyValue("summary", result.summary);
    if (result.outboxPath)
        printKeyValue("outboxPath", result.outboxPath);
    if (result.errors.length > 0) {
        console.log("  errors:");
        result.errors.forEach((e) => console.log(`    - ${e}`));
    }
    console.log();
    console.log("⚠️  Dispatch result is EVIDENCE only — NOT approval.");
    console.log("⚠️  This dispatch does NOT grant mutation authority.");
}
// ── 17. tripp agents transport status ────────────────────────────────
export async function executeAgentsTransportStatus(workdir) {
    console.log("Agent Transport Status\n");
    console.log("  Live/cloud transport: DISABLED");
    console.log("  Fake agent transport: AVAILABLE");
    console.log("  Manual file transport: AVAILABLE");
    console.log("  Agent Bus: AVAILABLE");
    console.log("  Trace ledger: AVAILABLE");
    if (workdir) {
        printKeyValue("  workdir", workdir);
    }
    console.log();
    console.log("⚠️  No live adapters are active.");
    console.log("⚠️  Experimental live mode is DISABLED.");
    console.log("⚠️  All dispatch is fake/manual only.");
}
// ── Register all subcommands ──────────────────────────────────────────
export function registerAgentsCommands(program) {
    const agents = program
        .command("agents")
        .description("Manage the file-based Agent Bus for external agents");
    // tripp agents init
    agents
        .command("init")
        .description("Ensure Agent Bus folder scaffold exists")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsInit(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents inbox
    agents
        .command("inbox")
        .description("List inbox task packets")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsInbox(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents outbox
    agents
        .command("outbox")
        .description("List outbox result packets")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsOutbox(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents read
    agents
        .command("read")
        .description("Read and validate an Agent Bus packet file")
        .argument("<file>", "Path to packet file inside .tripp/agents/")
        .option("--workdir <path>", "Working directory")
        .action(async (file, options) => {
        try {
            await executeAgentsRead(file, options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents create-task
    agents
        .command("create-task")
        .description("Create a task packet in the inbox")
        .requiredOption("--agent <role>", "Agent role: openclaw_tripp, hermes_cyony, openclaw_echo")
        .requiredOption("--task-type <type>", "Task type (plan, review, audit, prototype, proposal, implementation_proposal, warden_review, swarm_decomposition, report_review, drift_check)")
        .requiredOption("--title <title>", "Task title")
        .requiredOption("--objective <objective>", "Task objective")
        .requiredOption("--scope <scope>", "Task scope")
        .option("--run-id <id>", "Run ID (auto-generated if omitted)")
        .option("--parent-run-id <id>", "Parent run ID")
        .option("--allowed-path <path>", "Allowed path (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--denied-path <path>", "Denied path (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--constraint <constraint>", "Constraint (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--required-output-format <format>", "Required output format")
        .option("--report-required <bool>", "Report required (true/false, default true)")
        .option("--context-budget <n>", "Context budget tokens (default 8000)")
        .option("--include-repo-summary <bool>", "Include repo summary")
        .option("--include-file-contents <bool>", "Include file contents")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsCreateTask(options);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents archive
    agents
        .command("archive")
        .description("Move a packet to the archive")
        .argument("<file>", "Path to packet file inside .tripp/agents/")
        .option("--workdir <path>", "Working directory")
        .action(async (file, options) => {
        try {
            await executeAgentsArchive(file, options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents reject
    agents
        .command("reject")
        .description("Move a packet to rejected with reason")
        .argument("<file>", "Path to packet file inside .tripp/agents/")
        .requiredOption("--reason <reason>", "Reason for rejection")
        .option("--workdir <path>", "Working directory")
        .action(async (file, options) => {
        try {
            await executeAgentsReject(file, options.reason, options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents review
    agents
        .command("review")
        .description("Review a result packet (Echo Warden advisory review)")
        .argument("<result-file>", "Path to result packet file inside .tripp/agents/outbox")
        .requiredOption("--verdict <verdict>", "Verdict: pass, pass_with_notes, revise, block, escalate")
        .requiredOption("--summary <summary>", "Review summary")
        .option("--issue <issue>", "Issue finding (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--boundary-finding <finding>", "Boundary finding (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--doctrine-finding <finding>", "Doctrine finding (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--safety-finding <finding>", "Safety finding (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--recommended-next-action <action>", "Recommended next action")
        .option("--workdir <path>", "Working directory")
        .action(async (resultFile, options) => {
        try {
            await executeAgentsReview(resultFile, options);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents reviews
    agents
        .command("reviews")
        .description("List Echo Warden review packets and reports")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsReviews(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents review-read
    agents
        .command("review-read")
        .description("Read an Echo Warden review packet or report")
        .argument("<review-file>", "Path to review file inside .tripp/agents/reports")
        .option("--workdir <path>", "Working directory")
        .action(async (reviewFile, options) => {
        try {
            await executeAgentsReviewRead(reviewFile, options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // ── tripp agents trace ────────────────────────────────────────
    const trace = agents
        .command("trace")
        .description("Append-only Agent Bus trace ledger (evidence only)");
    // tripp agents trace append
    trace
        .command("append")
        .description("Append a trace event to the ledger")
        .requiredOption("--event-type <type>", "Event type")
        .requiredOption("--summary <summary>", "Event summary")
        .option("--severity <level>", "Severity: debug, info, warning, error, critical")
        .option("--actor <actor>", "Actor: cli, openclaw_tripp, hermes_cyony, openclaw_echo, operator, approvalgate, system, unknown")
        .option("--run-id <id>", "Run ID")
        .option("--parent-run-id <id>", "Parent run ID")
        .option("--packet-id <id>", "Packet ID")
        .option("--result-id <id>", "Result ID")
        .option("--review-id <id>", "Review ID")
        .option("--parent-event-id <id>", "Parent event ID")
        .option("--root-cause-event-id <id>", "Root cause event ID")
        .option("--agent-role <role>", "Agent role")
        .option("--parent-agent-role <role>", "Parent agent role")
        .option("--subagent-id <id>", "Subagent ID")
        .option("--subagent-role <role>", "Subagent role")
        .option("--tool <name>", "Tool name (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--source-path <path>", "Source path")
        .option("--target-path <path>", "Target path")
        .option("--tag <tag>", "Tag (repeatable)", (v, prev) => [...(prev ?? []), v], [])
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsTraceAppend(options);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace list
    trace
        .command("list")
        .description("List trace events")
        .option("--limit <n>", "Max events to show")
        .option("--event-type <type>", "Filter by event type")
        .option("--packet-id <id>", "Filter by packet ID")
        .option("--result-id <id>", "Filter by result ID")
        .option("--review-id <id>", "Filter by review ID")
        .option("--run-id <id>", "Filter by run ID")
        .option("--severity <level>", "Filter by severity")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsTraceList(options);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace validate
    trace
        .command("validate")
        .description("Validate the trace ledger")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsTraceValidate(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace chain
    trace
        .command("chain")
        .description("Show causal chain for an event")
        .argument("<event-id>", "Event ID to trace")
        .option("--workdir <path>", "Working directory")
        .action(async (eventId, options) => {
        try {
            await executeAgentsTraceChain(eventId, options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace packet
    trace
        .command("packet")
        .description("Show trace events linked to a packet")
        .argument("<packet-id>", "Packet ID")
        .option("--workdir <path>", "Working directory")
        .action(async (packetId, options) => {
        try {
            await executeAgentsTraceList({ packetId, workdir: options.workdir });
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace result
    trace
        .command("result")
        .description("Show trace events linked to a result")
        .argument("<result-id>", "Result ID")
        .option("--workdir <path>", "Working directory")
        .action(async (resultId, options) => {
        try {
            await executeAgentsTraceList({ resultId, workdir: options.workdir });
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents trace review
    trace
        .command("review")
        .description("Show trace events linked to a review")
        .argument("<review-id>", "Review ID")
        .option("--workdir <path>", "Working directory")
        .action(async (reviewId, options) => {
        try {
            await executeAgentsTraceList({ reviewId, workdir: options.workdir });
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // ── tripp agents transport ────────────────────────────────────
    const transport = agents
        .command("transport")
        .description("Bounded transport adapter for external agents (fake/manual only)");
    // tripp agents transport defaults
    transport
        .command("defaults")
        .description("Show safe default transport configs")
        .action(async () => {
        try {
            await executeAgentsTransportDefaults();
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents transport dispatch
    transport
        .command("dispatch")
        .description("Dispatch a task packet through fake/manual transport")
        .argument("<task-file>", "Path to task packet file inside .tripp/agents/")
        .option("--transport <kind>", "Transport kind: fake_agent, manual_file")
        .option("--mode <mode>", "Transport mode: fake, manual, dry_run")
        .option("--dry-run <bool>", "Dry run (default: true)")
        .option("--trace <bool>", "Enable trace events (default: true)")
        .option("--workdir <path>", "Working directory")
        .action(async (taskFile, options) => {
        try {
            await executeAgentsTransportDispatch(taskFile, options);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // tripp agents transport status
    transport
        .command("status")
        .description("Show transport readiness")
        .option("--workdir <path>", "Working directory")
        .action(async (options) => {
        try {
            await executeAgentsTransportStatus(options.workdir);
        }
        catch (error) {
            printError(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
}
//# sourceMappingURL=agentsCommand.js.map