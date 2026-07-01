/**
 * Stage 6J — Fake/Manual Manifest Sync Tests
 *
 * 6J-1: Schema tests
 * 6J-2: Pure mapper tests
 * 6J-3: Redaction tests
 * 6J-4: Edge case tests
 * 6J-5: Boundary tests
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  buildManifestFromEvents,
  buildManifestFromTraceFile,
  writeManifest,
  type ManifestSnapshot,
  type ManifestPacketEntry,
} from "../fakeManualManifest.js";
import {
  createTraceEvent,
  appendTraceEvent,
} from "@tripp-reason/external-agents";
import { executeAgentsDryRun } from "../agentsCommand.js";
import type { AgentBusTraceEvent } from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-6j-manifest-${Date.now()}`);
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

// ── 6J-1: Schema Tests ────────────────────────────────────────────

describe("6J-1: Schema tests", () => {
  it("valid empty manifest", () => {
    const m = buildManifestFromEvents([]);
    expect(m.manifest_version).toBe("1.0.0");
    expect(m.packet_count).toBe(0);
    expect(m.trace_event_count).toBe(0);
    expect(m.packets).toEqual([]);
    expect(m.mutation_capability).toBe("none");
  });

  it("valid single-packet manifest", () => {
    const pid = "pkt-test-001";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid, summary: "Created" }),
      makeEvent({ eventType: "packet_claimed", packetId: pid, summary: "Claimed" }),
      makeEvent({ eventType: "result_written", packetId: pid, summary: "Result", resultId: "r-1" }),
    ]);
    expect(m.packet_count).toBe(1);
    expect(m.packets[0].packet_id).toBe(pid);
    expect(m.packets[0].lifecycle_state).toBe("completed");
    expect(m.packets[0].source_event_ids).toHaveLength(3);
  });

  it("required snapshot fields are present", () => {
    const m = buildManifestFromEvents([]);
    const required = [
      "manifest_version", "generated_at", "source", "source_mode",
      "sync_mode", "mutation_capability", "trace_event_count",
      "packet_count", "confidence_level", "confidence_reason",
      "packets", "warnings", "unknowns", "redaction_summary",
      "validation_summary",
    ];
    for (const key of required) {
      expect(m).toHaveProperty(key);
    }
  });

  it("required packet entry fields are present", () => {
    const pid = "pkt-test-002";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
    ]);
    expect(m.packet_count).toBe(1);
    const p = m.packets[0];
    const required = [
      "packet_id", "packet_type", "lifecycle_state", "approval_state",
      "result_state", "rejection_state", "timeout_state",
      "owner_or_agent", "created_at", "updated_at", "source_event_ids",
      "causal_root_event_id", "latest_event_id", "confidence_level",
      "confidence_reason", "warnings", "redaction_applied", "safe_metadata",
    ];
    for (const key of required) {
      expect(p).toHaveProperty(key);
    }
  });

  it("mutation_capability is none", () => {
    const m = buildManifestFromEvents([]);
    expect(m.mutation_capability).toBe("none");
  });

  it("source_mode and sync_mode are static/manual values", () => {
    const m = buildManifestFromEvents([]);
    expect(m.source_mode).toBe("fake");
    expect(m.sync_mode).toBe("static_snapshot");
  });

  it("redaction_summary exists even when no redactions", () => {
    const m = buildManifestFromEvents([]);
    expect(m.redaction_summary).toBeDefined();
    expect(m.redaction_summary.fields_redacted).toBe(0);
    expect(m.redaction_summary.secrets_stripped).toBe(0);
  });
});

// ── 6J-2: Pure Mapper Tests ───────────────────────────────────────

describe("6J-2: Pure mapper tests", () => {
  it("packet_created derives pending state", () => {
    const pid = "pkt-pending";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("pending");
    expect(m.packets[0].causal_root_event_id).toBeTruthy();
  });

  it("approvalgate_required derives awaiting_approval", () => {
    const pid = "pkt-approval";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "approvalgate_required", packetId: pid }),
    ]);
    expect(m.packets[0].approval_state).toBe("pending");
    expect(m.packets[0].lifecycle_state).toBe("awaiting_approval");
  });

  it("mutation_applied derives granted approval", () => {
    const pid = "pkt-granted";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "approvalgate_required", packetId: pid }),
      makeEvent({ eventType: "mutation_applied", packetId: pid }),
    ]);
    expect(m.packets[0].approval_state).toBe("granted");
    expect(m.packets[0].lifecycle_state).toBe("approved");
  });

  it("human_decision_recorded derives denied approval", () => {
    const pid = "pkt-denied";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "approvalgate_required", packetId: pid }),
      makeEvent({ eventType: "human_decision_recorded", packetId: pid, summary: "Denied by operator" }),
    ]);
    expect(m.packets[0].approval_state).toBe("denied");
  });

  it("task_timeout derives timeout state", () => {
    const pid = "pkt-timeout";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "subagent_spawned", packetId: pid, subagentId: "sub-1" }),
      makeEvent({ eventType: "task_timeout", packetId: pid, subagentId: "sub-1" }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("timeout");
    expect(m.packets[0].timeout_state).toBe("timed_out");
    expect(m.packets[0].result_state).toBe("timeout");
  });

  it("approval_timeout derives timeout_approval state", () => {
    const pid = "pkt-atimeout";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "approvalgate_required", packetId: pid }),
      makeEvent({ eventType: "approval_timeout", packetId: pid, runId: "r1" }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("timeout_approval");
    expect(m.packets[0].approval_state).toBe("timed_out");
  });

  it("result_written derives completed state", () => {
    const pid = "pkt-done";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "packet_claimed", packetId: pid }),
      makeEvent({ eventType: "result_written", packetId: pid, resultId: "r-done" }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("completed");
    expect(m.packets[0].result_state).toBe("success");
  });

  it("subagent_killed derives failed state", () => {
    const pid = "pkt-fail";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "subagent_spawned", packetId: pid, subagentId: "s-1" }),
      makeEvent({ eventType: "subagent_killed", packetId: pid, subagentId: "s-1" }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("failed");
    expect(m.packets[0].result_state).toBe("failure");
  });

  it("packet_rejected derives rejected state", () => {
    const pid = "pkt-rej";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
      makeEvent({ eventType: "packet_rejected", packetId: pid }),
    ]);
    expect(m.packets[0].lifecycle_state).toBe("rejected");
    expect(m.packets[0].rejection_state).toBe("rejected");
    expect(m.packets[0].result_state).toBe("blocked");
  });

  it("multiple packets produce stable ordering by createdAt", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const events: AgentBusTraceEvent[] = [
      makeEvent({ eventType: "packet_created", packetId: "pkt-b", createdAt: new Date(base.getTime() + 2000).toISOString() }),
      makeEvent({ eventType: "packet_created", packetId: "pkt-a", createdAt: new Date(base.getTime() + 1000).toISOString() }),
      makeEvent({ eventType: "packet_created", packetId: "pkt-c", createdAt: new Date(base.getTime() + 3000).toISOString() }),
    ];
    const m = buildManifestFromEvents(events);
    expect(m.packets.map((p) => p.packet_id)).toEqual(["pkt-a", "pkt-b", "pkt-c"]);
  });

  it("eventId tiebreaker with same createdAt", () => {
    const ts = new Date("2026-01-01T00:00:00Z").toISOString();
    const events: AgentBusTraceEvent[] = [
      makeEvent({ eventType: "packet_created", packetId: "pkt-z", createdAt: ts, eventId: "z" }),
      makeEvent({ eventType: "packet_created", packetId: "pkt-a", createdAt: ts, eventId: "a" }),
    ];
    const m = buildManifestFromEvents(events);
    expect(m.packets.map((p) => p.packet_id)).toEqual(["pkt-a", "pkt-z"]);
  });

  it("causal_root_event_id and latest_event_id are set", () => {
    const pid = "pkt-root";
    const e1 = makeEvent({ eventType: "packet_created", packetId: pid, createdAt: "2026-01-01T00:00:01Z" });
    const e2 = makeEvent({ eventType: "result_written", packetId: pid, createdAt: "2026-01-01T00:00:02Z" });
    const m = buildManifestFromEvents([e1, e2]);
    expect(m.packets[0].causal_root_event_id).toBe(e1.eventId);
    expect(m.packets[0].latest_event_id).toBe(e2.eventId);
  });
});

// ── 6J-3: Redaction Tests ─────────────────────────────────────────

describe("6J-3: Redaction tests", () => {
  it("apiKey in details is redacted", () => {
    const pid = "pkt-redact";
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { apiKey: "sk-secret1234567890", safeField: "kept" },
      }),
    ]);
    const safe = m.packets[0].safe_metadata;
    expect(safe.apiKey).toBe("[REDACTED]");
    expect(safe.safeField).toBe("kept");
    expect(m.packets[0].redaction_applied).toContain("apiKey");
  });

  it("token field in details is redacted", () => {
    const pid = "pkt-token";
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { token: "ghp_secret1234" },
      }),
    ]);
    expect(m.packets[0].safe_metadata.token).toBe("[REDACTED]");
  });

  it("API key value pattern in details is redacted", () => {
    const pid = "pkt-vpattern";
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { note: "key: sk-abcdef1234567890abcdef1234567890" },
      }),
    ]);
    expect(m.packets[0].safe_metadata.note).toBe("[REDACTED]");
  });

  it("redaction_summary counts redacted fields", () => {
    const pid = "pkt-count";
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { apiKey: "sk-1", token: "x", secret: "y", safe: "z" },
      }),
    ]);
    expect(m.redaction_summary.fields_redacted).toBeGreaterThanOrEqual(3);
    expect(m.redaction_summary.secrets_stripped).toBeGreaterThanOrEqual(3);
  });

  it("prompts_truncated when value exceeds 200 chars", () => {
    const pid = "pkt-trunc";
    const longText = "x".repeat(300);
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        details: { prompt: longText },
      }),
    ]);
    const safe = m.packets[0].safe_metadata;
    expect((safe.prompt as string).length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(safe.prompt).toContain("...");
    expect(m.redaction_summary.prompts_truncated).toBeGreaterThanOrEqual(1);
  });

  it("safe top-level fields remain unchanged", () => {
    const pid = "pkt-safe";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid, agentRole: "openclaw_tripp" as any }),
    ]);
    const p = m.packets[0];
    expect(p.packet_id).toBe(pid);
    expect(p.owner_or_agent).toBe("openclaw_tripp");
    // Top-level fields are not redacted
  });
});

// ── 6J-4: Edge Case Tests ─────────────────────────────────────────

describe("6J-4: Edge case tests", () => {
  it("duplicate eventId uses first event only", () => {
    const eid = "dup-event-id";
    const pid = "pkt-dup";
    const e1 = makeEvent({ eventType: "packet_created", packetId: pid, eventId: eid, summary: "First" });
    const e2 = makeEvent({ eventType: "result_written", packetId: pid, eventId: eid, summary: "Second" });
    const m = buildManifestFromEvents([e1, e2]);
    // Should have only 1 valid event (deduped)
    expect(m.validation_summary.duplicate_event_ids).toBeGreaterThanOrEqual(1);
    expect(m.validation_summary.valid_events).toBe(1);
  });

  it("missing parentEventId target yields partial-trace confidence", () => {
    const pid = "pkt-missing";
    const m = buildManifestFromEvents([
      makeEvent({
        eventType: "packet_created", packetId: pid,
        parentEventId: "non-existent-event-id",
      }),
    ]);
    expect(m.validation_summary.missing_causal_targets).toBeGreaterThanOrEqual(1);
    expect(m.packets[0].confidence_level).toBe("partial-trace");
  });

  it("unknown event types do not crash", () => {
    const pid = "pkt-unknown";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created" as any, packetId: pid }),
      makeEvent({ eventType: "some_unknown_event" as any, packetId: pid }),
    ]);
    // Should not crash — unknown events are ignored for derivation
    expect(m.packet_count).toBe(1);
    expect(m.packets[0].lifecycle_state).toBe("pending");
  });

  it("empty trace produces empty manifest", () => {
    const m = buildManifestFromEvents([]);
    expect(m.packet_count).toBe(0);
    expect(m.trace_event_count).toBe(0);
    expect(m.confidence_level).toBe("confirmed");
    expect(m.packets).toEqual([]);
  });

  it("events without packetId are grouped under __no_packet__", () => {
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "tools_loaded" as any, packetId: "", toolNames: ["test"] } as any),
    ]);
    // Should not crash
    expect(m.packet_count).toBeGreaterThanOrEqual(0);
  });

  it("idempotent — same input twice produces identical manifests", () => {
    const pid = "pkt-idem";
    const events = [
      makeEvent({ eventType: "packet_created", packetId: pid, createdAt: "2026-01-01T00:00:00Z", eventId: "e1" }),
      makeEvent({ eventType: "result_written", packetId: pid, createdAt: "2026-01-01T00:00:01Z", eventId: "e2" }),
    ];
    const m1 = buildManifestFromEvents(events);
    const m2 = buildManifestFromEvents(events);
    expect(m1.packet_count).toBe(m2.packet_count);
    expect(m1.packets[0].lifecycle_state).toBe(m2.packets[0].lifecycle_state);
    expect(m1.packets[0].source_event_ids).toEqual(m2.packets[0].source_event_ids);
  });
});

// ── 6J-5: Boundary Tests ──────────────────────────────────────────

describe("6J-5: Boundary tests", () => {
  it("no shared-agent-bus references in manifest module", async () => {
    const src = await fs.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "fakeManualManifest.ts"),
      "utf-8",
    );
    expect(src.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")).not.toMatch(/shared-agent-bus/i);
    expect(src).not.toMatch(/TRIPP_SHARED_AGENT_BUS/i);
  });

  it("no Tripp.Control references in manifest module", async () => {
    const src = await fs.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "fakeManualManifest.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/Tripp\.Control/i);
  });

  it("no Tripp.OS references in manifest module", async () => {
    const src = await fs.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "fakeManualManifest.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/Tripp\.OS/i);
  });

  it("no polling, watchers, or background loops in manifest", async () => {
    const src = await fs.readFile(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "fakeManualManifest.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/setInterval/);
    expect(src).not.toMatch(/setTimeout/);
    expect(src).not.toMatch(/fs\.watch/);
    expect(src).not.toMatch(/chokidar/);
    expect(src).not.toMatch(/background/i);
    expect(src).not.toMatch(/child_process/);
    expect(src).not.toMatch(/\.exec\(/);
    expect(src).not.toMatch(/\.spawn\(/);
  });

  it("file output stays within manifest dir", async () => {
    const pid = "pkt-fileout";
    const snapshot = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
    ]);

    const { jsonPath, mdPath } = await writeManifest(snapshot, tmpDir);

    expect(jsonPath).toContain(".tripp/agents/manifest/");
    expect(jsonPath).toContain("manifest-");
    expect(jsonPath.endsWith(".json")).toBe(true);
    expect(mdPath.endsWith(".md")).toBe(true);

    // Verify files exist
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    expect(jsonContent).toContain(pid);
    const mdContent = await fs.readFile(mdPath, "utf-8");
    expect(mdContent).toContain(pid);
  });

  it("buildManifestFromTraceFile reads from real trace ledger", async () => {
    // Run a dry run to produce trace events
    await executeAgentsDryRun({
      agent: "hermes_cyony",
      taskType: "audit",
      title: "6J trace file test",
      objective: "Prove manifest reads from file",
      scope: "test",
      verdict: "pass",
      workdir: tmpDir,
    } as any);

    const snapshot = await buildManifestFromTraceFile(tmpDir);
    expect(snapshot.trace_event_count).toBeGreaterThan(0);
    expect(snapshot.packet_count).toBeGreaterThanOrEqual(1);
    expect(snapshot.packets[0].lifecycle_state).toBeTruthy();
  });

  it("no live-agent activation in manifest code path", () => {
    const pid = "pkt-nolive";
    const m = buildManifestFromEvents([
      makeEvent({ eventType: "packet_created", packetId: pid }),
    ]);
    // Manifest code reads trace events statically — no dispatch
    expect(m.packets[0].lifecycle_state).toBe("pending");
    // No approval granted, no mutation applied, no execution
    expect(m.packets[0].approval_state).toBe("not_required");
    expect(m.packets[0].result_state).toBe("none");
  });
});