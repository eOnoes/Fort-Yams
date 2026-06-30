# Tripp.Reason — Stage Reason-6B-1: Fake/Manual Runtime Integration Surface Audit

**Generated:** 2026-06-06 07:02 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_6B_1_PASS_SURFACE_SELECTED_CHAINING_TO_6B_2**

Integration surface identified: `executeAgentsDryRun` → `dispatchToFakeAgent` → trace pipeline. All components exist and are safe. No new architecture needed. Integration target: structured integration test with full trace chain validation.

---

## 1. Existing Fake Dispatch Surface

| Component | Location | Status |
|---|---|---|
| Dry-run entry | `agentsCommand.ts:executeAgentsDryRun` | ✅ Active |
| Task packet creation | `agentsCommand.ts:921-961` | ✅ Always fake |
| Transport config | `agentsCommand.ts:1016` — `createDefaultTransportConfig(agent, "fake_agent", "fake")` | ✅ Always fake |
| Dispatch request | `agentsCommand.ts:1017-1021` — `createDispatchRequest` | ✅ Dry-run flagged |
| Fake dispatch | `agentsCommand.ts:1033` — `dispatchToFakeAgent` | ✅ Deterministic |
| Dispatch route | `@tripp-os/agent-bus:dispatchRoute` | ✅ fake→fake, live→blocked |
| Trace emission | `agentsCommand.ts:966,990,1057+` — packet_created, approvalgate_required, warden events | ✅ 6 events per run |
| Trace validation | `agentsCommand.ts:1094+` — chain validation | ✅ Ledger read-back |

## 2. Missing Integration Coverage

The existing CLI tests (`dryRun.test.ts`, `dryRunGapClosure.test.ts`) exercise the dry-run command. But no dedicated integration test proves:

- Full trace chain from `packet_created` → `packet_claimed` → `result_written` → `warden_review_started` → `warden_verdict_recorded`
- Timeout events (`task_timeout`, `tool_timeout`, `approval_timeout`) validate against trace schema
- ApprovalGate is proven at the integration level (not just unit)
- Fake dispatch defaults cannot be bypassed
- `dispatchRoute` blocks live mode

## 3. Minimal Integration Target

**File:** `packages/cli/src/__tests__/fakeManualPipelineIntegration.test.ts`

**Structure:**
1. Full fake pipeline test — exercises `executeAgentsDryRun` → reads trace → validates chain
2. Timeout event validation test — creates timeout events via trace helpers → validates schema
3. Dispatch route safety test — proves fake/manual work, live blocked
4. ApprovalGate integration test — proves gate is in pipeline

**Dependencies:** Zero new. Uses existing `executeAgentsDryRun`, `createTraceEvent`, `appendTraceEvent`, `dispatchRoute`, `readTraceEvents`.

## 4. Safety Confirmation

| Check | Result |
|---|---|
| Fake/manual remains default | ✅ `mode: "fake"` hardcoded in dry run |
| Live agents disabled | ✅ `dispatchRoute` blocks `experimental_live` |
| ApprovalGate enforced | ✅ `approvalgate_required` trace before dispatch |
| No dependency changes | ✅ All imports exist |
| No contract changes | ✅ Read-only test file |
| No shared-agent-bus | ✅ Uses in-repo agent-bus |

---

**Surface identified. Proceed to 6B-2 implementation.**
