# Phase 7F Report — Append-Only Agent Bus Trace Ledger

**PHASE:** Phase 7F — Append-Only Agent Bus Trace Ledger  
**STATUS:** PASS ✅  
**DATE:** 2026-06-03  

---

## Summary

Implemented an append-only JSONL trace ledger for the Agent Bus. Every significant bus operation now emits trace events — packet creation, archival, rejection, and Echo/Warden reviews. The trace ledger is evidence-only: it never authorizes mutations, never bypasses ApprovalGate, and never contains secrets.

Manual CLI trace commands let Eddie and Echo append custom events, list/filter the ledger, validate integrity, and walk causal chains.

## FILES CHANGED

| File | Action |
|------|--------|
| `packages/external-agents/src/traceSchemas.ts` | **Created** — 5 Zod schemas + runtime validators |
| `packages/external-agents/src/traceLedger.ts` | **Created** — 10 helper functions |
| `packages/external-agents/src/index.ts` | Modified — added trace exports |
| `packages/cli/src/agentsCommand.ts` | Modified — trace imports, `emitTrace` helper, 4 trace command functions, 7 command registrations, automatic event emission in 4 existing commands |
| `packages/cli/src/__tests__/agentsCommand.test.ts` | Modified — 12 trace CLI tests + 4 automatic emission tests |
| `packages/external-agents/src/__tests__/traceLedger.test.ts` | **Created** — 27 trace schema + helper tests |
| `.tripp/agents/trace/README.md` | **Created** — trace ledger documentation |

## TRACE SCHEMAS ADDED

### `AgentBusTraceEventType` (24 event types)
- **Packet lifecycle**: `packet_created`, `packet_read`, `packet_claimed`, `result_written`, `result_read`, `schema_validation_failed`, `packet_rejected`, `packet_archived`
- **Echo/Warden review**: `warden_review_started`, `warden_verdict_recorded`, `warden_stop_issued`, `warden_stop_resolved`
- **Subagent lifecycle**: `subagent_spawned`, `subagent_completed`, `subagent_killed`, `subagent_audited`
- **JIT tools**: `tools_loaded`, `tools_unloaded`
- **Human/approval**: `human_decision_recorded`, `mutation_requested`, `approvalgate_required`, `mutation_applied`, `validation_failed_later`, `root_cause_linked`

### `AgentBusTraceSeverity`
`debug`, `info`, `warning`, `error`, `critical`

### `AgentBusTraceActorType`
`cli`, `openclaw_tripp`, `hermes_cyony`, `openclaw_echo`, `operator`, `approvalgate`, `system`, `unknown`

### `AgentBusTraceEvent` (22 fields)
`eventId`, `eventType`, `severity`, `createdAt`, `actorType`, `actorId`, `runId`, `parentRunId`, `packetId`, `resultId`, `reviewId`, `parentEventId`, `rootCauseEventId`, `agentRole`, `parentAgentRole`, `subagentId`, `subagentRole`, `toolNames`, `sourcePath`, `targetPath`, `summary`, `details`, `tags`

### Runtime validation rules
- `root_cause_linked` requires `rootCauseEventId`
- `subagent_*` events require `subagentId`
- `tools_loaded`/`tools_unloaded` require `toolNames[]`
- `warden_stop_resolved` requires `parentEventId` or resolution details
- `validation_failed_later` suggests `parentEventId` or `rootCauseEventId`

## TRACE HELPERS ADDED

| Helper | Description |
|--------|-------------|
| `getTraceLedgerPath(workdir?)` | Returns path to `.tripp/agents/trace/agent-bus-trace.jsonl` |
| `ensureTraceLedger(workdir?)` | Creates trace folder + empty JSONL file (idempotent) |
| `createTraceEvent(input)` | Creates validated trace event object |
| `appendTraceEvent(event, workdir?)` | Validates then appends to JSONL |
| `readTraceEvents(options)` | Reads and validates all events (with optional limit) |
| `validateTraceLedger(workdir?)` | Reports valid/malformed counts + line numbers |
| `findTraceEventsByPacketId(id, opts)` | Filter by packet ID |
| `findTraceEventsByResultId(id, opts)` | Filter by result ID |
| `findTraceEventsByReviewId(id, opts)` | Filter by review ID |
| `findTraceEventsByRunId(id, opts)` | Filter by run ID |
| `findRootCauseChain(eventId, workdir?)` | Walk parentEventId/rootCauseEventId backward |

