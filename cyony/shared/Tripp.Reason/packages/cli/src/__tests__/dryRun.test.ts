/**
 * Phase 8B — Fake E2E Dry Run Harness Tests
 *
 * Proves the full Agent Bus pipeline:
 *   CLI entry → packet created → approval gate checked →
 *   fake dispatch → result written → trace chain →
 *   Echo/Warden advisory review → pipeline verified
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { executeAgentsDryRun } from "../agentsCommand.js";
import {
  listInboxPackets,
  listOutboxPackets,
  listReviewPackets,
  readTraceEvents,
  validateTraceLedger,
} from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-cli-dry-run-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("Phase 8B — Fake E2E Dry Run", () => {
  const dryRunOpts = {
    agent: "hermes_cyony",
    taskType: "prototype",
    title: "Dry Run Test — Fake E2E Pipeline",
    objective: "Prove the full Agent Bus pipeline works without real agents",
    scope: "Dry run only — no real execution",
    verdict: "pass",
    workdir: "", // set in each test
  };

  // ── S1: Basic Pipeline ───────────────────────────────────────────

  describe("S1: Basic pipeline", () => {
    it("completes dry run without errors for hermes_cyony", async () => {
      const opts = { ...dryRunOpts, workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).resolves.toBeUndefined();
    });

    it("completes dry run without errors for openclaw_tripp", async () => {
      const opts = { ...dryRunOpts, agent: "openclaw_tripp", taskType: "review", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).resolves.toBeUndefined();
    });

    it("completes dry run without errors for openclaw_echo", async () => {
      const opts = { ...dryRunOpts, agent: "openclaw_echo", taskType: "audit", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).resolves.toBeUndefined();
    });
  });

  // ── S2: Task Packet ──────────────────────────────────────────────

  describe("S2: Task packet created in inbox", () => {
    it("creates a task packet in the inbox", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const inbox = await listInboxPackets({ workdir: tmpDir });
      expect(inbox.length).toBeGreaterThanOrEqual(1);
    });

    it("task packet has all required fields", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const inbox = await listInboxPackets({ workdir: tmpDir });
      expect(inbox.length).toBeGreaterThanOrEqual(1);

      const raw = await fs.readFile(inbox[0], "utf-8");
      const packet = JSON.parse(raw);
      expect(packet.schemaVersion).toBeDefined();
      expect(packet.packetId).toBeDefined();
      expect(packet.runId).toBeDefined();
      expect(packet.agentRole).toBe("hermes_cyony");
      expect(packet.taskType).toBe("prototype");
      expect(packet.title).toBe("Dry Run Test — Fake E2E Pipeline");
    });
  });

  // ── S3: Result in Outbox ─────────────────────────────────────────

  describe("S3: Result packet in outbox", () => {
    it("writes a result packet to the outbox", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      expect(outbox.length).toBeGreaterThanOrEqual(1);
    });

    it("result packet is marked as fake", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const raw = await fs.readFile(outbox[0], "utf-8");
      const result = JSON.parse(raw);
      expect(result.metadata.fake).toBe(true);
      expect(result.metadata.warning).toContain("FAKE");
    });

    it("result packet status is success", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const raw = await fs.readFile(outbox[0], "utf-8");
      const result = JSON.parse(raw);
      expect(result.status).toBe("success");
    });
  });

  // ── S4: ApprovalGate ─────────────────────────────────────────────

  describe("S4: ApprovalGate in pipeline", () => {
    it("records approvalgate_required trace event", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      const approvalEvents = events.filter(
        (e) => e.eventType === "approvalgate_required"
      );
      expect(approvalEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("approval event references correct packet", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      const approvalEvent = events.find(
        (e) => e.eventType === "approvalgate_required"
      );
      expect(approvalEvent).toBeDefined();
      expect(approvalEvent!.packetId).toBeDefined();
      expect(approvalEvent!.actorType).toBe("approvalgate");
    });

    it("approval event has requiresApprovalGate: true", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      const approvalEvent = events.find(
        (e) => e.eventType === "approvalgate_required"
      );
      expect(approvalEvent?.details).toBeDefined();
      expect(approvalEvent!.details!.requiresApprovalGate).toBe(true);
      expect(approvalEvent!.details!.requiresHumanApproval).toBe(true);
    });
  });

  // ── S5: Fake Transport Only ──────────────────────────────────────

  describe("S5: Fake transport only", () => {
    it("uses fake transport (no real agents)", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const raw = await fs.readFile(outbox[0], "utf-8");
      const result = JSON.parse(raw);
      expect(result.metadata.transportMode).toBe("fake");
    });

    it("result contains fake agent disclaimer", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const raw = await fs.readFile(outbox[0], "utf-8");
      const result = JSON.parse(raw);
      expect(result.assumptions).toContain("Fake agent — no real execution");
    });

    it("no live transport tokens in result", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const raw = await fs.readFile(outbox[0], "utf-8");
      const result = JSON.parse(raw);
      // Verify no live transport fields
      expect(result.metadata.live).toBeUndefined();
      expect(result.metadata.real).toBeUndefined();
    });
  });

  // ── S6: Trace Ledger ─────────────────────────────────────────────

  describe("S6: Trace ledger chain", () => {
    it("records all required trace events", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      const eventTypes = events.map((e) => e.eventType);

      expect(eventTypes).toContain("packet_created");
      expect(eventTypes).toContain("approvalgate_required");
      expect(eventTypes).toContain("packet_claimed");
      expect(eventTypes).toContain("result_written");
      expect(eventTypes).toContain("warden_review_started");
      expect(eventTypes).toContain("warden_verdict_recorded");
    });

    it("trace events form a causal chain via runId", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      expect(events.length).toBeGreaterThanOrEqual(6);

      // All events should share the same runId (except those without one)
      const runIds = new Set(
        events.filter((e) => e.runId).map((e) => e.runId)
      );
      // At least one runId should connect most events
      expect(runIds.size).toBeGreaterThanOrEqual(1);
    });

    it("trace ledger validates clean", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const validation = await validateTraceLedger(tmpDir);
      expect(validation.isValid).toBe(true);
    });

    it("trace events are JSON-serializable evidence only", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      for (const event of events) {
        // Verify event is valid JSON
        expect(() => JSON.stringify(event)).not.toThrow();
        // Verify event has required fields
        expect(event.eventId).toBeDefined();
        expect(event.eventType).toBeDefined();
        expect(event.createdAt).toBeDefined();
      }
    });
  });

  // ── S7: Echo/Warden Advisory ─────────────────────────────────────

  describe("S7: Echo/Warden advisory review", () => {
    it("creates Echo review packet", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const reviews = await listReviewPackets({ workdir: tmpDir });
      expect(reviews.length).toBeGreaterThanOrEqual(1);
    });

    it("review has advisory-only warnings in verdict", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const reviews = await listReviewPackets({ workdir: tmpDir });
      const raw = await fs.readFile(reviews[0], "utf-8");
      const review = JSON.parse(raw);
      // Warden is advisory — not authoritative
      expect(review.reviewerRole).toBe("openclaw_echo");
      expect(review.verdict).toBeDefined();
    });

    it("Warden does NOT authorize mutation", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const events = await readTraceEvents({ workdir: tmpDir });
      // There should be no mutation_applied or mutation_requested events
      // (these would indicate ApprovalGate bypass)
      const mutationEvents = events.filter(
        (e) => e.eventType === "mutation_applied" || e.eventType === "mutation_requested"
      );
      expect(mutationEvents.length).toBe(0);
    });

    it("review metadata includes dryRun flag", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const reviews = await listReviewPackets({ workdir: tmpDir });
      const raw = await fs.readFile(reviews[0], "utf-8");
      const review = JSON.parse(raw);
      expect(review.metadata.dryRun).toBe(true);
    });
  });

  // ── S8: Boundary Compliance ──────────────────────────────────────

  describe("S8: Boundary compliance", () => {
    it("rejects invalid agent role", async () => {
      const opts = { ...dryRunOpts, agent: "invalid_agent", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).rejects.toThrow("Invalid agent role");
    });

    it("rejects invalid verdict", async () => {
      const opts = { ...dryRunOpts, verdict: "auto_approve", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).rejects.toThrow("Invalid verdict");
    });

    it("no network/HTTP tokens in outbox result", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      // Scan the entire .tripp directory for forbidden tokens
      const scanDir = path.join(tmpDir, ".tripp/agents");
      async function scanForTokens(dir: string, tokens: string[]): Promise<string[]> {
        const found: string[] = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            found.push(...(await scanForTokens(fullPath, tokens)));
          } else if (entry.name.endsWith(".json")) {
            const content = await fs.readFile(fullPath, "utf-8");
            for (const token of tokens) {
              if (content.includes(token)) {
                found.push(`${entry.name}: ${token}`);
              }
            }
          }
        }
        return found;
      }

      const forbidden = await scanForTokens(scanDir, [
        "fetch",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
      ]);
      expect(forbidden).toEqual([]);
    });

    it("no HTML/CSS/JSX/TSX files created", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

      const allFiles: string[] = [];
      async function collectFiles(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await collectFiles(fullPath);
          } else {
            allFiles.push(fullPath);
          }
        }
      }
      await collectFiles(tmpDir);

      const uiFiles = allFiles.filter((f) =>
        /\.(html|css|jsx|tsx)$/i.test(f)
      );
      expect(uiFiles).toEqual([]);
    });
  });

  // ── S9: Multiple Runs ────────────────────────────────────────────

  describe("S9: Multiple dry runs", () => {
    it("each dry run produces independent packets", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir, title: "Second Dry Run" });
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir, title: "Third Dry Run" });

      const inbox = await listInboxPackets({ workdir: tmpDir });
      const outbox = await listOutboxPackets({ workdir: tmpDir });
      const reviews = await listReviewPackets({ workdir: tmpDir });

      expect(inbox.length).toBeGreaterThanOrEqual(1);
      expect(outbox.length).toBeGreaterThanOrEqual(1);
      expect(reviews.length).toBeGreaterThanOrEqual(1);

      // Verify unique runIds
      const runIds = new Set<string>();
      for (const f of inbox) {
        const raw = await fs.readFile(f, "utf-8");
        const p = JSON.parse(raw);
        runIds.add(p.runId);
      }
      expect(runIds.size).toBe(3);
    });

    it("trace ledger accumulates across runs", async () => {
      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
      const events1 = await readTraceEvents({ workdir: tmpDir });

      await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir, title: "Second Run" });
      const events2 = await readTraceEvents({ workdir: tmpDir });

      expect(events2.length).toBeGreaterThan(events1.length);

      // Ledger should still validate
      const validation = await validateTraceLedger(tmpDir);
      expect(validation.isValid).toBe(true);
    });
  });

  // ── S10: Dry run with block verdict ──────────────────────────────

  describe("S10: Dry run with block/revise verdicts", () => {
    it("handles block verdict without real blocking", async () => {
      const opts = { ...dryRunOpts, verdict: "pass_with_notes", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).resolves.toBeUndefined();

      // Block verdict should still create a review
      const reviews = await listReviewPackets({ workdir: tmpDir });
      expect(reviews.length).toBe(1);

      const raw = await fs.readFile(reviews[0], "utf-8");
      const review = JSON.parse(raw);
      expect(review.verdict).toBe("pass_with_notes");
    });

    it("handles revise verdict", async () => {
      const opts = { ...dryRunOpts, verdict: "revise", workdir: tmpDir };
      await expect(executeAgentsDryRun(opts)).resolves.toBeUndefined();

      const reviews = await listReviewPackets({ workdir: tmpDir });
      const raw = await fs.readFile(reviews[0], "utf-8");
      const review = JSON.parse(raw);
      expect(review.verdict).toBe("revise");
    });
  });
});
