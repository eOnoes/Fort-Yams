# Tripp.Reason — Stage Reason-3A: Dedicated Timeout Trace Event Audit and Implementation

**Generated:** 2026-06-06 06:25 UTC
**Auditor:** Cyony (Oni)
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_3A_PASS_TIMEOUT_TRACE_EVENT_IMPLEMENTED_CHAINING_TO_3B**

Three timeout event types added to schema: `task_timeout`, `tool_timeout`, `approval_timeout`. Validation rules enforce causal identifiers. 10 new tests. Typecheck clean. Emit points documented but not yet wired (requires adding agent-bus dependency to server/swarm — deferred to next gate).

---

## 1. Trace Event Model Inspection

Existing event taxonomy (now 29 types, was 26):

- Packet lifecycle (8): `packet_created`, `packet_read`, `packet_claimed`, `result_written`, `result_read`, `schema_validation_failed`, `packet_rejected`, `packet_archived`
- Warden review (4): `warden_review_started`, `warden_verdict_recorded`, `warden_stop_issued`, `warden_stop_resolved`
- Subagent lifecycle (5): `subagent_spawned`, `subagent_completed`, `subagent_killed`, `subagent_audited`, **`task_timeout`** ← new
- JIT tool lifecycle (3): `tools_loaded`, `tools_unloaded`, **`tool_timeout`** ← new
- Human/approval (9): `human_decision_recorded`, `mutation_requested`, `approvalgate_required`, `mutation_applied`, `validation_failed_later`, `root_cause_linked`, **`approval_timeout`** ← new

## 2. Implementation

### Schema changes (both packages)

**`@tripp-os/agent-bus/src/traceSchemas.ts` + `external-agents/src/traceSchemas.ts`:**

- Added `task_timeout`, `tool_timeout`, `approval_timeout` to `AgentBusTraceEventTypeSchema`
- Validation rules:
  - `task_timeout` requires `packetId` OR `subagentId`
  - `tool_timeout` requires at least one `toolName`
  - `approval_timeout` requires `packetId` OR `reviewId`

### Tests added (agent-bus)

10 new tests in `traceLedger.test.ts`:
- task_timeout validates with packetId ✓
- task_timeout validates with subagentId ✓
- task_timeout rejects missing both ✓
- tool_timeout validates with toolNames ✓
- tool_timeout rejects empty toolNames ✓
- approval_timeout validates with packetId ✓
- approval_timeout validates with reviewId ✓
- approval_timeout rejects missing both ✓
- timeout events append and read back from ledger ✓
- timeout events do not imply mutation ✓

## 3. Emit Points (Documented, Not Yet Wired)

| Event | Emit Point | Status |
|---|---|---|
| `task_timeout` | `reasonLoopWorker.ts` timeout catch block | Deferred — needs agent-bus dep in swarm |
| `tool_timeout` | `shell.ts` / `runTests.ts` close handler | Deferred — needs agent-bus dep in tools |
| `approval_timeout` | `approvalQueue.ts` timer callback | Deferred — needs agent-bus dep in server |

Adding `@tripp-os/agent-bus` to these packages' dependencies would be required. Deferred to next implementation gate.

## 4. Validation

- Typecheck: 0 errors across all 12 packages ✓
- Tests: 261/261 passing (78 agent-bus + 17 contracts + 166 CLI) ✓
- Contracts: unchanged ✓
- Lockfile: clean ✓

---

**Files changed:**
- `packages/@tripp-os/agent-bus/src/traceSchemas.ts` — +3 event types, +35 lines validation
- `packages/external-agents/src/traceSchemas.ts` — mirrored changes
- `packages/@tripp-os/agent-bus/src/__tests__/traceLedger.test.ts` — +10 tests (131 lines)
