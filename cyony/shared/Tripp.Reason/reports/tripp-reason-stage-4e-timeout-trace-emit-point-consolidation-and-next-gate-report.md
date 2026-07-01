# Tripp.Reason — Stage Reason-4E: Timeout Trace Emit Point Consolidation and Next Gate

**Generated:** 2026-06-06 06:40 UTC
**Auditor:** Cyony (Oni)
**Chain:** 4A → 4B → 4C → 4D → 4E
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_4E_PASS_PARTIAL_TIMEOUT_TRACE_WIRING_WITH_DEFERRED_EMIT_POINTS**

Two of three timeout events wired (task_timeout, tool_timeout). approval_timeout deferred — requires schema change to add packetId/reviewId to ApprovalRequest. Stage 4 chain complete. Ready for next gate.

---

## 1. Stage Summary

| Stage | Name | Result | Key Outcome |
|---|---|---|---|
| 4A | Dependency Boundary Preflight | PASS | @tripp-os/agent-bus added to server, swarm, tools |
| 4B | Wire task_timeout | PASS | Wired in reasonLoopWorker.ts timeout catch |
| 4C | Wire tool_timeout | PASS | Wired in shell.ts + runTests.ts close handlers |
| 4D | Wire approval_timeout | DEFERRED | ApprovalRequest lacks packetId/reviewId |
| 4E | Consolidation | PASS | Two wired, one deferred, ready for next gate |

## 2. Events Wired

| Event | Emit Point | Status |
|---|---|---|
| `task_timeout` | `reasonLoopWorker.ts` — Promise.race timeout catch | ✅ Wired |
| `tool_timeout` | `shell.ts` — spawn close handler (SIGTERM + duration) | ✅ Wired |
| `tool_timeout` | `runTests.ts` — spawn close handler (SIGTERM + duration) | ✅ Wired |
| `approval_timeout` | `approvalQueue.ts` — timer callback | ⬜ Deferred |

## 3. Deferred Reasoning

**approval_timeout** requires `packetId` or `reviewId` per schema validation. The `ApprovalQueue` item stores `sessionId` + `runId` but not `packetId` or `reviewId`. The `ApprovalRequest` schema (`packages/shared/src/schemas.ts`) carries `context.session_id` and `context.run_id` only.

To wire approval_timeout, one of these would be needed:
- Add `packetId` to `ApprovalRequestSchema` (contract change)
- Add `reviewId` to approval item
- Relax the `approval_timeout` validation to accept `runId`

This is a contract-level change requiring a separate gate.

## 4. Final State

| Metric | Value |
|---|---|
| Typecheck | 0 errors across all 12 packages |
| Tests | 261/261 passing |
| Lockfile | Clean |
| Dependencies added | 3 (@tripp-os/agent-bus to server/swarm/tools) |
| Runtime sources changed | 3 files (reasonLoopWorker, shell, runTests) |
| Contracts changed | None |
| Live agents | Still disabled |
| Fake/manual defaults | Unchanged |
| ApprovalGate | Still enforced |
| Shared-agent-bus | Untouched |
| Tripp.Control | Untouched |

## 5. Dependency Changes

| Package | Dependency Added |
|---|---|
| `@tripp-reason/server` | `@tripp-os/agent-bus: workspace:*` |
| `@tripp-reason/swarm` | `@tripp-os/agent-bus: workspace:*` |
| `@tripp-reason/tools` | `@tripp-os/agent-bus: workspace:*` |

## 6. Source Changes

| File | Change |
|---|---|
| `packages/swarm/src/reasonLoopWorker.ts` | +import, +23 lines (task_timeout emit) |
| `packages/tools/src/shell.ts` | +import, +14 lines (tool_timeout emit) |
| `packages/tools/src/runTests.ts` | +import, +14 lines (tool_timeout emit) |
| `packages/server/package.json` | +1 dep |
| `packages/swarm/package.json` | +1 dep |
| `packages/tools/package.json` | +1 dep |

All emit code is fire-and-forget / best-effort. No mutation. No live-agent activation.

## 7. Recommended Next Gate

**TRIPP_REASON_NEXT_GATE_APPROVAL_TIMEOUT_CONTRACT_HARDENING_OR_FAKE_MANUAL_RUNTIME_INTEGRATION**

Two paths:

A. **Approval timeout contract hardening** — add packetId/reviewId to ApprovalRequest, wire approval_timeout emit point
B. **Fake/manual runtime integration** — wire the next integration path now that trace events are operational

---

**Chain complete.** 261/261 tests. 0 type errors. 2/3 timeout events wired.
