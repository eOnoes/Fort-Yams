# Phase 5B Swarm Types Report

## PHASE

Phase 5B — Swarm Package Skeleton + Packet Types

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Packet type design, role boundaries, status enums, dependency direction
- **Fast Technical Builder** — Implementation of types, schemas, constants, validation
- **Code Review / Warden Pass** — Scope compliance, dependency verification, report

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/swarm/package.json` | Package config, depends on shared + zod |
| `packages/swarm/tsconfig.json` | Extends tsconfig.base.json, references shared |
| `packages/swarm/src/types.ts` | Core types: WorkerRole, SwarmMode, status enums, TaskPacket, ResultPacket, Finding, ProposedChange, RiskNote, ToolCallSummary, WardenVerdict, ConflictRecord, SwarmConfig, SwarmRunSummary |
| `packages/swarm/src/schemas.ts` | Zod schemas for all types (runtime validation) |
| `packages/swarm/src/constants.ts` | Worker caps, approval thresholds, timeout defaults, field caps |
| `packages/swarm/src/validation.ts` | Pure helpers: getWorkerCapForMode, doesModeRequireApproval, validateWorkerCount, validateTaskPacket, validateResultPacket, validateSwarmConfig |
| `packages/swarm/src/index.ts` | Barrel exports — full public API |

## FILES MODIFIED

None outside `packages/swarm/`. `pnpm-lock.yaml` updated by `pnpm install`.

## SWARM TYPES CREATED

### Enums / Unions
- **WorkerRole**: planner | researcher | coder | reviewer | tester | merger | reporter | warden
- **SwarmMode**: solo | small | medium | large | max
- **TaskStatus**: pending | running | pass | partial | fail | cancelled | timed_out
- **ResultStatus**: pass | partial | fail
- **SwarmStatus**: pending | running | pass | partial | fail | cancelled | timed_out
- **ConflictStatus**: open | resolved | blocked
- **ModelTierLabel**: 8 tier labels from MODEL_TIERS.md (no hardcoded model names)

### Packet Types
- **TaskPacket**: 15 fields (id, role, title, objective, scope, allowedFiles?, forbiddenFiles?, allowedTools?, forbiddenTools?, modelTier, riskLevel, timeoutMs, requiresApproval, contextRefs?, expectedOutput, dependsOn?)
- **ResultPacket**: 12 fields (taskId, role, status, summary, findings[], filesTouched[], toolCalls[], proposedChanges[], validation, risks[], nextRecommendation, rawArtifacts?)
- **Finding**: severity (info|warning|critical), message, source
- **ProposedChange**: file, diff (10KB cap), reason
- **RiskNote**: level (low|medium|high), description, mitigation?
- **ToolCallSummary**: tool (namespaced names supported), status (ok|error), summary

### Supporting Types
- **WardenVerdict**: status (PASS|PARTIAL|FAIL), reasoning, violations[], recommendations[]
- **WardenViolation**: severity, rule, detail, taskId?
- **ConflictRecord**: id, file, taskIds[], status, resolution?
- **SwarmConfig**: mode, maxWorkers, requireApproval, defaultTimeoutMs, workdir
- **SwarmRunSummary**: id, mode, workerCount, status, taskPackets[], resultPackets[], wardenVerdict?, conflicts[], startedAt, completedAt?

## CONSTANTS / LIMITS

| Constant | Value |
|----------|-------|
| SOLO_MAX_WORKERS | 1 |
| SMALL_MIN / MAX | 3 / 5 |
| MEDIUM_MIN / MAX | 6 / 10 |
| LARGE_MIN / MAX | 11 / 20 |
| ABSOLUTE_MAX_WORKERS | 25 |
| DEFAULT_INITIAL_SWARM_MAX | 3 |
| DEFAULT_WORKER_TIMEOUT_MS | 120,000 (2min) |
| MAX_WORKER_TIMEOUT_MS | 600,000 (10min) |

**Approval thresholds:**
- medium, large, max → require approval
- max → requires manual (human) approval

## VALIDATION HELPERS

| Helper | Returns |
|--------|---------|
| `getWorkerCapForMode(mode)` | `{ min, max }` |
| `doesModeRequireApproval(mode)` | `boolean` |
| `doesModeRequireManualApproval(mode)` | `boolean` |
| `validateWorkerCount(mode, count)` | `null` (valid) or error string |
| `validateTaskPacket(packet)` | `null` (valid) or error string |
| `validateResultPacket(packet)` | `null` (valid) or error string |
| `validateSwarmConfig(config)` | `null` (valid) or error string |

All helpers are pure functions — no side effects, no I/O, no execution.

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (9 packages) | ✅ 0 errors |
| `pnpm build` (9 packages) | ✅ 0 errors |

## SMOKE TEST RESULT

**18/18 assertions PASS:**

| # | Test | Result |
|---|------|--------|
| 1-5 | Worker cap constants + helpers | ✅ |
| 6-9 | Approval threshold helpers | ✅ |
| 10-12 | Worker count validation (valid, over cap, >25) | ✅ |
| 13-14 | TaskPacket validation (valid + invalid) | ✅ |
| 15-16 | ResultPacket validation (valid + invalid) | ✅ |
| 17-18 | Model tier labels — label-based, no hardcoded models | ✅ |

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| swarm imports only shared + zod | ✅ |
| No core import (deferred to 5C+) | ✅ |
| No package imports swarm | ✅ (verified by typecheck) |
| core does not import swarm | ✅ |
| server/cli/tools/mcp do not import swarm | ✅ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No orchestrator/planner logic | ✅ |
| No worker runner | ✅ |
| No merger/warden logic beyond types | ✅ |
| No execution | ✅ |
| No server/CLI swarm registration | ✅ |
| No ReasonLoop changes | ✅ |
| No UI/dashboard | ✅ |

## DESIGN DECISIONS

### Model Tier Labels
`ModelTierLabel` is a string union of the 8 tier labels from MODEL_TIERS.md. No model names are hardcoded. Workers and orchestrators reference tiers, not specific models. The provider system resolves tier → model at runtime.

### Status Names
Used `pass`/`partial`/`fail` for ResultStatus to match the existing report convention (PASS/PARTIAL/FAIL). TaskStatus extends with `pending`/`running`/`cancelled`/`timed_out` for lifecycle tracking.

### Schema Strictness
Zod schemas are strict — every field has a max length, array caps, and enum constraints. This prevents overflow at the type level before execution happens. `diff` is capped at 10KB, summaries at 2000 chars, arrays at reasonable maximums.

### rawArtifacts Handling
`rawArtifacts` is typed as `unknown` — intentionally unvalidated. Workers may attach raw output for diagnostics, but the merger treats it as opaque. This prevents the swarm from depending on untyped data.

### Approval Threshold Constants
`APPROVAL_REQUIRED_MODES` and `MANUAL_APPROVAL_MODES` are arrays, not computed logic. Easy to audit: `["medium", "large", "max"]` and `["max"]`. The `doesModeRequireApproval()` helper wraps them for ergonomics but the source of truth is the array.

### Why Core Import Is Deferred
Phase 5B keeps swarm importing only shared. Core import (for ReasonLoop-backed workers) belongs in Phase 5C-5E when execution is implemented. This follows the MCP pattern where B was skeleton-only and C added the adapter.

## BLOCKERS

None.

## NEXT STEP

**Phase 5C — Local In-Process Worker Runner with Fake Workers**

Create deterministic fake workers that accept TaskPackets and return ResultPackets without live providers. Prove the packet contracts work before wiring in ReasonLoop.

Phase 5B is complete. 9/9 build. 18/18 smoke. Ready for 5C.

---

*Report generated 2026-06-03. Phase 5B Swarm Types Report — PASS.*
