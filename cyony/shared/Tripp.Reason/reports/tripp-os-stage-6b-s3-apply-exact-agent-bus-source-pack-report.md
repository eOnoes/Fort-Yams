# Tripp.OS Stage 6B-S3 — Apply Exact Agent Bus Source Pack Report

## PHASE

Stage 6B-S3 — Apply Exact Agent Bus Source Pack + Workspace Dependency Wiring

## STATUS

**PASS — Source pack verified on Cyony side** ✅

**Kimi must complete workspace-side apply and validate.**

## EXECUTIVE VERDICT

The source pack is verified correct and ready for Kimi to apply. Stage 6B can receive Stop Point 6B signoff once Kimi:
1. Replaces the placeholder `packages/agent-bus` with this source pack
2. Wires `@tripp-os/agent-bus` as a workspace dependency for `runtime-queue`
3. Confirms 68/68 Agent Bus tests pass in his workspace
4. Confirms runtime-queue remains read-only

---

## SOURCE PACK PREFLIGHT

**Archive:** `tripp-os-agent-bus-stage-2-exact-source-pack.tar.gz` (29,783 bytes)
**Source folder:** `agent-bus-handoff/packages/agent-bus/`
**Location:** `/opt/data/shared/Tripp.Reason/sync/`

Both present. ✅

---

## EXACT AGENT BUS BASELINE CHECK

### Required files — all present ✅

| File | Type | Size |
|------|------|------|
| `package.json` | config | 466B |
| `tsconfig.json` | config | 280B |
| `src/index.ts` | source | 485B |
| `src/constants.ts` | source | 1,345B |
| `src/schemas.ts` | source | 12,287B |
| `src/fileBus.ts` | source | 14,137B |
| `src/traceSchemas.ts` | source | 6,221B |
| `src/traceLedger.ts` | source | 8,530B |
| `src/transportSchemas.ts` | source | 7,905B |
| `src/transport.ts` | source | 9,285B |
| `src/__tests__/schemas.test.ts` | test | 11,064B |
| `src/__tests__/fileBus.test.ts` | test | 8,418B |
| `src/__tests__/traceLedger.test.ts` | test | 13,105B |

**Total: 13 files (8 source, 3 test, 2 config)**

### Forbidden placeholder files — all absent ✅

```
src/version.ts              absent ✅
src/enums.ts                absent ✅
src/types.ts                absent ✅
src/validators.ts           absent ✅
src/mutations.ts            absent ✅
src/__tests__/validators.test.ts  absent ✅
src/__tests__/mutations.test.ts   absent ✅
```

---

## AGENT BUS TEST SPLIT

| Test file | Run | Result |
|-----------|-----|--------|
| `schemas.test.ts` | 27 | ✅ PASS |
| `fileBus.test.ts` | 14 | ✅ PASS |
| `traceLedger.test.ts` | 27 | ✅ PASS |
| **Total** | **68** | **✅ PASS** |

Validated from monorepo: `npx vitest run` → 68/68 PASS, 1.34s.

---

## AGENT BUS BUILDS

| Package | Command | Result |
|---------|---------|--------|
| `@tripp-os/agent-bus` | `npx tsc --build` | ✅ |
| `@tripp-os/contracts` | `npx vitest run` | ✅ 17/17 |

---

## DEPENDENCY WIRING (for Kimi)

### Step 1: Remove placeholder
```bash
rm -rf packages/agent-bus
```

### Step 2: Extract source pack
```bash
tar xzf tripp-os-agent-bus-stage-2-exact-source-pack.tar.gz
cp -r agent-bus-handoff/packages/agent-bus packages/agent-bus
```

### Step 3: Remove vendor copy
```bash
rm -rf packages/runtime-queue/node_modules/@tripp-os/agent-bus
```

### Step 4: Wire workspace dependency

In `packages/runtime-queue/package.json`:
```json
{
  "dependencies": {
    "@tripp-os/agent-bus": "workspace:*"
  }
}
```

If workspace doesn't support `workspace:*`, use the local equivalent (e.g. `"link:../agent-bus"` or `"file:../agent-bus"`).

### Step 5: Update tsconfig extends

Delivered `tsconfig.json` extends `../../../tsconfig.base.json`. Adjust to match workspace layout:
- If `packages/agent-bus/` is at root level, likely `../../tsconfig.base.json`
- Replace with self-contained config if no shared base exists

### Step 6: Install and validate
```bash
pnpm install
cd packages/agent-bus && npx vitest run    # expect 68/68
cd packages/runtime-queue && npx vitest run # expect all passing
```

---

## RUNTIME QUEUE ALIGNMENT

### Allowed imports in Stage 6B (schemas, types, constants, pure read helpers)

