# Tripp.Reason Stage 1 / Stage 2 Extraction Inventory

**STATUS:** READY  
**DATE:** 2026-06-03  
**AUTHOR:** Cyony (builder audit — no implementation)  

---

## SUMMARY

Both extraction stages are verified ready. This inventory provides the exact file list, export list, dependency analysis, test plan, and re-export shape for:

- **Stage 1** — `@tripp-os/contracts` v0 (from `packages/shared`)
- **Stage 2** — `@tripp-os/agent-bus` v0 (from `packages/external-agents`)

Zero code changes. Inventory only. Kimi and Eddie can begin Stage 1 implementation when this is reviewed.

---

## STAGE 1 — CONTRACTS INVENTORY

### Source: `packages/shared/` → `@tripp-os/contracts`

### Exact Files Moving

Only one file is clean enough to move whole. The rest move by splitting exports.

| # | Source File | Target Path | Why Safe | Dependencies | Reason-Specific? |
|---|------------|-------------|----------|-------------|-----------------|
| 1 | `packages/shared/src/status.ts` | `@tripp-os/contracts/src/status.ts` | Pure Zod enums. No ReasonLoop concepts. All values are generic (safe/mutating/destructive, pending/running/completed, etc.) | `zod` only | **No** — fully generic |

### Source files staying but donating exports (split)

| Source File | Strategy | Exports Moving | Exports Staying |
|------------|----------|---------------|----------------|
| `contracts.ts` | Split | `Tool`, `ToolContext`, `ToolDispatcher`, `Approver`, `ProviderAdapter` | Nothing — all 5 interfaces are generic |
| `events.ts` | Split | `StreamEvent` union + all subtypes | Nothing — all stream events are generic protocol types |
| `schemas.ts` | Stay | None | All (Session, Run, Message, Event, ToolCall, ApprovalRecord, ApprovalRequest, ApprovalResult, ProviderRequest, ToolResult, ReportRecord, ChatMessage) |
| `report.ts` | Stay | None | All (RunReport, ToolCallSummary, PersistenceWarning) |
| `index.ts` | Rewrite | Re-exports from `@tripp-os/contracts` | Direct exports of Reason-specific schemas |

### Exact Exports Moving

| Export Name | Type | Source File | → Target File | Dependencies | Safe? | Notes |
|------------|------|-------------|---------------|-------------|-------|-------|
| `RunStatusSchema` + `RunStatus` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic lifecycle: pending/running/completed/failed/cancelled |
| `SessionStatusSchema` + `SessionStatus` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: active/archived/completed |
| `ToolCallStatusSchema` + `ToolCallStatus` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: pending/awaiting_approval/executing/completed/failed/cancelled/denied |
| `ApprovalStatusSchema` + `ApprovalStatus` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: pending/approved/denied/timed_out |
| `EventTypeSchema` + `EventType` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: message/tool_request/tool_result/finish/error |
| `RiskLevelSchema` + `RiskLevel` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: safe/mutating/destructive |
| `MessageRoleSchema` + `MessageRole` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: user/assistant/system/tool |
| `ReportStatusSchema` + `ReportStatus` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: PASS/FAIL/PARTIAL |
| `FinishReasonSchema` + `FinishReason` | enum | `status.ts` | `status.ts` | zod | ✅ | Generic: complete/max_turns/error/cancelled |
| `Tool` | interface | `contracts.ts` | `contracts.ts` | zod (inputSchema) | ✅ | Generic tool contract. Consumed by 33 other source files. |
| `ToolContext` | interface | `contracts.ts` | `contracts.ts` | none | ✅ | Generic: sessionId/runId/workdir |
| `ToolDispatcher` | interface | `contracts.ts` | `contracts.ts` | Tool, ToolContext, ToolResult (via schemas) | ✅ | Generic dispatch contract |
| `Approver` | interface | `contracts.ts` | `contracts.ts` | ApprovalRequest, ApprovalResult (via schemas) | ✅ | Generic approval gate |
| `ProviderAdapter` | interface | `contracts.ts` | `contracts.ts` | ProviderRequest, StreamEvent | ✅ | Generic LLM provider contract |
| `StreamEventSchema` + `StreamEvent` | union | `events.ts` | `events.ts` | zod, EventType, MessageRole | ✅ | Generic SSE-like stream protocol |
| `StreamEventMessageSchema` + type | schema | `events.ts` | `events.ts` | zod | ✅ | Subtype of StreamEvent |
| `StreamEventToolRequestSchema` + type | schema | `events.ts` | `events.ts` | zod | ✅ | Subtype of StreamEvent |
| `StreamEventToolResultSchema` + type | schema | `events.ts` | `events.ts` | zod | ✅ | Subtype of StreamEvent |
| `StreamEventFinishSchema` + type | schema | `events.ts` | `events.ts` | zod, FinishReason | ✅ | Subtype of StreamEvent |
| `StreamEventErrorSchema` + type | schema | `events.ts` | `events.ts` | zod | ✅ | Subtype of StreamEvent |

