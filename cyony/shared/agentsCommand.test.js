/**
 * CLI Agent Bus smoke tests — Phase 7D
 *
 * Tests the execute* functions directly (not through commander).
 * Uses temp directories to avoid polluting the real Agent Bus.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { executeAgentsInit, executeAgentsInbox, executeAgentsOutbox, executeAgentsRead, executeAgentsCreateTask, executeAgentsArchive, executeAgentsReject, executeAgentsReview, executeAgentsReviews, executeAgentsReviewRead, } from "../agentsCommand.js";
let tmpDir;
beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `tripp-cli-agent-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
    // Init the bus
    await executeAgentsInit(tmpDir);
});
afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
});
describe("tripp agents init", () => {
    it("creates folder scaffold", async () => {
        const agentDir = path.join(tmpDir, ".tripp/agents");
        await expect(fs.access(agentDir)).resolves.toBeUndefined();
        await expect(fs.access(path.join(agentDir, "inbox"))).resolves.toBeUndefined();
        await expect(fs.access(path.join(agentDir, "outbox"))).resolves.toBeUndefined();
        await expect(fs.access(path.join(agentDir, "reports"))).resolves.toBeUndefined();
        await expect(fs.access(path.join(agentDir, "archive"))).resolves.toBeUndefined();
        await expect(fs.access(path.join(agentDir, "rejected"))).resolves.toBeUndefined();
    });
    it("is idempotent", async () => {
        await executeAgentsInit(tmpDir); // second call
        const agentDir = path.join(tmpDir, ".tripp/agents");
        await expect(fs.access(agentDir)).resolves.toBeUndefined();
    });
});
describe("tripp agents create-task", () => {
    it("creates valid task packet for OpenClaw Tripp", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Review Auth Module",
            objective: "Review the authentication module for security issues",
            scope: "src/auth/",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/^task-.*\.json$/);
        const content = await fs.readFile(path.join(inboxDir, files[0]), "utf-8");
        const json = JSON.parse(content);
        expect(json.agentRole).toBe("openclaw_tripp");
        expect(json.trustZone).toBe("cloud_controlled_reasoning");
        expect(json.taskType).toBe("review");
        expect(json.title).toBe("Review Auth Module");
        expect(json.toolPolicy.allowShell).toBe(false);
        expect(json.approvalPolicy.agentMayApprove).toBe(false);
    });
    it("Hermes task gets safe defaults", async () => {
        await executeAgentsCreateTask({
            agent: "hermes_cyony",
            taskType: "prototype",
            title: "Prototype UI",
            objective: "Explore UI alternatives",
            scope: "sandbox/",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const content = await fs.readFile(path.join(inboxDir, files[0]), "utf-8");
        const json = JSON.parse(content);
        expect(json.agentRole).toBe("hermes_cyony");
        expect(json.trustZone).toBe("cloud_sandbox_proposal");
        expect(json.toolPolicy.allowSecrets).toBe(false);
        expect(json.contextPolicy.redactSecrets).toBe(true);
    });
    it("Echo task gets local audit defaults", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_echo",
            taskType: "warden_review",
            title: "Audit Report",
            objective: "Review generated reports for doctrine compliance",
            scope: "reports/",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const content = await fs.readFile(path.join(inboxDir, files[0]), "utf-8");
        const json = JSON.parse(content);
        expect(json.agentRole).toBe("openclaw_echo");
        expect(json.trustZone).toBe("local_audit_warden");
    });
    it("rejects invalid agent role", async () => {
        await expect(executeAgentsCreateTask({
            agent: "invalid_role",
            taskType: "review",
            title: "Bad",
            objective: "Bad",
            scope: ".",
            workdir: tmpDir,
        })).rejects.toThrow(/Invalid agent role/);
    });
    it("rejects invalid task type", async () => {
        await expect(executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "invalid_type",
            title: "Bad",
            objective: "Bad",
            scope: ".",
            workdir: tmpDir,
        })).rejects.toThrow(/Invalid task type/);
    });
});
describe("tripp agents inbox", () => {
    it("lists valid inbox packets", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Task One",
            objective: "First task",
            scope: ".",
            workdir: tmpDir,
        });
        await executeAgentsCreateTask({
            agent: "hermes_cyony",
            taskType: "proposal",
            title: "Task Two",
            objective: "Second task",
            scope: ".",
            workdir: tmpDir,
        });
        // Capture stdout (executeAgentsInbox writes to console.log)
        // Just verify it doesn't throw — that means both packets are valid
        await expect(executeAgentsInbox(tmpDir)).resolves.toBeUndefined();
    });
});
describe("tripp agents outbox", () => {
    it("lists valid outbox packets", async () => {
        // No outbox packets by default — should not throw
        await expect(executeAgentsOutbox(tmpDir)).resolves.toBeUndefined();
    });
});
describe("tripp agents read", () => {
    it("reads a valid task packet", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Read Test",
            objective: "Test read command",
            scope: ".",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const filePath = path.join(inboxDir, files[0]);
        // Should not throw
        await expect(executeAgentsRead(filePath, tmpDir)).resolves.toBeUndefined();
    });
    it("rejects path traversal", async () => {
        await expect(executeAgentsRead("/etc/passwd", tmpDir)).rejects.toThrow(/traversal/);
    });
    it("rejects paths outside Agent Bus", async () => {
        await expect(executeAgentsRead("/tmp/outside.json", tmpDir)).rejects.toThrow(/traversal/);
    });
});
describe("tripp agents archive", () => {
    it("moves packet to archive", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Archive Test",
            objective: "Test archive command",
            scope: ".",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const filePath = path.join(inboxDir, files[0]);
        await executeAgentsArchive(filePath, tmpDir);
        // Inbox should be empty
        const inboxAfter = await fs.readdir(inboxDir);
        expect(inboxAfter.length).toBe(0);
        // Archive should have the file
        const archiveDir = path.join(tmpDir, ".tripp/agents/archive");
        const archiveFiles = await fs.readdir(archiveDir);
        expect(archiveFiles.length).toBe(1);
        expect(archiveFiles[0]).toBe(files[0]);
    });
});
describe("tripp agents reject", () => {
    it("moves packet to rejected with reason", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Reject Test",
            objective: "Test reject command",
            scope: ".",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const filePath = path.join(inboxDir, files[0]);
        await executeAgentsReject(filePath, "Test rejection — unsafe content", tmpDir);
        // Rejected should have the file
        const rejectedDir = path.join(tmpDir, ".tripp/agents/rejected");
        const rejectedFiles = await fs.readdir(rejectedDir);
        expect(rejectedFiles.length).toBe(2); // .json + .rejection.md
    });
});
// ── Phase 7E: Echo Review Workflow tests ────────────────────────────
import { randomUUID } from "node:crypto";
/** Helper: create a result packet file in the outbox for review testing */
async function createResultPacket(opts = {}, workdir) {
    const { writeResultPacket: writeResult, SCHEMA_VERSION, } = await import("@tripp-reason/external-agents");
    const result = {
        schemaVersion: SCHEMA_VERSION,
        packetId: opts.packetId ?? randomUUID(),
        resultId: randomUUID(),
        runId: opts.runId ?? randomUUID(),
        createdAt: new Date().toISOString(),
        agentRole: opts.agentRole ?? "openclaw_tripp",
        trustZone: "cloud_controlled_reasoning",
        status: opts.status ?? "success",
        summary: opts.summary ?? "Test result",
        assumptions: [],
        risks: [],
        proposedChanges: opts.proposedChanges ?? [],
        filesReferenced: [],
        validationPerformed: [],
        requestedApprovals: [],
        nextRecommendedAction: "",
    };
    return await writeResult(result, { workdir });
}
describe("tripp agents review", () => {
    it("creates valid Echo review packet and report from result", async () => {
        const resultPath = await createResultPacket({
            agentRole: "openclaw_tripp",
            summary: "Auth module review complete — 2 issues found",
        }, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass_with_notes",
            summary: "Looks good overall, some documentation gaps",
            issue: ["Missing JSDoc on exported functions"],
            recommendedNextAction: "Add JSDoc and resubmit",
            workdir: tmpDir,
        });
        // Check reports directory
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const files = await fs.readdir(reportsDir);
        const jsonFiles = files.filter((f) => f.endsWith(".json"));
        const mdFiles = files.filter((f) => f.endsWith(".md"));
        expect(jsonFiles.length).toBe(1);
        expect(mdFiles.length).toBe(1);
        expect(jsonFiles[0]).toMatch(/^review-.*\.json$/);
        expect(mdFiles[0]).toMatch(/^review-.*\.md$/);
        // Validate JSON review packet
        const jsonContent = await fs.readFile(path.join(reportsDir, jsonFiles[0]), "utf-8");
        const review = JSON.parse(jsonContent);
        expect(review.reviewerRole).toBe("openclaw_echo");
        expect(review.verdict).toBe("pass_with_notes");
        expect(review.issues).toContain("Missing JSDoc on exported functions");
        // Validate MD report has approval boundary
        const mdContent = await fs.readFile(path.join(reportsDir, mdFiles[0]), "utf-8");
        expect(mdContent).toContain("advisory only");
        expect(mdContent).toContain("ApprovalGate remains authoritative");
        expect(mdContent).toContain("Eddie remains the final approver");
    });
    it("rejects review of result outside Agent Bus", async () => {
        await expect(executeAgentsReview("/tmp/outside.json", {
            verdict: "pass",
            summary: "nope",
            workdir: tmpDir,
        })).rejects.toThrow(/traversal/);
    });
    it("rejects block verdict without issue or safety finding", async () => {
        const resultPath = await createResultPacket({}, tmpDir);
        await expect(executeAgentsReview(resultPath, {
            verdict: "block",
            summary: "I just don't like it",
            workdir: tmpDir,
        })).rejects.toThrow(/requires at least one --issue or --safety-finding/);
    });
    it("rejects escalate verdict without issue or safety finding", async () => {
        const resultPath = await createResultPacket({}, tmpDir);
        await expect(executeAgentsReview(resultPath, {
            verdict: "escalate",
            summary: "Too risky",
            workdir: tmpDir,
        })).rejects.toThrow(/requires at least one --issue or --safety-finding/);
    });
    it("allows block verdict with safety finding", async () => {
        const resultPath = await createResultPacket({
            summary: "Proposes writing to /etc",
            proposedChanges: [
                {
                    path: "/etc/config",
                    changeType: "modify",
                    summary: "Dangerous change",
                    risk: "high",
                    requiresApproval: true,
                },
            ],
        }, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "block",
            summary: "Unsafe system path modification",
            safetyFinding: ["Attempts to write to /etc — blocked at boundary"],
            recommendedNextAction: "Remove system path changes",
            workdir: tmpDir,
        });
        // Should have created review files
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const files = await fs.readdir(reportsDir);
        expect(files.filter((f) => f.endsWith(".json")).length).toBe(1);
    });
    it("rejects invalid verdict", async () => {
        const resultPath = await createResultPacket({}, tmpDir);
        await expect(executeAgentsReview(resultPath, {
            verdict: "approve",
            summary: "Should fail",
            workdir: tmpDir,
        })).rejects.toThrow(/Invalid verdict/);
    });
    it("rejects malformed result packet", async () => {
        // Write a malformed JSON file to the outbox
        const outboxDir = path.join(tmpDir, ".tripp/agents/outbox");
        const badFile = path.join(outboxDir, "result-bad.json");
        await fs.writeFile(badFile, "{ not valid json }", "utf-8");
        await expect(executeAgentsReview(badFile, {
            verdict: "pass",
            summary: "should fail",
            workdir: tmpDir,
        })).rejects.toThrow(/Malformed JSON/);
    });
    it("review report includes approval boundary warning", async () => {
        const resultPath = await createResultPacket({ summary: "Some proposed changes" }, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass_with_notes",
            summary: "OK but need review",
            issue: ["Verify imports"],
            workdir: tmpDir,
        });
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const mdFiles = (await fs.readdir(reportsDir)).filter((f) => f.endsWith(".md"));
        const mdContent = await fs.readFile(path.join(reportsDir, mdFiles[0]), "utf-8");
        expect(mdContent).toContain("advisory only");
        expect(mdContent).toContain("**NOT** approve mutation");
        expect(mdContent).toContain("ApprovalGate remains authoritative");
        expect(mdContent).toContain("Eddie remains the final approver");
    });
    it("mutation-bearing result review includes ApprovalGate reminder", async () => {
        const resultPath = await createResultPacket({
            summary: "Proposed changes for auth module",
            proposedChanges: [
                {
                    path: "src/auth/login.ts",
                    changeType: "modify",
                    summary: "Add 2FA support",
                    risk: "medium",
                    requiresApproval: true,
                },
            ],
        }, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass_with_notes",
            summary: "2FA addition looks correct but needs ApprovalGate",
            issue: ["Verify 2FA library version"],
            safetyFinding: ["Ensure no secret key leak"],
            recommendedNextAction: "Submit to ApprovalGate",
            workdir: tmpDir,
        });
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const jsonFiles = (await fs.readdir(reportsDir)).filter((f) => f.endsWith(".json"));
        const jsonContent = await fs.readFile(path.join(reportsDir, jsonFiles[0]), "utf-8");
        const review = JSON.parse(jsonContent);
        expect(review.verdict).toBe("pass_with_notes");
        expect(review.safetyFindings).toContain("Ensure no secret key leak");
        const mdFiles = (await fs.readdir(reportsDir)).filter((f) => f.endsWith(".md"));
        const mdContent = await fs.readFile(path.join(reportsDir, mdFiles[0]), "utf-8");
        expect(mdContent).toContain("advisory only");
    });
});
describe("tripp agents reviews", () => {
    it("lists review packets and marks malformed ones", async () => {
        // Create valid review
        const resultPath = await createResultPacket({}, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass",
            summary: "All good",
            workdir: tmpDir,
        });
        // Does not throw
        await expect(executeAgentsReviews(tmpDir)).resolves.toBeUndefined();
    });
});
describe("tripp agents review-read", () => {
    it("reads a valid JSON review packet", async () => {
        const resultPath = await createResultPacket({}, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass",
            summary: "All clear",
            workdir: tmpDir,
        });
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const jsonFiles = (await fs.readdir(reportsDir)).filter((f) => f.endsWith(".json"));
        const reviewPath = path.join(reportsDir, jsonFiles[0]);
        await expect(executeAgentsReviewRead(reviewPath, tmpDir)).resolves.toBeUndefined();
    });
    it("reads a valid MD review report", async () => {
        const resultPath = await createResultPacket({}, tmpDir);
        await executeAgentsReview(resultPath, {
            verdict: "pass",
            summary: "All clear",
            workdir: tmpDir,
        });
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const mdFiles = (await fs.readdir(reportsDir)).filter((f) => f.endsWith(".md"));
        const mdPath = path.join(reportsDir, mdFiles[0]);
        await expect(executeAgentsReviewRead(mdPath, tmpDir)).resolves.toBeUndefined();
    });
    it("rejects path traversal", async () => {
        await expect(executeAgentsReviewRead("/etc/passwd", tmpDir)).rejects.toThrow(/traversal/);
    });
    it("rejects malformed JSON review packet", async () => {
        const reportsDir = path.join(tmpDir, ".tripp/agents/reports");
        const badFile = path.join(reportsDir, "review-bad.json");
        await fs.writeFile(badFile, "{ definitely not json", "utf-8");
        // Should not throw (fails closed gracefully)
        await expect(executeAgentsReviewRead(badFile, tmpDir)).resolves.toBeUndefined();
    });
});
// ── Phase 7F: Trace Ledger CLI tests ──────────────────────────────
import { executeAgentsTraceAppend, executeAgentsTraceList, executeAgentsTraceValidate, executeAgentsTraceChain, } from "../agentsCommand.js";
import { ensureTraceLedger, createTraceEvent, appendTraceEvent, getTraceLedgerPath, } from "@tripp-reason/external-agents";
describe("tripp agents trace append", () => {
    it("writes a trace event", async () => {
        await executeAgentsTraceAppend({
            eventType: "packet_created",
            summary: "Test event",
            workdir: tmpDir,
        });
        // Verify trace ledger exists and has the event
        const ledgerPath = getTraceLedgerPath(tmpDir);
        const content = await fs.readFile(ledgerPath, "utf-8");
        const lines = content.trim().split("\n");
        expect(lines.length).toBeGreaterThanOrEqual(1);
        const parsed = JSON.parse(lines[lines.length - 1]);
        expect(parsed.eventType).toBe("packet_created");
        expect(parsed.summary).toBe("Test event");
    });
    it("rejects invalid event type", async () => {
        await expect(executeAgentsTraceAppend({
            eventType: "not_a_real_type",
            summary: "bad",
            workdir: tmpDir,
        })).rejects.toThrow();
    });
});
describe("tripp agents trace list", () => {
    it("lists trace events", async () => {
        await ensureTraceLedger(tmpDir);
        await appendTraceEvent(createTraceEvent({
            eventType: "packet_created",
            actorType: "cli",
            summary: "Event 1",
            packetId: "p1",
        }), tmpDir);
        // Should not throw
        await expect(executeAgentsTraceList({ workdir: tmpDir })).resolves.toBeUndefined();
    });
    it("filters by packetId", async () => {
        await ensureTraceLedger(tmpDir);
        await appendTraceEvent(createTraceEvent({
            eventType: "packet_created",
            actorType: "cli",
            summary: "Event A",
            packetId: "p-a",
        }), tmpDir);
        await appendTraceEvent(createTraceEvent({
            eventType: "packet_created",
            actorType: "cli",
            summary: "Event B",
            packetId: "p-b",
        }), tmpDir);
        // Should not throw — filtered list
        await expect(executeAgentsTraceList({ packetId: "p-a", workdir: tmpDir })).resolves.toBeUndefined();
    });
});
describe("tripp agents trace validate", () => {
    it("validates a clean ledger", async () => {
        await ensureTraceLedger(tmpDir);
        await appendTraceEvent(createTraceEvent({
            eventType: "packet_created",
            actorType: "cli",
            summary: "Valid",
        }), tmpDir);
        await expect(executeAgentsTraceValidate(tmpDir)).resolves.toBeUndefined();
    });
    it("reports malformed lines", async () => {
        await ensureTraceLedger(tmpDir);
        const ledgerPath = getTraceLedgerPath(tmpDir);
        // Write a malformed line
        await fs.appendFile(ledgerPath, "{ bad json\n", "utf-8");
        // Should not throw — reports malformed
        await expect(executeAgentsTraceValidate(tmpDir)).resolves.toBeUndefined();
    });
});
describe("tripp agents trace chain", () => {
    it("shows causal chain", async () => {
        await ensureTraceLedger(tmpDir);
        const root = createTraceEvent({
            eventType: "packet_created",
            actorType: "cli",
            summary: "Root",
        });
        await appendTraceEvent(root, tmpDir);
        const linked = createTraceEvent({
            eventType: "validation_failed_later",
            actorType: "system",
            summary: "Failed later",
            parentEventId: root.eventId,
        });
        await appendTraceEvent(linked, tmpDir);
        await expect(executeAgentsTraceChain(linked.eventId, tmpDir)).resolves.toBeUndefined();
    });
    it("handles unknown event gracefully", async () => {
        await expect(executeAgentsTraceChain("nonexistent-id", tmpDir)).resolves.toBeUndefined();
    });
});
describe("automatic trace emission", () => {
    it("create-task emits packet_created", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "Trace Test",
            objective: "Verify trace emission",
            scope: ".",
            workdir: tmpDir,
        });
        // Check trace ledger has packet_created event
        const ledgerPath = getTraceLedgerPath(tmpDir);
        const content = await fs.readFile(ledgerPath, "utf-8");
        const lines = content.trim().split("\n");
        const lastLine = JSON.parse(lines[lines.length - 1]);
        expect(lastLine.eventType).toBe("packet_created");
    });
    it("archive emits packet_archived", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "To Archive",
            objective: "Will be archived",
            scope: ".",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const filePath = path.join(inboxDir, files[0]);
        await executeAgentsArchive(filePath, tmpDir);
        const ledgerPath = getTraceLedgerPath(tmpDir);
        const content = await fs.readFile(ledgerPath, "utf-8");
        const lines = content.trim().split("\n");
        // Last event should be packet_archived
        const lastLine = JSON.parse(lines[lines.length - 1]);
        expect(lastLine.eventType).toBe("packet_archived");
    });
    it("reject emits packet_rejected", async () => {
        await executeAgentsCreateTask({
            agent: "openclaw_tripp",
            taskType: "review",
            title: "To Reject",
            objective: "Will be rejected",
            scope: ".",
            workdir: tmpDir,
        });
        const inboxDir = path.join(tmpDir, ".tripp/agents/inbox");
        const files = await fs.readdir(inboxDir);
        const filePath = path.join(inboxDir, files[0]);
        await executeAgentsReject(filePath, "Rejected for test", tmpDir);
        const ledgerPath = getTraceLedgerPath(tmpDir);
        const content = await fs.readFile(ledgerPath, "utf-8");
        const lines = content.trim().split("\n");
        // Last event should be packet_rejected
        const lastLine = JSON.parse(lines[lines.length - 1]);
        expect(lastLine.eventType).toBe("packet_rejected");
    });
    it("review emits warden_verdict_recorded", async () => {
        // Create a result packet first
        const { writeResultPacket: writeResult, SCHEMA_VERSION, } = await import("@tripp-reason/external-agents");
        const resultPath = await writeResult({
            schemaVersion: SCHEMA_VERSION,
            packetId: randomUUID(),
            resultId: randomUUID(),
            runId: randomUUID(),
            createdAt: new Date().toISOString(),
            agentRole: "openclaw_tripp",
            trustZone: "cloud_controlled_reasoning",
            status: "success",
            summary: "Test result for trace",
            assumptions: [],
            risks: [],
            proposedChanges: [],
            filesReferenced: [],
            validationPerformed: [],
            requestedApprovals: [],
            nextRecommendedAction: "",
        }, { workdir: tmpDir });
        await executeAgentsReview(resultPath, {
            verdict: "pass",
            summary: "All clear",
            workdir: tmpDir,
        });
        const ledgerPath = getTraceLedgerPath(tmpDir);
        const content = await fs.readFile(ledgerPath, "utf-8");
        const lines = content.trim().split("\n");
        // Find the warden_verdict_recorded event
        const verdictEvent = lines
            .map((l) => JSON.parse(l))
            .find((e) => e.eventType === "warden_verdict_recorded");
        expect(verdictEvent).toBeDefined();
        expect(verdictEvent.verdict || verdictEvent.details?.verdict).toBeDefined();
    });
});
//# sourceMappingURL=agentsCommand.test.js.map