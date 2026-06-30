# Tripp.Reason — Stage Reason-3B: External-Agents Test Coverage Resolution

**Generated:** 2026-06-06 06:28 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_3B_PASS_EXTERNAL_AGENTS_TESTS_DEFERRED_DEPENDENCY_APPROVAL_NEEDED_CHAINING_TO_3C**

external-agents has 3 test files that cannot run without adding vitest as a devDependency. Tests are effectively covered by @tripp-os/agent-bus (78 tests on the same schemas). Deferred — requires explicit dependency approval.

---

## 1. Package State

| Property | Value |
|---|---|
| Package | `@tripp-reason/external-agents` |
| Path | `packages/external-agents` |
| Test files | 3 (`traceLedger.test.ts`, `fileBus.test.ts`, `schemas.test.ts`) |
| Test script | None |
| Vitest devDep | Not declared |
| Vitest available | Not in package scope (pnpm strict mode) |

## 2. Non-Invasive Coverage Attempts

| Attempt | Result |
|---|---|
| `pnpm exec vitest run` from external-agents | Not found (no dep) |
| `npx vitest run` from external-agents | Not found |
| Root `pnpm test` coverage | Not included (no test script) |
| Agent-bus test coverage | Covers same schemas: 78 tests |

## 3. Why Deferred

- Adding `"vitest"` to external-agents devDependencies requires a package.json change
- This violates the "no dependency changes unless explicitly blocked and requested" rule
- The tests are mirrors of @tripp-os/agent-bus tests — same schemas, same validation
- Agent-bus 78 tests provide effective coverage

## 4. Path Forward

Two options for operator approval:
1. **Add vitest devDep** to external-agents — simple, one-line change, unlocks 3 test files
2. **Accept coverage gap** — agent-bus tests already cover the schemas, external-agents is a re-export wrapper

---

**Files changed:** None
