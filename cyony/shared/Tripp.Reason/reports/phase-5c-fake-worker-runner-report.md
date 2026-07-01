# Phase 5C Fake Worker Runner Report

## PHASE

Phase 5C — Local In-Process Worker Runner with Fake Workers

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Worker runner boundaries, fake worker behavior contracts, timeout/failure simulation design, role enforcement
- **Fast Technical Builder** — Implementation of workerRunner, fakeWorkers, workerErrors
- **Code Review / Warden Pass** — Scope audit, package boundary check, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/swarm/src/workerErrors.ts` | 6 controlled error types: SwarmWorkerError, SwarmValidationError, SwarmRoleMismatchError, SwarmTimeoutError, SwarmExecutionError, SwarmFrozenViolationError |
| `packages/swarm/src/workerRunner.ts` | WorkerRunner interface, WorkerExecutionContext, runWorker() — validates, checks roles, routes to fake workers |
| `packages/swarm/src/fakeWorkers.ts` | 8 role-specific deterministic fake workers (planner through warden) + timeout/failure simulation |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/swarm/src/index.ts` | Added barrel exports for worker errors, worker runner, fake workers |

## WORKER RUNNER COMPONENTS

### WorkerRunner Interface
```typescript
interface WorkerRunner {
  role: WorkerRole;
  run(subagent: SubagentSpec, taskPacket: TaskPacket, context: WorkerExecutionContext): Promise<ResultPacket>;
}
```

### WorkerExecutionContext
- `swarmId`, `startedAt`, `workdir` — runtime context
- `fakeExecution: boolean` — Phase 5C must be `true` (real execution is Phase 5E)
- `simulateTimeout?: boolean` — testing flag
- `simulateFail?: boolean` — testing flag

### runWorker()
Validation pipeline before execution:
1. `validateSubagentSpec(subagent)` — rejects invalid specs, frozen violations
2. `validateTaskPacket(taskPacket)` — rejects invalid packets
3. Role match check — `subagent.role === taskPacket.role` or throws `SwarmRoleMismatchError`
4. Route to `runFakeWorker()` (Phase 5C) or error (Phase 5E not yet implemented)

### Error Hierarchy
- `SwarmWorkerError` (base) — `code`, `subagentId?`, `taskPacketId?`
- `SwarmValidationError` — invalid spec/packet
- `SwarmRoleMismatchError` — role mismatch
- `SwarmTimeoutError` — timeout
- `SwarmExecutionError` — execution failure
- `SwarmFrozenViolationError` — frozen worker attempted restricted behavior

## FAKE WORKER BEHAVIOR

All 8 roles have deterministic fake implementations:

| Role | Returns |
|------|---------|
| planner | Info finding: task analyzed and decomposed |
| researcher | Info finding: relevant information found in scope |
| coder | Mock `ProposedChange` for `{scope}/fake-implementation.ts` — no real file written |
| reviewer | Info finding: code looks good |
| tester | Info finding: all tests passed |
| merger | Info finding: results consolidated, no conflicts |
| reporter | Info finding: swarm report generated |
| warden | Info finding: safety check passed |

**Every fake worker:**
- Returns `status: "pass"` (unless simulation triggered)
- Populates `summary` from task objective
- Adds role-specific `findings[]`
- Sets `filesTouched: []` (coder: explicitly empty to prevent false audit trails)
- Sets `toolCalls: []`
- Sets `validation` with "Fake <role> — deterministic output" marker
- Sets `nextRecommendation` for the next pipeline step
- **Never:** calls providers, executes tools, reads/writes files, spawns processes, loads MCP

## TIMEOUT / FAILURE BEHAVIOR

Two simulation paths, triggered by markers in `taskPacket.objective` or context flags:

### Timeout (`[simulate-timeout]` or `ctx.simulateTimeout`)
- Returns `status: "partial"`
- Adds warning finding: "Timeout after Nms. Partial results returned."
- Adds medium risk: "results may be incomplete"
- Validation: "Fake timeout — deterministic simulation."
- Does NOT throw — returns controlled ResultPacket

