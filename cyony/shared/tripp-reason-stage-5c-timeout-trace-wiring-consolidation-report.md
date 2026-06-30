# Tripp.Reason — Stage Reason-5C: Timeout Trace Wiring Consolidation

**Generated:** 2026-06-06 06:53 UTC
**Auditor:** Cyony (Oni)
**Chain:** 5A → 5B → 5C
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_5C_PASS_ALL_TIMEOUT_TRACE_EVENTS_WIRED_READY_FOR_FAKE_MANUAL_RUNTIME_INTEGRATION**

All three timeout trace events (task_timeout, tool_timeout, approval_timeout) are now wired at their respective catch points. Zero contract changes to ApprovalRequest. One backward-compatible trace schema relaxation. 262/262 tests passing.

---

## 1. Event Wiring Status

| Event | Emit Point | Pattern | Status |
|---|---|---|---|
| `task_timeout` | `reasonLoopWorker.ts` — Promise.race catch | best-effort try/catch | ✅ Wired (Stage 4B) |
| `tool_timeout` | `shell.ts` — spawn close handler | fire-and-forget .catch | ✅ Wired (Stage 4C) |
| `tool_timeout` | `runTests.ts` — spawn close handler | fire-and-forget .catch | ✅ Wired (Stage 4C) |
| `approval_timeout` | `approvalQueue.ts` — timer callback | fire-and-forget .catch | ✅ Wired (Stage 5B) |

## 2. Schema Changes

| Change | Scope | Compatibility |
|---|---|---|
| +3 event types (Stage 3A) | traceSchemas (2 files) | Backward-compatible |
| +validation rules (Stage 3A) | traceSchemas (2 files) | Adds rules, no removal |
| Relaxed approval_timeout (Stage 5A) | traceSchemas (2 files) | Adds `runId` path, backward-compatible |
| No ApprovalRequest change | — | — |

## 3. Dependency Changes

| Package | Dep Added | Stage |
|---|---|---|
| `@tripp-reason/server` | `@tripp-os/agent-bus: workspace:*` | 4A |
| `@tripp-reason/swarm` | `@tripp-os/agent-bus: workspace:*` | 4A |
| `@tripp-reason/tools` | `@tripp-os/agent-bus: workspace:*` | 4A |

No other dependencies added. No vitest. No new runtime libs.

## 4. Validation

| Metric | Value |
|---|---|
| Typecheck | 0 errors (12 packages) |
| Tests | 262/262 (79 + 17 + 166) |
| Lockfile | Clean |
| Live agents | Disabled |
| ApprovalGate | Enforced, fail-closed |
| Fake/manual defaults | Unchanged |
| Command execution | Guarded behind ApprovalGate |
| Packet lifecycle | No mutation |

## 5. Boundaries Confirmed

- Tripp.Control: untouched ✓
- Tripp.OS: untouched ✓
- shared-agent-bus: untouched ✓
- Codex working tree: not accessible ✓

---

**All timeout trace events operational. Ready for next gate.**
