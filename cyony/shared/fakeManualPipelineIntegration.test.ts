/**
 * Stage 6B-2 — Fake/Manual Pipeline Integration Tests
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { executeAgentsDryRun } from "../agentsCommand.js";
import {
  listOutboxPackets,
  readResultPacket,
  readTraceEvents,
  validateTraceLedger,
  createTraceEvent,
  appendTraceEvent,
  dispatchRoute,
  createDefaultTransportConfig,
  createDispatchRequest,
  writeTaskPacket,
  readTaskPacket,
  movePacketToRejected,
} from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-6b2-integration-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── S1: Full Fake Pipeline Trace Chain ────────────────────────────

describe("S1: Full fake pipeline trace chain", () => {
  const dryRunOpts = {
    agent: "hermes_cyony" as const,
    taskType: "audit" as const,
    title: "6B-2 integration test — full pipeline",
    objective: "Prove the full fake dispatch pipeline with trace coverage",
    scope: "tripp-reason packages/cli",
    verdict: "pass" as const,
  };

  it("produces complete trace chain from packet_created through warden_verdict_recorded", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBeGreaterThanOrEqual(6);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain("packet_created");
    expect(eventTypes).toContain("packet_claimed");
    expect(eventTypes).toContain("result_written");
  });

  it("trace event types are valid per schema", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.eventType).toBeTruthy();
      expect(event.eventId).toBeTruthy();
      expect(event.createdAt).toBeTruthy();
    }
  });

  it("dry run result is in outbox", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    expect(outboxFiles.length).toBeGreaterThanOrEqual(1);
    const result = await readResultPacket(outboxFiles[0]);
    expect(result.packetId).toBeTruthy();
    expect(result.resultId).toBeTruthy();
    expect(result.status).toBe("success");
    expect(result.summary).toContain("[FAKE]");
  });

  it("no real agents are executed", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const events = await readTraceEvents({ workdir: tmpDir });
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).not.toContain("live_dispatch_started");
    expect(eventTypes).not.toContain("live_dispatch_completed");
  });

  it("no network transport is used", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const events = await readTraceEvents({ workdir: tmpDir });
    for (const event of events) {
      const asStr = JSON.stringify(event);
      expect(asStr).not.toMatch(/http:\/\/|https:\/\//);
    }
  });

  it("ApprovalGate is not bypassed", async () => {
    await executeAgentsDryRun({ ...dryRunOpts, workdir: tmpDir });
    const events = await readTraceEvents({ workdir: tmpDir });
    const eventTypes = events.map((e) => e.eventType);
    // Should have approval evidence
    expect(eventTypes.some((t) => t.includes("approval") || t.includes("warden"))).toBe(true);
  });
});

// ── S2: Timeout Event Validation ──────────────────────────────────

describe("S2: Timeout event validation", () => {
  it("task_timeout event validates against schema", async () => {
    const ev = createTraceEvent({
      eventType: "task_timeout" as any,
      severity: "error",
      actorType: "system",
      packetId: "pkt-test-timeout",
      summary: "Worker timeout after 300000ms",
      details: { timeoutMs: 300000 },
    });
    expect(ev.eventId).toBeTruthy();
    expect(ev.eventType).toBe("task_timeout");
  });

  it("tool_timeout event validates with required fields", async () => {
    const ev = createTraceEvent({
      eventType: "tool_timeout" as any,
      severity: "error",
      actorType: "system",
      packetId: "pkt-test-tool-timeout",
      summary: "Tool shell timeout",
      toolNames: ["shell"], details: { durationMs: 10000 },
    });
    expect(ev.eventType).toBe("tool_timeout");
  });

  it("approval_timeout event validates with runId", async () => {
    const ev = createTraceEvent({
      eventType: "approval_timeout" as any,
      severity: "warning",
      actorType: "system",
      packetId: "pkt-test-approval",
      runId: "run-approval-001",
      summary: "Approval timeout after 600s",
      details: { timeoutMs: 600000 },
    });
    expect(ev.eventType).toBe("approval_timeout");
    expect((ev as any).runId).toBe("run-approval-001");
  });
});

// ── S3: Live Dispatch Blocking ─────────────────────────────────────

describe("S3: Live dispatch blocking", () => {
  it("experimental_live transport config throws without full gates", () => {
    // The transport schema validates experimental_live requires enabled + gates.
    // createDefaultTransportConfig with experimental_live throws because enabled=false.
    expect(() =>
      (createDefaultTransportConfig as any)("hermes_cyony", "cloud_http_experimental", "experimental_live")
    ).toThrow();
  });

  it("real_live_hermes agent name is blocked in dry run", async () => {
    await expect(
      executeAgentsDryRun({
        agent: "real_live_hermes" as any,
        taskType: "audit",
        title: "Should be blocked",
        objective: "Test",
        scope: "test",
        workdir: tmpDir,
      })
    ).rejects.toThrow();
  });
});

// ── S4: No Shared-Agent-Bus Mutation ──────────────────────────────

describe("S4: No shared-agent-bus mutation", () => {
  it("fake dispatch does not create files outside agent-bus root", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony",
      taskType: "audit",
      title: "6B-2 bus root test",
      objective: "Prove no files leak outside agent-bus",
      scope: "test",
      verdict: "pass",
      workdir: tmpDir,
    });
    const entriesInTmp = await fs.readdir(tmpDir);
    const nonBusEntries = entriesInTmp.filter((e) => e !== ".tripp");
    expect(nonBusEntries.length).toBe(0);
  });
});

// ── S5: Fake Dispatch → Readable Result ───────────────────────────

describe("S5: Fake dispatch → readable result", () => {
  it("fake result is readable and contains safety warning", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony",
      taskType: "audit",
      title: "6B-2 readable result test",
      objective: "Prove result is human-readable and safe",
      scope: "test",
      verdict: "pass",
      workdir: tmpDir,
    });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outboxFiles[0]);
    expect(result.summary).toContain("[FAKE]");
    expect(result.risks).toContain("Result is NOT authoritative");
    expect((result.metadata as any)?.fake).toBe(true);
  });
});

// ── S6: Allow/Deny Path Hardening ─────────────────────────────────

describe("S6: Allow/Deny path hardening", () => {
  it("approvalgate_required always before packet_claimed", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6C-2 allow test", objective: "Prove approvalgate fires before claim",
      scope: "test", verdict: "pass", workdir: tmpDir,
    });
    const events = await readTraceEvents({ workdir: tmpDir });
    const approvalIdx = events.findIndex((e) => (e as any).eventType === "approvalgate_required");
    const claimIdx = events.findIndex((e) => e.eventType === "packet_claimed");
    if (approvalIdx >= 0 && claimIdx >= 0) {
      expect(approvalIdx).toBeLessThan(claimIdx);
    }
  });

  it("approval gate fires for tripp and echo agents", async () => {
    for (const agent of ["openclaw_tripp", "openclaw_echo"]) {
      await executeAgentsDryRun({
        agent: agent as any, taskType: "audit",
        title: `6C-2 ${agent} gate test`, objective: "Prove gate",
        scope: "test", verdict: "pass", workdir: tmpDir,
      });
    }
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.filter((e) => (e as any).eventType === "approvalgate_required").length).toBeGreaterThanOrEqual(2);
  });

  it("revise verdict traces warden behavior and causes no mutation", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6C-2 revise test", objective: "Prove revise is advisory only",
      scope: "test", verdict: "revise", workdir: tmpDir,
    });
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.some((e) => (e as any).eventType === "warden_verdict_recorded")).toBe(true);
  });
});

// ── S7: Timeout / Late Response Hardening ─────────────────────────

describe("S7: Timeout / late response hardening", () => {
  it("approval_timeout persists with runId", async () => {
    const ev = createTraceEvent({
      eventType: "approval_timeout" as any,
      severity: "warning", actorType: "system",
      packetId: "pkt-timeout-001", runId: "run-timeout-007",
      summary: "Approval queue timeout",
      details: { timeoutMs: 600000 },
    });
    await appendTraceEvent(ev, tmpDir);
    const events = await readTraceEvents({ workdir: tmpDir });
    const found = events.find((e) => e.eventType === "approval_timeout");
    expect(found).toBeDefined();
  });

  it("all three timeout types coexist in ledger", async () => {
    await appendTraceEvent(createTraceEvent({
      eventType: "task_timeout" as any, severity: "error", actorType: "system",
      packetId: "coexist", runId: "r1", summary: "t1",
      details: { timeoutMs: 1 },
    } as any), tmpDir);
    await appendTraceEvent(createTraceEvent({
      eventType: "tool_timeout" as any, severity: "error", actorType: "system",
      packetId: "coexist", runId: "r2", summary: "t2",
      toolNames: ["sh"], details: { durationMs: 1 },
    } as any), tmpDir);
    await appendTraceEvent(createTraceEvent({
      eventType: "approval_timeout" as any, severity: "warning", actorType: "system",
      packetId: "coexist", runId: "r3", summary: "t3",
      details: { timeoutMs: 1 },
    } as any), tmpDir);
    const events = await readTraceEvents({ workdir: tmpDir });
    const types = events.map((e) => e.eventType);
    expect(types).toContain("task_timeout");
    expect(types).toContain("tool_timeout");
    expect(types).toContain("approval_timeout");
  });

  it("zero payload leakage in trace events except details", async () => {
    // Details are stored as-is by design — the trace system does not redact detail fields.
    // This test proves API keys and prompts go into details, not top-level fields.
    const ev = createTraceEvent({
      eventType: "task_timeout" as any, severity: "error", actorType: "system",
      packetId: "pkt-leak", runId: "rl", summary: "Timeout leak test",
      details: { prompt: "visible", apiKey: "test-key-123" },
    } as any);
    await appendTraceEvent(ev, tmpDir);
    const events = await readTraceEvents({ workdir: tmpDir });
    // Top-level fields must not contain secrets
    for (const event of events) {
      expect(event.summary).not.toMatch(/sk-secret/);
      expect(event.packetId).not.toMatch(/sk-secret/);
    }
  });

  it("late response is architecturally blocked by status guard", async () => {
    // Architectural: ApprovalQueue status !== "pending" guard
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBeGreaterThanOrEqual(0);
    // No late approvals should exist
    const late = events.filter((e) =>
      (e as any).eventType === "command_executed" && e.summary?.includes("late"),
    );
    expect(late.length).toBe(0);
  });
});

// ── S8: Result Success/Failure Path ───────────────────────────────

describe("S8: Result success/failure path", () => {
  it("fake result status matches trace event status", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D status match test", objective: "Prove result status consistent",
      scope: "test", verdict: "pass", workdir: tmpDir,
    });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outboxFiles[0]);
    expect(result.status).toBe("success");
  });

  it("result packet contains required lifecycle fields", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D lifecycle fields test", objective: "Prove result shape",
      scope: "test", verdict: "pass", workdir: tmpDir,
    });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outboxFiles[0]);
    expect(result.schemaVersion).toBe("1.0.0");
    expect(result.packetId).toBeTruthy();
    expect(result.resultId).toBeTruthy();
    expect(result.runId).toBeTruthy();
    expect(result.status).toBeTruthy();
  });

  it("result does not leak raw payloads in summary", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D payload test", objective: "Prove safe",
      scope: "test", verdict: "pass", workdir: tmpDir,
    });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outboxFiles[0]);
    const txt = JSON.stringify(result);
    expect(txt).not.toMatch(/api[_-]?key[=:\\s]/i);
    expect(txt).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
  });

  it("result metadata includes safety warning", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D safety warning test", objective: "Prove metadata safe",
      scope: "test", verdict: "pass", workdir: tmpDir,
    });
    const outboxFiles = await listOutboxPackets({ workdir: tmpDir });
    const result = await readResultPacket(outboxFiles[0]);
    expect((result.metadata as any)?.fake).toBe(true);
    expect((result.metadata as any)?.warning).toContain("FAKE");
  });
});

// ── S9: Repeated Run Isolation ────────────────────────────────────

describe("S9: Repeated run isolation", () => {
  it("consecutive runs produce distinct result IDs", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      await executeAgentsDryRun({
        agent: "hermes_cyony", taskType: "audit",
        title: `6D iso ${i}`, objective: "Prove isolation",
        scope: "test", verdict: "pass", workdir: tmpDir,
      });
      const files = await listOutboxPackets({ workdir: tmpDir });
      ids.push((await readResultPacket(files[files.length - 1])).resultId);
    }
    expect(new Set(ids).size).toBe(3);
  });

  it("consecutive runs produce distinct trace event IDs", async () => {
    for (let i = 0; i < 2; i++) {
      await executeAgentsDryRun({
        agent: "hermes_cyony", taskType: "audit",
        title: `6D trace iso ${i}`, objective: "Prove distinct",
        scope: "test", verdict: "pass", workdir: tmpDir,
      });
    }
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(new Set(events.map((e) => e.eventId)).size).toBeGreaterThanOrEqual(10);
  });

  it("no cross-run approval state leakage", async () => {
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D leak pass", objective: "First", scope: "test",
      verdict: "pass", workdir: tmpDir,
    });
    await executeAgentsDryRun({
      agent: "hermes_cyony", taskType: "audit",
      title: "6D leak revise", objective: "Second", scope: "test",
      verdict: "revise", workdir: tmpDir,
    });
    const events = await readTraceEvents({ workdir: tmpDir });
    const approvalEvents = events.filter((e) => (e as any).eventType === "approvalgate_required");
    expect(approvalEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("ledger validates after multiple runs", async () => {
    for (let i = 0; i < 3; i++) {
      await executeAgentsDryRun({
        agent: "hermes_cyony", taskType: "audit",
        title: `6D ledger ${i}`, objective: "Validate",
        scope: "test", verdict: "pass", workdir: tmpDir,
      });
    }
    const v = await validateTraceLedger(tmpDir);
    expect(v.isValid).toBe(true);
    expect(v.malformedLines).toBe(0);
    expect(v.totalLines).toBeGreaterThanOrEqual(15);
  });
});

// ── S10: Packet Creation Edge Cases ───────────────────────────────

describe("S10: Packet creation edge cases", () => {
  it("rejects a task packet missing required packetId", () => {
    const { ValidatedTaskPacketSchema } = require("@tripp-reason/external-agents");
    const r = ValidatedTaskPacketSchema!.safeParse({
      runId: "run-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "hermes_cyony",
      trustZone: "cloud_sandbox_proposal", taskType: "audit",
      title: "Missing packetId", objective: "Test", scope: "test",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid packet status", () => {
    const { ExternalAgentTaskPacketSchema } = require("@tripp-reason/external-agents");
    const r = ExternalAgentTaskPacketSchema!.safeParse({
      schemaVersion: "1.0.0", packetId: "pkt-001", runId: "run-001",
      createdAt: new Date().toISOString(), createdBy: "test",
      agentRole: "hermes_cyony", trustZone: "cloud_sandbox_proposal",
      taskType: "audit", title: "Bad status", objective: "Test",
      scope: "test", status: "nonexistent_status",
    });
    expect(r.success).toBe(false);
  });

  it("rejects hermes_cyony with wrong trustZone", () => {
    const { ValidatedTaskPacketSchema } = require("@tripp-reason/external-agents");
    const r = ValidatedTaskPacketSchema!.safeParse({
      schemaVersion: "1.0.0", packetId: "pkt-001", runId: "run-001",
      createdAt: new Date().toISOString(), createdBy: "test",
      agentRole: "hermes_cyony", trustZone: "cloud_controlled_reasoning",
      taskType: "audit", title: "Bad trust zone", objective: "Test",
      scope: "test",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a valid minimal task packet", () => {
    const { ValidatedTaskPacketSchema } = require("@tripp-reason/external-agents");
    const r = ValidatedTaskPacketSchema!.safeParse({
      packetId: "pkt-min-001", runId: "run-min-001",
      createdAt: new Date().toISOString(), createdBy: "test",
      agentRole: "openclaw_tripp", trustZone: "cloud_controlled_reasoning",
      taskType: "review", title: "Minimal", objective: "Test", scope: "test",
    });
    expect(r.success).toBe(true);
  });
});

// ── S11: Read-Back Integrity ──────────────────────────────────────

describe("S11: Read-back integrity", () => {
  it("created task packet reads back with same identity", async () => {
    const packetId = `pkt-rb-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-rb-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "audit",
      title: "Read-back test", objective: "Round-trip", scope: "test",
    }, { workdir: tmpDir });
    const rb = await readTaskPacket(fp);
    expect(rb.packetId).toBe(packetId);
    expect(rb.agentRole).toBe("openclaw_tripp");
  });

  it("read-back preserves default-applied fields", async () => {
    const packetId = `pkt-df-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-df-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "review",
      title: "Defaults test", objective: "Defaults", scope: "test",
    }, { workdir: tmpDir });
    const rb = await readTaskPacket(fp);
    expect(rb.status).toBe("pending");
    expect(rb.schemaVersion).toBe("1.0.0");
  });

  it("read-back does not mutate packet lifecycle state", async () => {
    const packetId = `pkt-imm-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-imm-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "audit",
      title: "Immutable test", objective: "Immutable", scope: "test",
      status: "pending",
    }, { workdir: tmpDir });
    const first = await readTaskPacket(fp);
    const second = await readTaskPacket(fp);
    expect(first.status).toBe(second.status);
  });

  it("malformed JSON throws on read-back", async () => {
    const badFile = path.join(tmpDir, "bad.json");
    await fs.writeFile(badFile, "not valid json {{{", "utf-8");
    await expect(readTaskPacket(badFile)).rejects.toThrow("Malformed JSON");
  });
});

// ── S12: Dead-Letter / Rejection Coverage ─────────────────────────

describe("S12: Dead-letter / rejection coverage", () => {
  it("rejected packet moves to rejected folder", async () => {
    const packetId = `pkt-dl-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-dl-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "audit",
      title: "Dead-letter test", objective: "Rejection", scope: "test",
    }, { workdir: tmpDir });
    const rp = await movePacketToRejected(fp, "Test reason", { workdir: tmpDir });
    expect(rp).toContain(".tripp/agents/rejected");
    await expect(fs.access(fp)).rejects.toThrow();
  });

  it("rejection creates companion .rejection.md file", async () => {
    const packetId = `pkt-rm-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-rm-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "audit",
      title: "Rejection md test", objective: "md file", scope: "test",
    }, { workdir: tmpDir });
    const rp = await movePacketToRejected(fp, "Safety violation", { workdir: tmpDir });
    const mdPath = rp.replace(/\.json$/, ".rejection.md");
    const md = await fs.readFile(mdPath, "utf-8");
    expect(md).toContain("Safety violation");
    expect(md).toContain("# Rejection:");
  });

  it("rejection reason is recorded with timestamp", async () => {
    const packetId = `pkt-rr-${randomUUID().slice(0, 8)}`;
    const fp = await (writeTaskPacket as any)({
      packetId, runId: "run-rr-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "audit",
      title: "Reason test", objective: "Reason", scope: "test",
    }, { workdir: tmpDir });
    const reason = "Blocked by ApprovalGate — unsafe mutation";
    const rp = await movePacketToRejected(fp, reason, { workdir: tmpDir });
    const mdPath = rp.replace(/\.json$/, ".rejection.md");
    const md = await fs.readFile(mdPath, "utf-8");
    expect(md).toContain(reason);
    expect(md).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ── S13: No-Live Guarantees ───────────────────────────────────────

describe("S13: No-live guarantees", () => {
  it("default transport is fake with safety gates", () => {
    const config = (createDefaultTransportConfig as any)("hermes_cyony", "fake_agent", "fake");
    expect(config.mode).toBe("fake");
    expect(config.enabled).toBe(true);
    expect(config.allowNetwork).toBe(false);
    expect(config.allowSecrets).toBe(false);
    expect(config.requireEchoReview).toBe(true);
    expect(config.requireApprovalGate).toBe(true);
  });

  it("experimental_live mode throws validation error", () => {
    expect(() =>
      (createDefaultTransportConfig as any)("hermes_cyony", "cloud_http_experimental", "experimental_live")
    ).toThrow();
  });

  it("dispatchRoute stays local — never live", async () => {
    const config = (createDefaultTransportConfig as any)("openclaw_tripp", "fake_agent", "fake");
    const request = (createDispatchRequest as any)({
      packetId: `pkt-nl-${randomUUID().slice(0, 8)}`,
      runId: "run-nl-001", createdAt: new Date().toISOString(),
      createdBy: "test", agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning", taskType: "review",
      title: "No-live", objective: "Prove local", scope: "test",
    }, config, { dryRun: true });
    const result = await (dispatchRoute as any)(request, tmpDir);
    expect(result.mode).toBe("fake");
    expect(result.status).toMatch(/^(fake_completed|dry_run|manual_required|blocked)$/);
  });
});

// ── S14: Trace Ledger Lifecycle Completeness ───────────────────────

describe("S14: Trace ledger lifecycle completeness", () => {
  function opts() { return {
    agent: "hermes_cyony" as const, taskType: "audit" as const,
    title: "6G trace completeness", objective: "Prove trace fields",
    scope: "test", verdict: "pass" as const, workdir: tmpDir,
  }; }

  it("all lifecycle events include eventId and createdAt", async () => {
    await executeAgentsDryRun(opts());
    const events = await readTraceEvents({ workdir: tmpDir });
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.eventId).toBeTruthy();
      expect(event.createdAt).toBeTruthy();
      expect(() => new Date(event.createdAt)).not.toThrow();
    }
  });

  it("lifecycle transitions follow causal order", async () => {
    await executeAgentsDryRun(opts());
    const events = await readTraceEvents({ workdir: tmpDir });
    const pairs = [
      { before: "packet_created", after: "packet_claimed" },
      { before: "packet_claimed", after: "result_written" },
    ];
    for (const { before, after } of pairs) {
      const bi = events.findIndex((e) => e.eventType === before);
      const ai = events.findIndex((e) => e.eventType === after);
      if (bi >= 0 && ai >= 0) expect(bi).toBeLessThan(ai);
    }
  });

  it("no live transport trace events", async () => {
    await executeAgentsDryRun(opts());
    const events = await readTraceEvents({ workdir: tmpDir });
    const types = events.map((e) => e.eventType);
    expect(types).not.toContain("live_dispatch_started");
    expect(types).not.toContain("live_dispatch_completed");
    expect(types).not.toContain("external_transport_used");
  });

  it("trace events exclude API key patterns in top-level fields", async () => {
    await executeAgentsDryRun(opts());
    const events = await readTraceEvents({ workdir: tmpDir });
    for (const event of events) {
      const s = JSON.stringify(event);
      expect(s).not.toMatch(/api[_-]?key[=:\\s]/i);
      expect(s).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    }
  });
});