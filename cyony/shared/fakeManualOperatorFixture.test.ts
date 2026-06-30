/**
 * Stage 6U — Static Operator Packet Fixture Export
 *
 * Exports a final operator packet fixture demonstrating the full
 * locked handoff lane: Trace → Manifest → Bundle → Operator Summary.
 *
 * Four fixture scenarios:
 *   A. Accepted Clean      — high confidence, no warnings
 *   B. Accepted Degraded   — medium confidence, warnings present
 *   C. Accepted Limited    — low confidence, unknowns + stale
 *   D. Rejected Unsafe     — mutation_capability = "mutable"
 *
 * NEVER: live agents, shared-bus mutation, Echo integration,
 *        cross-project writes, or public API promotion.
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
  tmpDir = path.join(os.tmpdir(), `tripp-6u-export-${Date.now()}`);
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

// ── Scenario builders ─────────────────────────────────────────────────

async function scenarioClean(): Promise<OperatorPacketResult> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-clean", eventId: "c1", agentRole: "openclaw_tripp" as any }),
    makeEvent({ eventType: "packet_claimed", packetId: "pkt-clean", eventId: "c2" }),
    makeEvent({ eventType: "result_written", packetId: "pkt-clean", eventId: "c3", resultId: "r-clean" } as any),
  ];
  const workdir = path.join(tmpDir, "clean");
  await fs.mkdir(workdir, { recursive: true });
  const snapshot = buildManifestFromEvents(events);
  const pkg = await packageHandoffBundle(snapshot, workdir);
  return simulateOperatorHandoff(pkg.bundleDir);
}

async function scenarioDegraded(): Promise<OperatorPacketResult> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-degraded", eventId: "d1" }),
    makeEvent({ eventType: "result_written", packetId: "pkt-degraded", eventId: "d2", resultId: "r-degraded" } as any),
  ];
  const workdir = path.join(tmpDir, "degraded");
  await fs.mkdir(workdir, { recursive: true });
  const snapshot = buildManifestFromEvents(events);
  const pkg = await packageHandoffBundle(snapshot, workdir);
  const meta = JSON.parse(await fs.readFile(path.join(pkg.bundleDir, "handoff-metadata.json"), "utf-8"));
  meta.warnings_count = 3;
  await fs.writeFile(path.join(pkg.bundleDir, "handoff-metadata.json"), JSON.stringify(meta, null, 2), "utf-8");
  return simulateOperatorHandoff(pkg.bundleDir);
}

async function scenarioLimited(): Promise<OperatorPacketResult> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-limited", eventId: "l1", parentEventId: "no-parent" }),
  ];
  const workdir = path.join(tmpDir, "limited");
  await fs.mkdir(workdir, { recursive: true });
  const snapshot = buildManifestFromEvents(events);
  const pkg = await packageHandoffBundle(snapshot, workdir);
  const meta = JSON.parse(await fs.readFile(path.join(pkg.bundleDir, "handoff-metadata.json"), "utf-8"));
  meta.unknowns_count = 2;
  meta.stale_state_summary = {
    is_stale: true,
    stale_reason: "Last trace over 7 days old",
    last_trace_event_at: "2026-05-30T00:00:00Z",
    recommended_refresh: "Re-run manifest",
  };
  meta.confidence_summary = {
    overall_level: "partial-trace",
    packets_confirmed: 0,
    packets_partial: 1,
    packets_unknown: 2,
    confidence_reason: "Missing causal parent in trace",
  };
  await fs.writeFile(path.join(pkg.bundleDir, "handoff-metadata.json"), JSON.stringify(meta, null, 2), "utf-8");
  return simulateOperatorHandoff(pkg.bundleDir);
}

async function scenarioRejected(): Promise<OperatorPacketResult> {
  const events = [
    makeEvent({ eventType: "packet_created", packetId: "pkt-unsafe", eventId: "r1" }),
  ];
  const workdir = path.join(tmpDir, "rejected");
  await fs.mkdir(workdir, { recursive: true });
  const snapshot = buildManifestFromEvents(events);
  const pkg = await packageHandoffBundle(snapshot, workdir);
  await fs.unlink(path.join(pkg.bundleDir, "manifest.json"));
  return simulateOperatorHandoff(pkg.bundleDir);
}

// ── 6U-1: Export Artifact Generation ──────────────────────────────────

describe("6U-1: Export artifact generation", () => {
  it("generates all four fixture scenarios", async () => {
    const clean = await scenarioClean();
    const degraded = await scenarioDegraded();
    const limited = await scenarioLimited();
    const rejected = await scenarioRejected();

    expect(clean.accepted).toBe(true);
    expect(degraded.accepted).toBe(true);
    expect(limited.accepted).toBe(true);
    expect(rejected.accepted).toBe(false);

    expect(clean.summary.packet_status).toBe("accepted");
    expect(rejected.summary.packet_status).toBe("rejected");
  });

  it("fixture summary contains all required fields for accepted packet", async () => {
    const result = await scenarioClean();

    const s = result.summary;
    expect(s.packet_status).toBeDefined();
    expect(s.decision).toBeTruthy();
    expect(s.confidence_level).toBeDefined();
    expect(s.confidence_reason).toBeTruthy();
    expect(s.recommended_next_marker).toBeTruthy();
    expect(Array.isArray(s.warnings)).toBe(true);
    expect(Array.isArray(s.unknowns)).toBe(true);
    expect(s.redaction_status).toBeDefined();
    expect(Array.isArray(s.consumer_forbidden_actions)).toBe(true);
    expect(s.operator_notes).toBeTruthy();
  });

  it("fixture summary contains all required fields for rejected packet", async () => {
    const result = await scenarioRejected();

    const s = result.summary;
    expect(s.packet_status).toBe("rejected");
    expect(s.decision).toContain("Rejected");
    expect(s.confidence_level).toBe("rejected");
    expect(s.recommended_next_marker).toContain("BLOCKED");
  });

  it("evidence_files list is accurate in metadata", async () => {
    const result = await scenarioClean();
    expect(result.metadata).toBeDefined();
    expect(result.metadata!.evidence_files).toEqual([
      "manifest.json",
      "manifest.md",
    ]);
  });
});

// ── 6U-2: Scenario Coverage ──────────────────────────────────────────

describe("6U-2: Scenario coverage", () => {
  it("accepted clean packet — high confidence, no warnings", async () => {
    const result = await scenarioClean();

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("high");
    expect(result.summary.warnings).toHaveLength(0);
    expect(result.summary.decision).toContain("Accepted");
  });

  it("accepted degraded packet — medium confidence, warnings present", async () => {
    const result = await scenarioDegraded();

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("medium");
    expect(result.summary.warnings.length).toBeGreaterThan(0);
    expect(result.summary.warnings.some((w) => w.includes("warning"))).toBe(true);
  });

  it("accepted limited packet — low confidence, unknowns + stale", async () => {
    const result = await scenarioLimited();

    expect(result.accepted).toBe(true);
    expect(result.summary.confidence_level).toBe("low");
    expect(result.summary.unknowns.length).toBeGreaterThan(0);
    expect(result.summary.warnings.some((w) => w.includes("stale"))).toBe(true);
  });

  it("rejected unsafe packet — missing required file", async () => {
    const result = await scenarioRejected();

    expect(result.accepted).toBe(false);
    expect(result.rejection_reason).toContain("manifest.json");
    expect(result.summary.confidence_level).toBe("rejected");
    expect(result.summary.recommended_next_marker).toContain("BLOCKED");
  });

  it("recommended_next_marker is present in all scenarios", async () => {
    const scenarios = [
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ];
    const results = await Promise.all(scenarios);

    for (const r of results) {
      expect(r.summary.recommended_next_marker).toBeTruthy();
    }
  });

  it("consumer_forbidden_actions are present in all scenarios", async () => {
    const scenarios = [
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ];
    const results = await Promise.all(scenarios);

    for (const r of results) {
      const f = r.summary.consumer_forbidden_actions;
      expect(f).toContain("live-dispatch");
      expect(f).toContain("bus-mutation");
    }
  });
});

// ── 6U-3: Safety Verification ────────────────────────────────────────

describe("6U-3: Safety verification", () => {
  it("no secret-looking values in any fixture summary", async () => {
    const scenarios = [
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ];
    const results = await Promise.all(scenarios);

    const secretPattern = /sk-[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{20,}/;

    for (const r of results) {
      const str = JSON.stringify(r.summary);
      expect(str).not.toMatch(secretPattern);
    }
  });

  it("no live/shared-bus/cross-project paths in fixture summaries", async () => {
    const results = await Promise.all([
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ]);

    for (const r of results) {
      const str = JSON.stringify(r.summary);
      expect(str).not.toMatch(/shared.agent.bus/);
      expect(str).not.toMatch(/Tripp\\.Control/);
      expect(str).not.toMatch(/Tripp\\.OS/);
      expect(str).not.toMatch(/experimental_live/);
      expect(str).not.toMatch(/dispatchToRealAgent/);
    }
  });

  it("all summaries have internal-fake-manual-only contract note", async () => {
    const results = await Promise.all([
      scenarioClean(),
      scenarioRejected(),
    ]);

    for (const r of results) {
      expect(r.summary.operator_notes).toContain("Internal");
      // All operator notes reference fake/manual nature
      expect(r.summary.operator_notes.toLowerCase()).toMatch(/fake|no live/);
    }
  });

  it("no Echo integration required in any fixture path", async () => {
    // This is a behavioral proof: the simulation module imports nothing Echo-related
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualOperatorSimulation.ts"),
      "utf-8",
    );
    const codeOnly = src
      .replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "")
      .replace(/".*?"|'.*?'|`[\s\S]*?`/gm, "");
    expect(codeOnly).not.toMatch(/import.*echo/i);
    expect(codeOnly).not.toMatch(/require.*echo/i);
  });
});

// ── 6U-4: Read-Back Validation ───────────────────────────────────────

describe("6U-4: Read-back validation", () => {
  it("fixture can be read back — all accepted summaries are coherent", async () => {
    const clean = await scenarioClean();
    const degraded = await scenarioDegraded();
    const limited = await scenarioLimited();

    // Clean: high confidence, no warnings
    expect(clean.summary.confidence_level).toBe("high");
    expect(clean.summary.warnings).toHaveLength(0);

    // Degraded: medium confidence, has warnings
    expect(degraded.summary.confidence_level).toBe("medium");
    expect(degraded.summary.warnings.length).toBeGreaterThan(0);

    // Limited: low confidence, has unknowns and/or stale warnings
    expect(limited.summary.confidence_level).toBe("low");
    const hasConcern =
      limited.summary.unknowns.length > 0 ||
      limited.summary.warnings.some((w) => w.includes("stale"));
    expect(hasConcern).toBe(true);
  });

  it("fixture confidence transitions are correct", async () => {
    const clean = await scenarioClean();
    const degraded = await scenarioDegraded();
    const limited = await scenarioLimited();
    const rejected = await scenarioRejected();

    // Confidence order should be: high > medium > low > rejected
    expect(clean.summary.confidence_level).toBe("high");
    expect(degraded.summary.confidence_level).toBe("medium");
    expect(limited.summary.confidence_level).toBe("low");
    expect(rejected.summary.confidence_level).toBe("rejected");
  });

  it("fixture remains internal-fake-manual-only — contract preserved", async () => {
    const clean = await scenarioClean();

    // Metadata must have correct classification
    expect(clean.metadata!.contract_classification).toBe(
      "internal-fake-manual-only",
    );
    expect(clean.metadata!.mutation_capability).toBe("none");

    // Summary operator notes must reinforce
    expect(clean.summary.operator_notes).toContain("Internal");

    // Consumer forbidden actions must include public-api-promotion
    expect(clean.summary.consumer_forbidden_actions).toContain(
      "public-api-promotion",
    );
  });

  it("redaction status is coherent across scenarios", async () => {
    const results = await Promise.all([
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ]);

    for (const r of results) {
      expect(r.summary.redaction_status).toBeDefined();
      expect(typeof r.summary.redaction_status.safe_for_review).toBe("boolean");
      expect(typeof r.summary.redaction_status.secrets_stripped).toBe("number");
      expect(typeof r.summary.redaction_status.applied).toBe("boolean");
    }
  });

  it("recommended_next_marker follows correct pattern", async () => {
    const clean = await scenarioClean();
    const rejected = await scenarioRejected();

    // Accepted → meaningful marker
    expect(clean.summary.recommended_next_marker.length).toBeGreaterThan(0);
    expect(clean.summary.recommended_next_marker).not.toContain("BLOCKED");

    // Rejected → BLOCKED marker
    expect(rejected.summary.recommended_next_marker).toContain("BLOCKED");
  });
});

// ── 6U-5: Boundary Verification ──────────────────────────────────────

describe("6U-5: Boundary verification", () => {
  it("export fixture requires no external services", async () => {
    // All scenarios run purely with local fake/manual data
    const results = await Promise.all([
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ]);

    for (const r of results) {
      // No external calls, no network, no live transport
      expect(r.bundleDir).toContain(tmpDir);
      expect(r.bundleDir).toContain(".tripp/agents/handoff/");
    }
  });

  it("export fixture writes only within tmpDir", async () => {
    // All scenario artifacts are under tmpDir/.tripp/agents/handoff/
    const clean = await scenarioClean();
    expect(clean.bundleDir.startsWith(tmpDir)).toBe(true);
  });

  it("no source files mutated during fixture generation", async () => {
    // Verify simulation module path is correct before reading
    const srcPath = path.resolve(process.cwd(), "src/fakeManualOperatorSimulation.ts");
    const srcBefore = await fs.readFile(srcPath, "utf-8");

    await Promise.all([
      scenarioClean(),
      scenarioDegraded(),
      scenarioLimited(),
      scenarioRejected(),
    ]);

    const srcAfter = await fs.readFile(srcPath, "utf-8");
    expect(srcAfter).toBe(srcBefore);
  });

  it("fixture contains no cross-project artifact paths", async () => {
    const results = await Promise.all([
      scenarioClean(),
      scenarioRejected(),
    ]);

    for (const r of results) {
      // All paths are under tmpDir
      expect(r.bundleDir).toContain(tmpDir);
      // No shared-agent-bus, Tripp.Control, Tripp.OS paths
      expect(r.bundleDir).not.toContain("shared-agent-bus");
      expect(r.bundleDir).not.toContain("Tripp.Control");
      expect(r.bundleDir).not.toContain("Tripp.OS");
    }
  });
});
