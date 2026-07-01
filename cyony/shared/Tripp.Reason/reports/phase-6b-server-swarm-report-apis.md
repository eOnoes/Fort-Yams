# Phase 6B Server Swarm / Reports API Report

## PHASE

Phase 6B — Server API Gaps / Swarm Endpoints + Reports Index

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Server/swarm assembly, API boundary design, fake-vs-real safety, report indexing, dashboard data contracts
- **Fast Technical Builder** — Implementation of swarmRuntime, routes/swarms, routes/reports
- **Code Review / Warden Pass** — Scope compliance, safety audit

## FILES CREATED

| File | Purpose |
|------|---------|
| `packages/server/src/swarmRuntime.ts` | In-memory swarm state + fake swarm runner via `runSwarmPipeline()`. Safety gates: real mode rejected, medium+ rejected, worker caps enforced |
| `packages/server/src/routes/swarms.ts` | GET `/swarms`, GET `/swarms/:id`, POST `/swarms/run` — swarm CRUD endpoints |
| `packages/server/src/routes/reports.ts` | GET `/reports` — report index with type classification and safe filesystem scanning |

## FILES MODIFIED

| File | Change |
|------|--------|
| `packages/server/package.json` | Added `@tripp-reason/swarm` workspace dependency |
| `packages/server/src/server.ts` | Registered swarmsRoute + reportsRoute; updated startup console log |
| `packages/server/src/runtime.ts` | Added `swarmCount` to ServerRuntime interface |
| `packages/server/src/routes/status.ts` | Added swarmApiEnabled, swarmRunsCount, dashboardApiGapsClosed to /status response |

## ROUTES ADDED

### GET /swarms
Returns `{ swarms: SwarmRunResponse[] }` where each item has: id, mode, workerCount, status, startedAt, completedAt, wardenStatus, promptSummary.

### GET /swarms/:id
Returns full swarm detail: id, mode, workerCount, status, operatorPrompt, taskPackets, resultPackets, conflicts, wardenVerdict, startedAt, completedAt. Returns 404 if unknown.

### POST /swarms/run
Request body: `{ prompt, mode?, workers?, fake?, real? }`

Behavior:
- Fake mode (default) fully supported — runs `runSwarmPipeline()` in-process
- Worker caps enforced: mode caps + absolute max 25
- Real mode rejected: "Real swarm mode not yet supported in server"
- Medium/large/max rejected: "requires operator startup approval"
- Missing prompt returns 400
- Returns 201 with SwarmRunResponse on success

### GET /reports
Scans `reports/` directory (one level deep) for `.md` files. Returns `{ reports: ReportEntry[] }` with: path, type (phase/run/swarm/unknown), name, createdAt, sizeBytes. Falls back to empty array if reports dir doesn't exist.

## SWARM API BEHAVIOR

| Scenario | Response | Reason |
|----------|----------|--------|
| Solo fake swarm | 201 + PASS summary | Allowed, no approval needed |
| Small fake swarm | 201 + PASS summary | Allowed, no approval needed |
| Medium fake swarm | 400 | Requires startup approval (Phase 6F+) |
| Large/max | 400 | Requires startup approval (Phase 6F+) |
| Workers >25 | 400 | Hard cap violation |
| Workers > mode cap | 400 | Mode cap violation |
| Real mode | 400 | Not yet supported in server |
| Missing prompt | 400 | Validation |
| Unknown swarm ID | 404 | Not found |

## REPORTS API BEHAVIOR

- Only scans under `reports/` — no arbitrary filesystem access
- Recurses one level (date directories)
- Classifies reports: phase (contains "phase" or "step_0"), swarm (starts with "plan_"), run (starts with "run-"), unknown (fallback)
- Safe — never exposes report content, only metadata
- Gracefully handles missing reports directory

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| `pnpm typecheck` (10 packages) | ✅ 0 project errors |
| `pnpm build` (10 packages) | ✅ All pass |

## SMOKE TEST RESULT

**31/31 assertions PASS:**