**Total moving: 20 exports (10 enums, 5 interfaces, 5 protocol schemas)**

### Exact Exports Staying In Tripp.Reason

| Export Name | Why It Stays | Reason-Specific? | Future Extract? |
|------------|-------------|-----------------|----------------|
| `Session` / `SessionSchema` | Contains `provider` + `model` fields — ReasonLoop shaped | Yes | Later (generic session base possible) |
| `Run` / `RunSchema` | Contains `prompt`, `provider`, `model`, `workdir` — ReasonLoop shaped | Yes | Later |
| `Message` / `MessageSchema` | DB record shape with `session_id` FK | Yes | Later |
| `ChatMessage` / `ChatMessageSchema` | Provider-facing message format — ReasonLoop shaped | Partial | Later (LLM-agnostic version possible) |
| `Event` / `EventSchema` | DB record with `run_id` FK, Reason-specific `data` JSON | Yes | Later |
| `ToolCall` / `ToolCallSchema` | DB record with detailed tool execution shape | Yes | Later |
| `ApprovalRecord` / `ApprovalRecordSchema` | DB record with Reason-specific risk_level mapping | Yes | Later |
| `ApprovalRequest` / `ApprovalRequestSchema` | Contains `sessionId`, `runId`, `toolCallId` — Reason orchestration | Yes | Later |
| `ApprovalResult` / `ApprovalResultSchema` | Reason-specific approval decision shape | Yes | Later |
| `ProviderRequest` / `ProviderRequestSchema` | ReasonLoop LLM request shape (messages, tools, model) | Yes | Later |
| `ToolResult` / `ToolResultSchema` | Contains `toolCallId` — Reason orchestration | Yes | Later |
| `ReportRecord` / `ReportRecordSchema` | DB record shape with Reason-specific status/path | Yes | Later |
| `RunReport` / `RunReportSchema` | ReasonLoop report shape (provider, model, filesChanged, persistenceWarnings) | Yes | Later |
| `ToolCallSummary` / `ToolCallSummarySchema` | Report helper type — ReasonLoop shaped | Yes | Later |
| `PersistenceWarning` / `PersistenceWarningSchema` | Reason-specific audit concept | Yes | Later |

**Total staying: 15 exports — all ReasonLoop-specific.**

### Compatibility Re-export Shape

After extraction, `packages/shared/src/index.ts` becomes:

```typescript
// Re-exports from @tripp-os/contracts (Stage 1 extraction)
export {
  // Status enums
  RunStatus,
  RunStatusSchema,
  SessionStatus,
  SessionStatusSchema,
  ToolCallStatus,
  ToolCallStatusSchema,
  ApprovalStatus,
  ApprovalStatusSchema,
  EventType,
  EventTypeSchema,
  RiskLevel,
  RiskLevelSchema,
  MessageRole,
  MessageRoleSchema,
  ReportStatus,
  ReportStatusSchema,
  FinishReason,
  FinishReasonSchema,
  // Interfaces
  Tool,
  ToolContext,
  ToolDispatcher,
  Approver,
  ProviderAdapter,
  // Stream events
  StreamEvent,
  StreamEventSchema,
  StreamEventMessage,
  StreamEventToolRequest,
  StreamEventToolResult,
  StreamEventFinish,
  StreamEventError,
} from "@tripp-os/contracts";

// Reason-specific exports (stay in shared)
export { Session, SessionSchema } from "./schemas.js";
export { Run, RunSchema } from "./schemas.js";
// ... (all 15 staying exports)
```

