# Agent Bus Placement & Integration Notes for Kimi

## Where To Place

Copy `packages/agent-bus/` into your Tripp.OS Runtime workspace at:

```
packages/agent-bus/
```

The package.json declares the scoped name `@tripp-os/agent-bus`. The folder name
`packages/agent-bus` matches your current workspace layout convention.

If your monorepo uses a scoped folder convention (`packages/@tripp-os/agent-bus`),
either path works — the package.json `name` field is what resolves imports.

## Package Identity

- **Name:** `@tripp-os/agent-bus`
- **Version:** `0.1.0`
- **Type:** ESM module
- **Dependencies:** `zod ^3.24.0` only (no Reason, no OS runtime)

## File Inventory (12 files)

```
packages/agent-bus/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          (barrel: re-exports all 7 modules)
│   ├── constants.ts       (bus paths, denied paths, schema version)
│   ├── schemas.ts         (13 packet/review/policy schemas + runtime validators)
│   ├── fileBus.ts         (14 helpers: read/write/list/move/review)
│   ├── traceSchemas.ts    (5 trace schemas: 24 event types, severities, actors)
│   ├── traceLedger.ts     (10 helpers: append/read/validate/query/chain)
│   ├── transportSchemas.ts (6 transport schemas with safety rules)
│   ├── transport.ts       (6 helpers: fake dispatch, manual file dispatch)
│   └── __tests__/
│       ├── schemas.test.ts    (27 tests)
│       ├── fileBus.test.ts    (14 tests)
│       └── traceLedger.test.ts (27 tests)
```

## Exports (73 total)

All re-exported through `index.ts`. Runtime packages import from `@tripp-os/agent-bus`.

Key exports your runtime-queue will need:

| Import | Purpose |
|--------|---------|
| `ExternalAgentTaskPacketSchema`, `ValidatedTaskPacketSchema` | Validate incoming task packets |
| `ExternalAgentResultPacketSchema` | Validate results from agents |
| `ExternalAgentReviewPacketSchema`, `ValidatedReviewPacketSchema` | Validate Echo reviews |
| `ExternalAgentRoleSchema` | Route packets to correct adapter |
| `ExternalAgentPacketStatusSchema` | Track packet lifecycle |
| `ExternalAgentApprovalPolicySchema` | Enforce `agentMayApprove: false` |
| `ExternalAgentToolPolicySchema` | Enforce tool restrictions |
| `writeTaskPacket`, `readTaskPacket` | Write/read inbox packets |
| `writeResultPacket`, `readResultPacket` | Write/read outbox results |
| `writeReviewPacket`, `readReviewPacket` | Write/read Echo reviews |
| `listInboxPackets`, `listOutboxPackets`, `listReviewPackets` | Queue snapshots |
| `movePacketToArchive`, `movePacketToRejected` | Lifecycle transitions |
| `ensureAgentBus`, `getAgentBusPaths` | Initialize bus directories |
| `AgentBusTraceEventSchema`, `ValidatedTraceEventSchema` | Validate trace events |
| `createTraceEvent`, `appendTraceEvent` | Write trace events |
| `readTraceEvents`, `validateTraceLedger` | Read/validate trace |
| `findTraceEventsByPacketId`, `findTraceEventsByRunId`, `findRootCauseChain` | Query/causal chain |
| `ExternalAgentTransportConfigSchema` | Configure adapter transports |
| `dispatchToFakeAgent`, `dispatchToManualFileTransport` | Fake/manual dispatch |
| `DEFAULT_DENIED_PATHS`, `AGENT_BUS_INBOX`, `AGENT_BUS_OUTBOX`, etc. | Path constants |

## Relationship to @tripp-reason/external-agents

In the Tripp.Reason monorepo, `@tripp-reason/external-agents` is now a thin re-export barrel:

```typescript
// packages/external-agents/src/index.ts
export * from "@tripp-os/agent-bus";
```

All 7 source files in `@tripp-os/agent-bus` are identical to the original
`@tripp-reason/external-agents` source files except for JSDoc namespace comments
(`@tripp-reason/external-agents` → `@tripp-os/agent-bus`). Zero functional changes.

## Relationship to @tripp-os/runtime-queue

runtime-queue should import from `@tripp-os/agent-bus` directly:

```typescript
import {
  ExternalAgentTaskPacketSchema,
  ExternalAgentResultPacketSchema,
  writeTaskPacket,
  readTaskPacket,
  writeResultPacket,
  listInboxPackets,
  listOutboxPackets,
  movePacketToArchive,
  movePacketToRejected,
  ensureAgentBus,
} from "@tripp-os/agent-bus";
```

Do not import from `@tripp-reason/external-agents` — that barrel exists only in
the Tripp.Reason monorepo for backward compatibility.

## Relationship to @tripp-os/runtime-trace (Stage 6C)

runtime-trace should import trace helpers from `@tripp-os/agent-bus`:

```typescript
import {
  createTraceEvent,
  appendTraceEvent,
  readTraceEvents,
  validateTraceLedger,
  findTraceEventsByPacketId,
  findRootCauseChain,
} from "@tripp-os/agent-bus";
```

The trace ledger file is `.tripp/agents/trace/agent-bus-trace.jsonl` (JSONL, append-only).

## Build & Test

```bash
cd packages/agent-bus
npx tsc --build          # build
npx vitest run            # 68/68 tests
```

Requires: `zod ^3.24.0`, `vitest ^2.1.0`, `@types/node ^20.0.0` (dev).

## Stage Background

| Stage | What | Report |
|-------|------|--------|
| 2 | Agent Bus extraction from @tripp-reason/external-agents | included |
| 3 | Tripp.Reason compatibility re-exports | included |
| 4 | Full extraction boundary power audit | included |
| 4A | Contracts reconciliation addendum | included |

## Verified: No Drift

- ✅ 7 source files, 3 test files
- ✅ 73 exports, 68/68 tests passing
- ✅ JSDoc namespace rename only — zero functional changes
- ✅ No Runtime, adapter, dashboard, MCP/store code
- ✅ Only dependency: zod
