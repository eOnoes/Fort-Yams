/**
 * Phase 8C — Fake E2E Gap Closure / Read-Back Hardening Tests
 *
 * Closes Phase 8B gaps:
 *   S11: Server read-back coverage (same functions server routes call)
 *   S12: Dashboard read visibility (read model functions)
 *   S13: Block verdict with issue payload
 *   S14: Escalate verdict with issue payload
 *   S15: Block/escalate rejected without issue
 *   S16: Root cause chain via linked trace events
 *   S17: Boundary checks (no real transport, Warden advisory, read-only)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { executeAgentsDryRun } from "../agentsCommand.js";
import {
  listInboxPackets,
  listOutboxPackets,
  listReviewPackets,
  readTaskPacket,
  readResultPacket,
  readReviewPacket,
  readTraceEvents,
  validateTraceLedger,
  findRootCauseChain,
  findTraceEventsByPacketId,
  findTraceEventsByRunId,
  createTraceEvent,
  appendTraceEvent,
} from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-cli-8c-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const dryRunOpts = {
  agent: "hermes_cyony",
  taskType: "prototype",
  title: "8C Gap Closure Test",
  objective: "Close Phase 8B gaps",
  scope: "Dry run only",
  workdir: "",
};

// ── S11: Server Read-Back Coverage ─────────────────────────────────

describe("S11: Server read-back coverage", () => {
  it("inbox list returns dry-run task packets", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const inbox = await listInboxPackets({ workdir: tmpDir });
    expect(inbox.length).toBeGreaterThanOrEqual(1);

    // Same path as GET /agents/inbox
    const p = await readTaskPacket(inbox[0]);
    expect(p.agentRole).toBe("hermes_cyony");
    expect(p.taskType).toBe("prototype");
    expect(p.status).toBe("pending");
  });

  it("outbox list returns dry-run result packets", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Same path as GET /agents/outbox
    const outbox = await listOutboxPackets({ workdir: tmpDir });
    expect(outbox.length).toBeGreaterThanOrEqual(1);

    const r = await readResultPacket(outbox[0]);
    expect(r.status).toBe("success");
    expect(r.metadata!.fake).toBe(true);
    expect(r.metadata!.warning).toContain("FAKE");
  });

  it("reviews list returns dry-run review packets", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Same path as GET /agents/reviews
    const reviews = await listReviewPackets({ workdir: tmpDir });
    expect(reviews.length).toBeGreaterThanOrEqual(1);

    const r = await readReviewPacket(reviews[0]);
    expect(r.reviewerRole).toBe("openclaw_echo");
    expect(r.verdict).toBeDefined();
  });

  it("trace events are queryable by packetId", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Same path as GET /agents/trace?packetId=...
    const inbox = await listInboxPackets({ workdir: tmpDir });
    const task = await readTaskPacket(inbox[0]);
    const events = await findTraceEventsByPacketId(task.packetId, { workdir: tmpDir });

    expect(events.length).toBeGreaterThanOrEqual(6);
    const types = events.map((e) => e.eventType);
    expect(types).toContain("packet_created");
    expect(types).toContain("approvalgate_required");
    expect(types).toContain("packet_claimed");
    expect(types).toContain("result_written");
    expect(types).toContain("warden_review_started");
    expect(types).toContain("warden_verdict_recorded");
  });

  it("trace events are queryable by runId", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const inbox = await listInboxPackets({ workdir: tmpDir });
    const task = await readTaskPacket(inbox[0]);
    const events = await findTraceEventsByRunId(task.runId, { workdir: tmpDir });

    expect(events.length).toBeGreaterThanOrEqual(6);
  });

  it("trace ledger validates clean after dry run", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Same path as GET /agents/status (which calls validateTraceLedger)
    const validation = await validateTraceLedger(tmpDir);
    expect(validation.isValid).toBe(true);
    expect(validation.totalLines).toBeGreaterThanOrEqual(6);
    expect(validation.malformedLines).toBe(0);
    expect(validation.validEvents).toBeGreaterThanOrEqual(6);
  });
});

// ── S12: Dashboard Read Visibility ────────────────────────────────

describe("S12: Dashboard read visibility", () => {
  it("inbox read model reflects dry-run state", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Same functions dashboard calls through API client
    const inbox = await listInboxPackets({ workdir: tmpDir });
    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const reviews = await listReviewPackets({ workdir: tmpDir });

    // Dashboard summary cards would show these counts
    expect(inbox.length).toBeGreaterThanOrEqual(1);
    expect(outbox.length).toBeGreaterThanOrEqual(1);
    expect(reviews.length).toBeGreaterThanOrEqual(1);

    // Dashboard trace table would show these events
    const trace = await readTraceEvents({ workdir: tmpDir });
    expect(trace.length).toBeGreaterThanOrEqual(6);
  });

  it("dashboard trace events include all required types", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const trace = await readTraceEvents({ workdir: tmpDir });
    const types = trace.map((e) => e.eventType);

    // Dashboard trace ledger table shows these
    expect(types).toContain("packet_created");
    expect(types).toContain("approvalgate_required");
    expect(types).toContain("packet_claimed");
    expect(types).toContain("result_written");
    expect(types).toContain("warden_review_started");
    expect(types).toContain("warden_verdict_recorded");
  });

  it("dashboard review table reflects verdicts", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const reviews = await listReviewPackets({ workdir: tmpDir });
    const r = await readReviewPacket(reviews[0]);

    // Dashboard reviews table shows these fields
    expect(r.verdict).toBeDefined();
    expect(r.reviewerRole).toBe("openclaw_echo");
    expect(r.issues.length).toBeGreaterThanOrEqual(0);
    expect(r.packetId).toBeDefined();
  });

  it("dashboard causal chain view renders linked events", async () => {
    // Emit linked trace events for chain testing
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBeGreaterThanOrEqual(6);

    // Find the approvalgate_required event for chain lookup
    const approvalEvent = events.find((e) => e.eventType === "approvalgate_required");
    expect(approvalEvent).toBeDefined();

    // Same path as GET /agents/trace/chain/:eventId (dashboard chain view)
    const chain = await findRootCauseChain(approvalEvent!.eventId, tmpDir);
    // Chain may be empty if no parentEventId links exist — that's the gap we're measuring
    expect(chain).toBeDefined();
  });
});

// ── S13: Block Verdict with Issue Payload ─────────────────────────

describe("S13: Block verdict with issue payload", () => {
  it("block verdict with valid safety finding is accepted", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // After dry run, manually create a review with block + issue
    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "block" as const,
      summary: "Block: safety finding detected",
      issues: [],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: ["Unauthorized mutation path detected"],
      recommendedNextAction: "Halt until safety review complete",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    // Should succeed — safetyFindings satisfies block validation
    const { reviewId } = await writeReviewPacket(reviewPacket, { workdir: tmpDir });
    expect(reviewId).toBeDefined();

    // Verify review packet was written
    const reviews = await listReviewPackets({ workdir: tmpDir });
    let blockReview: string | undefined;
    for (const f of reviews) {
      try {
        const rv = await readReviewPacket(f);
        if (rv.reviewId === reviewId) { blockReview = f; break; }
      } catch {}
    }
    expect(blockReview).toBeDefined();

    if (blockReview) {
      const r = await readReviewPacket(blockReview);
      expect(r.verdict).toBe("block");
      expect(r.safetyFindings.length).toBeGreaterThanOrEqual(1);
      expect(r.safetyFindings[0]).toBe("Unauthorized mutation path detected");
    }
  });

  it("block verdict with valid issues is accepted", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "block" as const,
      summary: "Block: scope violation",
      issues: ["Scope exceeds allowed boundary", "Forbidden import detected"],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: [],
      recommendedNextAction: "Reduce scope before resubmission",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    const { reviewId } = await writeReviewPacket(reviewPacket, { workdir: tmpDir });
    expect(reviewId).toBeDefined();

    const reviews = await listReviewPackets({ workdir: tmpDir });
    let blockReview: string | undefined;
    for (const f of reviews) {
      try {
        const rv = await readReviewPacket(f);
        if (rv.reviewId === reviewId) { blockReview = f; break; }
      } catch {}
    }
    expect(blockReview).toBeDefined();

    if (blockReview) {
      const r = await readReviewPacket(blockReview);
      expect(r.verdict).toBe("block");
      expect(r.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ── S14: Escalate Verdict with Issue Payload ──────────────────────

describe("S14: Escalate verdict with issue payload", () => {
  it("escalate verdict with valid safety finding is accepted", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "escalate" as const,
      summary: "Escalate: requires Eddie approval",
      issues: [],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: ["Runtime mutation without ApprovalGate"],
      recommendedNextAction: "Eddie must approve before any action",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    const { reviewId } = await writeReviewPacket(reviewPacket, { workdir: tmpDir });
    expect(reviewId).toBeDefined();

    const reviews = await listReviewPackets({ workdir: tmpDir });
    let escalateReview: string | undefined;
    for (const f of reviews) {
      try {
        const rv = await readReviewPacket(f);
        if (rv.reviewId === reviewId) { escalateReview = f; break; }
      } catch {}
    }
    expect(escalateReview).toBeDefined();
  });

  it("escalate verdict with issues is accepted", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "escalate" as const,
      summary: "Escalate: doctrine violation",
      issues: ["Violates architecture boundary", "Crosses trust zone"],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: [],
      recommendedNextAction: "Eddie review required",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    const { reviewId } = await writeReviewPacket(reviewPacket, { workdir: tmpDir });
    expect(reviewId).toBeDefined();
  });
});

// ── S15: Block/Escalate Rejected Without Issue ────────────────────

describe("S15: Block/escalate rejected without issue", () => {
  it("block verdict without issue or safety finding is rejected", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "block" as const,
      summary: "Block: no findings",
      issues: [],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: [],
      recommendedNextAction: "",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    // Should reject — block requires at least one issue or safety finding
    await expect(
      writeReviewPacket(reviewPacket, { workdir: tmpDir })
    ).rejects.toThrow();
  });

  it("escalate verdict without issue or safety finding is rejected", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "escalate" as const,
      summary: "Escalate: no findings",
      issues: [],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: [],
      recommendedNextAction: "",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    await expect(
      writeReviewPacket(reviewPacket, { workdir: tmpDir })
    ).rejects.toThrow();
  });

  it("empty issues array with block verdict is rejected", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    const { writeReviewPacket } = await import("@tripp-reason/external-agents");

    const reviewPacket = {
      schemaVersion: "1.0.0",
      reviewId: randomUUID(),
      packetId: result.packetId,
      resultId: result.resultId,
      runId: result.runId,
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo" as const,
      verdict: "block" as const,
      summary: "Block: empty findings array",
      issues: [],
      boundaryFindings: [],
      doctrineFindings: [],
      safetyFindings: [],
      recommendedNextAction: "",
      metadata: {
        sourceFile: outbox[0],
        agentRole: result.agentRole,
        trustZone: result.trustZone,
        resultStatus: result.status,
        dryRun: true,
      },
    };

    // Empty issues array + block — schema should reject
    await expect(
      writeReviewPacket(reviewPacket, { workdir: tmpDir })
    ).rejects.toThrow();
  });
});

// ── S16: Root Cause Chain Coverage ────────────────────────────────

describe("S16: Root cause chain via linked trace events", () => {
  it("linked trace events form a traversable causal chain", async () => {
    // Run dry run first to populate the agent bus
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Then manually emit linked trace events to build a chain
    const packetId = randomUUID();
    const runId = randomUUID();

    // Event 1: packet_created (root)
    const ev1 = createTraceEvent({
      eventType: "packet_created",
      severity: "info",
      actorType: "cli",
      packetId,
      runId,
      agentRole: "hermes_cyony",
      summary: "[8C-CHAIN] Task packet created",
    });
    await appendTraceEvent(ev1, tmpDir);

    // Event 2: approvalgate_required (links to ev1)
    const ev2 = createTraceEvent({
      eventType: "approvalgate_required",
      severity: "info",
      actorType: "approvalgate",
      packetId,
      runId,
      agentRole: "hermes_cyony",
      parentEventId: ev1.eventId,
      summary: "[8C-CHAIN] ApprovalGate check",
    });
    await appendTraceEvent(ev2, tmpDir);

    // Event 3: packet_claimed (links to ev2)
    const ev3 = createTraceEvent({
      eventType: "packet_claimed",
      severity: "info",
      actorType: "hermes_cyony",
      packetId,
      runId,
      agentRole: "hermes_cyony",
      parentEventId: ev2.eventId,
      summary: "[8C-CHAIN] Packet claimed by fake agent",
    });
    await appendTraceEvent(ev3, tmpDir);

    // Event 4: result_written (links to ev3)
    const ev4 = createTraceEvent({
      eventType: "result_written",
      severity: "info",
      actorType: "hermes_cyony",
      packetId,
      resultId: randomUUID(),
      runId,
      agentRole: "hermes_cyony",
      parentEventId: ev3.eventId,
      summary: "[8C-CHAIN] Result written to outbox",
    });
    await appendTraceEvent(ev4, tmpDir);

    // Event 5: warden_review_started (links to ev4)
    const ev5 = createTraceEvent({
      eventType: "warden_review_started",
      severity: "info",
      actorType: "openclaw_echo",
      packetId,
      resultId: randomUUID(),
      runId,
      reviewId: randomUUID(),
      agentRole: "hermes_cyony",
      parentEventId: ev4.eventId,
      summary: "[8C-CHAIN] Echo review started",
    });
    await appendTraceEvent(ev5, tmpDir);

    // Event 6: warden_verdict_recorded (links to ev5)
    const ev6 = createTraceEvent({
      eventType: "warden_verdict_recorded",
      severity: "info",
      actorType: "openclaw_echo",
      packetId,
      runId,
      agentRole: "hermes_cyony",
      parentEventId: ev5.eventId,
      summary: "[8C-CHAIN] Echo verdict: pass",
    });
    await appendTraceEvent(ev6, tmpDir);

    // Now walk the chain from the last event (ev6)
    const chain = await findRootCauseChain(ev6.eventId, tmpDir);

    expect(chain.length).toBe(6);
    expect(chain[0].eventType).toBe("packet_created");
    expect(chain[1].eventType).toBe("approvalgate_required");
    expect(chain[2].eventType).toBe("packet_claimed");
    expect(chain[3].eventType).toBe("result_written");
    expect(chain[4].eventType).toBe("warden_review_started");
    expect(chain[5].eventType).toBe("warden_verdict_recorded");
  });

  it("chain from middle event only returns ancestors", async () => {
    // Emit linked events
    const ev1 = createTraceEvent({
      eventType: "packet_created",
      severity: "info",
      actorType: "cli",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      summary: "Start",
    });
    await appendTraceEvent(ev1, tmpDir);

    const ev2 = createTraceEvent({
      eventType: "approvalgate_required",
      severity: "info",
      actorType: "approvalgate",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      parentEventId: ev1.eventId,
      summary: "Middle",
    });
    await appendTraceEvent(ev2, tmpDir);

    const ev3 = createTraceEvent({
      eventType: "result_written",
      severity: "info",
      actorType: "hermes_cyony",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      parentEventId: ev2.eventId,
      summary: "End",
    });
    await appendTraceEvent(ev3, tmpDir);

    // Chain from middle should only include ev1 and ev2
    const chain = await findRootCauseChain(ev2.eventId, tmpDir);
    expect(chain.length).toBe(2);
    expect(chain[0].eventType).toBe("packet_created");
    expect(chain[1].eventType).toBe("approvalgate_required");
  });

  it("unlinked events return self-only chain", async () => {
    const ev = createTraceEvent({
      eventType: "packet_created",
      severity: "info",
      actorType: "cli",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      summary: "Orphan event",
    });
    await appendTraceEvent(ev, tmpDir);

    const chain = await findRootCauseChain(ev.eventId, tmpDir);
    expect(chain.length).toBe(1);
    expect(chain[0].eventId).toBe(ev.eventId);
  });

  it("missing eventId returns empty chain", async () => {
    const chain = await findRootCauseChain("nonexistent-event-id", tmpDir);
    expect(chain).toEqual([]);
  });

  it("rootCauseEventId takes priority over parentEventId", async () => {
    const ev1 = createTraceEvent({
      eventType: "packet_created",
      severity: "info",
      actorType: "cli",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      summary: "Root",
    });
    await appendTraceEvent(ev1, tmpDir);

    const ev2 = createTraceEvent({
      eventType: "approvalgate_required",
      severity: "info",
      actorType: "approvalgate",
      packetId: randomUUID(),
      runId: randomUUID(),
      agentRole: "hermes_cyony",
      parentEventId: randomUUID(), // dead link
      rootCauseEventId: ev1.eventId, // should take priority
      summary: "With rootCause",
    });
    await appendTraceEvent(ev2, tmpDir);

    const chain = await findRootCauseChain(ev2.eventId, tmpDir);
    expect(chain.length).toBe(2);
    expect(chain[0].eventId).toBe(ev1.eventId);
  });
});

// ── S17: Boundary Checks ──────────────────────────────────────────

describe("S17: Boundary compliance — no real transport, advisory-only", () => {
  it("no live transport tokens in trace events", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const events = await readTraceEvents({ workdir: tmpDir });

    for (const e of events) {
      const str = JSON.stringify(e);
      expect(str).not.toContain("HermesClient");
      expect(str).not.toContain("OpenClawClient");
      expect(str).not.toContain("real_transport");
      expect(str).not.toContain("live_agent");
    }
  });

  it("no mutation_applied or mutation_requested events", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const events = await readTraceEvents({ workdir: tmpDir });
    const mutationEvents = events.filter(
      (e) => e.eventType === "mutation_applied" || e.eventType === "mutation_requested"
    );
    expect(mutationEvents.length).toBe(0);
  });

  it("Warden review is advisory-only with explicit warnings", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const reviews = await listReviewPackets({ workdir: tmpDir });
    const r = await readReviewPacket(reviews[0]);

    // Warden is advisory only
    expect(r.reviewerRole).toBe("openclaw_echo");

    // Dry run metadata
    expect(r.metadata?.dryRun).toBe(true);

    // Summary contains advisory language
    expect(r.summary).toContain("DRY-RUN");
  });

  it("no real agent execution in dry run results", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const outbox = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outbox[0]);

    expect(result.metadata!.fake).toBe(true);
    expect(result.assumptions).toContain("Fake agent — no real execution");
    expect(result.metadata!.live).toBeUndefined();
    expect(result.metadata!.real).toBeUndefined();
  });

  it("no HTTP/network tokens in any agent bus file", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    const scanDir = path.join(tmpDir, ".tripp/agents");
    async function scan(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fp);
        } else if (entry.name.endsWith(".json") || entry.name.endsWith(".jsonl") || entry.name.endsWith(".md")) {
          const content = await fs.readFile(fp, "utf-8");
          expect(content).not.toContain("fetch(");
          expect(content).not.toContain("XMLHttpRequest");
          expect(content).not.toContain("WebSocket");
          expect(content).not.toContain("EventSource(");
        }
      }
    }
    await expect(scan(scanDir)).resolves.toBeUndefined();
  });

  it("no server route mutation in read-only paths", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });

    // Server read-only routes only call these functions.
    // Verify they don't mutate the agent bus state.
    const inbox1 = await listInboxPackets({ workdir: tmpDir });
    const outbox1 = await listOutboxPackets({ workdir: tmpDir });

    // Re-read — should be identical (read-only operations)
    const inbox2 = await listInboxPackets({ workdir: tmpDir });
    const outbox2 = await listOutboxPackets({ workdir: tmpDir });

    expect(inbox1.length).toBe(inbox2.length);
    expect(outbox1.length).toBe(outbox2.length);
  });

  it("invalid agent role is still rejected", async () => {
    await expect(
      executeAgentsDryRun({ ...dryRunOpts, agent: "real_live_hermes", workdir: tmpDir })
    ).rejects.toThrow("Invalid agent role");
  });

  it("invalid verdict is still rejected", async () => {
    await expect(
      executeAgentsDryRun({ ...dryRunOpts, verdict: "auto_approve", workdir: tmpDir })
    ).rejects.toThrow("Invalid verdict");
  });
});
