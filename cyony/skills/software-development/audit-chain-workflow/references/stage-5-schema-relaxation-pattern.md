# Stage 5: Schema-Safe Contract Resolution

When a trace event can't be wired because the upstream schema lacks a required identifier, use validation relaxation instead of contract expansion.

## Problem

`approval_timeout` trace event requires `packetId` or `reviewId` per schema validation. But the `ApprovalQueue` item only carries `sessionId` + `runId` from `ApprovalRequest`. Neither `packetId` nor `reviewId` exists in the approval pipeline.

## Wrong Approach: Contract Expansion

Adding `packetId` to `ApprovalRequestSchema` would cascade through:
- `packages/shared/src/schemas.ts` — schema change
- `packages/cli/src/approver.ts` — CliApprover
- `packages/server/src/apiApprover.ts` — ApiApprover
- `packages/server/src/readOnlyApprover.ts` — ReadOnlyApprover
- `packages/server/src/approvalQueue.ts` — ApprovalQueue
- `packages/swarm/src/reasonLoopWorker.ts` — SwarmApprover
- `packages/core/src/approvalGate.ts` — ApprovalGate
- `packages/@tripp-os/contracts/src/contracts.ts` — contracts interface

This is a cross-package contract change — high risk in a bounded implementation gate.

## Correct Approach: Validation Relaxation

1. **Audit available identifiers** — `runId` IS in the `ApprovalQueue` item
2. **Check trace schema** — `AgentBusTraceEvent` already has a `runId` field
3. **Relax validation** — change from `packetId || reviewId` to `packetId || reviewId || runId`
4. **Keep backward-compatible** — additive only, no removal
5. **Zero upstream changes** — no contract, no dependents touched

## Implementation

```typescript
// BEFORE (Stage 3A)
if (data.eventType === "approval_timeout" && !data.packetId && !data.reviewId) {
  ctx.addIssue({ message: "approval_timeout must include packetId or reviewId" });
}

// AFTER (Stage 5A)
if (data.eventType === "approval_timeout" && !data.packetId && !data.reviewId && !data.runId) {
  ctx.addIssue({ message: "approval_timeout must include packetId, reviewId, or runId" });
}
```

Mirror in both `@tripp-os/agent-bus/src/traceSchemas.ts` and `@tripp-reason/external-agents/src/traceSchemas.ts`.

## Test Update

Add a test proving `runId` is accepted:
```typescript
it("approval_timeout validates with runId", () => {
  const event = createTraceEvent({
    eventType: "approval_timeout",
    actorType: "approvalgate",
    runId: randomUUID(),
    summary: "Approval timed out (identified by runId)",
  });
  expect(event.runId).toBeDefined();
});
```
