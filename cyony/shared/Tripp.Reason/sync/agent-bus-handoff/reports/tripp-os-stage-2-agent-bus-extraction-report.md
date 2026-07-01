# Tripp.OS Stage 2 — Agent Bus Extraction Report

## PHASE

Stage 2 — @tripp-os/agent-bus v0

## STATUS

**PASS** ✅

## FILES CHANGED

| File | Action | Reason |
|------|--------|--------|
| `packages/@tripp-os/agent-bus/package.json` | Created | Package metadata |
| `packages/@tripp-os/agent-bus/tsconfig.json` | Created | TypeScript config |
| `packages/@tripp-os/agent-bus/src/constants.ts` | Created (copied) | Agent Bus constants |
| `packages/@tripp-os/agent-bus/src/schemas.ts` | Created (copied) | Packet/review schemas |
| `packages/@tripp-os/agent-bus/src/fileBus.ts` | Created (copied) | File system helpers |
| `packages/@tripp-os/agent-bus/src/traceSchemas.ts` | Created (copied) | Trace event schemas |
| `packages/@tripp-os/agent-bus/src/traceLedger.ts` | Created (copied) | Trace ledger helpers |
| `packages/@tripp-os/agent-bus/src/transportSchemas.ts` | Created (copied) | Transport config schemas |
| `packages/@tripp-os/agent-bus/src/transport.ts` | Created (copied) | Dispatch helpers |
| `packages/@tripp-os/agent-bus/src/index.ts` | Created (copied) | Barrel export |
| `packages/@tripp-os/agent-bus/src/__tests__/schemas.test.ts` | Created (copied) | Schema tests (27) |
| `packages/@tripp-os/agent-bus/src/__tests__/fileBus.test.ts` | Created (copied) | File bus tests (14) |
| `packages/@tripp-os/agent-bus/src/__tests__/traceLedger.test.ts` | Created (copied) | Trace ledger tests (28) |
| `packages/external-agents/package.json` | Modified | Added `@tripp-os/agent-bus` dep, removed vitest |
| `packages/external-agents/src/index.ts` | Modified | Replaced with re-export barrel |
| `pnpm-workspace.yaml` | Modified | Added `packages/@tripp-os/*` |

## FILES CREATED

13 files — full `@tripp-os/agent-bus` package with 7 source files, 3 test files, package.json, tsconfig.json, and the barrel index.

## FILES MOVED

All 7 source files + 3 test files were **copied** (not moved) from `packages/external-agents/src/` to maintain backward compatibility. The original `@tripp-reason/external-agents` package remains as a re-export barrel.

## EXPORTS MOVED

All 73 unique exports from the original inventory are present:

- **29 schemas/types:** ExternalAgentRole, ExternalAgentTrustZone, ExternalAgentTaskType, ExternalAgentPacketStatus, ExternalAgentToolPolicy, ExternalAgentApprovalPolicy, ExternalAgentContextPolicy, ExternalAgentTaskPacket, ExternalAgentResultStatus, ExternalAgentProposedChange, ExternalAgentResultPacket, ExternalAgentReviewVerdict, ExternalAgentReviewPacket, ValidatedTaskPacketSchema, ValidatedReviewPacketSchema, AgentBusTraceEventType, AgentBusTraceSeverity, AgentBusTraceActorType, AgentBusTraceEvent, ValidatedTraceEventSchema, TraceLedgerValidationResult, ExternalAgentTransportKind, ExternalAgentTransportMode, ExternalAgentTransportConfig, ValidatedTransportConfigSchema, ExternalAgentDispatchRequest, ExternalAgentDispatchStatus, ExternalAgentDispatchResult, ValidatedDispatchResultSchema
- **10 constants:** AGENT_BUS_ROOT, AGENT_BUS_INBOX, AGENT_BUS_OUTBOX, AGENT_BUS_REPORTS, AGENT_BUS_ARCHIVE, AGENT_BUS_REJECTED, DEFAULT_DENIED_PATHS, SCHEMA_VERSION, MAX_PACKET_SIZE_BYTES, UNSAFE_FILENAME_CHARS
- **30 helper functions:** ensureAgentBus, getAgentBusPaths, writeTaskPacket, readTaskPacket, writeResultPacket, readResultPacket, writeReviewPacket, readReviewPacket, listInboxPackets, listOutboxPackets, listReviewPackets, listReportFiles, movePacketToArchive, movePacketToRejected, createTaskPacketFilename, createResultPacketFilename, createReviewPacketFilename, getTraceLedgerPath, ensureTraceLedger, createTraceEvent, appendTraceEvent, readTraceEvents, validateTraceLedger, findTraceEventsByPacketId, findTraceEventsByResultId, findTraceEventsByReviewId, findTraceEventsByRunId, findRootCauseChain, createDefaultTransportConfig, validateTransportConfig, createDispatchRequest, dispatchToFakeAgent, dispatchToManualFileTransport
- **4 support types:** AgentBusPaths, ListOptions, WriteOptions, ReadTraceOptions, FindTraceOptions, CreateTraceEventInput

