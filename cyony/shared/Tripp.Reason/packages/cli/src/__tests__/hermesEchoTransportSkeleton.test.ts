/**
 * Phase 8E — Disabled Hermes/Echo Transport Skeleton Tests
 *
 * Proves:
 *   - hermes_echo role accepted by schema
 *   - AGENT_DEFAULTS includes hermes_echo with correct trust zone
 *   - dispatchToRealAgent always returns blocked
 *   - dispatchRoute correctly routes fake/manual/experimental_live/disabled
 *   - No live transport tokens exist
 *   - ApprovalGate bypass impossible
 *   - Existing roles + tests still work
 */
import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ExternalAgentRoleSchema,
  dispatchToFakeAgent,
  dispatchToManualFileTransport,
  dispatchToRealAgent,
  dispatchRoute,
  createDefaultTransportConfig,
  createDispatchRequest,
  type ExternalAgentTaskPacket,
  type ExternalAgentTransportConfig,
} from "@tripp-reason/external-agents";
import { executeAgentsDryRun } from "../agentsCommand.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;

async function setupTmpDir() {
  tmpDir = path.join(os.tmpdir(), `tripp-8e-test-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
}

async function cleanupTmpDir() {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
}

function makeTaskPacket(agentRole: "openclaw_tripp" | "hermes_cyony" | "openclaw_echo" | "hermes_echo"): ExternalAgentTaskPacket {
  return {
    schemaVersion: "1.0.0",
    packetId: randomUUID(),
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: "test",
    agentRole,
    trustZone: "local_audit_warden",
    taskType: "audit",
    title: "8E Test",
    objective: "Test disabled transport",
    scope: "Test only",
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
}

// ── Helpers ───────────────────────────────────────────────────────

function makeLiveConfig(role: "openclaw_tripp" | "hermes_cyony" | "openclaw_echo" | "hermes_echo"): ExternalAgentTransportConfig {
  return {
    transportId: "test-live",
    name: "Test live transport",
    kind: "cloud_http_experimental",
    mode: "experimental_live",
    agentRole: role,
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
}

// ── S1: hermes_echo Role Schema ────────────────────────────────────

describe("S1: hermes_echo role schema", () => {
  it("hermes_echo is accepted by ExternalAgentRoleSchema", () => {
    expect(() => ExternalAgentRoleSchema.parse("hermes_echo")).not.toThrow();
  });

  it("hermes_echo is in parsed enum values", () => {
    const result = ExternalAgentRoleSchema.parse("hermes_echo");
    expect(result).toBe("hermes_echo");
  });

  it("openclaw_echo is still accepted (backward compat)", () => {
    expect(() => ExternalAgentRoleSchema.parse("openclaw_echo")).not.toThrow();
  });

  it("openclaw_tripp is still accepted", () => {
    expect(() => ExternalAgentRoleSchema.parse("openclaw_tripp")).not.toThrow();
  });

  it("hermes_cyony is still accepted", () => {
    expect(() => ExternalAgentRoleSchema.parse("hermes_cyony")).not.toThrow();
  });

  it("invalid role is still rejected", () => {
    expect(() => ExternalAgentRoleSchema.parse("real_live_hermes")).toThrow();
  });
});

// ── S2: AGENT_DEFAULTS ────────────────────────────────────────────

describe("S2: AGENT_DEFAULTS for hermes_echo", () => {
  it("hermes_echo is accepted by dry-run command", async () => {
    await setupTmpDir();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "hermes_echo",
          taskType: "audit",
          title: "8E Echo Test",
          objective: "Test hermes_echo role",
          scope: "Test only",
          verdict: "pass",
          workdir: tmpDir,
        })
      ).resolves.toBeUndefined();
    } finally {
      await cleanupTmpDir();
    }
  });

  it("hermes_echo has local_audit_warden trust zone", async () => {
    await setupTmpDir();
    try {
      await executeAgentsDryRun({
        agent: "hermes_echo",
        taskType: "audit",
        title: "8E Trust Zone Test",
        objective: "Verify trust zone",
        scope: "Test only",
        verdict: "pass",
        workdir: tmpDir,
      });

      // Verify trust zone in the task packet
      const { listInboxPackets, readTaskPacket } = await import("@tripp-reason/external-agents");
      const inbox = await listInboxPackets({ workdir: tmpDir });
      expect(inbox.length).toBeGreaterThanOrEqual(1);
      const task = await readTaskPacket(inbox[0]);
      expect(task.trustZone).toBe("local_audit_warden");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("hermes_echo dry run uses fake transport only", async () => {
    await setupTmpDir();
    try {
      await executeAgentsDryRun({
        agent: "hermes_echo",
        taskType: "audit",
        title: "8E Fake Test",
        objective: "Verify fake transport",
        scope: "Test only",
        verdict: "pass",
        workdir: tmpDir,
      });

      const { listOutboxPackets, readResultPacket } = await import("@tripp-reason/external-agents");
      const outbox = await listOutboxPackets({ workdir: tmpDir });
      expect(outbox.length).toBeGreaterThanOrEqual(1);
      const result = await readResultPacket(outbox[0]);
      expect(result.metadata!.fake).toBe(true);
    } finally {
      await cleanupTmpDir();
    }
  });

  it("invalid role still rejected by dry run", async () => {
    await setupTmpDir();
    try {
      await expect(
        executeAgentsDryRun({
          agent: "invalid_role_xyz",
          taskType: "audit",
          title: "Bad",
          objective: "Bad",
          scope: "Bad",
          workdir: tmpDir,
        })
      ).rejects.toThrow("Invalid agent role");
    } finally {
      await cleanupTmpDir();
    }
  });
});

// ── S3: dispatchToRealAgent — Always Blocked ──────────────────────

describe("S3: dispatchToRealAgent always returns blocked", () => {
  it("returns status blocked", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = makeLiveConfig("hermes_echo");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });
      const result = await dispatchToRealAgent(request, config, tmpDir);
      expect(result.status).toBe("blocked");
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0]).toContain("real_transport_disabled");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("does not produce a result packet", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = makeLiveConfig("hermes_echo");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      const result = await dispatchToRealAgent(request, config, tmpDir);

      expect(result.resultPacket).toBeUndefined();
      expect(result.outboxPath).toBeUndefined();
    } finally {
      await cleanupTmpDir();
    }
  });

  it("emits trace events on block", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = makeLiveConfig("hermes_echo");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      await dispatchToRealAgent(request, config, tmpDir);

      const { readTraceEvents } = await import("@tripp-reason/external-agents");
      const events = await readTraceEvents({ workdir: tmpDir });
      expect(events.length).toBeGreaterThanOrEqual(1);

      const blockedEvents = events.filter((e) =>
        e.summary.includes("real_transport_disabled") || e.summary.includes("Transport blocked")
      );
      expect(blockedEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupTmpDir();
    }
  });

  it("works with any agent role", async () => {
    await setupTmpDir();
    try {
      for (const role of ["openclaw_tripp", "hermes_cyony", "openclaw_echo", "hermes_echo"] as const) {
        const taskPacket = makeTaskPacket(role);
        const config = makeLiveConfig(role);
        const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: false });

        const result = await dispatchToRealAgent(request, config, tmpDir);
        expect(result.status).toBe("blocked");
      }
    } finally {
      await cleanupTmpDir();
    }
  });
});

// ── S4: dispatchRoute — Correct routing ───────────────────────────

describe("S4: dispatchRoute routes correctly", () => {
  it("mode=fake routes to fake dispatch", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_cyony");
      const config = createDefaultTransportConfig("hermes_cyony", "fake_agent", "fake");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      const result = await dispatchRoute(request, config, tmpDir);

      expect(result.status === "fake_completed" || result.status === "dry_run").toBe(true);
      expect(result.resultPacket).toBeDefined();
    } finally {
      await cleanupTmpDir();
    }
  });

  it("mode=manual routes to manual dispatch", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_cyony");
      const config = createDefaultTransportConfig("hermes_cyony", "manual_file", "manual");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: false });

      const result = await dispatchRoute(request, config, tmpDir);

      expect(result.status).toBe("manual_required");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("mode=experimental_live routes to real stub (blocked)", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      // Important: createDefaultTransportConfig defaults to mode=fake for safety
      // We need an explicit experimental_live config
      const config: ExternalAgentTransportConfig = {
        transportId: "echo-test",
        name: "Echo test transport",
        kind: "cloud_http_experimental",
        mode: "experimental_live",
        agentRole: "hermes_echo",
        enabled: false,
        allowNetwork: false,
        allowSecrets: false,
        allowRepoAccess: false,
        allowDirectMutation: false,
        requireEchoReview: true,
        requireApprovalGate: true,
        timeoutSeconds: 300,
        maxContextTokens: 8000,
      };
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      const result = await dispatchRoute(request, config, tmpDir);

      expect(result.status).toBe("blocked");
      expect(result.errors[0]).toContain("real_transport_disabled");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("mode=disabled returns blocked", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = createDefaultTransportConfig("hermes_echo", "manual_file", "disabled");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: false });

      const result = await dispatchRoute(request, config, tmpDir);

      expect(result.status).toBe("blocked");
      expect(result.errors[0]).toContain("requires explicit enablement");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("mode=dry_run returns blocked (not routed to fake)", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = createDefaultTransportConfig("hermes_echo", "fake_agent", "dry_run");
      const request = createDispatchRequest(taskPacket, config, { dryRun: true, traceEnabled: false });

      const result = await dispatchRoute(request, config, tmpDir);

      // dry_run mode should be blocked via the router, not silently routed to fake
      expect(result.status).toBe("blocked");
    } finally {
      await cleanupTmpDir();
    }
  });
});

// ── S5: No live transport tokens ──────────────────────────────────

describe("S5: No live transport tokens in transport files", () => {
  it("transport.ts has no fetch", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("fetch(");
  });

  it("transport.ts has no XMLHttpRequest", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("XMLHttpRequest");
  });

  it("transport.ts has no WebSocket", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("new WebSocket");
  });

  it("transport.ts has no child_process spawn/exec", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("child_process");
    expect(content).not.toMatch(/spawn\(/);
    expect(content).not.toMatch(/exec\(/);
  });

  it("transport.ts has no .env or secret references", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("process.env.HERMES");
    expect(content).not.toContain("process.env.ECHO");
    expect(content).not.toContain("apiKey");
  });

  it("transport.ts has no http.request or https.request", async () => {
    const transportPath = path.resolve(process.cwd(), "../@tripp-os/agent-bus/src/transport.ts");
    const content = await fs.readFile(transportPath, "utf-8");
    expect(content).not.toContain("http.request");
    expect(content).not.toContain("https.request");
  });
});

// ── S6: ApprovalGate safety ──────────────────────────────────────

describe("S6: ApprovalGate safety with real transport", () => {
  it("dispatchToRealAgent does not bypass ApprovalGate", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = makeLiveConfig("hermes_echo");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      const result = await dispatchToRealAgent(request, config, tmpDir);

      // Result must be blocked — not completed
      expect(result.status).toBe("blocked");
      expect(result.status).not.toBe("completed");
      expect(result.status).not.toBe("fake_completed");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("Warden/Echo does not authorize real dispatch", async () => {
    await setupTmpDir();
    try {
      // Run a dry run to create a Warden review
      await executeAgentsDryRun({
        agent: "hermes_echo",
        taskType: "audit",
        title: "Warden Block Test",
        objective: "Prove Warden does not authorize execution",
        scope: "Test only",
        verdict: "pass",
        workdir: tmpDir,
      });

      // Try to dispatch to real agent — should still be blocked regardless of Warden pass
      const taskPacket = makeTaskPacket("hermes_echo");
      const config = makeLiveConfig("hermes_echo");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: false });

      const result = await dispatchToRealAgent(request, config, tmpDir);
      expect(result.status).toBe("blocked");
    } finally {
      await cleanupTmpDir();
    }
  });

  it("allowDirectMutation is false in default config", () => {
    const config = createDefaultTransportConfig("hermes_echo");
    expect(config.allowDirectMutation).toBe(false);
  });

  it("requireApprovalGate is true in default config", () => {
    const config = createDefaultTransportConfig("hermes_echo");
    expect(config.requireApprovalGate).toBe(true);
  });
});

// ── S7: Regression — fake/manual still work ──────────────────────

describe("S7: Fake/manual dispatch regression", () => {
  it("dispatchToFakeAgent still works with dispatchRoute", async () => {
    await setupTmpDir();
    try {
      const taskPacket = makeTaskPacket("hermes_cyony");
      const config = createDefaultTransportConfig("hermes_cyony", "fake_agent", "fake");
      const request = createDispatchRequest(taskPacket, config, { dryRun: false, traceEnabled: true });

      const result = await dispatchRoute(request, config, tmpDir);
      expect(result.resultPacket).toBeDefined();
      expect(result.resultPacket!.metadata!.fake).toBe(true);
    } finally {
      await cleanupTmpDir();
    }
  });

  it("existing dry run command still passes for all roles", async () => {
    await setupTmpDir();
    try {
      for (const role of ["openclaw_tripp", "hermes_cyony", "openclaw_echo", "hermes_echo"]) {
        await executeAgentsDryRun({
          agent: role,
          taskType: "audit",
          title: `Regression: ${role}`,
          objective: "Verify dry run still works",
          scope: "Test only",
          verdict: "pass",
          workdir: tmpDir,
        });
      }
      // All 4 should complete without throwing
    } finally {
      await cleanupTmpDir();
    }
  });
});
