/**
 * Stage 6O — Static Operator Handoff Bundle Tests
 *
 * 6O-1: Generator tests
 * 6O-2: Schema/metadata tests
 * 6O-3: Safety tests
 * 6O-4: Invalid bundle tests
 * 6O-5: Boundary tests
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
  tmpDir = path.join(os.tmpdir(), `tripp-6o-handoff-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeEvent(opts: { eventType: any; packetId: string; createdAt?: string; eventId?: string }): AgentBusTraceEvent {
  return {
    schemaVersion: "1.0.0",
    eventId: opts.eventId ?? randomUUID(),
    eventType: opts.eventType,
    severity: "info",
    createdAt: opts.createdAt ?? new Date().toISOString(),
    actorType: "system",
    packetId: opts.packetId,
    summary: `Event: ${opts.eventType}`,
  } as AgentBusTraceEvent;
}

function makeSnapshot(overrides?: Partial<any>): any {
  const base = buildManifestFromEvents([
    makeEvent({ eventType: "packet_created", packetId: "pkt-1", eventId: "e1" }),
    makeEvent({ eventType: "result_written", packetId: "pkt-1", eventId: "e2", } as any),
  ]);
  if (overrides) return { ...base, ...overrides };
  return base;
}

// ── 6O-1: Generator Tests ─────────────────────────────────────────

describe("6O-1: Generator tests", () => {
  it("creates all five bundle files", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    expect(result.files).toHaveLength(5);
    const names = result.files.map((f) => path.basename(f)).sort();
    expect(names).toContain("manifest.json");
    expect(names).toContain("manifest.md");
    expect(names).toContain("handoff-summary.md");
    expect(names).toContain("handoff-metadata.json");
    expect(names).toContain("README-OPERATOR-HANDOFF.md");
  });

  it("bundle directory is under .tripp/agents/handoff/", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.bundleDir).toContain(".tripp/agents/handoff/handoff-bundle-");
  });

  it("manifest.json contains the full snapshot", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const raw = await fs.readFile(result.files[0], "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.manifest_version).toBe("1.0.0");
    expect(parsed.packet_count).toBe(1);
    expect(parsed.mutation_capability).toBe("none");
  });

  it("manifest.md contains markdown with safety warnings", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const mdFile = result.files.find((f) => f.endsWith("manifest.md"))!;
    const md = await fs.readFile(mdFile, "utf-8");
    expect(md).toContain("FAKE/MANUAL");
    expect(md).toContain("Do not use for authorization");
    expect(md).toContain("ApprovalGate remains authoritative");
  });

  it("handoff-summary.md contains operator-friendly overview", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const summaryFile = result.files.find((f) => f.endsWith("handoff-summary.md"))!;
    const summary = await fs.readFile(summaryFile, "utf-8");
    expect(summary).toContain("Handoff");
    expect(summary).toContain("NOT a live runtime state report");
    expect(summary).toContain("Packets:");
  });

  it("handoff-metadata.json contains all 17 required fields", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const metaFile = result.files.find((f) => f.endsWith("handoff-metadata.json"))!;
    const meta: HandoffMetadata = JSON.parse(await fs.readFile(metaFile, "utf-8"));

    expect(meta.handoff_version).toBe("1.0.0");
    expect(meta.generated_at).toBeTruthy();
    expect(meta.producer).toBeTruthy();
    expect(meta.producer_project).toBe("Tripp.Reason");
    expect(meta.contract_classification).toBe("internal-fake-manual-only");
    expect(meta.source_manifest_path).toBe("manifest.json");
    expect(meta.mutation_capability).toBe("none");
    expect(meta.consumer_permissions).toHaveLength(4);
    expect(meta.consumer_forbidden_actions).toHaveLength(7);
    expect(meta.redaction_status).toBeDefined();
    expect(meta.confidence_summary).toBeDefined();
    expect(meta.stale_state_summary).toBeDefined();
    expect(meta.warnings_count).toBeGreaterThanOrEqual(0);
    expect(meta.unknowns_count).toBeGreaterThanOrEqual(0);
    expect(meta.recommended_next_marker).toBeTruthy();
    expect(meta.evidence_files).toHaveLength(2);
    expect(meta.notes).toBeTruthy();
  });

  it("README-OPERATOR-HANDOFF.md is created with instructions", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const readmeFile = result.files.find((f) => f.includes("README"))!;
    const readme = await fs.readFile(readmeFile, "utf-8");
    expect(readme).toContain("Operator Handoff");
    expect(readme).toContain("internal-fake-manual-only");
    expect(readme).toContain("What You Must NOT Do");
    expect(readme).toContain("FAKE/MANUAL MANIFEST ONLY");
  });
});

// ── 6O-2: Schema / Metadata Tests ─────────────────────────────────

describe("6O-2: Schema/metadata tests", () => {
  it("contract_classification is always internal-fake-manual-only", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.contract_classification).toBe("internal-fake-manual-only");
  });

  it("mutation_capability is always none", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.mutation_capability).toBe("none");
  });

  it("consumer_permissions include read, inspect, compare, static-transfer", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.consumer_permissions).toContain("read");
    expect(result.metadata.consumer_permissions).toContain("inspect");
    expect(result.metadata.consumer_permissions).toContain("compare");
    expect(result.metadata.consumer_permissions).toContain("static-transfer");
  });

  it("consumer_forbidden_actions includes all 7 rules", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const f = result.metadata.consumer_forbidden_actions;
    expect(f).toContain("live-dispatch");
    expect(f).toContain("bus-mutation");
    expect(f).toContain("agent-activation");
    expect(f).toContain("cross-project-write");
    expect(f).toContain("auto-polling");
    expect(f).toContain("public-api-promotion");
    expect(f).toContain("source-of-truth-inference");
  });

  it("redaction_status reflects manifest redaction state", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.redaction_status.fields_redacted).toBe(0);
    expect(result.metadata.redaction_status.safe_for_operator_review).toBe(true);
  });

  it("confidence_summary matches manifest confidence", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.confidence_summary.overall_level).toBe(snapshot.confidence_level);
    expect(result.metadata.confidence_summary.packets_confirmed).toBeGreaterThanOrEqual(0);
  });

  it("stale_state_summary has reasonable defaults", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.stale_state_summary.is_stale).toBe(false);
    expect(result.metadata.stale_state_summary.recommended_refresh).toBeTruthy();
  });

  it("evidence_files lists manifest.json and manifest.md", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.evidence_files).toEqual(["manifest.json", "manifest.md"]);
  });
});

// ── 6O-3: Safety Tests ────────────────────────────────────────────

describe("6O-3: Safety tests", () => {
  it("rejects manifest with mutation_capability not none", async () => {
    const snapshot = makeSnapshot({ mutation_capability: "live" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow(
      'mutation_capability is "live"',
    );
  });

  it("rejects manifest with live source_mode", async () => {
    const snapshot = makeSnapshot({ source_mode: "experimental_live" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow(
      "implies live behavior",
    );
  });

  it("rejects raw secret-looking values in manifest content", async () => {
    // Build manifest with a secret-like packet_id that would appear in JSON
    const snapshot = makeSnapshot();
    // Inject a secret into the warnings array (which gets serialized)
    snapshot.warnings = ["key: sk-abcdef1234567890abcdef1234567890"];
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow(
      "secret-like value found",
    );
  });

  it("redaction_status is present in metadata", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    expect(result.metadata.redaction_status.redaction_applied).toBeDefined();
    expect(result.metadata.redaction_status.safe_for_operator_review).toBe(true);
  });

  it("markdown files warn about fake/manual nature", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);
    const mdFiles = result.files.filter((f) => f.endsWith(".md"));
    for (const f of mdFiles) {
      const content = await fs.readFile(f, "utf-8");
      expect(content).toMatch(/FAKE.MANUAL|fake.manual|FAKE\/MANUAL/);
    }
  });
});

// ── 6O-4: Invalid Bundle Tests ────────────────────────────────────

describe("6O-4: Invalid bundle tests", () => {
  it("rejects when mutation_capability is not none", async () => {
    const snapshot = makeSnapshot({ mutation_capability: "some-capability" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow("mutation_capability");
  });

  it("rejects when source_mode is live", async () => {
    const snapshot = makeSnapshot({ source_mode: "live" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow("implies live");
  });

  it("rejects when source_mode is cloud", async () => {
    const snapshot = makeSnapshot({ source_mode: "cloud" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow("implies live");
  });

  it("rejects when source_mode is remote", async () => {
    const snapshot = makeSnapshot({ source_mode: "remote" });
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow("implies live");
  });

  it("rejects secret-like values in manifest JSON", async () => {
    const snapshot = makeSnapshot();
    snapshot.unknowns = ["Bearer abc12345678901234567890"];
    await expect(packageHandoffBundle(snapshot, tmpDir)).rejects.toThrow("secret-like");
  });

  it("contract_classification is always internal-fake-manual-only in all files", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    // Check metadata
    expect(result.metadata.contract_classification).toBe("internal-fake-manual-only");

    // Check README
    const readmeFile = result.files.find((f) => f.includes("README"))!;
    const readme = await fs.readFile(readmeFile, "utf-8");
    expect(readme).toContain("internal-fake-manual-only");
  });
});

// ── 6O-5: Boundary Tests ──────────────────────────────────────────

describe("6O-5: Boundary tests", () => {
  it("no shared-agent-bus imports in handoff module", async () => {
    // Verify behaviorally: the module only imports from local manifest + node builtins
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts"),
      "utf-8",
    );
    // No import of shared-agent-bus
    expect(src).not.toMatch(/from.*shared-agent-bus/);
    expect(src).not.toMatch(/require.*shared-agent-bus/);
  });

  it("no Tripp.Control or Tripp.OS imports", async () => {
    // Verify behaviorally: handoff module never imports cross-project
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/from.*Tripp\.Control/);
    expect(src).not.toMatch(/from.*Tripp\.OS/);
    expect(src).not.toMatch(/require.*Tripp\.Control/);
    expect(src).not.toMatch(/require.*Tripp\.OS/);
  });

  it("no child_process, exec, or spawn in handoff module", async () => {
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/child_process/);
    expect(src).not.toMatch(/\.exec\(/);
    expect(src).not.toMatch(/\.spawn\(/);
  });

  it("no polling, watchers, or background loops", async () => {
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/setInterval/);
    expect(src).not.toMatch(/setTimeout/);
    expect(src).not.toMatch(/fs\.watch/);
    expect(src).not.toMatch(/chokidar/);
  });

  it("output stays within explicit local handoff directory", async () => {
    const snapshot = makeSnapshot();
    const result = await packageHandoffBundle(snapshot, tmpDir);

    for (const f of result.files) {
      expect(f.startsWith(path.resolve(tmpDir))).toBe(true);
      expect(f).toContain(".tripp/agents/handoff/");
    }
  });

  it("no Echo integration imports in handoff module", async () => {
    // Verify behaviorally: handoff module never imports Echo
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts"),
      "utf-8",
    );
    expect(src).not.toMatch(/import.*echos?/i);
    expect(src).not.toMatch(/require.*echos?/i);
  });
});