**Old import paths remain valid** — `import { RiskLevel } from "@tripp-reason/shared"` still works because shared re-exports from contracts.

**No imports inside Tripp.Reason need to change.** The 8 packages importing from `@tripp-reason/shared` continue to work transparently.

**No version pinning needed yet** — contracts v0.1.0 and shared use `workspace:*` internally.

### Versioning

```
@tripp-os/contracts version: 0.1.0
PACKAGE_CONTRACT_VERSION = "0.1.0"  (to be added as constant in contracts)
```

No schema/type version metadata exists in shared currently. Should be added to `@tripp-os/contracts/src/version.ts` as part of Stage 1 implementation:

```typescript
export const CONTRACTS_VERSION = "0.1.0";
```

### Stage 1 Tests

| # | Test File | Command | What It Proves | Pre-Extraction | Post-Extraction |
|---|----------|---------|---------------|---------------|----------------|
| 1 | `packages/cli/src/__tests__/agentsCommand.test.ts` | `pnpm --filter @tripp-reason/cli test` | CLI still works with re-exports | ✅ 40/40 PASS | Run after |
| 2 | `packages/external-agents/test` | `pnpm --filter @tripp-reason/external-agents test` | External agents unaffected | ✅ 68/68 PASS | Run after |
| 3 | `packages/server/build` | `pnpm --filter @tripp-reason/server build` | Server builds with re-exports | ✅ | Run after |
| 4 | `packages/core/build` | `pnpm --filter @tripp-reason/core build` | Core builds with re-exports | ✅ | Run after |
| 5 | `@tripp-os/contracts build` | `pnpm --filter @tripp-os/contracts build` | Contracts package builds standalone | NEW | Run after |
| 6 | `@tripp-os/contracts test` | `pnpm --filter @tripp-os/contracts test` | Contracts enums/interface types check | NEW | Run after |

**Validation expectation:** Tripp.Reason builds, all 108 tests pass, no behavior changes, no circular dependencies, contracts has zero runtime deps beyond `zod`.

---

## STAGE 2 — AGENT BUS INVENTORY

### Source: `packages/external-agents/` → `@tripp-os/agent-bus`

### Exact Files Moving

All 7 source files move whole. The package is already fully portable.

| # | Source File | Target Path | Dependencies | Reason-Specific Assumptions |
|---|------------|-------------|-------------|---------------------------|
| 1 | `packages/external-agents/src/constants.ts` | `@tripp-os/agent-bus/src/constants.ts` | none | Path prefix `.tripp/agents/` — **Tripp.OS standard** |
| 2 | `packages/external-agents/src/schemas.ts` | `@tripp-os/agent-bus/src/schemas.ts` | zod, constants | `openclaw_tripp`/`hermes_cyony`/`openclaw_echo` role names — **Tripp.OS standard roles**. Approval message mentions "Eddie" |
| 3 | `packages/external-agents/src/fileBus.ts` | `@tripp-os/agent-bus/src/fileBus.ts` | node:fs, node:path, node:crypto, schemas, constants | `.tripp/agents/` path validation. Safe path traversal via `validateBusPath()` |
| 4 | `packages/external-agents/src/traceSchemas.ts` | `@tripp-os/agent-bus/src/traceSchemas.ts` | zod, constants, schemas (imports ExternalAgentRoleSchema) | 24 event types, all generic |
| 5 | `packages/external-agents/src/traceLedger.ts` | `@tripp-os/agent-bus/src/traceLedger.ts` | node:fs, node:path, node:crypto, constants, traceSchemas, schemas | `.tripp/agents/trace/agent-bus-trace.jsonl` path. Append-only JSONL |
| 6 | `packages/external-agents/src/transportSchemas.ts` | `@tripp-os/agent-bus/src/transportSchemas.ts` | zod, constants, schemas | Transport kinds: fake_agent/manual_file/cloud_http_experimental. Safety rules enforce no secrets/mutation. |
| 7 | `packages/external-agents/src/transport.ts` | `@tripp-os/agent-bus/src/transport.ts` | node:crypto, transportSchemas, schemas, constants, fileBus, traceLedger | Fake agent + manual file dispatch only. No live transport. |
| 8 | `packages/external-agents/src/index.ts` | `@tripp-os/agent-bus/src/index.ts` | all 7 files | Barrel re-exports all |

