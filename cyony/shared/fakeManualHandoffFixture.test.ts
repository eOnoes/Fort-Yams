/**
 * Stage 6Q — Static Operator Export Fixture Tests
 *
 * Generates a comprehensive handoff bundle from representative
 * fake/manual trace events and proves the full export pipeline:
 * Trace → Manifest → Handoff Bundle → Operator Inspection.
 *
 * Fixture scenarios:
 *   - Packet A: Success (complete lifecycle)
 *   - Packet B: Denied/Rejected
 *   - Packet C: Task Timeout
 *   - Packet D: Partial Trace (missing causal event)
 *   - Packet E: Duplicate EventId
 *   - Packet F: Unknown Event Type
 *   - Packet G: Redaction Evidence (secrets + long prompt)
 *   - Packet H: Tool Timeout
 *   - Packet I: Empty Trace
 *
 * Tests:
 *   6Q-1: Export generation
 *   6Q-2: File integrity
 *   6Q-3: JSON validity
 *   6Q-4: Content safety
 *   6Q-5: Boundary verification
 *   6Q-6: Read-back validation
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  packageHandoffBundle,
  type HandoffMetadata,
} from "../fakeManualHandoffBundle.js";
import { buildManifestFromEvents } from "../fakeManualManifest.js";
import type { AgentBusTraceEvent } from "@tripp-reason/external-agents";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `tripp-6q-fixture-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Helpers ───────────────────────────────────────────────────────────

function makeEvent(
  overrides: Partial<AgentBusTraceEvent> & {
    eventType: any;
    packetId: string;
  },
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

function buildFixtureSnapshot() {
  // --- Packet A: Success (complete lifecycle) ---
  const pidA = "pkt-6q-success";
  const eA1 = makeEvent({
    eventType: "packet_created",
    packetId: pidA,
    createdAt: "2026-06-06T10:00:01Z",
    eventId: "6qa-created",
    agentRole: "openclaw_tripp" as any,
  });
  const eA2 = makeEvent({
    eventType: "approvalgate_required",
    packetId: pidA,
    createdAt: "2026-06-06T10:00:02Z",
    eventId: "6qa-gate",
    runId: "run-6qa",
  });
  const eA3 = makeEvent({
    eventType: "packet_claimed",
    packetId: pidA,
    createdAt: "2026-06-06T10:00:03Z",
    eventId: "6qa-claimed",
  });
  const eA4 = makeEvent({
    eventType: "mutation_applied",
    packetId: pidA,
    createdAt: "2026-06-06T10:00:04Z",
    eventId: "6qa-mutation",
  });
  const eA5 = makeEvent({
    eventType: "result_written",
    packetId: pidA,
    createdAt: "2026-06-06T10:00:05Z",
    eventId: "6qa-result",
    resultId: "r-6qa-success",
  });

  // --- Packet B: Denied/Rejected ---
  const pidB = "pkt-6q-denied";
  const eB1 = makeEvent({
    eventType: "packet_created",
    packetId: pidB,
    createdAt: "2026-06-06T10:00:06Z",
    eventId: "6qb-created",
    agentRole: "hermes_cyony" as any,
  });
  const eB2 = makeEvent({
    eventType: "approvalgate_required",
    packetId: pidB,
    createdAt: "2026-06-06T10:00:07Z",
    eventId: "6qb-gate",
    runId: "run-6qb",
  });
  const eB3 = makeEvent({
    eventType: "human_decision_recorded",
    packetId: pidB,
    createdAt: "2026-06-06T10:00:08Z",
    eventId: "6qb-deny",
    runId: "run-6qb",
    summary: "Denied by operator: scope too broad",
  });

  // --- Packet C: Task Timeout ---
  const pidC = "pkt-6q-timeout";
  const eC1 = makeEvent({
    eventType: "packet_created",
    packetId: pidC,
    createdAt: "2026-06-06T10:00:09Z",
    eventId: "6qc-created",
    agentRole: "openclaw_echo" as any,
  });
  const eC2 = makeEvent({
    eventType: "subagent_spawned",
    packetId: pidC,
    createdAt: "2026-06-06T10:00:10Z",
    eventId: "6qc-spawned",
    subagentId: "sub-6qc",
  });
  const eC3 = makeEvent({
    eventType: "task_timeout",
    packetId: pidC,
    createdAt: "2026-06-06T10:05:10Z",
    eventId: "6qc-timeout",
    subagentId: "sub-6qc",
    details: { timeoutMs: 300000 },
  });

  // --- Packet D: Partial Trace (missing causal event) ---
  const pidD = "pkt-6q-partial";
  const eD1 = makeEvent({
    eventType: "packet_created",
    packetId: pidD,
    createdAt: "2026-06-06T10:00:11Z",
    eventId: "6qd-created",
    parentEventId: "non-existent-parent-6q",
  });

  // --- Packet E: Duplicate EventId ---
  const pidE = "pkt-6q-duplicate";
  const dupId = "dup-event-6q";
  const eE1 = makeEvent({
    eventType: "packet_created",
    packetId: pidE,
    createdAt: "2026-06-06T10:00:12Z",
    eventId: dupId,
    summary: "First occurrence",
  });
  const eE2 = makeEvent({
    eventType: "result_written",
    packetId: pidE,
    createdAt: "2026-06-06T10:00:13Z",
    eventId: dupId,
    summary: "Duplicate eventId",
  });

  // --- Packet F: Unknown Event Type ---
  const pidF = "pkt-6q-unknown";
  const eF1 = makeEvent({
    eventType: "packet_created" as any,
    packetId: pidF,
    createdAt: "2026-06-06T10:00:14Z",
    eventId: "6qf-created",
  });
  const eF2 = makeEvent({
    eventType: "some_unknown_event_type" as any,
    packetId: pidF,
    createdAt: "2026-06-06T10:00:15Z",
    eventId: "6qf-unknown",
  });

  // --- Packet G: Redaction Evidence ---
  const pidG = "pkt-6q-redacted";
  const eG1 = makeEvent({
    eventType: "packet_created",
    packetId: pidG,
    createdAt: "2026-06-06T10:00:16Z",
    eventId: "6qg-created",
    details: {
      apiKey: "sk-proj-abcdefghijklmnopqrstuvwx",
      token: "ghp_1234567890abcdef1234567890abcdef12",
      safeMetadata: "public-info",
      longPrompt: "x".repeat(600),
    },
  });

  // --- Packet H: Tool Timeout ---
  const pidH = "pkt-6q-tool-timeout";
  const eH1 = makeEvent({
    eventType: "packet_created",
    packetId: pidH,
    createdAt: "2026-06-06T10:00:17Z",
    eventId: "6qh-created",
  });
  const eH2 = makeEvent({
    eventType: "tool_timeout" as any,
    packetId: pidH,
    createdAt: "2026-06-06T10:00:18Z",
    eventId: "6qh-timeout",
    toolNames: ["shell"],
  });

  // --- Packet I: Empty trace (edge case, tested separately) ---
  // (handled by the empty-manifest test below)

  const allEvents = [
    eA1, eA2, eA3, eA4, eA5,
    eB1, eB2, eB3,
    eC1, eC2, eC3,
    eD1,
    eE1, eE2,
    eF1, eF2,
    eG1,
    eH1, eH2,
  ];

  return buildManifestFromEvents(allEvents);
}

// ── 6Q-1: Export Generation ────────────────────────────────────────

describe("6Q-1: Export generation", () => {
  it("generates handoff bundle from comprehensive fixture manifest", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // Bundle directory exists and has correct structure
    expect(result.bundleDir).toContain(".tripp/agents/handoff/handoff-bundle-");
    expect(result.files).toHaveLength(5);

    // All 5 files exist on disk
    for (const f of result.files) {
      await expect(fs.access(f)).resolves.toBeUndefined();
    }

    // File names
    const names = result.files.map((f) => path.basename(f)).sort();
    expect(names).toEqual([
      "README-OPERATOR-HANDOFF.md",
      "handoff-metadata.json",
      "handoff-summary.md",
      "manifest.json",
      "manifest.md",
    ]);
  });

  it("generates handoff bundle from empty manifest", async () => {
    const snapshot = buildManifestFromEvents([]);
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.files).toHaveLength(5);
    expect(result.metadata.confidence_summary.packets_confirmed).toBe(0);
    expect(result.metadata.warnings_count).toBe(0);
    expect(result.metadata.unknowns_count).toBe(0);
  });

  it("bundle output path is under .tripp/agents/handoff/", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.bundleDir).toContain(path.join(".tripp", "agents", "handoff"));
    // All output files are within bundleDir
    for (const f of result.files) {
      expect(f.startsWith(result.bundleDir)).toBe(true);
    }
  });

  it("export fixture covers success, denied, timeout, partial, duplicate, unknown, and redacted packets", async () => {
    const snapshot = buildFixtureSnapshot();

    // Verify all required scenarios are present in the manifest
    const states = snapshot.packets.map((p) => p.lifecycle_state);
    expect(states).toContain("completed");
    expect(states).toContain("denied");
    expect(states).toContain("timeout");
    expect(states).toContain("pending"); // partial + unknown

    const confidenceLevels = snapshot.packets.map((p) => p.confidence_level);
    expect(confidenceLevels).toContain("confirmed");
    expect(confidenceLevels).toContain("partial-trace");

    // Redaction evidence
    expect(snapshot.redaction_summary.secrets_stripped).toBeGreaterThanOrEqual(2);
    expect(snapshot.redaction_summary.prompts_truncated).toBeGreaterThanOrEqual(1);

    // Duplicate handled
    expect(snapshot.validation_summary.duplicate_event_ids).toBeGreaterThanOrEqual(1);

    // Timeout states
    const timeoutPackets = snapshot.packets.filter((p) => p.timeout_state === "timed_out");
    expect(timeoutPackets.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 6Q-2: File Integrity ───────────────────────────────────────────

describe("6Q-2: File integrity", () => {
  it("manifest.json contains the full snapshot with all packets", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const raw = await fs.readFile(jsonFile, "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.manifest_version).toBe("1.0.0");
    expect(parsed.mutation_capability).toBe("none");
    expect(parsed.source_mode).toBe("fake");
    expect(parsed.sync_mode).toBe("static_snapshot");
    expect(parsed.packet_count).toBe(snapshot.packet_count);
    expect(parsed.packets).toHaveLength(snapshot.packets.length);
    expect(parsed.redaction_summary).toBeDefined();
    expect(parsed.validation_summary).toBeDefined();
    expect(parsed.confidence_level).toBeDefined();
  });

  it("manifest.md is a human-readable markdown with safety warnings", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const mdFile = result.files.find((f) => f.endsWith("manifest.md"))!;
    const md = await fs.readFile(mdFile, "utf-8");

    // Safety markers
    expect(md).toMatch(/FAKE.MANUAL|FAKE\/MANUAL/);
    expect(md).toContain("Do not use for authorization");
    expect(md).toContain("ApprovalGate remains authoritative");

    // Contains packet IDs
    expect(md).toContain("pkt-6q-success");
    expect(md).toContain("pkt-6q-denied");
    expect(md).toContain("pkt-6q-timeout");
    expect(md).toContain("pkt-6q-redacted");

    // Redaction section
    expect(md).toContain("Redaction");
    expect(md).toContain("Secrets stripped");
    expect(md).toContain("Prompts truncated");
  });

  it("handoff-summary.md is operator-facing and safe", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const summaryFile = result.files.find((f) =>
      f.endsWith("handoff-summary.md"),
    )!;
    const summary = await fs.readFile(summaryFile, "utf-8");

    expect(summary).toContain("Handoff");
    expect(summary).toContain("NOT a live runtime state report");
    expect(summary).toContain("NOT a source of truth for authorization");
    expect(summary).toContain("Packets:");
    expect(summary).toContain("Completed:");
    expect(summary).toContain("Denied:");
    expect(summary).toContain("Timeout:");

    // No raw secrets in summary
    expect(summary).not.toMatch(/sk-[a-zA-Z0-9]{5}/);
    expect(summary).not.toMatch(/ghp_/);
    expect(summary).not.toMatch(/Bearer/);
  });

  it("handoff-metadata.json is valid and complete", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const metaFile = result.files.find((f) =>
      f.endsWith("handoff-metadata.json"),
    )!;
    const meta: HandoffMetadata = JSON.parse(
      await fs.readFile(metaFile, "utf-8"),
    );

    // Required fields
    expect(meta.handoff_version).toBe("1.0.0");
    expect(meta.contract_classification).toBe("internal-fake-manual-only");
    expect(meta.mutation_capability).toBe("none");
    expect(meta.producer_project).toBe("Tripp.Reason");

    // Consumer rules
    expect(meta.consumer_permissions).toContain("read");
    expect(meta.consumer_permissions).toContain("static-transfer");
    expect(meta.consumer_forbidden_actions).toContain("live-dispatch");
    expect(meta.consumer_forbidden_actions).toContain("bus-mutation");
    expect(meta.consumer_forbidden_actions).toContain("agent-activation");

    // Safety
    expect(meta.redaction_status.safe_for_operator_review).toBe(true);
    expect(meta.redaction_status.redaction_applied).toBe(true);
    expect(meta.redaction_status.secrets_stripped).toBeGreaterThanOrEqual(1);

    // Confidence
    expect(meta.confidence_summary.packets_confirmed).toBeGreaterThanOrEqual(1);
    expect(meta.confidence_summary.packets_partial).toBeGreaterThanOrEqual(1);

    // Navigation
    expect(meta.evidence_files).toEqual(["manifest.json", "manifest.md"]);
    expect(meta.recommended_next_marker).toBeTruthy();
  });

  it("README-OPERATOR-HANDOFF.md contains consumer boundaries", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const readmeFile = result.files.find((f) => f.includes("README"))!;
    const readme = await fs.readFile(readmeFile, "utf-8");

    // Operator instructions
    expect(readme).toContain("Operator Handoff");
    expect(readme).toContain("What This Bundle Contains");
    expect(readme).toContain("What You May Do");
    expect(readme).toContain("What You Must NOT Do");

    // Internal contract
    expect(readme).toContain("internal-fake-manual-only");

    // Consumer boundaries
    expect(readme).toContain("Share with Echo as operator-provided evidence");

    // Forbidden actions
    expect(readme).toContain("Mutate shared-agent-bus");
    expect(readme).toContain("Activate live agents");
    expect(readme).toContain("Tripp.Control");
    expect(readme).toContain("Tripp.OS");
    expect(readme).toContain("Auto-poll");

    // Safety footer
    expect(readme).toMatch(/FAKE.MANUAL|FAKE\/MANUAL/);
    expect(readme).toContain("NO LIVE EXECUTION OCCURRED");
  });
});

// ── 6Q-3: JSON Validity ────────────────────────────────────────────

describe("6Q-3: JSON validity", () => {
  it("handoff-metadata.json is valid JSON with correct types", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const metaFile = result.files.find((f) =>
      f.endsWith("handoff-metadata.json"),
    )!;
    const meta: HandoffMetadata = JSON.parse(
      await fs.readFile(metaFile, "utf-8"),
    );

    expect(typeof meta.handoff_version).toBe("string");
    expect(typeof meta.generated_at).toBe("string");
    expect(typeof meta.producer).toBe("string");
    expect(typeof meta.producer_project).toBe("string");
    expect(typeof meta.contract_classification).toBe("string");
    expect(typeof meta.mutation_capability).toBe("string");
    expect(typeof meta.source_manifest_path).toBe("string");
    expect(Array.isArray(meta.consumer_permissions)).toBe(true);
    expect(Array.isArray(meta.consumer_forbidden_actions)).toBe(true);
    expect(typeof meta.redaction_status).toBe("object");
    expect(typeof meta.confidence_summary).toBe("object");
    expect(typeof meta.stale_state_summary).toBe("object");
    expect(typeof meta.warnings_count).toBe("number");
    expect(typeof meta.unknowns_count).toBe("number");
    expect(typeof meta.recommended_next_marker).toBe("string");
    expect(Array.isArray(meta.evidence_files)).toBe(true);
    expect(typeof meta.notes).toBe("string");
  });

  it("manifest.json is valid JSON with correct shape", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const parsed = JSON.parse(await fs.readFile(jsonFile, "utf-8"));

    expect(parsed.manifest_version).toBe("1.0.0");
    expect(Array.isArray(parsed.packets)).toBe(true);
    expect(typeof parsed.packet_count).toBe("number");
    expect(Array.isArray(parsed.warnings)).toBe(true);
    expect(Array.isArray(parsed.unknowns)).toBe(true);
    expect(typeof parsed.redaction_summary).toBe("object");
    expect(typeof parsed.validation_summary).toBe("object");
    expect(typeof parsed.confidence_level).toBe("string");
  });
});

// ── 6Q-4: Content Safety ───────────────────────────────────────────

describe("6Q-4: Content safety", () => {
  it("no secret-looking values in any bundle file", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const secretPattern = /sk-[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{20,}/;

    for (const f of result.files) {
      const content = await fs.readFile(f, "utf-8");
      expect(content).not.toMatch(secretPattern);
    }
  });

  it("redaction evidence exists in manifest.json", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const parsed = JSON.parse(await fs.readFile(jsonFile, "utf-8"));

    // Redaction summary
    expect(parsed.redaction_summary.secrets_stripped).toBeGreaterThanOrEqual(2);
    expect(parsed.redaction_summary.redaction_rules_applied).toBeDefined();

    // Packet G has redacted fields
    const pktG = parsed.packets.find(
      (p: any) => p.packet_id === "pkt-6q-redacted",
    );
    expect(pktG).toBeDefined();
    expect(pktG.safe_metadata.apiKey).toBe("[REDACTED]");
    expect(pktG.safe_metadata.token).toBe("[REDACTED]");
    expect(pktG.redaction_applied).toContain("apiKey");
    expect(pktG.redaction_applied).toContain("token");
  });

  it("all markdown files contain fake/manual disclaimers", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const mdFiles = result.files.filter((f) => f.endsWith(".md"));
    for (const f of mdFiles) {
      const content = await fs.readFile(f, "utf-8");
      expect(content).toMatch(/FAKE.MANUAL|FAKE\/MANUAL|fake.manual/i);
    }
  });

  it("mutation_capability is none in all output files", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // In metadata
    expect(result.metadata.mutation_capability).toBe("none");

    // In manifest.json
    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const parsed = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
    expect(parsed.mutation_capability).toBe("none");

    // In all markdown files
    for (const f of result.files.filter((x) => x.endsWith(".md"))) {
      const content = await fs.readFile(f, "utf-8");
      const hasMutationRef =
        content.includes("mutation_capability") ||
        content.includes("Mutation capability") ||
        content.includes("none");
      expect(hasMutationRef).toBe(true);
    }
  });

  it("contract_classification is internal-fake-manual-only everywhere", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.metadata.contract_classification).toBe(
      "internal-fake-manual-only",
    );

    const readmeFile = result.files.find((f) => f.includes("README"))!;
    const readme = await fs.readFile(readmeFile, "utf-8");
    expect(readme).toContain("internal-fake-manual-only");

    const summaryFile = result.files.find((f) =>
      f.endsWith("handoff-summary.md"),
    )!;
    const summary = await fs.readFile(summaryFile, "utf-8");
    expect(summary).toContain("internal to Tripp.Reason");
  });
});

// ── 6Q-5: Boundary Verification ────────────────────────────────────

describe("6Q-5: Boundary verification", () => {
  it("export fixture does not imply live source_mode", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // Metadata
    expect(result.metadata.mutation_capability).toBe("none");

    // manifest.json
    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const parsed = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
    expect(parsed.source_mode).toBe("fake");
    expect(parsed.source_mode).not.toBe("live");
    expect(parsed.source_mode).not.toBe("experimental_live");

    // No live agent references in any output
    for (const f of result.files) {
      const content = await fs.readFile(f, "utf-8");
      // Must NOT contain live dispatch references
      expect(content).not.toMatch(/dispatchToRealAgent/);
      expect(content).not.toMatch(/experimental_live/);
    }
  });

  it("no Echo integration is required to consume the bundle", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // Echo is only referenced as a passive consumer in README
    const readmeFile = result.files.find((f) => f.includes("README"))!;
    const readme = await fs.readFile(readmeFile, "utf-8");

    // Echo mentioned only as "share with", not as an import or SDK dependency
    expect(readme).toContain("Echo");
    // "Share with Echo" is documentation, not integration
    const codeOnly = readme.replace(
      /#.*$|What You May Do[\s\S]*?What You Must NOT Do/gm,
      "",
    );
    expect(codeOnly).not.toMatch(/import.*echo/i);
    expect(codeOnly).not.toMatch(/require.*echo/i);
    expect(codeOnly).not.toMatch(/echos?\.(connect|dispatch|send|subscribe)/i);
  });

  it("no shared-agent-bus path is used in output", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    for (const f of result.files) {
      const content = await fs.readFile(f, "utf-8");
      // shared-agent-bus only appears in forbidden-actions documentation
      // Strip markdown comments/doc sections and check remaining code
      const nonDoc = content.replace(/#+\s.*$/gm, "");
      expect(nonDoc).not.toMatch(/shared.agent.bus\/.*\.json/);
    }
  });

  it("output path is bounded — all files within tmpDir", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const resolvedBase = path.resolve(tmpDir);
    for (const f of result.files) {
      expect(path.resolve(f).startsWith(resolvedBase)).toBe(true);
    }
  });

  it("export fixture is reproducible — same input → identical bundle structure", async () => {
    const snapshot = buildFixtureSnapshot();
    const result1 = await packageHandoffBundle(snapshot, tmpDir);

    // Second call with same snapshot produces same file count and names
    const result2 = await packageHandoffBundle(snapshot, tmpDir);
    expect(result2.files).toHaveLength(result1.files.length);

    const names1 = result1.files.map((f) => path.basename(f)).sort();
    const names2 = result2.files.map((f) => path.basename(f)).sort();
    expect(names2).toEqual(names1);
  });
});

// ── 6Q-6: Read-Back Validation ─────────────────────────────────────

describe("6Q-6: Read-back validation", () => {
  it("handoff bundle can be read back and all files validated", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // Read and validate every file
    for (const f of result.files) {
      const stat = await fs.stat(f);
      expect(stat.size).toBeGreaterThan(0);

      const content = await fs.readFile(f, "utf-8");

      if (f.endsWith(".json")) {
        // Valid JSON
        expect(() => JSON.parse(content)).not.toThrow();
      }

      if (f.endsWith(".md")) {
        // Non-empty markdown
        expect(content.length).toBeGreaterThan(50);
        expect(content.trim()).toBeTruthy();
      }
    }
  });

  it("metadata confidence summary matches manifest content", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const meta = result.metadata;
    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const manifest = JSON.parse(await fs.readFile(jsonFile, "utf-8"));

    // Packet counts should match
    expect(manifest.packet_count).toBe(meta.confidence_summary.packets_confirmed
      + meta.confidence_summary.packets_partial
      + meta.confidence_summary.packets_unknown);
  });

  it("recommended next marker is present and non-empty", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.metadata.recommended_next_marker).toBeTruthy();
    expect(result.metadata.recommended_next_marker.length).toBeGreaterThan(0);

    // Also in handoff-summary
    const summaryFile = result.files.find((f) =>
      f.endsWith("handoff-summary.md"),
    )!;
    const summary = await fs.readFile(summaryFile, "utf-8");
    expect(summary).toContain(result.metadata.recommended_next_marker);
  });

  it("stale state summary is coherent", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    const sss = result.metadata.stale_state_summary;
    expect(typeof sss.is_stale).toBe("boolean");
    expect(typeof sss.recommended_refresh).toBe("string");
    expect(sss.recommended_refresh.length).toBeGreaterThan(0);

    // With packets present, last_trace_event_at should be set
    const jsonFile = result.files.find((f) => f.endsWith("manifest.json"))!;
    const manifest = JSON.parse(await fs.readFile(jsonFile, "utf-8"));
    if (manifest.packet_count > 0) {
      expect(sss.last_trace_event_at).toBeTruthy();
    }
  });

  it("evidence_files lists exactly manifest.json and manifest.md", async () => {
    const snapshot = buildFixtureSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.metadata.evidence_files).toEqual([
      "manifest.json",
      "manifest.md",
    ]);
  });
});
