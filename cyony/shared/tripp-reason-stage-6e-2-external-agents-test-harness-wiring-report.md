# Tripp.Reason Stage 6E-2 — External-Agents Test Harness Wiring

**Date:** 2026-06-06
**Stage:** Reason-6E-2
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_6E_2_PASS_EXTERNAL_AGENTS_TESTS_RUN_CHAINING_TO_6E_3**

---

## Changes Applied

### 1. Added vitest devDependency
```
pnpm --filter @tripp-reason/external-agents add -D vitest@^2.1.0
```
- Version: `^2.1.0` (matches agent-bus, contracts, cli)
- Installed version in workspace: `2.1.9`
- Lockfile: +12 lines (expected, limited)
- Frozen install passes

### 2. Added test script
```json
"scripts": {
  "build": "tsc --build",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```
Matches convention exactly.

### Files Modified
| File | Change |
|------|--------|
| `packages/external-agents/package.json` | +2 lines: test script, vitest devDep |
| `pnpm-lock.yaml` | +12 lines: vitest devDep resolution |

### No Other Files Touched
No runtime source, no contracts, no config files, no test content changes.

---

## Test Results

### External-Agents Tests
```
 ✓ src/__tests__/traceLedger.test.ts (27 tests) 64ms
 ✓ src/__tests__/schemas.test.ts (27 tests) 25ms
 ✓ src/__tests__/fileBus.test.ts (14 tests) 60ms

 Test Files  3 passed (3)
      Tests  68 passed (68)
```

### Full Test Matrix
```
 @tripp-os/contracts ........ 17 passed  (1 file)
 @tripp-os/agent-bus ........ 79 passed  (3 files)
 @tripp-reason/external-agents  68 passed  (3 files)  ← NEW
 @tripp-reason/cli ........... 195 passed (6 files)
 ─────────────────────────────────────────
 Total ....................... 359 passed (13 files)
```

### Typecheck
```
12/12 packages — 0 errors
```

---

## Safety Checks

| Check | Result |
|-------|--------|
| Runtime source changes | ❌ None |
| Public contract changes | ❌ None |
| Live-agent activation | ❌ None |
| Transport activation | ❌ None |
| Fake/manual defaults | ✅ Unchanged |
| ApprovalGate | ✅ Unchanged (fail-closed) |
| Command execution paths | ❌ No new paths |
| shared-agent-bus writes | ❌ None |
| Dependencies beyond vitest | ❌ None |

---

## Summary
The last remaining test harness gap is resolved. External-agents 68 tests now run as part of the workspace. The vitest devDep is test-only, matches existing conventions, and required zero runtime changes.