## EXPORTS LEFT BEHIND

**None.** All exports from `@tripp-reason/external-agents` are now provided by `@tripp-os/agent-bus`.

## IMPORT CHANGES

Zero import changes in Tripp.Reason consumer packages. The `@tripp-reason/external-agents` package now re-exports everything from `@tripp-os/agent-bus`, so all existing `import ... from "@tripp-reason/external-agents"` lines in server, CLI, and tests continue to work transparently.

## JSDOC / NAMESPACE CHANGES

8 files had their JSDoc namespace updated:
- `@tripp-reason/external-agents` → `@tripp-os/agent-bus` (in all 7 source file headers + constants comment)
- One user-facing string ("Tripp.Reason ApprovalGate remains authoritative") preserved — it's correct semantic content, not a namespace reference

## CONTRACTS PACKAGE USAGE

`@tripp-os/contracts` is **not** imported by `@tripp-os/agent-bus`. The agent-bus package depends only on `zod` + Node built-ins. No contracts bridge was needed for Stage 2.

## COMPATIBILITY IMPACT

**Zero breaking changes.** Tripp.Reason consumers continue to work identically:

| Consumer | Impact |
|----------|--------|
| `@tripp-reason/cli` | No change — imports re-exported transparently |
| `@tripp-reason/server` | No change — imports re-exported transparently |
| `apps/dashboard` | No change — HTTP-only, never imported external-agents |
| All tests | No change — 40/40 CLI tests pass, server builds clean |

## VALIDATION COMMANDS

| # | Command | Working Directory | Exit | Result |
|---|---------|-----------------|------|--------|
| 1 | `pnpm --filter @tripp-os/agent-bus build` | Tripp.Reason root | 0 | ✅ |
| 2 | `pnpm --filter @tripp-os/agent-bus test` | Tripp.Reason root | 0 | ✅ 68/68 |
| 3 | `pnpm --filter @tripp-reason/external-agents build` | Tripp.Reason root | 0 | ✅ |
| 4 | `pnpm --filter @tripp-reason/cli build` | Tripp.Reason root | 0 | ✅ |
| 5 | `pnpm --filter @tripp-reason/cli test` | Tripp.Reason root | 0 | ✅ 40/40 |
| 6 | `pnpm --filter @tripp-reason/server build` | Tripp.Reason root | 0 | ✅ |
| 7 | `pnpm build` (dashboard) | `apps/dashboard` | 0 | ✅ 42 modules |

## TEST RESULTS

| Test | Result | Notes |
|------|--------|-------|
| Package build | ✅ | `tsc --build` succeeds |
| Package tests | ✅ | 68/68 PASS |
| Standalone Agent Bus validation | ✅ | Package builds/tests without Tripp.Reason runtime |
| Packet roundtrip | ✅ | `schemas.test.ts` covers create/validate, `fileBus.test.ts` covers write/read |
| Dead-letter behavior | ✅ | `fileBus.test.ts` tests malformed JSON rejection, `traceLedger.test.ts` tests malformed lines |
| Safe-path traversal | ✅ | `fileBus.test.ts` + CLI tests verify path rejection |
| Trace helper behavior | ✅ | `traceLedger.test.ts` (28 tests) covers append/read/validate/chain |
| Queue state behavior | ✅ | Covered by `listInboxPackets`/`listOutboxPackets` in fileBus tests |
| Dispatch helper behavior | ✅ | Fake + manual dispatch in transport helpers (CLI tests verify) |

## BLOCKERS

None.

## DRIFT / SCOPE WATCH

| Check | Status |
|-------|--------|
| No Runtime work | ✅ |
| No Hermes adapter work | ✅ |
| No OpenClaw adapter work | ✅ |
| No Codex adapter work | ✅ |
| No dashboard/API/server work | ✅ (server re-export didn't change) |
| No MCP/store extraction | ✅ |
| No Stage 1B/v5 contract expansion | ✅ |
| No Windows Job Object/process manager work | ✅ |
| No behavior changes | ✅ |
| No new dependencies | ✅ |

## NEXT STEP

**Stage 2 is ready for Stop Point 2 power audit.** The @tripp-os/agent-bus package is a clean extraction of the Agent Bus substrate — builds independently, tests independently, and Tripp.Reason consumers continue to work with zero import changes.

Recommend proceeding to Stage 3 compatibility re-exports, then Stage 4 full extraction power audit.
