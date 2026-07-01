# Phase 5B.1 Dynamic Subagent Types Report

## PHASE

Phase 5B.1 — Dynamic Subagent Type Addendum

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Kimi-style swarm type alignment, dynamic subagent contracts, critical-path metrics, serial-collapse/swarm-spam guard design
- **Fast Technical Builder** — Surgical type/schema/helper additions
- **Code Review / Warden Pass** — Scope compliance, package boundary verification, report

## FILES CREATED

None. This is a surgical addendum — all changes are patches to existing 5B files.

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/swarm/src/types.ts` | Added SubagentSpec, SubagentAssignment, CriticalPathMetrics, OrchestrationDecision, SwarmRunPlan |
| `packages/swarm/src/schemas.ts` | Added Zod schemas for all 5 new types |
| `packages/swarm/src/validation.ts` | Added 6 new pure helpers: validateSubagentSpec, validateSubagentAssignment, validateSwarmRunPlan, detectSerialCollapseRisk, detectSwarmSpamRisk, calculateCriticalPathMetrics |
| `packages/swarm/src/index.ts` | Added barrel exports for new types, schemas, and helpers |

## TYPES / SCHEMAS ADDED

### SubagentSpec
Dynamic subagent definition — the orchestrator creates these on demand per run. No predefined roster.
- `id`, `name`, `role`, `systemPrompt` (custom, up to 8000 chars), `modelTier`, `allowedTools`, `forbiddenTools`, `allowedFiles`, `forbiddenFiles`, `maxSteps` (default 100, max 200), `timeoutMs`, `frozenBehavior` (default true)

### SubagentAssignment
Binds a SubagentSpec to a TaskPacket — represents the `assign_task` operation.
- `id`, `subagentId`, `taskPacketId`, `wave` (parallelism order), `dependsOn`, `status`, `startedAt`, `completedAt`

### CriticalPathMetrics
Wall-clock efficiency metrics. The formula is: `orchestratorPlanningMs + max(workerWaveMs) + mergerMs + wardenMs`
- `orchestratorPlanningMs`, `workerWaveMs[]`, `maxWorkerWaveMs`, `mergerMs`, `wardenMs`, `totalCriticalPathMs`, `totalWorkerMs`, `parallelEfficiencyRatio`

### OrchestrationDecision
Lightweight audit metadata for debugging orchestrator behavior.
- `shouldParallelize`, `reason`, `workerCount`, `selectedMode`, `serialCollapseRisk?`, `swarmSpamRisk?`, `assumptions[]`, `rejectedAlternatives?`

### SwarmRunPlan
Complete pre-execution blueprint from the orchestrator.
- `id`, `operatorPrompt`, `shouldParallelize`, `reasonForParallelism`, `selectedMode`, `workerCount`, `subagents[]`, `taskPackets[]`, `assignments[]`, `dependencyGraph`, `criticalPathEstimate?`, `approvalRequired`, `serialCollapseRisk?`, `swarmSpamRisk?`, `createdAt`

## VALIDATION HELPERS ADDED

| Helper | Purpose |
|--------|---------|
| `validateSubagentSpec(spec)` | Zod validation + frozenBehavior enforcement for non-orchestrator roles |
| `validateSubagentAssignment(assignment)` | Zod validation |
| `validateSwarmRunPlan(plan)` | Full cross-field validation: counts, references, mode caps, approval alignment |
| `detectSerialCollapseRisk(plan)` | True when shouldParallelize=false but tasks have no dependencies |
| `detectSwarmSpamRisk(plan)` | True when shouldParallelize=true and workerCount > taskPackets.length |
| `calculateCriticalPathMetrics(metrics, workerCount)` | Computes critical path per Kimi formula |

All helpers are pure functions — no I/O, no execution, no provider calls.

## KIMI-STYLE ALIGNMENT

| Kimi Concept | Tripp.Reason Implementation |
|-------------|---------------------------|
| create_subagent (dynamic) | SubagentSpec with custom systemPrompt, created per run |
| assign_task | SubagentAssignment binds spec → taskPacket with wave ordering |
| Frozen sub-agents | frozenBehavior: true enforced for all non-orchestrator roles |
| Critical path optimization | CriticalPathMetrics: Σ(orchestrator + max(wave) + merger + warden) |
| Serial collapse prevention | detectSerialCollapseRisk() flags sequential-on-independent |
| Swarm spam prevention | detectSwarmSpamRisk() flags workers > tasks |
| Orchestrator decides parallelism | OrchestrationDecision.shouldParallelize + reason |
| No predefined agent roster | SubagentSpecs are created dynamically; roles constrain behavior, not identity |

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (9 packages) | ✅ 0 errors |
| `pnpm build` (9 packages) | ✅ 0 errors |

## SMOKE TEST RESULT

**12/12 assertions PASS:**

| # | Test | Result |
|---|------|--------|
| 1 | Valid SubagentSpec passes | ✅ |
| 2 | Invalid SubagentSpec fails | ✅ |
| 3 | Unfrozen worker rejected | ✅ |
| 4 | Valid SubagentAssignment passes | ✅ |
| 5 | Valid 3-worker SwarmRunPlan passes | ✅ |
| 6 | >25 worker SwarmRunPlan rejected | ✅ |
| 7 | Serial collapse detected (seq on independent) | ✅ |
| 8 | Swarm spam detected (workers > tasks) | ✅ |
| 9a | Critical path formula: 100+250+50+30=430 | ✅ |
| 9b | maxWorkerWaveMs = 250 | ✅ |
| 10 | Swarm imports only shared+zod | ✅ |
| 11 | No other package imports swarm | ✅ |
| 12 | No execution code added | ✅ |

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| swarm imports only shared + zod | ✅ |
| No core import | ✅ |
| No package imports swarm | ✅ (verified by typecheck) |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No orchestrator execution logic | ✅ |
| No planner logic | ✅ |
| No worker runner | ✅ |
| No merger/warden logic | ✅ |
| No server/CLI swarm registration | ✅ |
| No ReasonLoop changes | ✅ |
| No new dependencies | ✅ |
| No UI/dashboard | ✅ |

## DESIGN DECISIONS

### frozenBehavior
Default true for all non-orchestrator roles. Enforced in `validateSubagentSpec()`. The orchestrator (planner role) is exempt since it needs flexibility to decompose tasks. This directly implements the Kimi model: "froze the sub-agents and only trained the orchestrator."

### Dynamic Subagent vs Static Role Taxonomy
The existing `WorkerRole` enum (planner, researcher, coder, etc.) constrains _what_ a subagent does. `SubagentSpec` adds _who_ — dynamically created per run with custom system prompts. Roles are behavioral constraints; specs are runtime instances. This gives the orchestrator Kimi-style flexibility while maintaining auditability through role classification.

### Critical Path Metric
The formula `Σ(orchestrator + max(wave) + merger + warden)` rewards parallel execution because `max(wave)` shrinks as workers run concurrently. This matches Kimi's "not total worker step count" philosophy. The `parallelEfficiencyRatio` (totalWorkerMs / (criticalPathMs × workerCount)) quantifies how much parallelism actually helped.

### Serial Collapse Detection
Flags when the orchestrator chooses sequential execution but all tasks are independent (no dependency edges). This is a pure function — it doesn't override the orchestrator's decision, only surfaces the risk for audit and potential future RL feedback.

### Swarm Spam Detection
Flags when parallel worker count exceeds task count. Simple heuristic: more workers than tasks means some workers have nothing meaningful to do.

### Why Execution Remains Phase 5C+
All new code is pure types, schemas, and pure functions. No spawn, no process management, no ReasonLoop integration. The packet contracts are now Kimi-aligned but execution machinery belongs in 5C (fake workers) and 5E (real workers).

## BLOCKERS

None.

## NEXT STEP

**Phase 5C — Local In-Process Worker Runner with Fake Workers**

The type foundation now supports Kimi-style dynamic subagents. Phase 5C can implement deterministic fake workers that accept SubagentSpec + TaskPacket and return ResultPackets — proving the contracts work before wiring in ReasonLoop.

Phase 5B.1 is complete. 9/9 build. 12/12 smoke. Ready for 5C.

---

*Report generated 2026-06-03. Phase 5B.1 Dynamic Subagent Types Report — PASS.*
