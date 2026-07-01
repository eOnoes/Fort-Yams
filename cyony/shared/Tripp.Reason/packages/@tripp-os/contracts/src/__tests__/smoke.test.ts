/**
 * @tripp-os/contracts — smoke tests
 *
 * Validates that the contracts package exports the expected surface
 * and has zero Reason-specific leakage.
 */
import { describe, it, expect } from "vitest";
import * as contracts from "../index.js";

// ── Version constants ────────────────────────────────────────────────
describe("version constants", () => {
  it("exports CONTRACTS_VERSION = 0.1.0", () => {
    expect(contracts.CONTRACTS_VERSION).toBe("0.1.0");
  });

  it("exports PACKAGE_CONTRACT_VERSION = 0.1.0 (compatibility alias)", () => {
    expect(contracts.PACKAGE_CONTRACT_VERSION).toBe("0.1.0");
  });

  it("both version constants are identical", () => {
    expect(contracts.PACKAGE_CONTRACT_VERSION).toBe(contracts.CONTRACTS_VERSION);
  });
});

// ── Status enums ─────────────────────────────────────────────────────
describe("status enums", () => {
  const expectedEnums = [
    "RunStatusSchema",
    "SessionStatusSchema",
    "ToolCallStatusSchema",
    "ApprovalStatusSchema",
    "EventTypeSchema",
    "RiskLevelSchema",
    "MessageRoleSchema",
    "ReportStatusSchema",
    "FinishReasonSchema",
  ];

  for (const name of expectedEnums) {
    it(`exports ${name}`, () => {
      expect(contracts).toHaveProperty(name);
      // Should be a ZodEnum
      expect((contracts as any)[name]._def).toBeDefined();
    });
  }
});

// ── Generic interfaces (shape check via assigned vars) ────────────────
describe("generic interfaces", () => {
  it("ToolContext shape is correct", () => {
    const ctx: contracts.ToolContext = {
      sessionId: "s1",
      runId: "r1",
      workdir: "/tmp",
    };
    expect(ctx.sessionId).toBe("s1");
  });

  it("ToolResult shape is correct", () => {
    const ok: contracts.ToolResult = { status: "ok", output: "done" };
    const err: contracts.ToolResult = { status: "error", error: "fail" };
    expect(ok.status).toBe("ok");
    expect(err.status).toBe("error");
  });
});

// ── StreamEvent schemas ──────────────────────────────────────────────
describe("StreamEvent schemas", () => {
  it("StreamEventMessageSchema validates", () => {
    const result = contracts.StreamEventMessageSchema.safeParse({
      type: "message",
      content: "hello",
      role: "assistant",
    });
    expect(result.success).toBe(true);
  });

  it("StreamEventSchema discriminated union works", () => {
    const result = contracts.StreamEventSchema.safeParse({
      type: "finish",
      reason: "complete",
      runId: "r1",
    });
    expect(result.success).toBe(true);
  });
});

// ── No ReasonLoop leakage ────────────────────────────────────────────
describe("no Reason-specific leakage", () => {
  const forbiddenTerms = [
    "ReasonLoop",
    "reasonLoop",
    "Reason",
    "Goose",
    "goose",
    "@tripp-reason",
    "Swarm",
    "MCP",
  ];

  it("has zero ReasonLoop references in export names", () => {
    const exportNames = Object.keys(contracts).filter(
      (n) => n !== "FinishReason" && n !== "FinishReasonSchema"
    );
    const forbiddenTerms = [
      "ReasonLoop",
      "reasonLoop",
      "TrippReason",
      "tripp-reason",
      "Goose",
      "goose",
      "@tripp-reason",
      "Swarm",
      "MCP",
    ];
    for (const term of forbiddenTerms) {
      for (const name of exportNames) {
        expect(name).not.toContain(term);
      }
    }
  });
});
