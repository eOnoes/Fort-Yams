# Tripp.Reason Stage 6E-1 — External-Agents Test Harness Dependency Audit

**Date:** 2026-06-06
**Stage:** Reason-6E-1
**Assigned:** Cyony

---

## Final Decision

**TRIPP_REASON_6E_1_PASS_VITEST_DEVDEP_APPROVED_CHAINING_TO_6E_2**

---

## Audit Summary

### Package Inspected
- **Path:** `packages/external-agents/`
- **Name:** `@tripp-reason/external-agents`
- **Type:** `module`

### Existing Scripts
| Script | Status |
|--------|--------|
| `build` | ✅ `tsc --build` |
| `typecheck` | ✅ `tsc --noEmit` |
| `test` | ❌ Missing |

### Test Files Found
| File | Lines | Imports |
|------|-------|---------|
| `traceLedger.test.ts` | 431 | vitest, node:fs, node:path, node:os, node:crypto |
| `fileBus.test.ts` | 215 | vitest, node:fs, node:path, node:os |
| `schemas.test.ts` | 322 | vitest |

All 3 test files use `vitest` imports (`describe, it, expect, beforeEach, afterEach`).

### Current Dependencies
```json
"dependencies": {
  "@tripp-os/agent-bus": "workspace:*",
  "zod": "^3.24.0"
},
"devDependencies": {
  "@types/node": "^20.0.0"
}
```

### Workspace Context
- **vitest@2.1.9** is already installed in workspace `node_modules` (hoisted by pnpm)
- 3 other workspace packages use the exact same pattern:
  - `@tripp-os/agent-bus`: vitest@^2.1.0 devDep, `"test": "vitest run"`
  - `@tripp-os/contracts`: vitest@^2.1.0 devDep, `"test": "vitest run"`
  - `@tripp-reason/cli`: vitest@^2.1.0 devDep, `"test": "vitest run"`
- No vitest.config.ts files exist — vitest uses default auto-discovery
- Running `npx vitest run` from external-agents fails with `vitest: not found` (pnpm strict mode)

### Minimum Change Required
1. Add `"vitest": "^2.1.0"` to devDependencies
2. Add `"test": "vitest run"` to scripts

**No other changes needed.** These match the existing convention exactly. No vitest config file needed — tests auto-discover from `__tests__/**` patterns.

### Approval Scope
- ✅ vitest is test-only (devDependency)
- ✅ No runtime package depends on vitest
- ✅ No runtime behavior changes
- ✅ Lockfile change is expected and limited
- ✅ No other dependencies needed
- ✅ Same version (`^2.1.0`) as all other packages

### Baseline Validation (before changes)
- Typecheck: 0 errors (12/12)
- Tests: 291/291 (79 + 17 + 195)
- Lockfile: clean, frozen install passes

### Classification
**vitest devDependency approved.** This is the exact minimum change matching existing repo conventions. The tests are already written; they just need the harness wired.
