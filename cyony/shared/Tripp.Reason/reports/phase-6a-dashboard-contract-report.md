# Phase 6A Dashboard Contract Report

## PHASE

Phase 6A — Dashboard / Control Surface Contract Lock

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Dashboard architecture, server/API gap analysis, live streaming design, approval UX design, swarm monitoring requirements, security boundaries
- **Code Review / Warden Pass** — Scope control, doctrine compliance, dependency direction verification

## FILES CREATED

| File | Purpose |
|------|---------|
| `docs/PHASE_6_DASHBOARD_CONTRACT.md` | Full dashboard contract: UI stack, package boundary, API gap analysis, 7 panels, security, testing, open questions |
| `reports/phase-6a-dashboard-contract-report.md` | This report |

## FILES MODIFIED

None. No implementation files touched.

## DASHBOARD CONTRACT SUMMARY

The contract (`docs/PHASE_6_DASHBOARD_CONTRACT.md`) defines:

### Non-Goals (10 items)
No cloud, no multi-user auth, no Electron, no mobile-first, no UI bypassing ApprovalGate, no MCP marketplace, no config editing in initial panels, no OpenClaw/Hermes yet.

### UI Stack
- **Vite + React + TypeScript** — fast dev, ES module native, shares types with `@tripp-reason/shared`
- Dark mode first, hard edges / 0-radius, no blue-heavy palette, monospaced for logs/reports
- No auto-open browser

### Package Boundary
- **Location:** `apps/dashboard/` (application, not library)
- **Dependency rule:** dashboard consumes server HTTP/SSE only — never imports core/tools/store/providers/swarm/mcp directly
- Shared types used for client-side typing only

### Server API Gap Analysis
Audited all 11 existing server routes. Identified 3 **P0 gaps** (must build before swarm UI):

| Priority | Route | Purpose |
|----------|-------|---------|
| P0 | GET `/swarms` | List swarm runs |
| P0 | GET `/swarms/:id` | Swarm run detail |
| P0 | POST `/swarms/run` | Start a swarm run |

Plus 3 P1/P2 gaps: GET `/swarms/:id/report`, GET `/reports`, GET `/config/status`.

### 7 Dashboard Panels
1. **Overview** — health, provider/model, tools count, MCP status, pending approvals, recent sessions
2. **Live Run** — prompt input, SSE event feed, streaming text, tool cards, report link
3. **Approvals** — pending cards, tool/risk/args display, approve/deny, default-deny posture
4. **Sessions/Runs** — session list, run list, events, messages, reports
5. **Reports** — markdown viewer, run metadata, download link
6. **Tools** — local + MCP tools table, requiresApproval badge, search
7. **Swarms** — swarm runs, task/worker/warden detail, POST form for new runs

### Security (10 rules)
Local-only, no secrets in UI, no filesystem access, no tool bypass, no ApprovalGate bypass, CORS restricted, body limits, controlled errors, report access through stored records only, no arbitrary file browsing.

### Implementation Sequence
```text
6A — Contract Lock (THIS)
6B — Server API Gaps (swarm endpoints + /reports)
6C — Dashboard Scaffold + API Client + Overview/Sessions/Reports/Approvals
6D — Live Run SSE Panel
6E — Swarm Panel
6F — Final Dashboard Audit
```

### Open Questions (6)
2 resolved in contract: `apps/dashboard` ✅, swarm endpoints before swarm UI ✅.
4 deferred to implementation phases: static serving approach, CSS strategy, approval args display, config editing.

## PACKAGE / APP BOUNDARY DECISION

**Decision:** `apps/dashboard/`

Rationale:
- Dashboard is an application, not a library — nothing imports it
- It uses Vite (own build tooling), not shared tsc
- Monorepo convention: `packages/` = shared libraries, `apps/` = deployables

**Dependency rules:**
- dashboard → server (HTTP/SSE only)
- dashboard → shared (types only)
- dashboard ↛ core/tools/store/providers/swarm/mcp
- core ↛ dashboard (never)

## SERVER API GAP ANALYSIS

| # | Existing Route | Dashboard Panel |
|---|---------------|-----------------|
| 1 | GET `/health` | Overview |
| 2 | GET `/status` | Overview |
| 3 | GET `/tools` | Tools |
| 4 | GET `/sessions` | Sessions |
| 5 | GET `/sessions/:id/events` | Run viewer |
| 6 | GET `/runs/:id` | Run viewer |
| 7 | GET `/runs/:id/report` | Reports |
| 8 | POST `/reply` | Live Run (SSE) |
| 9 | GET `/approvals` | Approvals |
| 10 | POST `/approvals/:id/resolve` | Approvals |

