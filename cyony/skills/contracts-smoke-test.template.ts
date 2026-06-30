/**
 * @<PKG> — smoke tests
 *
 * Minimal validation that a contracts/interface-only package exports
 * the expected surface and has zero upstream leakage.
 *
 * USAGE: Copy to src/__tests__/smoke.test.ts, replace @<PKG> and expected
 * enum/interface lists with your package's actual exports.
 */
import { describe, it, expect } from "vitest";
import * as pkg from "../index.js";

// ── Version constants ──────────────────────────────────────────────
describe("version constants", () => {
  it("exports CONTRACTS_VERSION = 0.1.0", () => {
    expect(pkg.CONTRACTS_VERSION).toBe("0.1.0");
  });

  it("version constant is a string matching semver", () => {
    expect(pkg.CONTRACTS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ── Status enums ───────────────────────────────────────────────────
describe("status enums", () => {
  const expectedEnums = [
    // Replace with your package's actual enum schema names
    "RunStatusSchema",
    "SessionStatusSchema",
    "ToolCallStatusSchema",
  ];

  for (const name of expectedEnums) {
    it(`exports ${name}`, () => {
      expect(pkg).toHaveProperty(name);
      // Should be a ZodEnum (has _def property)
      expect((pkg as any)[name]._def).toBeDefined();
    });
  }
});

// ── Generic interfaces ─────────────────────────────────────────────
describe("generic interfaces", () => {
  it("ToolContext shape is correct", () => {
    const ctx: pkg.ToolContext = {
      sessionId: "s1",
      runId: "r1",
      workdir: "/tmp",
    };
    expect(ctx.sessionId).toBe("s1");
    expect(ctx.runId).toBe("r1");
    expect(ctx.workdir).toBe("/tmp");
  });
});

// ── StreamEvent schemas (if applicable) ────────────────────────────
describe("StreamEvent schemas", () => {
  it("StreamEventMessageSchema validates", () => {
    const result = pkg.StreamEventMessageSchema.safeParse({
      type: "message",
      content: "hello",
      role: "assistant",
    });
    expect(result.success).toBe(true);
  });

  it("StreamEventSchema discriminated union works", () => {
    const result = pkg.StreamEventSchema.safeParse({
      type: "finish",
      reason: "complete",
      runId: "r1",
    });
    expect(result.success).toBe(true);
  });
});

// ── No upstream leakage ────────────────────────────────────────────
describe("no upstream leakage", () => {
  it("has zero forbidden references in export names", () => {
    // Exclude false positives — enum names that coincidentally contain
    // keywords but are NOT upstream references (e.g. FinishReason)
    const falsePositives = [
      "FinishReason",
      "FinishReasonSchema",
      // Add more as discovered
    ];
    const exportNames = Object.keys(pkg).filter(
      (n) => !falsePositives.includes(n)
    );

    const forbiddenTerms = [
      // Upstream project names — replace with your actual upstream
      "ReasonLoop",
      "reasonLoop",
      "TrippReason",
      "tripp-reason",
      "@tripp-reason",
      // Legacy system names
      "Goose",
      "goose",
      // Other packages that must not leak
      "Swarm",
      "MCP",
      "Runtime",
      "Server",
      "Dashboard",
    ];

    for (const term of forbiddenTerms) {
      for (const name of exportNames) {
        expect(name).not.toContain(term);
      }
    }
  });
});