### Failure (`[simulate-fail]` or `ctx.simulateFail`)
- Returns `status: "fail"`
- Adds critical finding: "Simulated worker failure."
- Adds high risk: "task results unavailable"
- Validation: "Fake failure — deterministic simulation."
- Does NOT crash process

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (9 packages) | ✅ 0 errors |
| `pnpm build` (9 packages) | ✅ 0 errors |

## SMOKE TEST RESULT

**28/28 assertions PASS:**

| # | Test | Result |
|---|------|--------|
| 1 | Valid researcher returns pass with findings | ✅ |
| 2 | Role mismatch throws SwarmRoleMismatchError | ✅ |
| 3 | Unfrozen non-planner rejected | ✅ |
| 4 | Coder returns mock ProposedChange (no real file) | ✅ |
| 5 | Tester returns validation note | ✅ |
| 6 | Warden returns safety finding | ✅ |
| 7 | Simulated timeout returns PARTIAL (no throw) | ✅ |
| 8 | Simulated failure returns FAIL with critical finding | ✅ |
| 9 | All 8 roles return valid pass ResultPackets | ✅ |
| 10 | Invalid TaskPacket rejected with SwarmValidationError | ✅ |
| 11-14 | Scope: imports, no files, no execution | ✅ |

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| swarm imports only shared + zod | ✅ |
| No core import | ✅ |
| No package imports swarm | ✅ (verified by typecheck) |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No orchestrator logic | ✅ |
| No planner decomposition logic | ✅ |
| No merger logic | ✅ |
| No warden logic beyond fake finding | ✅ |
| No conflict detector | ✅ |
| No swarm report generation | ✅ |
| No ReasonLoop integration | ✅ |
| No provider calls | ✅ |
| No tool execution | ✅ |
| No MCP involvement | ✅ |
| No server/CLI integration | ✅ |
| No new dependencies | ✅ |

## DESIGN DECISIONS

### Deterministic Fake Behavior
Every fake worker returns the same output for the same input. No randomness, no model calls, no external state. This makes smoke tests reproducible and proves the packet contract works before wiring real execution. The "Fake <role> — deterministic output" marker in `validation` makes it auditable.

### Role Mismatch Handling
`runWorker()` throws `SwarmRoleMismatchError` when `subagent.role !== taskPacket.role`. This is enforced before any fake execution happens. Rationale: a worker running a mismatched task is a configuration bug, not a runtime condition — it should fail fast and loud.

### Invalid Packet Handling
Invalid specs/packets throw `SwarmValidationError` before any execution. `runWorker()` does not silently create invalid ResultPackets. This is a fail-fast design: garbage in → error out, not garbage in → garbage out.

### Timeout/Failure Simulation
Simulation is controlled by `taskPacket.objective` markers (`[simulate-timeout]`, `[simulate-fail]`) or context flags. This allows smoke tests to exercise failure paths without requiring real timeouts or process crashes. In Phase 5E, real timeouts will be enforced by the ReasonLoop's existing timeout mechanism.

### Why Real Execution Remains Phase 5E
Phase 5C proves the packet contracts work. Phase 5D will prove orchestration (planner + merger + warden) works with fake workers. Phase 5E wires in ReasonLoop-backed real workers with providers and tools. Keeping these phases separate ensures each layer is testable in isolation.

## BLOCKERS

None.

## NEXT STEP

**Phase 5D — Orchestrator + Planner + Merger + Warden Smoke (fake workers)**

Wire the orchestrator pipeline: planner decomposes → fake workers execute → merger consolidates → warden reviews. All with deterministic fake workers — no real execution yet.

Phase 5C is complete. 9/9 build. 28/28 smoke. Ready for 5D.

---

*Report generated 2026-06-03. Phase 5C Fake Worker Runner Report — PASS.*