**Missing (P0 — block swarm panel):**
- GET `/swarms`
- GET `/swarms/:id`
- POST `/swarms/run`

**Missing (P1 — enhance after MVP):**
- GET `/swarms/:id/report`
- GET `/reports`

**Missing (P2 — nice to have):**
- GET `/config/status`
- GET `/sessions/:id/runs`

## SCREEN / PANEL PLAN

7 panels in priority order:

| Order | Panel | Depends On | Phase |
|-------|-------|-----------|-------|
| 1 | Overview | Existing routes | 6C |
| 2 | Sessions/Runs | Existing routes | 6C |
| 3 | Reports | Existing routes | 6C |
| 4 | Approvals | Existing routes | 6C |
| 5 | Tools | Existing routes | 6C |
| 6 | Live Run SSE | POST `/reply` (existing) | 6D |
| 7 | Swarms | Requires 6B endpoints | 6E |

## APPROVAL UX DECISION

- **Never auto-approve.** Every approval requires explicit human action.
- **Default to deny.** If uncertain or timeout, deny is the safe path.
- **Args summary by default.** Expand on click for trusted operators. Redact secrets.
- **Use existing POST `/approvals/:id/resolve`.** No new API semantics.
- **Show timeout countdown.** Server enforces 5-min auto-deny; dashboard reflects it.
- **History section.** Resolved approvals visible, collapsed by default.

## SWARM DASHBOARD DECISION

**Server swarm endpoints must come before dashboard swarm panel.**

Sequence:
1. Phase 6B adds `GET /swarms`, `GET /swarms/:id`, `POST /swarms/run` to server
2. Phase 6C creates dashboard scaffold with Overview/Sessions/Reports/Approvals/Tools
3. Phase 6E creates swarm panel consuming the 6B endpoints

This ensures the dashboard never needs to import `@tripp-reason/swarm` directly — all swarm state comes through the server API. Other panels (Overview through Tools) can proceed in 6C while swarm endpoints are available.

If 6B is deferred for any reason, all non-swarm panels can still ship in 6C-6D with the swarm panel grayed out or hidden.

## SECURITY DECISIONS

| Rule | Status |
|------|--------|
| Local-only (CORS: `http://localhost:*`, bind `127.0.0.1`) | 🔒 Contract |
| No secrets in UI | 🔒 Contract |
| No direct filesystem access from dashboard | 🔒 Browser sandbox |
| No tool execution except through server APIs | 🔒 Architecture |
| No ApprovalGate bypass | 🔒 Architecture |
| Default-deny approval posture | 🔒 UX rule |
| Report access through stored records only | 🔒 Server route |
| No arbitrary file browsing from UI | 🔒 No route exists |

## IMPLEMENTATION SEQUENCE

```text
Phase 6A — Dashboard Contract Lock ✅ (THIS)
Phase 6B — Server API Gaps (swarm endpoints + /reports)
Phase 6C — Dashboard Scaffold + API Client + Overview/Sessions/Reports/Approvals/Tools
Phase 6D — Live Run SSE Panel
Phase 6E — Swarm Panel
Phase 6F — Final Dashboard Audit
Phase 6G — Phase Closeout (docs, README, ROADMAP)
```

## OPEN QUESTIONS

| # | Question | Status |
|---|----------|--------|
| 1 | `apps/dashboard` vs `packages/dashboard`? | **Resolved** ✅ — `apps/dashboard` |
| 2 | Server swarm endpoints before UI scaffold? | **Resolved** ✅ — 6B before 6E |
| 3 | Static-served by server or separate dev server? | Deferred to 6C |
| 4 | CSS modules, plain CSS, or Tailwind? | Deferred to 6C (plain CSS or CSS modules preferred) |
| 5 | Approval args: full or summary only? | Deferred to 6D (summary default, expand on click) |
| 6 | Config editing from dashboard? | Read-only first, editing deferred to 6F+ |

## SCOPE COMPLIANCE

| Check | Status |
|-------|--------|
| No UI files created | ✅ |
| No Vite/React scaffolding | ✅ |
| No dependencies added | ✅ |
| No package.json modified | ✅ |
| No server routes added | ✅ |
| No dashboard implementation | ✅ |
| Docs-only phase | ✅ |

## BLOCKERS

None.

## NEXT STEP

**Phase 6B — Server API Gaps for Dashboard**

Add swarm server endpoints:
- `GET /swarms` — list swarm runs (from stored swarm state or in-memory registry)
- `GET /swarms/:id` — swarm run detail
- `POST /swarms/run` — start a swarm run with optional SSE
- `GET /reports` — list all reports (optional, P1)

These endpoints unlock the swarm dashboard panel in Phase 6E.

---

*Report generated 2026-06-03. Phase 6A Dashboard Contract Report — PASS.*
