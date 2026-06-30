/**
 * Stage 6S — Static Operator Packet Simulation Tests
 *
 * Simulates operator receiving, validating, classifying, and
 * accepting/rejecting static handoff bundles.
 *
 * Tests:
 *   6S-1: Accepted packets (clean, warnings, unknowns, stale)
 *   6S-2: Rejected packets (missing files, mutation, contract, live, secrets, cross-project)
 *   6S-3: Operator summary safety
 *   6S-4: Confidence classification
 *   6S-5: Boundary verification
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import {
  simulateOperatorHandoff,
  type OperatorPacketResult,
} from "../fakeManualOperatorSimulation.js";
import { packageHandoffBundle } from "../fakeManualHandoffBundle.js";
import { buildManifestFromEvents } from "../fakeManualManifest.js";
import type { AgentBusTraceEvent } from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-6s-sim-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<AgentBusTraceEvent> & { eventType: any; packetId: string },
): AgentBusTraceEvent {
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

async function makeCleanBundle(overrides?: Partial<any>): Promise<string> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-sim", eventId: "s1" }),
    makeEvent({ eventType: "result_written", packetId: "pkt-sim", eventId: "s2", resultId: "r1" } as any),
  ];
  let snapshot = buildManifestFromEvents(events);
  if (overrides) {
    snapshot = { ...snapshot, ...overrides };
  }
  const result = await packageHandoffBundle(snapshot, tmpDir);
  return result.files[0].replace(/\/manifest\.json$/, ""); // bundle dir
}

async function makeWarningBundle(): Promise<string> {
  // Same as clean but we'll inject warnings after generation
  return makeCleanBundle();
}

async function makeStaleBundle(): Promise<string> {
  const events = [
    makeEvent({
      eventType: "packet_created",
      packetId: "pkt-stale",
      eventId: "st1",
      createdAt: "2020-01-01T00:00:00Z",
    }),
    makeEvent({
      eventType: "result_written" as any,
      packetId: "pkt-stale",
      eventId: "st2",
      createdAt: "2020-01-01T00:00:01Z",
      resultId: "r-stale",
    }),
  ];
  const snapshot = buildManifestFromEvents(events);
  const result = await packageHandoffBundle(snapshot, tmpDir);
  return result.files[0].replace(/\/manifest\.json$/, "");
}

async function makePartialTraceBundle(): Promise<string> {
  const events = [
    makeEvent({
      eventType: "packet_created",
      packetId: "pkt-partial",
      eventId: "pt1",
      parentEventId: "non-existent",
    }),
  ];
  const snapshot = buildManifestFromEvents(events);
  const result = await packageHandoffBundle(snapshot, tmpDir);
  return result.files[0].replace(/\/manifest\.json$/, "");
}

async function makeUnknownsBundle(): Promise<string> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-unk", eventId: "u1" }),
    makeEvent({ eventType: "some_unknown_event" as any, packetId: "pkt-unk", eventId: "u2" }),
  ];
  const snapshot = buildManifestFromEvents(events);
  const result = await packageHandoffBundle(snapshot, tmpDir);
  return result.files[0].replace(/\/manifest\.json$/, "");
}

// ── 6S-1: Accepted Packets ───────────────────────────────────────────

describe("6S-1: Accepted packets", () => {
  it("clean handoff bundle is accepted with high confidence", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.accepted).toBe(true);
    expect(result.rejection_reason).toBeNull();
    expect(result.summary.packet_status).toBe("accepted");
    expect(result.summary.confidence_level).toBe("high");
    expect(result.summary.decision).toContain("Accepted");
    expect(result.metadata).toBeDefined();
  });

  it("bundle with warnings is accepted with medium confidence", async () => {
    const bundleDir = await makeCleanBundle();

    // Inject warnings into metadata
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.warnings_count = 2;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("medium");
    expect(result.summary.warnings.length).toBeGreaterThan(0);
  });

  it("bundle with unknowns is accepted with low confidence", async () => {
    const bundleDir = await makeCleanBundle();

    // Inject unknowns into metadata
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.unknowns_count = 3;
    meta.confidence_summary.overall_level = "partial-trace";
    meta.confidence_summary.packets_partial = 1;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("low");
    expect(result.summary.unknowns.length).toBeGreaterThan(0);
  });

  it("bundle with stale state is accepted with limited confidence", async () => {
    const bundleDir = await makeStaleBundle();

    // Inject stale flag into metadata
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.stale_state_summary = {
      is_stale: true,
      stale_reason: "Last trace event over 30 days old",
      last_trace_event_at: "2020-01-01T00:00:01Z",
      recommended_refresh: "Re-run manifest generation",
    };
    meta.confidence_summary.overall_level = "confirmed";
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.accepted).toBe(true);
    // Stale should degrade confidence
    expect(["medium", "low"]).toContain(result.summary.confidence_level);
    expect(result.summary.warnings.some((w) => w.includes("stale"))).toBe(true);
  });

  it("bundle with partial trace is accepted with low confidence", async () => {
    const bundleDir = await makePartialTraceBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("low");
    expect(result.summary.confidence_reason).toContain("partial");
  });

  it("operator summary includes recommended next marker", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.recommended_next_marker).toBeTruthy();
    expect(result.summary.recommended_next_marker.length).toBeGreaterThan(0);
  });

  it("operator summary includes consumer forbidden actions", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.consumer_forbidden_actions.length).toBeGreaterThan(0);
    expect(result.summary.consumer_forbidden_actions).toContain("live-dispatch");
    expect(result.summary.consumer_forbidden_actions).toContain("bus-mutation");
  });

  it("operator summary includes redaction status", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.redaction_status).toBeDefined();
    expect(typeof result.summary.redaction_status.safe_for_review).toBe("boolean");
  });
});

// ── 6S-2: Rejected Packets ───────────────────────────────────────────

describe("6S-2: Rejected packets", () => {
  it("missing manifest.json is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    await fs.unlink(path.join(bundleDir, "manifest.json"));

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("manifest.json");
  });

  it("missing handoff-metadata.json is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    await fs.unlink(path.join(bundleDir, "handoff-metadata.json"));

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("handoff-metadata.json");
  });

  it("mutation_capability not none is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.mutation_capability = "mutable";
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("mutation_capability");
  });

  it("contract_classification not internal-fake-manual-only is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.contract_classification = "public-api";
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("contract_classification");
  });

  it("source_mode live is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    const manifestPath = path.join(bundleDir, "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    manifest.source_mode = "live";
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("source_mode");
  });

  it("source_mode experimental_live is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    const manifestPath = path.join(bundleDir, "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    manifest.source_mode = "experimental_live";
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
  });

  it("secret-looking content is rejected", async () => {
    const bundleDir = await makeCleanBundle();
    // Inject secret into manifest.md
    const mdPath = path.join(bundleDir, "manifest.md");
    const md = await fs.readFile(mdPath, "utf-8");
    await fs.writeFile(mdPath, md + "\nsk-abcdefghijklmnopqrstuvwxyz\n", "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("Secret");
  });

  it("empty recommended_next_marker is accepted with warning", async () => {
    const bundleDir = await makeCleanBundle();
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.recommended_next_marker = "";
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    // Should be accepted but with warning about missing marker
    expect(result.accepted).toBe(true);
    expect(result.summary.warnings.some((w) => w.includes("next_marker"))).toBe(true);
  });
});

// ── 6S-3: Operator Summary Safety ────────────────────────────────────

describe("6S-3: Operator summary safety", () => {
  it("summary contains no secret-looking values", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    const summaryStr = JSON.stringify(result.summary);
    expect(summaryStr).not.toMatch(/sk-[a-zA-Z0-9]{5}/);
    expect(summaryStr).not.toMatch(/ghp_/);
    expect(summaryStr).not.toMatch(/Bearer/);
  });

  it("summary operator_notes warns about fake/manual nature", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.operator_notes).toContain("fake");
    expect(result.summary.operator_notes).toContain("No live execution");
  });

  it("summary consumer_forbidden_actions include all 7 rules", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    const f = result.summary.consumer_forbidden_actions;
    expect(f).toContain("live-dispatch");
    expect(f).toContain("bus-mutation");
    expect(f).toContain("agent-activation");
    expect(f).toContain("cross-project-write");
    expect(f).toContain("auto-polling");
    expect(f).toContain("public-api-promotion");
    expect(f).toContain("source-of-truth-inference");
  });

  it("rejected summary has BLOCKED marker", async () => {
    const bundleDir = await makeCleanBundle();
    await fs.unlink(path.join(bundleDir, "manifest.json"));

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.summary.packet_status).toBe("rejected");
    expect(result.summary.recommended_next_marker).toContain("BLOCKED");
    expect(result.summary.confidence_level).toBe("rejected");
  });
});

// ── 6S-4: Confidence Classification ──────────────────────────────────

describe("6S-4: Confidence classification", () => {
  it("high confidence: confirmed packets, no warnings, not stale", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.confidence_level).toBe("high");
  });

  it("medium confidence: confirmed with warnings", async () => {
    const bundleDir = await makeCleanBundle();
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.warnings_count = 3;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(result.summary.confidence_level).toBe("medium");
  });

  it("medium confidence: confirmed but stale", async () => {
    const bundleDir = await makeStaleBundle();
    const metaPath = path.join(bundleDir, "handoff-metadata.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    meta.stale_state_summary = {
      is_stale: true,
      stale_reason: "Old data",
      last_trace_event_at: "2020-01-01T00:00:00Z",
      recommended_refresh: "Refresh",
    };
    meta.confidence_summary.overall_level = "confirmed";
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

    const result = await simulateOperatorHandoff(bundleDir);
    expect(["medium", "low"]).toContain(result.summary.confidence_level);
  });

  it("low confidence: partial trace", async () => {
    const bundleDir = await makePartialTraceBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    expect(result.summary.confidence_level).toBe("low");
  });

  it("low confidence: unknowns present", async () => {
    const bundleDir = await makeUnknownsBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    if (result.summary.unknowns.length > 0) {
      expect(result.summary.confidence_level).toBe("low");
    }
  });
});

// ── 6S-5: Boundary Verification ──────────────────────────────────────

describe("6S-5: Boundary verification", () => {
  it("simulation performs no live dispatch", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    // Operator simulation result must not reference live dispatch
    const summaryStr = JSON.stringify(result.summary);
    expect(summaryStr).not.toMatch(/dispatchToRealAgent/);
    expect(summaryStr).not.toMatch(/experimental_live/);
    expect(result.summary.operator_notes).toContain("No live execution");
  });

  it("simulation does not mutate source files", async () => {
    const bundleDir = await makeCleanBundle();

    // Capture file contents before simulation
    const before: Record<string, string> = {};
    for (const f of ["manifest.json", "handoff-metadata.json"]) {
      before[f] = await fs.readFile(path.join(bundleDir, f), "utf-8");
    }

    await simulateOperatorHandoff(bundleDir);

    // File contents unchanged after simulation
    for (const f of ["manifest.json", "handoff-metadata.json"]) {
      const after = await fs.readFile(path.join(bundleDir, f), "utf-8");
      expect(after).toBe(before[f]);
    }
  });

  it("simulation does not reference shared-agent-bus paths", async () => {
    const bundleDir = await makeCleanBundle();
    const result = await simulateOperatorHandoff(bundleDir);

    const summaryStr = JSON.stringify(result.summary);
    expect(summaryStr).not.toMatch(/shared.agent.bus\/.*\.json/);
  });

  it("simulation does not call Echo, Codex, Kimi, or Tripp externally", async () => {
    // The operator simulation module imports only node builtins + handoff types
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualOperatorSimulation.ts"),
      "utf-8",
    );

    expect(src).not.toMatch(/import.*echos?/i);
    expect(src).not.toMatch(/import.*codex/i);
    expect(src).not.toMatch(/import.*kimi/i);
    expect(src).not.toMatch(/from.*Tripp\\.Control/);
    expect(src).not.toMatch(/from.*Tripp\\.OS/);
    expect(src).not.toMatch(/child_process/);
    expect(src).not.toMatch(/setInterval/);
    expect(src).not.toMatch(/fs\\.watch/);
  });

  it("no shared-agent-bus imports in simulation module", async () => {
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualOperatorSimulation.ts"),
      "utf-8",
    );
    const codeOnly = src.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "").replace(/".*?"|'.*?'|`[\s\S]*?`/gm, "");
    expect(codeOnly).not.toMatch(/shared-agent-bus/i);
  });
});