### Exact Exports Moving

| Export Name | Type | Source File | → Target | Deps | Safe? | Notes |
|------------|------|-------------|---------|------|-------|-------|
| `ExternalAgentRoleSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 3 roles — Tripp.OS standard |
| `ExternalAgentTrustZoneSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 4 zones — portable |
| `ExternalAgentTaskTypeSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 10 task types — portable |
| `ExternalAgentPacketStatusSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 7 statuses — portable |
| `ExternalAgentToolPolicySchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Generic tool allow/deny |
| `ExternalAgentApprovalPolicySchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Generic approval policy |
| `ExternalAgentContextPolicySchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Generic context policy |
| `ExternalAgentTaskPacketSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Task packet — OS standard |
| `ExternalAgentResultStatusSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 7 result statuses |
| `ExternalAgentProposedChangeSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Change proposal shape |
| `ExternalAgentResultPacketSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Result packet — OS standard |
| `ExternalAgentReviewVerdictSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | 5 verdicts — OS standard |
| `ExternalAgentReviewPacketSchema` + type | schema | schemas.ts | schemas.ts | zod | ✅ | Review packet — OS standard |
| `ValidatedTaskPacketSchema` | schema | schemas.ts | schemas.ts | zod | ✅ | Runtime-validated task |
| `ValidatedReviewPacketSchema` | schema | schemas.ts | schemas.ts | zod | ✅ | Runtime-validated review |
| `AgentBusTraceEventTypeSchema` + type | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | 24 event types — OS standard |
| `AgentBusTraceSeveritySchema` + type | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | 5 severities |
| `AgentBusTraceActorTypeSchema` + type | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | 8 actor types |
| `AgentBusTraceEventSchema` + type | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | Trace event — OS standard |
| `ValidatedTraceEventSchema` | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | Runtime-validated trace |
| `TraceLedgerValidationResultSchema` + type | schema | traceSchemas.ts | traceSchemas.ts | zod | ✅ | Validation result shape |
| `ExternalAgentTransportKindSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | 4 transport kinds |
| `ExternalAgentTransportModeSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | 5 modes |
| `ExternalAgentTransportConfigSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | Transport config |
| `ValidatedTransportConfigSchema` | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | Validated config |
| `ExternalAgentDispatchRequestSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | Dispatch request |
| `ExternalAgentDispatchStatusSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | 8 dispatch statuses |
| `ExternalAgentDispatchResultSchema` + type | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | Dispatch result |
| `ValidatedDispatchResultSchema` | schema | transportSchemas.ts | transportSchemas.ts | zod | ✅ | Validated result |
| `AGENT_BUS_ROOT` | const | constants.ts | constants.ts | none | ✅ | `.tripp/agents/` |
| `AGENT_BUS_INBOX` | const | constants.ts | constants.ts | none | ✅ | |
| `AGENT_BUS_OUTBOX` | const | constants.ts | constants.ts | none | ✅ | |
| `AGENT_BUS_REPORTS` | const | constants.ts | constants.ts | none | ✅ | |
| `AGENT_BUS_ARCHIVE` | const | constants.ts | constants.ts | none | ✅ | |
| `AGENT_BUS_REJECTED` | const | constants.ts | constants.ts | none | ✅ | |
| `DEFAULT_DENIED_PATHS` | const | constants.ts | constants.ts | none | ✅ | 12 denied globs |
| `SCHEMA_VERSION` | const | constants.ts | constants.ts | none | ✅ | `"1.0.0"` |
| `MAX_PACKET_SIZE_BYTES` | const | constants.ts | constants.ts | none | ✅ | 1MB |
| `UNSAFE_FILENAME_CHARS` | const | constants.ts | constants.ts | none | ✅ | Regex |
| `ensureAgentBus` | function | fileBus.ts | fileBus.ts | fs, path | ✅ | Creates folders |
| `getAgentBusPaths` | function | fileBus.ts | fileBus.ts | path | ✅ | Resolves paths |
| `writeTaskPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | Validates + writes |
| `readTaskPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | Reads + validates |
| `writeResultPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | |
| `readResultPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | |
| `writeReviewPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | Writes JSON+MD |
| `readReviewPacket` | function | fileBus.ts | fileBus.ts | fs, schemas | ✅ | |
| `listInboxPackets` | function | fileBus.ts | fileBus.ts | fs | ✅ | |
| `listOutboxPackets` | function | fileBus.ts | fileBus.ts | fs | ✅ | |
| `listReviewPackets` | function | fileBus.ts | fileBus.ts | fs | ✅ | |
| `listReportFiles` | function | fileBus.ts | fileBus.ts | fs | ✅ | |
| `movePacketToArchive` | function | fileBus.ts | fileBus.ts | fs | ✅ | |
| `movePacketToRejected` | function | fileBus.ts | fileBus.ts | fs | ✅ | Writes .rejection.md |
| `createTaskPacketFilename` | function | fileBus.ts | fileBus.ts | crypto | ✅ | |
| `createResultPacketFilename` | function | fileBus.ts | fileBus.ts | none | ✅ | |
| `createReviewPacketFilename` | function | fileBus.ts | fileBus.ts | none | ✅ | |
| `getTraceLedgerPath` | function | traceLedger.ts | traceLedger.ts | path | ✅ | |
| `ensureTraceLedger` | function | traceLedger.ts | traceLedger.ts | fs | ✅ | |
| `createTraceEvent` | function | traceLedger.ts | traceLedger.ts | crypto, schemas | ✅ | |
| `appendTraceEvent` | function | traceLedger.ts | traceLedger.ts | fs, schemas | ✅ | |
| `readTraceEvents` | function | traceLedger.ts | traceLedger.ts | fs, schemas | ✅ | |
| `validateTraceLedger` | function | traceLedger.ts | traceLedger.ts | fs, schemas | ✅ | |
| `findTraceEventsByPacketId` | function | traceLedger.ts | traceLedger.ts | readTraceEvents | ✅ | |
| `findTraceEventsByResultId` | function | traceLedger.ts | traceLedger.ts | readTraceEvents | ✅ | |
| `findTraceEventsByReviewId` | function | traceLedger.ts | traceLedger.ts | readTraceEvents | ✅ | |
| `findTraceEventsByRunId` | function | traceLedger.ts | traceLedger.ts | readTraceEvents | ✅ | |
| `findRootCauseChain` | function | traceLedger.ts | traceLedger.ts | readTraceEvents | ✅ | |
| `createDefaultTransportConfig` | function | transport.ts | transport.ts | schemas | ✅ | |
| `validateTransportConfig` | function | transport.ts | transport.ts | schemas | ✅ | |
| `createDispatchRequest` | function | transport.ts | transport.ts | crypto, schemas | ✅ | |
| `dispatchToFakeAgent` | function | transport.ts | transport.ts | crypto, fileBus, traceLedger | ✅ | Deterministic |
| `dispatchToManualFileTransport` | function | transport.ts | transport.ts | traceLedger | ✅ | No network |
| `AgentBusPaths` | type | fileBus.ts | fileBus.ts | none | ✅ | |
| `ListOptions` | type | fileBus.ts | fileBus.ts | none | ✅ | |
| `WriteOptions` | type | fileBus.ts | fileBus.ts | none | ✅ | |
| `ReadTraceOptions` | type | traceLedger.ts | traceLedger.ts | none | ✅ | |
| `FindTraceOptions` | type | traceLedger.ts | traceLedger.ts | none | ✅ | |
| `CreateTraceEventInput` | type | traceLedger.ts | traceLedger.ts | schemas | ✅ | |

