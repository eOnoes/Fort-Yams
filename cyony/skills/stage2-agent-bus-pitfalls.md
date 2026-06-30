# Stage 2 — Agent Bus Extraction Pitfalls

## 68 vs 69 Test Count

**The inventory was wrong.** The Stage 2 inventory estimated 69 tests:
- schemas.test.ts: 27
- fileBus.test.ts: 14
- traceLedger.test.ts: 28 ← WRONG

Actual count: 27+14+27 = **68**. The `traceLedger.test.ts` file always had 27 tests, not 28. The inventory author miscounted. No test was removed, merged, or renamed.

**Verification:** `pnpm --filter @tripp-os/agent-bus test` → "Tests 68 passed (68)"

## sed Hits Approval Messages

When running `sed -i 's/@tripp-reason\/external-agents/@tripp-os\/agent-bus/g'` on all source files, the one user-facing string that should stay is:

```
"- ⚠️ **Tripp.Reason ApprovalGate remains authoritative.**",
```

This is NOT a namespace reference — it's a semantic statement about who controls mutations. It should remain as-is. After sed, grep for remaining `@tripp-reason|Tripp\.Reason` to verify only intentional references remain.

## Workspace Glob

`pnpm-workspace.yaml` with `packages: ["packages/*"]` does NOT match `packages/@tripp-os/agent-bus`. The shell glob `*` is single-level only. Must add:

```yaml
packages:
  - "packages/*"
  - "packages/@tripp-os/*"
  - "apps/*"
```

Without this, `pnpm --filter @tripp-os/agent-bus` returns "No projects matched the filters."

## Origin Package Cleanup

After extraction, the origin `@tripp-reason/external-agents` package.json changes:
- **Add** `"@tripp-os/agent-bus": "workspace:*"` to dependencies
- **Remove** `vitest` from devDependencies
- **Remove** `"test"` and `"test:watch"` scripts
- **Remove** `@types/node` if only needed for tests

The origin's `src/index.ts` becomes a one-liner: `export * from "@tripp-os/agent-bus";`
