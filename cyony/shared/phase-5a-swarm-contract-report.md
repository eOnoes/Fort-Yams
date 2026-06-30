# Phase 5A Swarm Contract Report

## PHASE

Phase 5A — Swarm Runtime Contract Lock

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Swarm architecture design, worker boundaries, orchestration model, packet contracts, approval interaction, concurrency model, Kimi-style decomposition
- **Code Review / Warden Pass** — Scope control, doctrine compliance, dependency direction verification, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `docs/PHASE_5_SWARM_CONTRACT.md` | Complete Phase 5 swarm runtime contract (17KB, 12 sections): purpose, non-goals, operating model, worker roles, concurrency rules, packet contracts, approval/tool/MCP integration, provider routing, conflict detection, report contract, failure behavior, package boundary, implementation sequence, testing requirements, open questions |

## FILES MODIFIED

None. Docs-only phase. No code created.

## SWARM CONTRACT SUMMARY

The Phase 5 Swarm Contract defines a disciplined Kimi-style multi-worker orchestration model with these core properties:

- **Bounded, not chaotic** — max 25 workers, default 3, solo by default
- **Role-bounded workers** — 8 roles (Planner, Researcher, Coder, Reviewer, Tester, Merger, Reporter, Warden), each with allowed/forbidden behaviors
- **Structured packets** — workers return `ResultPacket` (not prose), merger processes programmatically
- **ApprovalGate preserved** — all mutation tools route through existing gate; medium/large swarms require startup approval
- **ToolDispatcher preserved** — workers use same tool system; MCP tools passthrough; tool allowlists per task
- **Warden final pass** — safety/scope/drift review before report delivery
- **Conflict detection** — no two workers write same file concurrently
- **Fail-closed** — missing ApprovalGate → no mutating workers; worker failure doesn't crash swarm unless critical

## OPERATING MODEL DECISION

The swarm follows a pipeline model rather than a free-form agent loop:

```
Orchestrator → Planner → [Workers in parallel] → Merger → Warden → Report
```

This is explicitly a **Kimi-style** model — bounded decomposition, structured results, mandatory review pass. Workers don't chat with each other; they execute bounded task packets and return structured results.

Key architectural decisions:
- **One orchestrator, one merger, one warden** — not peer-to-peer
- **Planner runs first** — task decomposition before worker spawn
- **Workers run in parallel** under concurrency cap
- **Merger runs after all workers complete** (or timeout)
- **Warden is the final gate** — can override merger

## WORKER ROLE DECISION

8 initial roles chosen to cover the full task lifecycle:

| Role | Allowed | Forbidden | Output |
|------|---------|-----------|--------|
| Planner | Analyze, classify, decompose | Execute code, mutate files | TaskPacket[] |
| Researcher | Search, read, git inspect | Write/edit, shell mutations | Findings |
| Coder | Write, edit, build, test | Delete outside scope, git push | Code changes + diffs |
| Reviewer | Review diffs, static analysis | Make code changes directly | Review findings |
| Tester | Run tests, validate | Modify source code | Test results |
| Merger | Consolidate, detect conflicts | Modify worker results | Unified result + conflicts |
| Reporter | Generate report, aggregate | Change results, alter verdicts | Markdown report |
| Warden | Scope/safety review | Execute tools, override operator | Verdict + violations |

Each role has explicit allowed/forbidden tool access enforced by `TaskPacket.allowedTools` / `forbiddenTools`.

## PACKET CONTRACTS

### TaskPacket
Structured input to a worker: `{ id, role, title, objective, scope, allowedFiles, forbiddenFiles, allowedTools, forbiddenTools, modelTier, riskLevel, timeoutMs, requiresApproval, contextRefs, expectedOutput, dependsOn }`. Workers receive one packet and produce one result.

