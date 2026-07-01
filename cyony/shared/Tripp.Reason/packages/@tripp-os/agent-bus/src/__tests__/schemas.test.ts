/**
 * Schema validation tests — verifies all Zod schemas enforce the contract.
 */
import { describe, it, expect } from "vitest";
import {
  ExternalAgentTaskPacketSchema,
  ValidatedTaskPacketSchema,
  ExternalAgentResultPacketSchema,
  ExternalAgentReviewPacketSchema,
  ValidatedReviewPacketSchema,
  ExternalAgentApprovalPolicySchema,
  ExternalAgentToolPolicySchema,
  ExternalAgentContextPolicySchema,
} from "../schemas.js";
import type { ExternalAgentTaskPacket } from "../schemas.js";

// ── Helpers ───────────────────────────────────────────────────────────

function makeValidTask(overrides: Partial<ExternalAgentTaskPacket> = {}): ExternalAgentTaskPacket {
  return {
    schemaVersion: "1.0.0",
    packetId: "pkt-test-001",
    runId: "run-test-001",
    createdAt: new Date().toISOString(),
    createdBy: "test",
    agentRole: "openclaw_tripp",
    trustZone: "cloud_controlled_reasoning",
    taskType: "review",
    title: "Test Task",
    objective: "Verify schema validation works correctly",
    scope: "testing",
    ...overrides,
  };
}

// ── Task Packet Tests ─────────────────────────────────────────────────

describe("ExternalAgentTaskPacketSchema", () => {
  it("valid task packet parses", () => {
    const packet = makeValidTask();
    const result = ValidatedTaskPacketSchema.safeParse(packet);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = ValidatedTaskPacketSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty packetId", () => {
    const result = ValidatedTaskPacketSchema.safeParse(makeValidTask({ packetId: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects empty runId", () => {
    const result = ValidatedTaskPacketSchema.safeParse(makeValidTask({ runId: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = ValidatedTaskPacketSchema.safeParse(makeValidTask({ title: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects empty objective", () => {
    const result = ValidatedTaskPacketSchema.safeParse(makeValidTask({ objective: "" }));
    expect(result.success).toBe(false);
  });

  it("default denied paths are present", () => {
    const result = ValidatedTaskPacketSchema.safeParse(makeValidTask());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deniedPaths).toContain(".env");
      expect(result.data.deniedPaths).toContain(".git");
      expect(result.data.deniedPaths).toContain("node_modules");
    }
  });

  // ── Hermes sandbox checks ───────────────────────────────────────

  it("Hermes packet with shell rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        agentRole: "hermes_cyony",
        trustZone: "cloud_sandbox_proposal",
        toolPolicy: { allowShell: true, allowWrite: false, allowNetwork: false, allowSecrets: false },
      })
    );
    expect(result.success).toBe(false);
  });

  it("Hermes packet with write rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        agentRole: "hermes_cyony",
        trustZone: "cloud_sandbox_proposal",
        toolPolicy: { allowShell: false, allowWrite: true, allowNetwork: false, allowSecrets: false },
      })
    );
    expect(result.success).toBe(false);
  });

  it("Hermes packet with secrets rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        agentRole: "hermes_cyony",
        trustZone: "cloud_sandbox_proposal",
        toolPolicy: { allowShell: false, allowWrite: false, allowNetwork: false, allowSecrets: true },
      })
    );
    expect(result.success).toBe(false);
  });

  it("Hermes packet uses wrong trustZone rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        agentRole: "hermes_cyony",
        trustZone: "cloud_controlled_reasoning",
      })
    );
    expect(result.success).toBe(false);
  });

  it("valid Hermes proposal packet passes", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        agentRole: "hermes_cyony",
        trustZone: "cloud_sandbox_proposal",
        taskType: "proposal",
      })
    );
    expect(result.success).toBe(true);
  });

  // ── Cloud secrets checks ────────────────────────────────────────

  it("cloud packet with allowSecrets rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        trustZone: "cloud_controlled_reasoning",
        toolPolicy: { allowShell: false, allowWrite: false, allowNetwork: false, allowSecrets: true },
      })
    );
    expect(result.success).toBe(false);
  });

  it("cloud packet with redactSecrets false rejected", () => {
    const result = ValidatedTaskPacketSchema.safeParse(
      makeValidTask({
        trustZone: "cloud_controlled_reasoning",
        contextPolicy: { contextBudgetTokens: 8000, redactSecrets: false },
      })
    );
    expect(result.success).toBe(false);
  });

  // ── agentMayApprove ─────────────────────────────────────────────

  it("agentMayApprove true rejected", () => {
    const result = ExternalAgentApprovalPolicySchema.safeParse({
      agentMayApprove: true,
    });
    expect(result.success).toBe(false);
  });

  it("agentMayApprove false passes", () => {
    const result = ExternalAgentApprovalPolicySchema.safeParse({
      agentMayApprove: false,
    });
    expect(result.success).toBe(true);
  });
});

