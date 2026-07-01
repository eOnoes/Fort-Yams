# Phase 5D Orchestrator Fake Pipeline Report

## PHASE

Phase 5D — Orchestrator + Planner + Merger + Warden Smoke

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Orchestration pipeline design, deterministic task decomposition, merge/warden logic, conflict handling
- **Fast Technical Builder** — Implementation of all 7 pipeline components
- **Code Review / Warden Pass** — Scope audit, boundary check, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/swarm/src/ids.ts` | Lightweight ID generator for plans/tasks/conflicts |
| `packages/swarm/src/planner.ts` | Deterministic planner: prompt keywords → SwarmRunPlan |
| `packages/swarm/src/orchestrator.ts` | Pipeline orchestrator: plan → execute waves → merge → conflicts → warden → summary |
| `packages/swarm/src/merger.ts` | ResultPacket merger: status aggregation, finding/file/tool dedup |
| `packages/swarm/src/conflictDetector.ts` | Write conflict detection: same-file proposedChanges across workers |
| `packages/swarm/src/warden.ts` | Warden review: cap check, recursive spawn, conflicts, mutation safety → PASS/PARTIAL/FAIL |
| `packages/swarm/src/swarmSummary.ts` | SwarmRunSummary builder from pipeline results |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/swarm/src/index.ts` | Added barrel exports for orchestrator, planner, merger, conflictDetector, warden, swarmSummary |

## PIPELINE COMPONENTS CREATED

### Planner (keyword-driven)
`createPlan({ operatorPrompt, workdir })` → `SwarmRunPlan`
- `[single]` → solo mode, 1 coder worker
- `[parallel]` → small mode, 3 workers (researcher + coder + tester)
- Default → small mode, 3 workers
- Creates dynamic SubagentSpecs with custom system prompts
- Creates TaskPackets with role-appropriate risk levels
- Creates SubagentAssignments in wave 0 (parallel) or sequential (solo)
- Detects serialCollapseRisk and swarmSpamRisk
- Fills OrchestrationDecision metadata

### Orchestrator
`runSwarmPipeline({ operatorPrompt, workdir })` → `SwarmRunSummary`
1. Plan → validate → enforce hard cap
2. Execute by wave: group assignments by wave, run in parallel per wave via `Promise.all`
3. Conflict detection
4. Merge results
5. Warden review
6. Build summary

### Wave Execution
Assignments grouped by `wave` field. Same-wave workers run concurrently. DependsOn validated at plan level. No real process spawning — all fake workers run in-process.

### Merger
`mergeResults(results, conflicts?)` → `MergedResult`
- Status: any fail → fail, any partial → partial, all pass → pass
- Aggregates findings, filesTouched (deduped), toolCalls
- Includes conflict records
- Returns counts: passCount, partialCount, failCount

### Conflict Detector
`detectConflicts(results)` → `ConflictRecord[]`
- Detects when 2+ workers propose changes to same file
- Read-only overlaps (empty proposedChanges) don't conflict
- Returns open conflicts with file path and competing taskIds

### Warden
`runWarden(plan, results, merged, conflicts)` → `WardenVerdict`
Rules enforced:
- Hard cap (≤25 workers) — critical violation if exceeded
- Recursive spawn detection (keyword "spawn" in findings)
- Worker count mismatch (plan vs results)
- Open conflicts — warns
- Unexpected mutations (non-coder proposing changes)
- Status: FAIL if critical violations or failures; PARTIAL if partials or conflicts; PASS otherwise

### Swarm Summary
`buildSwarmSummary({ plan, resultPackets, conflicts, verdict, startedAt, completedAt })` → `SwarmRunSummary`
- Maps Warden PASS/PARTIAL/FAIL to pass/partial/fail status
- Preserves full plan and results for audit

## OPERATING MODEL RESULT

The deterministic Kimi-style pipeline works end-to-end:

```
prompt → planner → SwarmRunPlan → orchestrator
  → validate → execute waves (fake workers) → detect conflicts
  → merge → warden → summary
```

