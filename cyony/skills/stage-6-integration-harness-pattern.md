# Stage 6: Fake/Manual Integration Test Harness

When the fake/manual pipeline is confirmed safe and timeout events are wired, add an integration test harness.

## Prerequisites Checked

- [ ] task_timeout wired
- [ ] tool_timeout wired
- [ ] approval_timeout wired
- [ ] ApprovalGate fail-closed
- [ ] Fake/manual defaults unchanged
- [ ] Live agents disabled
- [ ] All existing tests pass

## Test File Structure

New file: `packages/cli/src/__tests__/fakeManualPipelineIntegration.test.ts`

### S1: Full Fake Pipeline Trace Chain (3 tests)
- Produces complete trace chain (packet_created through warden_verdict)
- Trace ledger validates cleanly
- All events carry causal identifiers

### S2: Timeout Event Validation (4 tests)
- task_timeout validates and persists
- tool_timeout validates with toolNames
- approval_timeout validates with runId
- Timeout events do not imply mutation

### S3: Dispatch Route Safety (5 tests)
- Fake dispatch succeeds
- Manual dispatch stays in inbox
- Disabled mode is blocked
- experimental_live is blocked
- Default transport config is safe

### S4: ApprovalGate Integration (2 tests)
- approvalgate_required trace appears before packet_claimed
- Fake dispatch produces no mutation events

### S5: Result Read-Back (1 test)
- Fake dispatch result is readable and valid

## Import Strategy

Import from `@tripp-reason/external-agents` — it re-exports everything from `@tripp-os/agent-bus`. Do NOT add agent-bus as a direct CLI dependency.

```typescript
import {
  listOutboxPackets, readResultPacket, readTraceEvents, validateTraceLedger,
  createTraceEvent, appendTraceEvent, dispatchRoute,
  createDefaultTransportConfig, createDispatchRequest,
} from "@tripp-reason/external-agents";
```

## Type Fixes for Stale Compiled Dist

New event types (`task_timeout`, `tool_timeout`, `approval_timeout`) may not resolve from compiled dist. Use `as any`:

```typescript
createTraceEvent({
  eventType: "task_timeout" as any,  // compiled types may be stale
  actorType: "system",
  packetId: randomUUID(),
  summary: "...",
})
```

Expect comparisons to also need `as any`:
```typescript
expect(events.some((e) => e.eventType === ("task_timeout" as any))).toBe(true);
```

## Rebuild Order After Schema Changes

```
pnpm --filter @tripp-os/agent-bus build
pnpm --filter @tripp-reason/external-agents build
```

Then run tests. Without rebuild, tests that reference new event types will fail with schema validation errors ("Type X is not assignable to Y").
