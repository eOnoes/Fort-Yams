/**
 * Stage 6L — Fake/Manual Manifest Output Fixture Tests
 *
 * Produces real fixture manifests from representative trace event sets
 * and validates end-to-end pipeline completeness.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import {
  buildManifestFromEvents,
  buildManifestFromTraceFile,
  writeManifest,
  type ManifestSnapshot,
} from "../fakeManualManifest.js";
import {
  createTraceEvent,
  appendTraceEvent,
} from "@tripp-reason/external-agents";
import { executeAgentsDryRun } from "../agentsCommand.js";
import type { AgentBusTraceEvent } from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-6l-fixture-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<AgentBusTraceEvent> & { eventType: any; packetId: string }): AgentBusTraceEvent {
  const { eventType, packetId, ...rest } = overrides;
  return {
    schemaVersion: "1.0.0",
    eventId: rest.eventId ?? randomUUID(),
    severity: "info",
    createdAt: rest.createdAt ?? new Date().toISOString(),
    actorType: "system",
    summary: rest.summary ?? `Event: ${eventType}`,
    ...rest,
    eventType,
    packetId,
    runId: rest.runId,
  } as AgentBusTraceEvent;
}

// ── Fixture: Comprehensive Lifecycle ──────────────────────────────

describe("6L Fixture: Comprehensive Lifecycle", () => {
  it("generates manifest with all fixture scenarios", async () => {
    const baseTime = "2026-06-06T00:00:00.000Z";

    // --- Packet A: Success (complete lifecycle) ---
    const pidA = "pkt-fixture-success";
    const eA1 = makeEvent({ eventType: "packet_created", packetId: pidA, createdAt: "2026-06-06T00:00:01Z", eventId: "a-created", agentRole: "openclaw_tripp" as any });
    const eA2 = makeEvent({ eventType: "approvalgate_required", packetId: pidA, createdAt: "2026-06-06T00:00:02Z", eventId: "a-gate", runId: "run-a" });
    const eA3 = makeEvent({ eventType: "packet_claimed", packetId: pidA, createdAt: "2026-06-06T00:00:03Z", eventId: "a-claimed" });
    const eA4 = makeEvent({ eventType: "mutation_applied", packetId: pidA, createdAt: "2026-06-06T00:00:04Z", eventId: "a-mutation" });
    const eA5 = makeEvent({ eventType: "result_written", packetId: pidA, createdAt: "2026-06-06T00:00:05Z", eventId: "a-result", resultId: "r-success" });

    // --- Packet B: Denied/Rejected ---
    const pidB = "pkt-fixture-denied";
    const eB1 = makeEvent({ eventType: "packet_created", packetId: pidB, createdAt: "2026-06-06T00:00:06Z", eventId: "b-created", agentRole: "hermes_cyony" as any });
    const eB2 = makeEvent({ eventType: "approvalgate_required", packetId: pidB, createdAt: "2026-06-06T00:00:07Z", eventId: "b-gate", runId: "run-b" });
    const eB3 = makeEvent({ eventType: "human_decision_recorded", packetId: pidB, createdAt: "2026-06-06T00:00:08Z", eventId: "b-deny", runId: "run-b", summary: "Denied by operator" });

    // --- Packet C: Timeout ---
    const pidC = "pkt-fixture-timeout";
    const eC1 = makeEvent({ eventType: "packet_created", packetId: pidC, createdAt: "2026-06-06T00:00:09Z", eventId: "c-created", agentRole: "openclaw_echo" as any });
    const eC2 = makeEvent({ eventType: "subagent_spawned", packetId: pidC, createdAt: "2026-06-06T00:00:10Z", eventId: "c-spawned", subagentId: "sub-c" });
    const eC3 = makeEvent({ eventType: "task_timeout", packetId: pidC, createdAt: "2026-06-06T00:00:11Z", eventId: "c-timeout", subagentId: "sub-c", details: { timeoutMs: 300000 } });

    // --- Packet D: Partial trace (missing causal event) ---
    const pidD = "pkt-fixture-partial";
    const eD1 = makeEvent({ eventType: "packet_created", packetId: pidD, createdAt: "2026-06-06T00:00:12Z", eventId: "d-created", parentEventId: "non-existent-parent" });

    // --- Packet E: Duplicate eventId ---
    const pidE = "pkt-fixture-duplicate";
    const eid = "dup-event-fixture";
    const eE1 = makeEvent({ eventType: "packet_created", packetId: pidE, createdAt: "2026-06-06T00:00:13Z", eventId: eid, summary: "First" });
    const eE2 = makeEvent({ eventType: "result_written", packetId: pidE, createdAt: "2026-06-06T00:00:14Z", eventId: eid, summary: "Second (duplicate id)" });

    // --- Packet F: Unknown event type ---
    const pidF = "pkt-fixture-unknown";
    const eF1 = makeEvent({ eventType: "packet_created" as any, packetId: pidF, createdAt: "2026-06-06T00:00:15Z", eventId: "f-created" });
    const eF2 = makeEvent({ eventType: "some_unknown_event" as any, packetId: pidF, createdAt: "2026-06-06T00:00:16Z", eventId: "f-unknown" });

    // --- Packet G: With redaction evidence ---
    const pidG = "pkt-fixture-redacted";
    const eG1 = makeEvent({
      eventType: "packet_created", packetId: pidG, createdAt: "2026-06-06T00:00:17Z", eventId: "g-created",
      details: { apiKey: "sk-secret-1234567890abcdef", safeNote: "public info", longPrompt: "x".repeat(300) },
    });

    // --- Packet H: Tool timeout ---
    const pidH = "pkt-fixture-tool-timeout";
    const eH1 = makeEvent({ eventType: "packet_created", packetId: pidH, createdAt: "2026-06-06T00:00:18Z", eventId: "h-created" });
    const eH2 = makeEvent({ eventType: "tool_timeout" as any, packetId: pidH, createdAt: "2026-06-06T00:00:19Z", eventId: "h-timeout", toolNames: ["shell"] });

    const allEvents = [eA1, eA2, eA3, eA4, eA5, eB1, eB2, eB3, eC1, eC2, eC3, eD1, eE1, eE2, eF1, eF2, eG1, eH1, eH2];

    // ── Build manifest ──
    const snapshot = buildManifestFromEvents(allEvents);

    // ── Validate shape ──
    expect(snapshot.manifest_version).toBe("1.0.0");
    expect(snapshot.mutation_capability).toBe("none");
    expect(snapshot.sync_mode).toBe("static_snapshot");
    expect(snapshot.source_mode).toBe("fake");

    // 19 events, 1 duplicate → 18 valid, 8 packets
    expect(snapshot.trace_event_count).toBe(19);
    expect(snapshot.validation_summary.total_events).toBe(19);
    expect(snapshot.validation_summary.valid_events).toBe(18);
    expect(snapshot.validation_summary.duplicate_event_ids).toBe(1);
    expect(snapshot.packet_count).toBe(8);

    // ── Packet A: Success ──
    const pktA = snapshot.packets.find((p) => p.packet_id === pidA)!;
    expect(pktA).toBeDefined();
    expect(pktA.lifecycle_state).toBe("completed");
    expect(pktA.approval_state).toBe("granted");
    expect(pktA.result_state).toBe("success");
    expect(pktA.confidence_level).toBe("confirmed");
    expect(pktA.source_event_ids).toHaveLength(5);
    expect(pktA.causal_root_event_id).toBe("a-created");
    expect(pktA.latest_event_id).toBe("a-result");
    expect(pktA.owner_or_agent).toBe("openclaw_tripp");

    // ── Packet B: Denied ──
    const pktB = snapshot.packets.find((p) => p.packet_id === pidB)!;
    expect(pktB).toBeDefined();
    expect(pktB.lifecycle_state).toBe("denied");
    expect(pktB.approval_state).toBe("denied");
    expect(pktB.result_state).toBe("none");
    expect(pktB.confidence_level).toBe("confirmed");

    // ── Packet C: Timeout ──
    const pktC = snapshot.packets.find((p) => p.packet_id === pidC)!;
    expect(pktC).toBeDefined();
    expect(pktC.lifecycle_state).toBe("timeout");
    expect(pktC.timeout_state).toBe("timed_out");
    expect(pktC.result_state).toBe("timeout");
    expect(pktC.owner_or_agent).toBe("openclaw_echo");

    // ── Packet D: Partial trace ──
    const pktD = snapshot.packets.find((p) => p.packet_id === pidD)!;
    expect(pktD).toBeDefined();
    expect(pktD.confidence_level).toBe("partial-trace");
    expect(snapshot.validation_summary.missing_causal_targets).toBeGreaterThanOrEqual(1);

    // ── Packet E: Duplicate handled ──
    const pktE = snapshot.packets.find((p) => p.packet_id === pidE)!;
    expect(pktE).toBeDefined();
    expect(pktE.source_event_ids).toHaveLength(1); // only the first
    expect(pktE.lifecycle_state).toBe("pending"); // only packet_created

    // ── Packet F: Unknown event type ──
    const pktF = snapshot.packets.find((p) => p.packet_id === pidF)!;
    expect(pktF).toBeDefined();
    expect(pktF.lifecycle_state).toBe("pending"); // unknown type ignored
    expect(pktF.confidence_level).toBe("confirmed"); // still has packet_created

    // ── Packet G: Redaction ──
    const pktG = snapshot.packets.find((p) => p.packet_id === pidG)!;
    expect(pktG).toBeDefined();
    expect(pktG.safe_metadata.apiKey).toBe("[REDACTED]");
    expect(pktG.safe_metadata.safeNote).toBe("public info");
    expect(pktG.safe_metadata.longPrompt).toContain("...");
    expect(pktG.redaction_applied).toContain("apiKey");
    expect(snapshot.redaction_summary.secrets_stripped).toBeGreaterThanOrEqual(1);
    expect(snapshot.redaction_summary.prompts_truncated).toBeGreaterThanOrEqual(1);

    // ── Packet H: Tool timeout ──
    const pktH = snapshot.packets.find((p) => p.packet_id === pidH)!;
    expect(pktH).toBeDefined();
    expect(pktH.lifecycle_state).toBe("timeout");
    expect(pktH.timeout_state).toBe("timed_out");
  });
});

// ── Fixture: Write + Read-Back ────────────────────────────────────

describe("6L Fixture: Write + Read-back", () => {
  it("writes manifest JSON + MD and reads back", async () => {
    const pid = "pkt-writeback";
    const events = [
      makeEvent({ eventType: "packet_created", packetId: pid, createdAt: "2026-06-06T00:00:01Z", eventId: "wb-1" }),
      makeEvent({ eventType: "result_written", packetId: pid, createdAt: "2026-06-06T00:00:02Z", eventId: "wb-2", resultId: "r-wb" }),
    ];

    const snapshot = buildManifestFromEvents(events);
    const { jsonPath, mdPath } = await writeManifest(snapshot, tmpDir);

    // Path checks
    expect(jsonPath).toContain(".tripp/agents/manifest/");
    expect(jsonPath.endsWith(".json")).toBe(true);
    expect(mdPath.endsWith(".md")).toBe(true);

    // Read back JSON
    const jsonRaw = await fs.readFile(jsonPath, "utf-8");
    const parsed = JSON.parse(jsonRaw) as ManifestSnapshot;
    expect(parsed.manifest_version).toBe("1.0.0");
    expect(parsed.packet_count).toBe(1);
    expect(parsed.packets[0].packet_id).toBe(pid);
    expect(parsed.mutation_capability).toBe("none");

    // Read back Markdown
    const mdRaw = await fs.readFile(mdPath, "utf-8");
    expect(mdRaw).toContain(pid);
    expect(mdRaw).toContain("FAKE/MANUAL");
    expect(mdRaw).toContain("Do not use for authorization");
    expect(mdRaw).toContain("ApprovalGate remains authoritative");
  });

  it("manifest output path is bounded", async () => {
    const snapshot = buildManifestFromEvents([]);
    const { jsonPath } = await writeManifest(snapshot, tmpDir);

    // Must be within tmpDir
    const resolved = path.resolve(jsonPath);
    const base = path.resolve(tmpDir);
    expect(resolved.startsWith(base)).toBe(true);
    expect(jsonPath).toContain(".tripp/agents/manifest/");
  });

  it("manifest has no secret-looking values in JSON", async () => {
    const pid = "pkt-nosecret";
    const events = [
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { apiKey: "sk-top-secret-12345", token: "ghp_fake" },
      }),
    ];

    const snapshot = buildManifestFromEvents(events);
    const { jsonPath } = await writeManifest(snapshot, tmpDir);
    const raw = await fs.readFile(jsonPath, "utf-8");

    expect(raw).not.toMatch(/sk-top-secret/);
    expect(raw).not.toMatch(/ghp_fake/);
    expect(raw).toContain("[REDACTED]");
  });
});

// ── Fixture: End-to-End Dry Run → Manifest ────────────────────────

describe("6L Fixture: End-to-end dry run → manifest", () => {
  it("produces manifest from real dry run", async () => {
    // Run a real dry run
    await executeAgentsDryRun({
      agent: "hermes_cyony",
      taskType: "audit",
      title: "6L e2e fixture test",
      objective: "Prove end-to-end manifest from dry run",
      scope: "test",
      verdict: "pass",
      workdir: tmpDir,
    } as any);

    // Build manifest from trace file
    const snapshot = await buildManifestFromTraceFile(tmpDir);

    // Basic shape
    expect(snapshot.trace_event_count).toBeGreaterThan(0);
    expect(snapshot.packet_count).toBeGreaterThanOrEqual(1);
    expect(snapshot.mutation_capability).toBe("none");
    expect(snapshot.source_mode).toBe("fake");
    expect(snapshot.manifest_version).toBe("1.0.0");

    // At least one packet is completed
    const completed = snapshot.packets.filter((p) => p.lifecycle_state === "completed");
    expect(completed.length).toBeGreaterThanOrEqual(1);

    // Write to disk
    const { jsonPath } = await writeManifest(snapshot, tmpDir);
    const raw = await fs.readFile(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.manifest_version).toBe("1.0.0");
    expect(parsed.mutation_capability).toBe("none");
  });
});

// ── Fixture: Yellow Flag Resolution Verification ──────────────────

describe("6L Fixture: Yellow flag resolution", () => {
  it("validateTraceLedger is no longer imported (dead import removed)", async () => {
    const src = await fs.readFile(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "fakeManualManifest.ts",
      ),
      "utf-8",
    );
    expect(src).not.toMatch(/validateTraceLedger/);
  });

  it("warnings/unknowns arrays exist in snapshot (reserved for future)", () => {
    const snapshot = buildManifestFromEvents([]);
    // Arrays exist (schema-compliant)
    expect(Array.isArray(snapshot.warnings)).toBe(true);
    expect(Array.isArray(snapshot.unknowns)).toBe(true);
    // Currently empty — documented as reserved
    // They don't need to be populated for a clean fixture
  });

  it("cycle detection is deferred (hasCycles false — documented)", () => {
    // prove that manifests don't crash on cycles even though detection is deferred
    const pid = "pkt-cycle";
    const e1 = makeEvent({ eventType: "packet_created", packetId: pid, eventId: "cyc-1", parentEventId: "cyc-2" });
    const e2 = makeEvent({ eventType: "result_written", packetId: pid, eventId: "cyc-2", parentEventId: "cyc-1" });

    // Should not crash
    const snapshot = buildManifestFromEvents([e1, e2]);
    expect(snapshot.packet_count).toBe(1);
    // Missing targets are counted but cycles are not detected
    expect(snapshot.validation_summary.missing_causal_targets).toBeGreaterThanOrEqual(0);
  });
});

// ── Fixture: Boundary Verification ────────────────────────────────

describe("6L Fixture: Boundary verification", () => {
  it("no shared-agent-bus in fixture code path", async () => {
    const src = await fs.readFile(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "fakeManualManifest.ts",
      ),
      "utf-8",
    );
    // Strip comments before checking
    const codeOnly = src.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "");
    expect(codeOnly).not.toMatch(/shared-agent-bus/i);
  });

  it("no Tripp.Control or Tripp.OS references", async () => {
    const src = await fs.readFile(
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "..",
        "fakeManualManifest.ts",
      ),
      "utf-8",
    );
    expect(src).not.toMatch(/Tripp\.Control/i);
    expect(src).not.toMatch(/Tripp\.OS/i);
  });
});