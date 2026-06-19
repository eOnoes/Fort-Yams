# Phase 8B Dry Run Harness Pattern

## When to Use

When proving a multi-component pipeline (Agent Bus, transport, trace, Warden) works end-to-end before wiring real external dependencies.

## Pattern: Wire Existing Primitives

Do NOT build a parallel test-only pipeline. The dry run IS the real pipeline with fake transport:

```
tripp agents dry-run
  ├─ Phase 1: ensureAgentBus + writeTaskPacket → packet_created trace
  ├─ Phase 2: emitTrace(approvalgate_required) → proves gate position
  ├─ Phase 3: createDefaultTransportConfig(fake) + createDispatchRequest
  ├─ Phase 4: dispatchToFakeAgent() → packet_claimed + result_written traces
  ├─ Phase 5: writeReviewPacket + warden_review_started/verdict_recorded traces
  └─ Phase 6: findTraceEventsByPacketId + validateTraceLedger
```

## Functions Used (from @tripp-os/agent-bus)

- `ensureAgentBus(workdir)` — idempotent folder scaffold
- `writeTaskPacket(packet, { workdir })` — packet to inbox
- `createDefaultTransportConfig(role, "fake_agent", "fake")` — safe config
- `createDispatchRequest(packet, config, { traceEnabled: true })`
- `dispatchToFakeAgent(request, workdir)` — deterministic, no LLM/network
- `writeReviewPacket(reviewPacket, { workdir })` — Warden review to reports/
- `emitTrace(...)` — best-effort trace wrapper
- `findTraceEventsByPacketId(packetId, { workdir })` — verify chain
- `validateTraceLedger(workdir)` — ledger integrity

## Required Trace Events (6 minimum)

1. `packet_created` — CLI entry
2. `approvalgate_required` — gate position proven
3. `packet_claimed` — fake agent claims
4. `result_written` — result in outbox
5. `warden_review_started` — Echo review begins
6. `warden_verdict_recorded` — Echo verdict

## API Pitfalls

- File-bus + trace-ledger use options objects: `{ workdir: "..." }` NOT raw string
- Exception: `validateTraceLedger(workdir)` and `ensureAgentBus(workdir)` take plain string
- `validateTraceLedger` returns `{ isValid, malformedLines }` NOT `{ valid, errors }`
- `AgentBusTraceEvent` uses `createdAt` NOT `timestamp`
- `findTraceEventsBy*` takes `(id, { workdir: "..." })` NOT `(id, workdir)`

## Testing

30 tests across 10 sections:
- S1-S3: Pipeline runs, packet/result structure
- S4: ApprovalGate trace evidence
- S5: Fake transport markers
- S6: Trace ledger completeness + validation
- S7: Warden advisory-only boundaries
- S8: Invalid role/verdict rejection, no forbidden tokens
- S9: Multiple independent dry runs
- S10: Verdict variants (pass_with_notes, revise)