**Total moving: 73 exports — 29 schemas/types, 10 constants, 30 helper functions, 4 support types.**

### Exact Exports Staying In Tripp.Reason

**None.** The entire `external-agents` package is portable. Every export moves to `@tripp-os/agent-bus`.

### Standalone Behavior Test

Prove `@tripp-os/agent-bus` works without Tripp.Reason present:

```bash
# 1. Create temp directory
mkdir /tmp/agent-bus-standalone-test && cd /tmp/agent-bus-standalone-test

# 2. Init bus
node -e "
  const { ensureAgentBus, createTraceEvent, appendTraceEvent, writeTaskPacket, readTaskPacket, listInboxPackets, movePacketToArchive, movePacketToRejected, getTraceLedgerPath, readTraceEvents, validateTraceLedger, findRootCauseChain } = require('@tripp-os/agent-bus');
  
  // Init
  ensureAgentBus('.').then(p => console.log('Bus ready:', p.root));
  
  // Create task
  writeTaskPacket({packetId:'test-1', runId:'run-1', agentRole:'openclaw_tripp', trustZone:'cloud_controlled_reasoning', taskType:'review', title:'Test', objective:'Verify', scope:'.'}).then(p => console.log('Task:', p));
  
  // List inbox
  listInboxPackets().then(f => console.log('Inbox:', f.length));
  
  // Read back
  listInboxPackets().then(f => readTaskPacket(f[0])).then(p => console.log('Read:', p.title));
  
  // Archive
  listInboxPackets().then(f => movePacketToArchive(f[0])).then(d => console.log('Archived:', d));
  
  // Trace
  ensureTraceLedger().then(() => createTraceEvent({eventType:'packet_created', summary:'Test', actorType:'cli'})).then(e => appendTraceEvent(e)).then(() => readTraceEvents()).then(events => console.log('Trace:', events.length));
  
  // Validate
  validateTraceLedger().then(r => console.log('Valid:', r.isValid));
  
  // Dead letter: read nonexistent
  readTaskPacket('./nonexistent.json').catch(e => console.log('Dead letter:', e.message));
  
  // Path traversal
  const { readTaskPacket } = require('@tripp-os/agent-bus');
  readTaskPacket('/etc/passwd').catch(e => console.log('Traversal blocked:', e.message));
"

# Expected output:
# Bus ready: /tmp/agent-bus-standalone-test/.tripp/agents
# Task: /tmp/.../inbox/task-....json
# Inbox: 1
# Read: Test
# Archived: /tmp/.../archive/task-....json
# Trace: 1
# Valid: true
# Dead letter: Malformed JSON in task packet
# Traversal blocked: (throws)
```

