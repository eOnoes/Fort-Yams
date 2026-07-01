# Tripp.Reason — Stage Reason-Timeout-2A: CLI Typecheck Yellow-Flag Triage

**Generated:** 2026-06-06 06:05 UTC  
**Auditor:** Cyony (Oni)  
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_TIMEOUT_2A_PASS_TYPECHECK_YELLOW_FLAG_RESOLVED_CHAINING_TO_2B**

All 10 typecheck errors resolved. Test-only patches — non-null assertions on optional `metadata`/`details`. No runtime or contract changes. Full test suite passes (251/251). Typecheck clean across all 12 packages.

---

## 1. Errors Reproduced

```
dryRun.test.ts:153  TS2532 Object is possibly 'undefined' — approvalEvent!.details
dryRun.test.ts:154  TS2532 Object is possibly 'undefined' — approvalEvent!.details
dryRunGapClosure.test.ts:80   TS18048 r.metadata is possibly 'undefined'
dryRunGapClosure.test.ts:81   TS18048 r.metadata is possibly 'undefined'
dryRunGapClosure.test.ts:767  TS18048 result.metadata is possibly 'undefined'
dryRunGapClosure.test.ts:769  TS18048 result.metadata is possibly 'undefined'
dryRunGapClosure.test.ts:770  TS18048 result.metadata is possibly 'undefined'
hermesEchoTransportSkeleton.test.ts:180 TS18048 result.metadata is possibly 'undefined'
hermesEchoTransportSkeleton.test.ts:493 TS2532 Object is possibly 'undefined' — resultPacket.metadata
namedAgentAdapterSeparation.test.ts:331 TS18048 result.metadata is possibly 'undefined'
```

## 2. Root Cause

`ExternalAgentResultPacketSchema` defines `metadata: z.record(z.string(), z.unknown()).optional()` (line 251 in schemas.ts). TypeScript infers `metadata` as `Record<string, unknown> | undefined`. Test code accesses `.metadata.fake` etc. without narrowing.

## 3. Scope Confirmed

- **CLI test files only** — zero source type errors
- No contracts/schema type errors
- No agent-bus type errors
- No approval/runtime-adapter type errors
- All other 11 packages: typecheck clean

## 4. Patches Applied

| File | Lines | Change |
|---|---|---|
| dryRun.test.ts | 153-154 | `.details.` → `.details!.` |
| dryRunGapClosure.test.ts | 80-81 | `.metadata.` → `.metadata!.` |
| dryRunGapClosure.test.ts | 767-770 | `.metadata.` → `.metadata!.` |
| hermesEchoTransportSkeleton.test.ts | 180 | `.metadata.` → `.metadata!.` |
| hermesEchoTransportSkeleton.test.ts | 493 | `.metadata.` → `.metadata!.` |
| namedAgentAdapterSeparation.test.ts | 331 | `.metadata.` → `.metadata!.` |

**Strategy:** Non-null assertions — minimal, test-only, preserves assertion strength. Tests already validate metadata presence via `expect(result.metadata!.fake).toBe(true)` — the `!` tells TS "we know it's there."

## 5. Validation

- Typecheck: **0 errors across all 12 packages** ✓
- Full test matrix: **251/251 passing** ✓
- Lockfile: clean ✓

---

**Files changed:** 4 test files, +10/-10 lines (non-null assertions)