| # | Test | Result |
|---|------|--------|
| 1-2 | GET /health still works (200, status ok) | ✅ |
| 3-5 | GET /swarms returns 200, array, initially empty | ✅ |
| 6 | GET /swarms/unknown returns 404 | ✅ |
| 7-10 | POST /swarms/run [single] solo returns 201 + id + mode + pass | ✅ |
| 11-15 | GET /swarms/:id returns full detail (operatorPrompt, taskPackets, wardenVerdict) | ✅ |
| 16 | GET /swarms list has entries after run | ✅ |
| 17-19 | POST /swarms/run [parallel] small returns 201 + small + worker count | ✅ |
| 20 | Workers > 25 returns 400 | ✅ |
| 21 | Medium mode returns 400 (approval required) | ✅ |
| 22 | Real mode returns 400 (unsupported) | ✅ |
| 23 | Missing prompt returns 400 | ✅ |
| 24-25 | GET /reports returns 200 + array | ✅ |
| 26-28 | GET /status includes swarmApiEnabled + dashboardApiGapsClosed | ✅ |
| 29-31 | Existing routes (/tools, /sessions) still work | ✅ |

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| Local-only server posture unchanged | ✅ bind 127.0.0.1 |
| Report path restricted to `reports/` only | ✅ |
| Fake default (no real swarm) | ✅ default fake |
| Real mode explicitly rejected | ✅ 400 + clear message |
| Medium/large/max explicitly rejected | ✅ 400 + clear message |
| Worker caps enforced | ✅ mode caps + absolute 25 |
| No raw stack traces | ✅ controlled error responses |
| Body cap still applies | ✅ 1MB |
| No secrets in status | ✅ unchanged |

## PACKAGE BOUNDARY CHECK

| Check | Status |
|-------|--------|
| server imports @tripp-reason/swarm (assembly) | ✅ |
| core does NOT import swarm | ✅ |
| swarm does NOT import server | ✅ |
| No circular dependencies | ✅ |
| CLI does NOT import server swarm routes (separate surfaces) | ✅ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No UI/dashboard files created | ✅ |
| No React/Vite/CSS | ✅ |
| No apps/dashboard | ✅ |
| No OpenClaw/Hermes adapters | ✅ |
| No new provider implementations | ✅ |
| No recursive swarm spawning | ✅ |
| No background autonomous execution | ✅ |

## DESIGN DECISIONS

### In-Memory Swarm State
Swarm runs are stored in an in-memory `Map<string, SwarmRunEntry>` for Phase 6B. No persistence, no DB tables. Survives only for the server process lifetime. This is sufficient for the dashboard contract's GET /swarms and GET /swarms/:id requirements. Persistent swarm storage can be added in a later phase.

### Fake Default
Fake mode is the only supported server mode. Real mode returns a clear error. This keeps the server safe — no live provider dependency, no approval queue complexity for swarm runs. Operators who need real swarms use `tripp swarm run --real` from CLI.

### Real Mode Handling
Real mode is explicitly rejected with: "Real swarm mode not yet supported in server. Use fake mode or CLI --real." This is a safety-first decision — the server assembly for real swarm requires wiring ReasonLoop + ApprovalGate + ToolDispatcher into swarm workers, which needs the same assembly pattern as `tripp run`. That work belongs in a dedicated sub-phase.

### Medium/Large/Max Handling
Medium+ modes require startup approval, but HTTP startup approval for swarms doesn't exist yet. Rather than building it now, these modes are rejected with a clear message pointing to the CLI (`tripp swarm run --mode medium --approve`). This can be relaxed in a later phase when an HTTP approval path is designed.

### No Swarm SSE Yet
POST /swarms/run is blocking (returns JSON result). SSE streaming for live swarm progress belongs to a later dashboard/live phase when the swarm panel receives real-time updates.

### Reports Indexing
Simple filesystem scan under `reports/` with type classification. Safe by design — only lists files, never reads content. No performance concerns for a local UI.

## BLOCKERS

None.

## NEXT STEP

**Phase 6C — Dashboard Scaffold + API Client**

All P0 dashboard API gaps are closed:
- GET /swarms ✅
- GET /swarms/:id ✅
- POST /swarms/run ✅
- GET /reports ✅ (P1, bonus)

Dashboard scaffold can now proceed: Vite + React + TypeScript in `apps/dashboard/`, with typed API client consuming these endpoints.

---

*Report generated 2026-06-03. Phase 6B Server Swarm / Reports API Report — PASS. 31/31 smoke.*
