# Tripp.OS Stage 5 — Runtime Design Report

## PHASE

Stage 5 — Runtime Design Only

## STATUS

**PASS** ✅

## EXECUTIVE VERDICT

Runtime design is complete and ready for Stop Point 5 review. The design covers all 17 required sections: purpose, non-goals, inputs, package shape, dependencies, state model, Agent Bus integration, trace/ledger, approval authority, adapter boundary, Control API, operator workflow, failure modes, safe mode/panic, test strategy, implementation phasing, and open decisions.

No code was written. No packages were created. Design only.

---

## FILES CHANGED

None.

## FILES CREATED

| File | Purpose |
|------|---------|
| `docs/tripp-os-runtime-design-v0.md` | Full Runtime design document (17 sections, ~30KB) |
| `reports/tripp-os-stage-5-runtime-design-report.md` | This report |

---

## DESIGN OUTPUTS

1. **Tripp.OS Runtime Design v0** — `docs/tripp-os-runtime-design-v0.md`

---

## RUNTIME BOUNDARY SUMMARY

### Runtime Owns (design, not implementation)
- Runtime process lifecycle (start/stop/status/panic)
- Queue manager (packet ingestion, dispatch routing, lifecycle)
- Durable trace writer (append-only JSONL)
- Approval coordinator (operator approval, Echo review integration)
- Health monitor and alert emitter
- Safe mode / panic state controller
- Generic adapter boundary (registry, dispatch, kill, health check)
- Control-facing API surface (REST + SSE)
- Report registry
- Future: workcell manager, merge candidate manager

### Runtime Does NOT Own
- Tripp.Control dashboard (separate project)
- Tripp.Reason reasoning engine (separate project)
- Hermes/OpenClaw/Codex adapter implementations (generic boundary only)
- MCP runtime
- Store extraction project
- Forge/memory system
- Recursive swarm brain
- Uncontrolled autonomous background workers

---

## PACKAGE / MODULE PROPOSAL

| Package | Purpose | Risk |
|---------|---------|------|
| `@tripp-os/runtime-core` | Process lifecycle, config, state model, health, safe mode/panic | HIGH |
| `@tripp-os/runtime-queue` | Queue manager, packet lifecycle, dead-letter handling | HIGH |
| `@tripp-os/runtime-trace` | Trace writer/reader, validation, search, causal chain | MEDIUM |
| `@tripp-os/runtime-approval` | Approval coordinator, operator queue, Echo review integration | CRITICAL |
| `@tripp-os/runtime-adapters` | Generic adapter boundary, registry, dispatch, kill | HIGH |
| `@tripp-os/runtime-api` | Control-facing REST+SSE endpoints (16 required v0, 3 optional, 5 future) | HIGH |
| `@tripp-os/runtime-store` | Internal durable state (SQLite or file-based) | MEDIUM |

---

## DEPENDENCY DIRECTION

**Allowed:** Runtime packages import downward to `@tripp-os/contracts` and `@tripp-os/agent-bus`. Tripp.Control consumes Runtime API via HTTP/SSE only. External agents consume generic adapter interface only.

**Forbidden:** Contracts and agent-bus packages never import Runtime. Runtime never imports Tripp.Reason, Tripp.Control internals, or agent-specific SDKs. Dashboard never writes to queue or trace. API never triggers execution directly.

---

## STREAMEVENT DIVERGENCE RESOLUTION PLAN

**Strategy 1 selected: Runtime uses only generic Tripp.OS StreamEvents.**

- Runtime imports StreamEvents from `@tripp-os/contracts` (generic shapes)
- Tripp.Reason uses its own StreamEvents from `@tripp-reason/shared` (ReasonLoop shapes)
- If Tripp.Reason needs to flow events to Runtime, a mapper in shared converts local→generic
- Agents receive events in the shape their adapters expect
- No accidental mixing possible — different import paths, different type-check surfaces

---

## CONTROL API SURFACE SUMMARY

**16 required v0 endpoints:**
- `/health`, `/queue`, `/queue/:id` — status and queue visibility
- `/approvals`, `/approvals/:id`, `/approvals/:id/review` — approval workflow
- `/trace`, `/trace/chain/:id` — trace tail and causal chain
- `/reports`, `/reports/:id` — report registry
- `/adapters` — adapter status
- `/safe-mode`, `/safe-mode/clear` — safe mode control
- `/panic` — manual panic stop
- `/alerts` — active alerts

**3 optional v0 endpoints:** `/trace/search`, `/adapters/:id/kill`, `/events` (SSE)