```typescript
// Schemas & types
import type {
  ExternalAgentTaskPacket,
  ExternalAgentResultPacket,
  ExternalAgentReviewPacket,
  ExternalAgentRole,
  ExternalAgentPacketStatus,
  ExternalAgentTrustZone,
  ExternalAgentReviewVerdict,
} from "@tripp-os/agent-bus";

import {
  ExternalAgentTaskPacketSchema,
  ExternalAgentResultPacketSchema,
  ExternalAgentReviewPacketSchema,
  ValidatedTaskPacketSchema,
  ValidatedReviewPacketSchema,
  ExternalAgentRoleSchema,
  ExternalAgentPacketStatusSchema,
  ExternalAgentApprovalPolicySchema,
  ExternalAgentToolPolicySchema,
} from "@tripp-os/agent-bus";

// Read-only helpers (validate, read, list — no write/move/create)
import {
  readTaskPacket,
  readResultPacket,
  readReviewPacket,
  listInboxPackets,
  listOutboxPackets,
  listReviewPackets,
} from "@tripp-os/agent-bus";

// Constants (path strings only)
import {
  AGENT_BUS_INBOX,
  AGENT_BUS_OUTBOX,
  AGENT_BUS_REPORTS,
  AGENT_BUS_ARCHIVE,
  AGENT_BUS_REJECTED,
  DEFAULT_DENIED_PATHS,
  SCHEMA_VERSION,
} from "@tripp-os/agent-bus";
```

### Read-only classification

| Import | Category | Allowed in 6B? |
|--------|----------|----------------|
| `ExternalAgentTaskPacketSchema` | schema | ✅ |
| `ExternalAgentResultPacketSchema` | schema | ✅ |
| `ExternalAgentReviewPacketSchema` | schema | ✅ |
| `ValidatedTaskPacketSchema` | schema | ✅ |
| `ValidatedReviewPacketSchema` | schema | ✅ |
| `ExternalAgentRoleSchema` | schema | ✅ |
| `ExternalAgentPacketStatusSchema` | schema | ✅ |
| `ExternalAgentApprovalPolicySchema` | schema | ✅ |
| `ExternalAgentToolPolicySchema` | schema | ✅ |
| Type-only imports | type | ✅ |
| `readTaskPacket` | read-only helper | ✅ |
| `readResultPacket` | read-only helper | ✅ |
| `readReviewPacket` | read-only helper | ✅ |
| `listInboxPackets` | read-only helper | ✅ |
| `listOutboxPackets` | read-only helper | ✅ |
| `listReviewPackets` | read-only helper | ✅ |
| `AGENT_BUS_INBOX` | constant | ✅ |
| `AGENT_BUS_OUTBOX` | constant | ✅ |
| `AGENT_BUS_REPORTS` | constant | ✅ |
| `AGENT_BUS_ARCHIVE` | constant | ✅ |
| `AGENT_BUS_REJECTED` | constant | ✅ |
| `DEFAULT_DENIED_PATHS` | constant | ✅ |
| `SCHEMA_VERSION` | constant | ✅ |

**Mutating helper count: ZERO** ✅

### Forbidden imports

```typescript
// ❌ DO NOT IMPORT in Stage 6B:
writeTaskPacket         // writes to inbox
writeResultPacket       // writes to outbox
writeReviewPacket       // writes to reports
ensureAgentBus          // creates directories
getAgentBusPaths        // creates directories
movePacketToArchive     // moves files
movePacketToRejected    // moves files
createTraceEvent        // creates trace objects
appendTraceEvent        // writes to trace ledger
dispatchToFakeAgent     // dispatches + writes results
dispatchToManualFileTransport  // dispatches
```

---

## READ-ONLY GUARANTEE

Runtime-queue imports only schemas, types, constants, and read/list helpers. No write, move, create, claim, dispatch, or trace imports.

Any validation runtime-queue needs beyond what Agent Bus exposes as read-only should be created locally inside runtime-queue using `safeParse()` on the imported schemas.

---

## STATIC AUDIT

| Check | Cyony-side verification |
|-------|------------------------|
| Exact Agent Bus file list matches source pack | ✅ 13/13 present |
| Placeholder files absent | ✅ 7/7 absent |
| Agent Bus tests pass 68/68 | ✅ |
| No Runtime implementation in Agent Bus | ✅ |
| No live adapters in Agent Bus | ✅ |
| No dashboard/API/server in Agent Bus | ✅ |
| No MCP/store extraction | ✅ |

---

## DRIFT / SCOPE WATCH

| Check | Status |
|-------|--------|
| No Stage 6C trace writer | ✅ |
| No Stage 6D packet lifecycle | ✅ |
| No Stage 6E approval coordinator | ✅ |
| No Stage 6F safe-mode/panic | ✅ |
| No Stage 6G adapter runner | ✅ |
| No Stage 6H API/server | ✅ |
| No queue mutation | ✅ |
| No packet claiming | ✅ |
| No dispatch | ✅ |
| No archive/reject/dead-letter | ✅ |
| No trace writes | ✅ |
| No live adapters | ✅ |
| No dashboard/API/server features | ✅ |
| No Stage 1B/v5 expansion | ✅ |
| No MCP/store extraction | ✅ |

---

## BLOCKERS

**None from Cyony side.** Source pack verified, tests pass, no drift.

---

## NEXT STEP

**Kimi: apply the pack, wire dependencies, confirm 68/68 tests, then Stage 6B Stop Point signoff.**

Report path for Kimi's own validation report: `reports/tripp-os-stage-6b-s3-apply-exact-agent-bus-source-pack-report.md`