### ResultPacket
Structured output from a worker: `{ taskId, role, status: pass|partial|fail, summary, findings[], filesTouched[], toolCalls[], proposedChanges[], validation, risks[], nextRecommendation, rawArtifacts? }`. No free-form prose beyond `summary` (2000 char cap) and `validation`.

**This is the Kimi-style differentiator:** workers don't produce essays — they produce structured data the merger can process programmatically.

## APPROVAL / TOOL INTEGRATION DECISION

Swarm preserves existing systems without modification:

- **ApprovalGate** unchanged — swarm startup requires approval for medium/large mode; worker tool calls route through same gate
- **ApiApprover / CliApprover** unchanged — swarm is just another consumer
- **ToolDispatcher** unchanged — workers use same dispatcher; tool allowlists enforced at TaskPacket level
- **MCP tools** unchanged — namespaced names work in allowlists; no MCP-specific bypass
- **Fail-closed** — no gate → no mutating workers

## CONCURRENCY / LIMIT DECISION

Per doctrine, with conservative defaults for Phase 5:

| Mode | Workers | Approval | Phase 5 |
|------|---------|----------|---------|
| Solo | 1 | No | Default |
| Small | 3–5 | No | Start here (3 max initially) |
| Medium | 6–10 | Yes | Unlock after small proven |
| Large | 11–20 | Yes | Deferred |
| Max | 25 | Yes + manual | Hard cap |

Phase 5C-5D will start with max 3 workers. Scaling to 5, then 10, requires smoke test evidence.

## PACKAGE BOUNDARY DECISION

```
swarm ← shared               (contracts)
swarm ← core                 (ReasonLoop for workers)
cli/server → swarm           (assembly)
core ↛ swarm                 (NEVER)
tools ↛ swarm                (NEVER)
mcp ↛ swarm                  (NEVER)
```

jCodeMunch confirmed: `core/src/reasonLoop.ts` imports only from within core (runManager, approvalGate, errors). Core has zero awareness of tools, mcp, or swarm. Swarm can consume core without core knowing about swarm — identical pattern to MCP.

## IMPLEMENTATION SEQUENCE

| Phase | Deliverable |
|-------|------------|
| 5A | Contract Lock ✅ |
| 5B | Package Skeleton + Packet Types |
| 5C | Fake Worker Runner (deterministic) |
| 5D | Orchestrator + Merger + Warden Smoke |
| 5E | Real ReasonLoop-backed Workers |
| 5F | Server/CLI Registration |
| 5G | Final Audit |

## OPEN QUESTIONS

7 open questions logged in contract:

1. **Per-worker ReasonLoop vs shared** — per-worker isolates failures but adds overhead. Decision deferred to 5C.
2. **Swarm store tables now vs later** — schema exists; stub in 5B, activate in 5E.
3. **Initial parallelism** — 3 workers max until proven.
4. **File locks in swarm vs core** — swarm-level is simpler for Phase 5.
5. **Warden as role vs mandatory pass** — mandatory pass is simplest.
6. **Isolated filesystems vs shared workdir** — shared for Phase 5 simplicity.
7. **Blocking vs async tripp swarm run** — blocking for Phase 5 simplicity.

## TMP / SMOKE ARTIFACT DECISION

Phase 5 smoke tests follow Phase 4 pattern: scripts under `tmp/phase5*-smoke.mjs`, gitignored. No dedicated test area needed.

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No `packages/swarm/` created | ✅ |
| No swarm code written | ✅ |
| No dependencies added | ✅ |
| No build/typecheck changes | ✅ |
| Docs-only phase | ✅ |
| jCodeMunch confirms core imports no external packages | ✅ |

## NEXT STEP

**Phase 5B — Swarm Package Skeleton + Packet Types**

Create `packages/swarm/` scaffold with TaskPacket, ResultPacket, WorkerRole types. No execution yet.

Phase 5A is complete. Contract locked. Ready for Phase 5B.

---

*Report generated 2026-06-03. Phase 5A Swarm Contract Report — PASS.*
