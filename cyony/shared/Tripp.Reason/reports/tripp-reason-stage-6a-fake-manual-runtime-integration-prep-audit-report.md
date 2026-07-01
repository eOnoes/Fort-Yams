# Tripp.Reason — Stage Reason-6A: Fake/Manual Runtime Integration Prep Audit

**Generated:** 2026-06-06 06:58 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_6A_PASS_READY_FOR_STAGE_6B_FAKE_MANUAL_RUNTIME_INTEGRATION_IMPLEMENTATION**

All prerequisites for fake/manual runtime integration are met. Implementation boundary defined. Test expectations documented.

---

## 1. Integration Target

**Recommended path:** CLI-driven fake/manual agent dispatch with full trace coverage.

The existing `dispatchRoute` function in `@tripp-os/agent-bus` already supports:
- `fake` → `dispatchToFakeAgent` (deterministic, no LLM)
- `manual` → `dispatchToManualFileTransport` (inbox-based)
- `experimental_live` → blocked (`dispatchToRealAgent` returns `real_transport_disabled`)

The next gate should wire the CLI `dryRun` harness into a structured integration test path that exercises the full pipeline: packet creation → approval check → fake dispatch → trace emission → result read-back.

## 2. Prerequisites Confirmed

| Prerequisite | Status |
|---|---|
| task_timeout wired in reasonLoopWorker | ✅ |
| tool_timeout wired in shell + runTests | ✅ |
| approval_timeout wired in approvalQueue | ✅ |
| ApprovalGate fail-closed | ✅ |
| Fake/manual defaults unchanged | ✅ |
| Live agents disabled | ✅ |
| Command execution guarded behind ApprovalGate | ✅ |
| Trace events validate (29 types) | ✅ |
| Typecheck clean (0 errors, 12 packages) | ✅ |
| Tests passing (262/262) | ✅ |
| Dependencies stable (3 added, no others) | ✅ |
| No contract breakage | ✅ |

## 3. Implementation Boundary (for Stage 6B)

The next implementation gate must NOT:
- Activate live agents (`experimental_live` remains blocked)
- Dispatch real external work
- Write to shared-agent-bus
- Mutate packet lifecycle without ApprovalGate
- Bypass ApprovalGate
- Add new dependencies
- Alter Tripp.Control or Tripp.OS
- Change fake/manual defaults

The next implementation gate MAY:
- Wire the CLI fake dispatch path into structured integration tests
- Add trace event emission at additional lifecycle points
- Add integration test harness files to `packages/cli/src/__tests__/`
- Harden the dry-run pipeline with additional validation
- Add report generation for integration test runs

## 4. Expected Tests for Stage 6B

Tests should prove:
- Fake dispatch produces trace events (packet_created, packet_claimed, result_written)
- Timeout events fire on bounded timeout (task_timeout, tool_timeout, approval_timeout)
- ApprovalGate is checked before any mutation
- Fake/manual defaults are not bypassed
- `dispatchRoute` does not enable live agents
- Command execution remains behind ApprovalGate
- Trace ledger accumulates events across runs
- Result packets are readable and validated
- No shared-agent-bus mutation occurs

## 5. Recommended Next Marker

**READY_FOR_TRIPP_REASON_STAGE_6B_FAKE_MANUAL_RUNTIME_INTEGRATION_IMPLEMENTATION_PROMPT**

---

**Prep complete. Tripp.Reason is ready for the fake/manual runtime integration implementation gate.**