**5 future endpoints:** `/workcells`, `/merge-candidates`, `/budget`, `/runs`, `/runs/:id`

---

## ADAPTER BOUNDARY SUMMARY

Generic `AgentAdapter` interface with:
- Identity: id, agentRole, capabilities, config
- Lifecycle: connect, disconnect, healthCheck
- Execution: executeTask, kill
- Limits: maxConcurrentTasks, timeoutMs

Agent profiles defined for Tripp (lead/builder), Cyony (proposal-only), Echo (review-only). Safety rules per agent encoded in capabilities. All adapters require `allowDirectMutation: false`.

---

## SAFETY / AUTHORITY MODEL

- **Operator (Eddie):** Final approver
- **ApprovalGate:** Fail-closed, enforces risk level, tool policy, adapter config
- **Echo (Warden):** Advisory only. Block/escalate require findings. Never approves.
- **No self-approval** — enforced at Zod schema level (`agentMayApprove: false`)
- **No implicit approval** — no trace event, result packet, or dashboard click substitutes for explicit operator action

---

## FAILURE MODE COVERAGE

12 failure modes covered:
1. Malformed packet → reject, trace
2. Missing result → reject, alert
3. Stale claimed packet → reclaim, trace
4. Adapter timeout → kill, safe mode check
5. Forbidden tool → block, trace, alert
6. Path traversal → reject, trace, safe mode trigger
7. Self-approval → block, trace, alert
8. Trace write failure → stderr, alert, safe mode
9. Dashboard stale → SSE reconnect
10. Duplicate packet IDs → reject, trace
11. Conflicting merge candidates → alert, operator resolution
12. Runtime shutdown mid-cycle → drain, trace

---

## IMPLEMENTATION PHASING PROPOSAL

| Stage | Deliverable | Gate |
|-------|------------|------|
| 6A | Runtime skeleton (no side effects) | Status machine verified |
| 6B | Read-only queue & status | Queue reads accurately |
| 6C | Append-only trace writer | Trace writes/reads correctly |
| 6D | Packet lifecycle manager | Full lifecycle via fake packets |
| 6E | Approval coordinator | ApprovalGate enforced |
| 6F | Safe mode / panic | Triggered and recovered |
| 6G | Generic fake/manual adapter runner | End-to-end with trace |
| 6H | Control API contract | All v0 endpoints serve correctly |
| 6I | Power audit | Clean, ready for live adapters |

---

## VALIDATION / REVIEW PERFORMED

| Check | Result |
|-------|--------|
| No Runtime code added | ✅ — design doc only |
| No adapter code added | ✅ — design doc only |
| No dashboard/API/server implementation | ✅ |
| No package creation | ✅ |
| No Stage 1B/v5 contract expansion | ✅ |
| No MCP/store extraction | ✅ |
| Docs internally consistent with Stages 1–4A | ✅ |
| StreamEvent divergence addressed | ✅ — Strategy 1 |
| All carry-forward findings addressed | ✅ |

---

## DRIFT / SCOPE WATCH

| Check | Result |
|-------|--------|
| No Runtime implementation | ✅ |
| No Hermes adapter | ✅ |
| No OpenClaw adapter | ✅ |
| No Codex adapter | ✅ |
| No dashboard/API/server feature work | ✅ |
| No MCP/store extraction | ✅ |
| No Stage 1B/v5 contract expansion | ✅ |
| No Windows Job Object/process manager work | ✅ |
| No packet behavior rewrite | ✅ |
| No broad Tripp.Reason refactor | ✅ |

---

## BLOCKERS

**None.**

---

## OPERATOR DECISIONS NEEDED

Eddie must decide before Stage 6 implementation begins:

1. Local-only vs optional remote Runtime API
2. File-based only vs DB-backed trace ledger
3. REST+SSE vs WebSocket for API protocol
4. Dashboard integration sequence (before or after Runtime stabilizes)
5. Which live adapter first: Tripp → Echo → Cyony (recommended order)
6. Keep Tripp.Reason as primary Runtime test harness during rollout
7. Should Codex build a Control-facing agent after Runtime API stabilizes
8. `@tripp-os/runtime-*` naming convention confirmed
9. JSONL trace acceptable for v0, or immediate WAL required
10. Operator auth model for approval actions

---

## NEXT STEP

**Recommend: Approve Stop Point 5 design review, then proceed to Stage 6A (Runtime skeleton, no side effects).**

Alternative options:
- Produce a Codex-facing Control API planning prompt
- Produce a Cyony-facing Tripp.Reason dry-run alignment prompt