// ── Result Packet Tests ───────────────────────────────────────────────

describe("ExternalAgentResultPacketSchema", () => {
  it("valid result packet parses", () => {
    const result = ExternalAgentResultPacketSchema.safeParse({
      schemaVersion: "1.0.0",
      packetId: "pkt-test-001",
      resultId: "res-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning",
      status: "success",
      summary: "All checks passed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty resultId", () => {
    const result = ExternalAgentResultPacketSchema.safeParse({
      schemaVersion: "1.0.0",
      packetId: "pkt-test-001",
      resultId: "",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning",
      status: "success",
      summary: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty packetId", () => {
    const result = ExternalAgentResultPacketSchema.safeParse({
      packetId: "",
      resultId: "res-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning",
      status: "success",
      summary: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty summary", () => {
    const result = ExternalAgentResultPacketSchema.safeParse({
      packetId: "pkt-test-001",
      resultId: "res-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      agentRole: "openclaw_tripp",
      trustZone: "cloud_controlled_reasoning",
      status: "success",
      summary: "",
    });
    expect(result.success).toBe(false);
  });
});

// ── Review Packet Tests ───────────────────────────────────────────────

describe("ExternalAgentReviewPacketSchema", () => {
  it("valid review packet parses", () => {
    const result = ValidatedReviewPacketSchema.safeParse({
      schemaVersion: "1.0.0",
      reviewId: "rev-001",
      packetId: "pkt-test-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo",
      verdict: "pass",
      summary: "All clear",
    });
    expect(result.success).toBe(true);
  });

  it("block verdict without issues or safety findings rejected", () => {
    const result = ValidatedReviewPacketSchema.safeParse({
      reviewId: "rev-001",
      packetId: "pkt-test-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo",
      verdict: "block",
      summary: "Blocked",
      issues: [],
      safetyFindings: [],
    });
    expect(result.success).toBe(false);
  });

  it("block verdict with issues passes", () => {
    const result = ValidatedReviewPacketSchema.safeParse({
      reviewId: "rev-001",
      packetId: "pkt-test-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo",
      verdict: "block",
      summary: "Blocked",
      issues: ["Unauthorized file access detected"],
    });
    expect(result.success).toBe(true);
  });

  it("escalate verdict without safety findings rejected", () => {
    const result = ValidatedReviewPacketSchema.safeParse({
      reviewId: "rev-001",
      packetId: "pkt-test-001",
      runId: "run-test-001",
      createdAt: new Date().toISOString(),
      reviewerRole: "openclaw_echo",
      verdict: "escalate",
      summary: "Needs escalation",
      issues: [],
      safetyFindings: [],
    });
    expect(result.success).toBe(false);
  });
});

// ── Defaults ──────────────────────────────────────────────────────────

describe("Default values", () => {
  it("toolPolicy defaults are safe", () => {
    const defaults = ExternalAgentToolPolicySchema.parse({});
    expect(defaults.allowShell).toBe(false);
    expect(defaults.allowWrite).toBe(false);
    expect(defaults.allowNetwork).toBe(false);
    expect(defaults.allowSecrets).toBe(false);
  });

  it("approvalPolicy defaults are safe", () => {
    const defaults = ExternalAgentApprovalPolicySchema.parse({});
    expect(defaults.requiresHumanApproval).toBe(true);
    expect(defaults.requiresApprovalGate).toBe(true);
    expect(defaults.agentMayApprove).toBe(false);
  });

  it("contextPolicy defaults are safe", () => {
    const defaults = ExternalAgentContextPolicySchema.parse({ contextBudgetTokens: 4000 });
    expect(defaults.redactSecrets).toBe(true);
    expect(defaults.includeFileContents).toBe(false);
  });
});
