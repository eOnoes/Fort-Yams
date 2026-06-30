# Tripp.Reason — Stage Reason-3D: Next Implementation Gate Recommendation

**Generated:** 2026-06-06 06:32 UTC
**Auditor:** Cyony (Oni)
**Chain:** 3A → 3B → 3C → 3D
**Repo:** `/opt/data/shared/Tripp.Reason`

---

## Final Decision

**TRIPP_REASON_3D_PASS_RECOMMEND_RUNTIME_INTEGRATION_IMPLEMENTATION**

Tripp.Reason is ready for bounded runtime integration. Recommended: wire timeout trace events to existing emit points, then proceed to the next fake/manual runtime integration path.

---

## 1. Current State Summary

| Metric | Value |
|---|---|
| Tests | 261/261 passing |
| Typecheck | 0 errors |
| Trace events | 29 types, validated |
| Timeout events | Schema ready, emit points documented |
| Timeout handling | Bounded, cleared, fail-closed |
| ApprovalGate | Enforced, fail-closed |
| Live agents | Disabled (blocked at dispatch) |
| Fake/manual | Active defaults |
| Lockfile | Clean |
| Git | Clean except staged test fixes |

## 2. Option Evaluation

| Option | Viability | Rationale |
|---|---|---|
| **A — Runtime integration** | ✅ RECOMMENDED | Foundation solid, ready to wire |
| B — Trace manifest | ⬜ Deferrable | Less critical, post-integration |
| C — external-agents dep | ⬜ Needs approval | One-line change, operator call |
| D — ApprovalGate hardening | ⬜ Already good | 5 test files cover approval |
| E — Cross-project sync | ⬜ Premature | Codex still in Control; wait |

## 3. Recommended Next Gate

**Wire timeout trace events to existing emit points, then bounded runtime integration.**

Specific tasks:
1. Add `@tripp-os/agent-bus` dependency to `@tripp-reason/server` (for approvalQueue emit)
2. Add `@tripp-os/agent-bus` dependency to `@tripp-reason/swarm` (for worker timeout emit)
3. Add `@tripp-os/agent-bus` dependency to `@tripp-reason/tools` (for tool timeout emit)
4. Wire `appendTraceEvent` calls at existing timeout points
5. Add integration tests proving trace events are emitted on timeout
6. Keep fake/manual defaults unchanged
7. Keep live agents disabled

**Pre-approved by this audit:**
- Adding agent-bus as a dependency to server/swarm/tools is explicitly identified as needed
- The emit points are already documented (see 3A report)
- No runtime architecture changes — just adding trace emission at existing timeout catch points

---

**Chain complete.** 261/261 tests. 0 type errors. Ready for runtime integration.
