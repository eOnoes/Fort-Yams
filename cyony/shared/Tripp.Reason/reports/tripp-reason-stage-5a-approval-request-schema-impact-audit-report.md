# Tripp.Reason — Stage Reason-5A: ApprovalRequest Schema Impact Audit

**Generated:** 2026-06-06 06:50 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_5A_PASS_BACKWARD_COMPAT_SCHEMA_CHANGE_SAFE_CHAINING_TO_5B**

No ApprovalRequest contract change needed. The approval item already carries `runId`. Relaxing the `approval_timeout` trace validation to accept `runId` as a causal identifier is backward-compatible, local to the trace schema, and requires zero changes to the ApprovalRequest pipeline.

---

## 1. Schema Audit

### ApprovalRequest (packages/shared/src/schemas.ts:128)
```typescript
export const ApprovalRequestSchema = z.object({
  toolName: z.string(),
  args: z.unknown(),
  riskLevel: RiskLevelSchema,
  context: z.object({
    session_id: z.string(),
    run_id: z.string(),
  }),
});
```

Fields available: `toolName`, `args`, `riskLevel`, `context.session_id`, `context.run_id`.  
Fields missing: `packetId`, `reviewId`.

### approval_timeout validation (Stage 3A)
Originally required: `packetId` or `reviewId`.  
Neither is present in the approval pipeline.

### ApprovalQueue item (packages/server/src/approvalQueue.ts)
Stores: `id`, `sessionId`, `runId`, `toolName`, `argsSummary`, `riskLevel`, `status`, `reason`, `createdAt`, `expiresAt`.  
Has `runId` ✓. No `packetId` or `reviewId`.

## 2. Consumers of ApprovalRequest

| Consumer | Impact |
|---|---|
| `packages/cli/src/approver.ts` | None — doesn't use packetId |
| `packages/swarm/src/reasonLoopWorker.ts` | None — swarm approver |
| `packages/server/src/apiApprover.ts` | None — passes to queue |
| `packages/server/src/readOnlyApprover.ts` | None — read-only |
| `packages/server/src/approvalQueue.ts` | None — uses `runId` |
| `packages/core/src/approvalGate.ts` | None — creates request from tool call |
| `packages/@tripp-os/contracts/src/contracts.ts` | None — interface unchanged |

Zero consumers would break from a backward-compatible change.

## 3. Options Evaluated

| Option | Risk | Verdict |
|---|---|---|
| Add `packetId` to ApprovalRequest | Medium — contract change, propagates to all consumers | Overkill |
| Add `reviewId` to ApprovalRequest | Medium — review concept not in approval flow | Wrong fit |
| Relax `approval_timeout` to accept `runId` | Low — backward-compatible, local to trace schema | ✅ Chosen |
| Defer approval_timeout permanently | Low — but leaves gap | Unnecessary |

## 4. Chosen Path

Relax `approval_timeout` validation from:
```
packetId or reviewId
```
to:
```
packetId, reviewId, or runId
```

This is:
- Backward-compatible (adds a new valid path, removes none)
- Local to `packages/@tripp-os/agent-bus/src/traceSchemas.ts`
- Mirrored in `packages/external-agents/src/traceSchemas.ts`
- Zero ApprovalRequest contract change
- Zero pipeline changes

---

**Verdict:** Safe. Proceed to 5B.