## COMMANDS ADDED (7)

| Command | Description |
|---------|-------------|
| `tripp agents trace append --event-type ... --summary ...` | Manual trace event (17 optional flags) |
| `tripp agents trace list [--limit N] [--packet-id ...] ...` | List/filter trace events |
| `tripp agents trace validate` | Validate ledger integrity (reports malformed lines) |
| `tripp agents trace chain <event-id>` | Show causal chain (root → target) |
| `tripp agents trace packet <packet-id>` | Events linked to a packet |
| `tripp agents trace result <result-id>` | Events linked to a result |
| `tripp agents trace review <review-id>` | Events linked to a review |

## AUTOMATIC EVENT EMISSION

Existing CLI commands now automatically emit trace events (best-effort, never blocking):

| Command | Event(s) Emitted |
|---------|------------------|
| `tripp agents create-task` | `packet_created` |
| `tripp agents archive` | `packet_archived` |
| `tripp agents reject` | `packet_rejected` |
| `tripp agents review` | `warden_review_started` + `warden_verdict_recorded` |

All trace emission is best-effort — if the trace ledger write fails, the main operation continues. Trace events always warn "EVIDENCE only — does NOT approve mutation."

## VALIDATION

### Tests

| Suite | Result |
|-------|--------|
| Trace schemas (external-agents) | **13/13 PASS** |
| Trace helpers (external-agents) | **14/14 PASS** |
| Existing schemas + fileBus (external-agents) | **41/41 PASS** |
| CLI trace commands | **8/8 PASS** |
| CLI automatic emission | **4/4 PASS** |
| Existing CLI commands (7D + 7E) | **28/28 PASS** |
| **TOTAL** | **108/108 PASS** |

### Build / Typecheck

| Check | Result |
|-------|--------|
| CLI build (`tsc`) | ✅ |
| external-agents build (`tsc --build`) | ✅ |
| No forbidden imports | ✅ |
| No new dependencies | ✅ |

### Smoke tests

- `trace append` writes valid JSONL line ✅
- Invalid event type rejected by schema ✅
- `trace list` filters by packetId ✅
- `trace validate` reports malformed lines without rewriting ✅
- `trace chain` follows parentEventId backward ✅
- `create-task` emits `packet_created` ✅
- `archive` emits `packet_archived` ✅
- `reject` emits `packet_rejected` ✅
- `review` emits `warden_review_started` + `warden_verdict_recorded` ✅

## BOUNDARY CHECK

| Boundary | Status |
|----------|--------|
| No live agent connection | ✅ |
| No OpenClaw adapter | ✅ |
| No Hermes adapter | ✅ |
| No Echo adapter | ✅ |
| No cloud transport | ✅ |
| No mutation authority added | ✅ |
| No direct repo write authority for external agents | ✅ |
| No secrets handling beyond rejection/default-deny | ✅ |
| No dependency graph violations | ✅ |
| Trace events are evidence only | ✅ |
| Trace events do not authorize mutation | ✅ |
| ApprovalGate remains authoritative | ✅ |
| Eddie remains final approver | ✅ |
| No server routes added | ✅ |
| No dashboard panels added | ✅ |
| No watchers/background workers added | ✅ |
| No ApprovalGate bypass | ✅ |
| Legacy untouched | ✅ |

## RISKS / OPEN QUESTIONS

- None. Trace ledger is fully append-only, evidence-only, and best-effort.

## NEXT RECOMMENDED STEP

**Phase 7G** — Dashboard Agent Bus + Trace Views (surfacing inbox/outbox/reviews/trace in the Phase 6 React dashboard).