All components are pure or deterministic — no providers, no tools, no file I/O. The pipeline can be tested in isolation before wiring in real ReasonLoop-backed workers in Phase 5E.

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (9 packages) | ✅ 0 errors |
| `pnpm build` (9 packages) | ✅ 0 errors |

## SMOKE TEST RESULT

**24/24 assertions PASS:**

| # | Test | Result |
|---|------|--------|
| 1 | [parallel] creates 3-worker small plan | ✅ |
| 2 | Subagent names are dynamic (not static) | ✅ |
| 3 | Pipeline executes 3 workers, returns 3 results | ✅ |
| 4 | Merger returns pass when all pass | ✅ |
| 5 | Warden returns PASS for clean plan | ✅ |
| 6 | Timeout worker → PARTIAL | ✅ |
| 7 | Failure worker → FAIL/PARTIAL | ✅ |
| 8 | Conflict detector flags same-file writes | ✅ |
| 9 | Warden returns PARTIAL on open conflicts | ✅ |
| 10 | [single] creates solo plan (1 worker) | ✅ |
| 11 | >25 workers rejected | ✅ |
| 12 | Swarm spam risk detected | ✅ |
| 13 | Serial collapse risk detected | ✅ |
| 14-16 | Scope: no providers/tools/MCP, clean imports | ✅ |

## CONFLICT / WARDEN RESULT

- **Conflict detection:** Two coders proposing changes to `src/a.ts` → 1 open conflict with both taskIds
- **Warden on clean plan:** 0 violations → PASS
- **Warden on conflicts:** 1 warning violation → PARTIAL
- **Warden on failures:** critical finding → FAIL
- **Warden on hard cap violation:** critical violation → FAIL

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| swarm imports only shared + zod | ✅ |
| No core import | ✅ |
| No package imports swarm | ✅ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No ReasonLoop integration | ✅ |
| No provider calls | ✅ |
| No real tool execution | ✅ |
| No MCP involvement | ✅ |
| No file mutation | ✅ |
| No server/CLI integration | ✅ |
| No OpenClaw/Hermes adapters | ✅ |
| No UI/dashboard | ✅ |
| No new dependencies | ✅ |

## DESIGN DECISIONS

### Deterministic Planning
Keywords (`[single]`, `[parallel]`) drive plan creation. No LLM, no provider calls. This lets pipeline tests be fully reproducible. In Phase 5E+, the planner can be replaced with an LLM-backed version without changing the orchestrator interface.

### Fake Wave Execution
Waves are executed via `Promise.all` per wave group — same-wave workers run concurrently in-process. This proves the concurrency model without real process spawning. Phase 5E will replace `runFakeWorker` with ReasonLoop-backed workers while keeping the wave execution structure.

### Merger Status Mapping
Priority: fail > partial > pass. Any worker failure makes the whole swarm fail (or partial if the warden downgrades). This is a conservative default — Phase 5E+ can add criticality weights per role.

### Warden Rules
The warden enforces 4 categories: structural (worker caps, count consistency), safety (recursive spawn, unexpected mutations), conflicts, and results (failures, partials). New rules can be added without changing the orchestrator.

### Conflict Detection
In-memory only — checks `proposedChanges[].file` overlap. No file system access. This is sufficient for Phase 5D deterministic testing. Phase 5F+ can add filesystem-level lock detection.

### Why Real Execution Remains Phase 5E
The fake pipeline proves the orchestration contracts work. Phase 5E swaps fake workers for ReasonLoop-backed real workers with providers and tools. Keeping these phases separate means Phase 5D can be validated deterministically before introducing non-deterministic LLM behavior.

## BLOCKERS

None.

## NEXT STEP

**Phase 5E — Real ReasonLoop-Backed Worker Execution**

Replace `runFakeWorker` with ReasonLoop-backed workers. Workers get real providers, real tools, real ApprovalGate. Pipeline structure (plan → waves → merge → warden) stays the same.

Phase 5D is complete. 9/9 build. 24/24 smoke. Ready for 5E.

---

*Report generated 2026-06-03. Phase 5D Orchestrator Fake Pipeline Report — PASS.*
