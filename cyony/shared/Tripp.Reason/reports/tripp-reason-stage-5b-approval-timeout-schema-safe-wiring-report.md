# Tripp.Reason — Stage Reason-5B: Approval Timeout Schema-Safe Wiring

**Generated:** 2026-06-06 06:52 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_5B_PASS_APPROVAL_TIMEOUT_WIRED_CHAINING_TO_5C**

approval_timeout wired at ApprovalQueue timer callback. Uses `runId` as causal identifier per relaxed validation (Stage 5A). Best-effort fire-and-forget pattern. No contract changes. ApprovalGate remains fail-closed.

---

## 1. Schema Change (Stage 5A Carried Forward)

`approval_timeout` validation relaxed: `packetId or reviewId` → `packetId, reviewId, or runId`.  
Applied to both `@tripp-os/agent-bus` and `external-agents` trace schemas.

## 2. Emit Point Wiring

**File:** `packages/server/src/approvalQueue.ts`

**Location:** Timer callback in `enqueue()` method

**Pattern:** Fire-and-forget (`.catch(() => {})`)

```typescript
appendTraceEvent(
  createTraceEvent({
    eventType: "approval_timeout",
    severity: "warning",
    actorType: "approvalgate",
    runId: request.runId,
    summary: `Approval timed out for "${request.toolName}" after ${timeoutMs}ms`,
    details: { timeoutMs, toolName, riskLevel },
  }),
).catch(() => { /* best-effort */ });
```

**Import added:** `createTraceEvent, appendTraceEvent` from `@tripp-os/agent-bus`

**Dependency:** Already present (added in Stage 4A)

## 3. Safety Verification

| Check | Result |
|---|---|
| Event is observational only | ✓ Fire-and-forget, no await |
| No packet lifecycle mutation | ✓ Only emits trace, then calls existing resolve |
| No approval bypass | ✓ Resolve still returns `approved: false` |
| No command execution | ✓ Trace event only |
| No live-agent activation | ✓ No transport dispatch |
| No fake/manual default change | ✓ Unchanged |
| ApprovalGate remains fail-closed | ✓ `approved: false` on timeout |

## 4. Test Update

**File:** `packages/@tripp-os/agent-bus/src/__tests__/traceLedger.test.ts`

- Added: `approval_timeout validates with runId` — proves `runId` is accepted as causal identifier
- Updated: `approval_timeout rejects missing packetId, reviewId, and runId` — now checks all three

## 5. Validation

- Typecheck: 0 errors across all 12 packages ✓
- Tests: 262/262 passing (79 agent-bus + 17 contracts + 166 CLI) ✓
- Lockfile: clean ✓
- ApprovalGate: fail-closed ✓

## 6. Files Changed

| File | Change |
|---|---|
| `packages/@tripp-os/agent-bus/src/traceSchemas.ts` | Relaxed approval_timeout validation (+runId) |
| `packages/external-agents/src/traceSchemas.ts` | Mirrored |
| `packages/@tripp-os/agent-bus/src/__tests__/traceLedger.test.ts` | +1 runId test |
| `packages/server/src/approvalQueue.ts` | +import, +16 lines emit |

---

**Verdict:** 3/3 timeout events now wired. All safe.
