# Tripp.Reason — Stage Reason-6C-1: Approval Flow Surface Audit

**Generated:** 2026-06-06 07:24 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_6C_1_PASS_APPROVAL_SURFACE_SELECTED_CHAINING_TO_6C_2**

Approval surface identified: ApprovalQueue (in-memory, testable without deps) + ApprovalGate (risk-level routing) + approval_timeout trace. All surfaces are local to Tripp.Reason and safe to test.

---

## 1. Approval Surfaces

| Surface | Location | Testable? |
|---|---|---|
| ApprovalQueue.enqueue | server/src/approvalQueue.ts | ✅ Pure in-memory, no deps |
| ApprovalQueue.resolve | server/src/approvalQueue.ts | ✅ Returns ApprovalResult |
| ApprovalQueue timeout | server/src/approvalQueue.ts | ✅ Timer with approval_timeout trace |
| ApprovalGate.check | core/src/approvalGate.ts | ✅ Routes by risk level |
| createSwarmApprover | swarm/src/reasonLoopWorker.ts | ✅ Task-level rules |
| CLI pipeline | agentsCommand.ts | ✅ Dry-run with ApprovalGate |

## 2. States to Test

| State | Method | Feasibility |
|---|---|---|
| Approved | Queue → resolve(true) | ✅ Direct |
| Denied | Queue → resolve(false) | ✅ Direct |
| Timed out | Queue → wait for timer | ✅ Short timeout fixture |
| Late response | Queue → timeout → resolve | ✅ Resolve after timeout returns false |
| Duplicate resolve | Queue → resolve → resolve again | ✅ Second returns false |
| Missing gate | ApprovalGate without approver | ✅ Fail-closed behavior |

## 3. Implementation Plan

**File:** `packages/server/src/__tests__/approvalHardening.test.ts` (new)

**Structure:**
- S1: Allow/Deny — prove resolve(true/false) + fail-closed behavior
- S2: Timeout — prove timer fires, approval_timeout trace emits
- S3: Late response — prove post-timeout resolve is rejected
- S4: Duplicate resolve — prove second resolve is rejected
- S5: Trace coverage — prove all paths emit appropriate trace events

**Dependencies:** Zero new. `ApprovalQueue` uses `@tripp-reason/shared` + `@tripp-os/agent-bus` (already deps of server).

---

**Surface identified. Proceed to 6C-2.**