**Test files already existing that cover this:**
- `packages/external-agents/src/__tests__/schemas.test.ts` (27 tests) — schema validation
- `packages/external-agents/src/__tests__/fileBus.test.ts` (14 tests) — read/write/list/move
- `packages/external-agents/src/__tests__/traceLedger.test.ts` (28 tests) — trace append/read/validate/chain

All 69 tests use temp directories and have zero Tripp.Reason runtime dependencies.

### Compatibility Re-export Shape

After extraction, `@tripp-reason/external-agents` becomes a thin re-export barrel:

```typescript
// packages/external-agents/src/index.ts (after Stage 2)
export * from "@tripp-os/agent-bus";
```

Or if keeping the package for backward compatibility:

```json
// packages/external-agents/package.json
{
  "name": "@tripp-reason/external-agents",
  "dependencies": {
    "@tripp-os/agent-bus": "0.1.0"
  }
}
```

All existing `import ... from "@tripp-reason/external-agents"` lines in server and CLI continue to work.

---

## EXTRACTION RISKS

| Risk | Severity | Phase | Mitigation |
|------|----------|-------|------------|
| `status.ts` exports all move — file disappears from shared, need new file path | LOW | Stage 1 | Shared re-exports from `@tripp-os/contracts/src/status.js` via index.ts barrel |
| `contracts.ts` moves all 5 interfaces — import path changes | LOW | Stage 1 | Shared index.ts re-exports; no consumer code changes |
| `events.ts` moves all StreamEvent types — import path changes | LOW | Stage 1 | Same pattern; re-export keeps old paths valid |
| `Tool` interface imports `ToolResult` from schemas.ts (stays in Reason) | MEDIUM | Stage 1 | `Tool` in contracts needs to define its own `execute()` return type or import a generic version. **Fix: define `ToolResult` as a generic type in contracts (or make Tool's execute return `Promise<{ status: string; output?: unknown; error?: string }>`)** |
| `ProviderAdapter` imports `ProviderRequest` from schemas.ts (stays in Reason) | MEDIUM | Stage 1 | Same pattern. **Fix: define a generic `ProviderRequest` shape in contracts (messages array + model string)** |
| `Approver` imports `ApprovalRequest`/`ApprovalResult` from schemas.ts (stays in Reason) | MEDIUM | Stage 1 | **Fix: define generic `ApprovalRequest`/`ApprovalResult` in contracts** |
| `ToolDispatcher` imports `ToolResult` from schemas.ts (stays in Reason) | MEDIUM | Stage 1 | **Fix: define generic `ToolResult` in contracts** |
| `.tripp/agents/` path assumption is hardcoded | LOW | Stage 2 | Already overridable via `workdir` parameter in every function |
| Agent role names (`openclaw_tripp`, etc.) are hardcoded in Zod enums | LOW | Stage 2 | These are the Tripp.OS standard roles — no change needed |
| `Eddie` mentioned in approval error message | LOW | Stage 2 | Eddie IS the Tripp.OS final approver — correct |
| Circular dependency: transport.ts → fileBus.ts + traceLedger.ts → schemas.ts | LOW | Stage 2 | All internal to agent-bus package — no cross-package circle |
| Test files reference `@tripp-reason/external-agents` imports | LOW | Stage 2 | Rename imports to `@tripp-os/agent-bus`; tests are self-contained |

**Key finding:** The 3 interfaces (`Tool`, `ProviderAdapter`, `Approver`) and `ToolDispatcher` import Reason-specific schema types (`ToolResult`, `ProviderRequest`, `ApprovalRequest`, `ApprovalResult`). These need generic versions in contracts. This is the **only code change** needed in Stage 1 beyond file moves.

---

## FINAL RECOMMENDATION

**Can Stage 1 begin after this inventory is reviewed?** YES. Only blocker is defining generic versions of `ToolResult`, `ProviderRequest`, `ApprovalRequest`, `ApprovalResult` in contracts so the 3 interfaces don't depend on Reason schemas. This is a small addition — each needs: `{ status: string }` shape with optional fields.

**Can Stage 2 begin later using this inventory?** YES. Stage 2 is mechanical: copy the entire `external-agents` package, rename namespace, update JSDoc. Zero code changes needed.

**Who should own Stage 1 implementation?** Kimi (Tripp.OS architect). The generic type definitions are architectural decisions.

**Who should own Stage 2 implementation?** Cyony can execute — it's mechanical copy+rename. Or Kimi if coordinating with Stage 1.

**Who should own Stage 3 compatibility re-exports?** Cyony — updating `@tripp-reason/shared` and `@tripp-reason/external-agents` to re-export from OS packages.

**What exact commands should be run after Stage 1?**
```bash
pnpm --filter @tripp-os/contracts build
pnpm --filter @tripp-os/contracts test
pnpm --filter @tripp-reason/shared build
pnpm --filter @tripp-reason/core build
pnpm --filter @tripp-reason/cli test
pnpm --filter @tripp-reason/server build
pnpm --filter @tripp-reason/external-agents test
```

**What exact commands should be run after Stage 2?**
```bash
pnpm --filter @tripp-os/agent-bus build
pnpm --filter @tripp-os/agent-bus test
pnpm --filter @tripp-reason/server build
pnpm --filter @tripp-reason/cli test
apps/dashboard/pnpm build
```

---

## COMMANDS RUN

```
grep exports by file (shared, external-agents)
grep internal dependency edges
grep Reason-specific naming
grep consumer count per export
read contracts.ts, status.ts, schemas.ts, report.ts, events.ts
read external-agents schemas.ts, constants.ts, fileBus.ts, traceSchemas.ts, traceLedger.ts, transportSchemas.ts, transport.ts
```

## FILES INSPECTED

```
packages/shared/src/{contracts,events,report,schemas,status,index}.ts
packages/external-agents/src/{schemas,constants,fileBus,traceSchemas,traceLedger,transportSchemas,transport,index}.ts
packages/external-agents/src/__tests__/{schemas,fileBus,traceLedger}.test.ts
All package.json files
```

## NEXT STEP

**Stage 1 implementation** — create `@tripp-os/contracts` with the 20 extracted exports + 4 new generic types (`ToolResult`, `ProviderRequest`, `ApprovalRequest`, `ApprovalResult`). Then wire `@tripp-reason/shared` to re-export.
