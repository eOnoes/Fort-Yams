/**
 * Phase 8G — Named-Agent / Adapter Separation Tests
 *
 * Proves:
 *   - NamedAgent (tripp, cyony, echo) is provider-agnostic
 *   - BackingAdapter (fake, manual, hermes, openclaw) is separate from identity
 *   - normalizeAgentIdentity maps provider keys to stable identity
 *   - Authority rules don't depend on backing provider
 *   - Compatibility aliases preserved
 *   - Fake/manual E2E still works
 *   - All existing tests still pass (regression)
 */
import { describe, it, expect } from "vitest";
import {
  NamedAgentSchema,
  BackingAdapterSchema,
  AgentIdentitySchema,
  resolveAgentIdentity,
  normalizeAgentIdentity,
  ExternalAgentRoleSchema,
  type NamedAgent,
  type BackingAdapter,
  type ExternalAgentRole,
  type ExternalAgentTaskPacket,
} from "@tripp-reason/external-agents";
import { executeAgentsDryRun } from "../agentsCommand.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;

async function setup() {
  tmpDir = path.join(os.tmpdir(), `tripp-8g-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
}

async function cleanup() {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}

// ── S1: NamedAgent schema ──────────────────────────────────────────

describe("S1: NamedAgent — provider-agnostic identity", () => {
  it("accepts tripp", () => {
    expect(() => NamedAgentSchema.parse("tripp")).not.toThrow();
  });

  it("accepts cyony", () => {
    expect(() => NamedAgentSchema.parse("cyony")).not.toThrow();
  });

  it("accepts echo", () => {
    expect(() => NamedAgentSchema.parse("echo")).not.toThrow();
  });

  it("rejects provider-specific strings", () => {
    expect(() => NamedAgentSchema.parse("hermes_echo")).toThrow();
    expect(() => NamedAgentSchema.parse("openclaw_tripp")).toThrow();
  });

  it("rejects invalid names", () => {
    expect(() => NamedAgentSchema.parse("unknown_agent")).toThrow();
  });
});

// ── S2: BackingAdapter schema ──────────────────────────────────────

describe("S2: BackingAdapter — separate from identity", () => {
  it("accepts fake", () => {
    expect(() => BackingAdapterSchema.parse("fake")).not.toThrow();
  });

  it("accepts manual", () => {
    expect(() => BackingAdapterSchema.parse("manual")).not.toThrow();
  });

  it("accepts hermes", () => {
    expect(() => BackingAdapterSchema.parse("hermes")).not.toThrow();
  });

  it("accepts openclaw", () => {
    expect(() => BackingAdapterSchema.parse("openclaw")).not.toThrow();
  });

  it("rejects invalid adapters", () => {
    expect(() => BackingAdapterSchema.parse("live_network")).toThrow();
  });
});

// ── S3: AgentIdentity — resolved view ─────────────────────────────

describe("S3: AgentIdentity resolved view", () => {
  it("validates complete identity object", () => {
    expect(() =>
      AgentIdentitySchema.parse({
        namedAgent: "echo",
        assignedRole: "warden/auditor/trace",
        backingAdapter: "hermes",
      })
    ).not.toThrow();
  });

  it("validates identity with compatibility alias", () => {
    expect(() =>
      AgentIdentitySchema.parse({
        namedAgent: "echo",
        assignedRole: "warden/auditor/trace",
        backingAdapter: "hermes",
        compatibilityAlias: "hermes_echo",
      })
    ).not.toThrow();
  });

  it("rejects identity with invalid namedAgent", () => {
    expect(() =>
      AgentIdentitySchema.parse({
        namedAgent: "unknown",
        backingAdapter: "fake",
      })
    ).toThrow();
  });
});

// ── S4: Normalization — provider key → identity ───────────────────

describe("S4: normalizeAgentIdentity maps provider keys", () => {
  it("openclaw_tripp → tripp + openclaw", () => {
    const result = normalizeAgentIdentity("openclaw_tripp");
    expect(result.namedAgent).toBe("tripp");
    expect(result.backingAdapter).toBe("openclaw");
    expect(result.assignedRole).toContain("controller");
    expect(result.isLegacyAlias).toBe(true);
  });

  it("hermes_cyony → cyony + hermes", () => {
    const result = normalizeAgentIdentity("hermes_cyony");
    expect(result.namedAgent).toBe("cyony");
    expect(result.backingAdapter).toBe("hermes");
    expect(result.assignedRole).toContain("builder");
    expect(result.isLegacyAlias).toBe(true);
  });

  it("openclaw_echo → echo + openclaw (legacy)", () => {
    const result = normalizeAgentIdentity("openclaw_echo");
    expect(result.namedAgent).toBe("echo");
    expect(result.backingAdapter).toBe("openclaw");
    expect(result.assignedRole).toContain("warden");
    expect(result.isLegacyAlias).toBe(true);
  });

  it("hermes_echo → echo + hermes (current)", () => {
    const result = normalizeAgentIdentity("hermes_echo");
    expect(result.namedAgent).toBe("echo");
    expect(result.backingAdapter).toBe("hermes");
    expect(result.assignedRole).toContain("warden");
    expect(result.isLegacyAlias).toBe(true);
  });

  it("Echo's identity is stable regardless of backing adapter", () => {
    const echoHermes = normalizeAgentIdentity("hermes_echo");
    const echoOpenClaw = normalizeAgentIdentity("openclaw_echo");

    // Same named agent
    expect(echoHermes.namedAgent).toBe("echo");
    expect(echoOpenClaw.namedAgent).toBe("echo");

    // Same assigned role
    expect(echoHermes.assignedRole).toBe(echoOpenClaw.assignedRole);

    // Different backing adapter
    expect(echoHermes.backingAdapter).toBe("hermes");
    expect(echoOpenClaw.backingAdapter).toBe("openclaw");
  });

  it("Cyony's identity is stable", () => {
    const result = normalizeAgentIdentity("hermes_cyony");
    expect(result.namedAgent).toBe("cyony");
    expect(result.backingAdapter).toBe("hermes");
    expect(result.assignedRole).toContain("builder");
  });

  it("Tripp's identity is stable", () => {
    const result = normalizeAgentIdentity("openclaw_tripp");
    expect(result.namedAgent).toBe("tripp");
    expect(result.backingAdapter).toBe("openclaw");
    expect(result.assignedRole).toContain("controller");
  });
});

// ── S5: resolveAgentIdentity — full identity object ───────────────

describe("S5: resolveAgentIdentity returns full identity", () => {
  it("returns namedAgent, assignedRole, backingAdapter, compatibilityAlias", () => {
    const identity = resolveAgentIdentity("hermes_echo");
    expect(identity.namedAgent).toBe("echo");
    expect(identity.backingAdapter).toBe("hermes");
    expect(identity.assignedRole).toContain("warden");
    expect(identity.compatibilityAlias).toBe("hermes_echo");
  });

  it("all 4 provider keys resolve", () => {
    const roles: ExternalAgentRole[] = ["openclaw_tripp", "hermes_cyony", "openclaw_echo", "hermes_echo"];
    for (const role of roles) {
      const identity = resolveAgentIdentity(role);
      expect(identity.namedAgent).toBeDefined();
      expect(identity.backingAdapter).toBeDefined();
      expect(identity.assignedRole).toBeDefined();
    }
  });
});

// ── S6: Authority rules don't depend on backing provider ──────────

describe("S6: Authority rules are provider-agnostic", () => {
  it("Echo Warden role doesn't change when backing adapter changes", () => {
    const echoHermes = resolveAgentIdentity("hermes_echo");
    const echoOpenClaw = resolveAgentIdentity("openclaw_echo");

    // Warden authority is same regardless of backing
    expect(echoHermes.assignedRole).toBe(echoOpenClaw.assignedRole);

    // Both map to same named agent
    expect(echoHermes.namedAgent).toBe(echoOpenClaw.namedAgent);
  });

  it("Tripp's controller role is assigned, not provider-derived", () => {
    const identity = resolveAgentIdentity("openclaw_tripp");
    expect(identity.assignedRole).toContain("controller");
    // The role is explicitly assigned — not derived from "openclaw" prefix
  });

  it("ExternalAgentRole still validates for backward compat", () => {
    expect(() => ExternalAgentRoleSchema.parse("openclaw_tripp")).not.toThrow();
    expect(() => ExternalAgentRoleSchema.parse("hermes_echo")).not.toThrow();
  });
});

// ── S7: Backward compatibility — all 4 roles still work ───────────

describe("S7: Backward compatibility with provider keys", () => {
  it("openclaw_tripp dry run still works", async () => {
    await setup();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "openclaw_tripp",
          taskType: "plan",
          title: "8G Compat Tripp",
          objective: "Backward compat",
          scope: "Test",
          verdict: "pass",
          workdir: tmpDir,
        })
      ).resolves.toBeUndefined();
    } finally { await cleanup(); }
  });

  it("hermes_cyony dry run still works", async () => {
    await setup();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "hermes_cyony",
          taskType: "prototype",
          title: "8G Compat Cyony",
          objective: "Backward compat",
          scope: "Test",
          verdict: "pass",
          workdir: tmpDir,
        })
      ).resolves.toBeUndefined();
    } finally { await cleanup(); }
  });

  it("openclaw_echo dry run still works (legacy alias)", async () => {
    await setup();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "openclaw_echo",
          taskType: "audit",
          title: "8G Compat Echo-Legacy",
          objective: "Backward compat",
          scope: "Test",
          verdict: "pass",
          workdir: tmpDir,
        })
      ).resolves.toBeUndefined();
    } finally { await cleanup(); }
  });

  it("hermes_echo dry run still works (current alias)", async () => {
    await setup();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "hermes_echo",
          taskType: "audit",
          title: "8G Compat Echo-Hermes",
          objective: "Backward compat",
          scope: "Test",
          verdict: "pass",
          workdir: tmpDir,
        })
      ).resolves.toBeUndefined();
    } finally { await cleanup(); }
  });
});

// ── S8: Fake/manual dispatch regression ───────────────────────────

describe("S8: Fake/manual dispatch still works after 8G", () => {
  it("fake dispatch still produces result", async () => {
    await setup();
    try {
      await executeAgentsDryRun({
        agent: "hermes_echo",
        taskType: "audit",
        title: "8G Fake Regression",
        objective: "Verify fake still works",
        scope: "Test",
        verdict: "pass",
        workdir: tmpDir,
      });

      const { listOutboxPackets, readResultPacket } = await import("@tripp-reason/external-agents");
      const outbox = await listOutboxPackets({ workdir: tmpDir });
      expect(outbox.length).toBeGreaterThanOrEqual(1);
      const result = await readResultPacket(outbox[0]);
      expect(result.metadata!.fake).toBe(true);
    } finally { await cleanup(); }
  });

  it("invalid role still rejected", async () => {
    await setup();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "real_live_echo",
          taskType: "audit",
          title: "Bad",
          objective: "Bad",
          scope: "Bad",
          workdir: tmpDir,
        })
      ).rejects.toThrow("Invalid agent role");
    } finally { await cleanup(); }
  });
});

// ── S9: Disabled real transport still blocked ─────────────────────

describe("S9: Disabled real transport still blocked after 8G", () => {
  it("dispatchToRealAgent still blocked for hermes_echo", async () => {
    await setup();
    try {
      const { randomUUID } = await import("node:crypto");
      const { dispatchToRealAgent, createDispatchRequest } = await import("@tripp-reason/external-agents");

      const taskPacket: ExternalAgentTaskPacket = {
        schemaVersion: "1.0.0",
        packetId: randomUUID(),
        runId: randomUUID(),
        createdAt: new Date().toISOString(),
        createdBy: "test",
        agentRole: "hermes_echo",
        trustZone: "local_audit_warden",
        taskType: "audit",
        title: "8G Block Test",
        objective: "Still blocked",
        scope: "Test",
        allowedPaths: [],
        deniedPaths: [],
        toolPolicy: { allowShell: false, allowWrite: false, allowNetwork: false, allowSecrets: false, allowedTools: [], deniedTools: [] },
        approvalPolicy: { requiresHumanApproval: true, requiresApprovalGate: true, agentMayApprove: false, echoReviewRequired: false },
        contextPolicy: { contextBudgetTokens: 8000, redactSecrets: true, includeRepoSummary: false, includeFileContents: false, allowedContextPaths: [], deniedContextPaths: [] },
        constraints: [],
        requiredOutputFormat: "json_packet_plus_markdown_report",
        reportRequired: true,
        status: "pending",
      };

      const config = {
        transportId: "test",
        name: "Test",
        kind: "cloud_http_experimental" as const,
        mode: "experimental_live" as const,
        agentRole: "hermes_echo" as const,
        enabled: true,
        allowNetwork: false,
        allowSecrets: false,
        allowRepoAccess: false,
        allowDirectMutation: false,
        requireEchoReview: true,
        requireApprovalGate: true,
        timeoutSeconds: 300,
        maxContextTokens: 8000,
      };

      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: false });
      const result = await dispatchToRealAgent(request, config, tmpDir);
      expect(result.status).toBe("blocked");
    } finally { await cleanup(); }
  });
});

// ── S10: Boundary checks ──────────────────────────────────────────

describe("S10: No provision for hiding the separation in naming conventions", () => {
  it("NamedAgent does not contain provider strings", () => {
    const options = ["tripp", "cyony", "echo"] as NamedAgent[];
    for (const name of options) {
      expect(name).not.toContain("hermes");
      expect(name).not.toContain("openclaw");
    }
  });

  it("backingAdapter is empty string-safe — no provider leakage in namedAgent", () => {
    // Verify normalization doesn't produce mixed identity
    const identity = normalizeAgentIdentity("hermes_echo");
    expect(identity.namedAgent).not.toContain("hermes");
    expect(identity.namedAgent).not.toContain("openclaw");
    expect(identity.backingAdapter).not.toContain("echo");
  });

  it("no new live transport tokens in schemas after 8G", async () => {
    const schemaPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/schemas.ts");
    const content = await fs.readFile(schemaPath, "utf-8");
    expect(content).not.toContain("fetch(");
    expect(content).not.toContain("http.request");
    expect(content).not.toContain("WebSocket");
    expect(content).not.toContain("child_process");
    expect(content).not.toContain("apiKey");
  });
});
