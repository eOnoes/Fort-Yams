# Phase 6 Dashboard / Control Surface Contract

> Locked before any dashboard code exists. Defines the local web control surface for observing and operating the Tripp.Reason runtime.

## Purpose

Phase 6 adds a local web dashboard that provides visibility into and control over the existing Tripp.Reason runtime. The dashboard is a **consumer** of the server API — it adds no new runtime contracts, bypasses no safety gates, and must remain local-first.

```text
Phase 1-5 (current):
  CLI / HTTP client → server → core → provider/tools/store

Phase 6 (target):
  Dashboard (Vite+React) → server (same APIs) → core → provider/tools/store
                          CLI / HTTP client → server (unchanged)
```

## Non-Goals

- ❌ No cloud dashboard — local-only
- ❌ No multi-user auth system
- ❌ No remote public bind by default (localhost only)
- ❌ No Electron in Phase 6 (web browser only)
- ❌ No mobile-first design (desktop only)
- ❌ No UI rewriting core/server behavior — UI is a thin consumer
- ❌ No direct tool execution from UI bypassing HTTP/API/ApprovalGate
- ❌ No MCP marketplace
- ❌ No swarm autonomy beyond existing controls
- ❌ No OpenClaw/Hermes integration yet (Phase 7)
- ❌ No config editing from UI in initial panels (read-only status first)

## UI Stack Recommendation

**Recommended:** Vite + React + TypeScript

Rationale:
- Vite: fast dev server, ES module native, minimal config
- React: broad ecosystem, hooks model maps well to live state
- TypeScript: shares types with `@tripp-reason/shared`
- No heavy framework (MUI, Ant) unless justified — start with hand-rolled or minimal

**Theme:**
- Dark mode first, light mode later
- Hard edges / 0-radius preference (matches operator preference)
- No blue-heavy palette — neutral grays with accent for status/state
- Dense but readable layout
- No animated dashboard noise
- Monospaced fonts for logs, reports, and code output

**Browser:**
- Do NOT auto-open browser unless operator explicitly requests it
- Dashboard is served by the same local server (no separate dev server in production)
- Vite dev server acceptable for development

## Package Boundary

### Recommended Location

`apps/dashboard/`

**Why `apps/` not `packages/`:**
- The dashboard is an application, not a library
- It is the final consumer — nothing imports it
- It has its own build tooling (Vite), not shared tsc
- Following monorepo convention: `packages/` = libraries, `apps/` = deployables

### Dependency Rules

```text
dashboard → server (HTTP/SSE only, never direct function imports)
dashboard → shared (types only — shared API shapes for client-side typing)
dashboard ↛ core          (NEVER — must go through server API)
dashboard ↛ tools         (NEVER — must go through server API)
dashboard ↛ store         (NEVER — must go through server API)
dashboard ↛ providers     (NEVER)
dashboard ↛ swarm         (NEVER — swarm state through server API)
dashboard ↛ mcp           (NEVER)

core ↛ dashboard          (NEVER — core is UI-free)
server ↛ dashboard        (NEVER — server is API boundary, not UI-aware)
```

**The dashboard is a thin API consumer.** It talks exclusively to the local server over HTTP/SSE. This keeps the boundary clean: the server remains the single API surface; the dashboard is a render layer.

## Server API Gaps

### Current Server Routes (Phase 3–5)

| Method | Route | Purpose | Dashboard Use |
|--------|-------|---------|---------------|
| GET | `/health` | Liveness | Overview panel |
| GET | `/status` | Runtime visibility (provider, model, tools, MCP, approvals count) | Overview panel |
| GET | `/tools` | List all tools (local + MCP) | Tools panel |
| GET | `/sessions` | List sessions | Sessions panel |
| GET | `/sessions/:id/events` | Events for session/run | Run viewer |
| GET | `/runs/:id` | Run detail (status, messages, timestamps) | Run viewer |
| GET | `/runs/:id/report` | Report content (markdown) | Report viewer |
| POST | `/reply` | Start a run with SSE streaming | Live run panel |
| GET | `/approvals` | List pending approvals | Approvals panel |
| POST | `/approvals/:id/resolve` | Approve/deny | Approvals panel |

### Required Dashboard APIs (Not Yet Built)

| Priority | Method | Route | Purpose |
|----------|--------|-------|---------|
| **P0 (before UI)** | GET | `/swarms` | List swarm runs |
| **P0 (before UI)** | GET | `/swarms/:id` | Swarm run detail (plan, workers, results, verdict) |
| **P0 (before UI)** | POST | `/swarms/run` | Start a swarm run (blocks or returns swarm ID) |
| P1 (during UI) | GET | `/swarms/:id/report` | Swarm report content |
| P1 (during UI) | GET | `/reports` | List all generated reports |
| P2 (after MVP) | GET | `/config/status` | Read-only config view (provider, model, host:port, workdir — no secrets) |
| P2 (after MVP) | GET | `/sessions/:id/runs` | List runs for a session |

**Decision: Swarm endpoints (P0) must be built before the swarm dashboard panel.** The other panels (Overview, Live Run, Approvals, Sessions, Reports, Tools) can be built against existing routes immediately.

### Recommended Sequence

```text
Phase 6A — Dashboard Contract Lock (THIS)
Phase 6B — Server API Gaps: add swarm endpoints + /reports endpoint
Phase 6C — Dashboard scaffold + API client + Overview/Sessions/Reports/Approvals panels
Phase 6D — Live Run SSE panel
Phase 6E — Swarm panel (once endpoints exist from 6B)
Phase 6F — Final Dashboard Audit
```

Phase 6B adds swarm server endpoints BEFORE any dashboard UI touches swarm data. This ensures the dashboard never needs to import swarm directly.

## Dashboard Screens / Panels

### 1. Overview Panel

**Data sources:** GET `/health`, GET `/status`

- Server health indicator (green/red)
- Provider name + model
- Active tools count (local + MCP)
- MCP servers connected / total
- Pending approvals count (link to Approvals)
- Recent sessions (latest 5, link to Sessions)
- Uptime

### 2. Live Run Panel

**Data sources:** POST `/reply` (SSE stream)

- Prompt text input (textarea)
- Provider/model selectors (read from /status)
- Send button → opens SSE connection
- Live event feed:
  - `message` events → streaming text display
  - `tool_request` events → card with tool name + risk level + approval status
  - `tool_result` events → result card
  - `finish` events → status + report link
  - `error` events → error card
- Run status indicator
- Report link on completion

### 3. Approvals Panel

**Data sources:** GET `/approvals`, POST `/approvals/:id/resolve`

- List of pending approval cards
- Each card shows:
  - Tool name (e.g., `write_file`, `mcp.mock.mutate`)
  - Risk level (`mutating` / `destructive`)
  - Args summary (truncated, no secrets exposed)
  - Expand to see full args (if safe)
  - Session/run context
  - Timeout indicator
- Approve button (green, requires confirmation)
- Deny button (red, default action)
- Default deny posture — no auto-approve ever
- Already-resolved approvals shown in history section (collapsed by default)

### 4. Sessions / Runs Panel

**Data sources:** GET `/sessions`, GET `/sessions/:id/events`, GET `/runs/:id`

- Session list with title, date, run count
- Click session → expand to show runs
- Click run → show messages, tool calls, events
- Run status badges (completed/failed/cancelled)
- Report link for each completed run

### 5. Reports Panel

**Data sources:** GET `/runs/:id/report`, GET `/reports` (future)

- Report list (from /reports when available, or from runs)
- Markdown report viewer with monospaced rendering
- Run metadata (session, model, status, duration)
- Download link

### 6. Tools Panel

**Data sources:** GET `/tools`

- Tool table: name, description, requiresApproval (badge)
- Local tools section
- MCP tools section (with server name prefix)
- Search/filter
- Read-only — no tool execution from this panel

### 7. Swarms Panel

**Data sources:** GET `/swarms`, GET `/swarms/:id`, GET `/swarms/:id/report`

- Swarm run list: ID, mode, worker count, status, date
- Click swarm → expand to show:
  - Task packets (role, title, objective)
  - Worker results (icon, role, status, summary)
  - Warden verdict + violations
  - Conflicts (file, competing tasks)
  - Report link
- POST `/swarms/run` form (prompt input, mode selector, worker count, fake/real toggle)
- Startup approval prompt for medium/large/max (modal or inline confirm)

## UX / Theme Rules

- **Desktop-first** — designed for 1280px+, reasonable at 1024px
- **Dark mode first** — dark background with light text
- **Hard edges** — 0 border-radius preference (operator preference)
- **No blue-heavy palette** — use neutral grays, status-driven accent colors
- **Dense but readable** — maximize information density without clutter
- **Monospaced** — reports, logs, code output, and error messages
- **No animated noise** — transitions only where they convey meaning (status changes)
- **No auto-refresh spinners** — polling should be subtle
- **Keyboard navigable** — approvals should be resolvable with keyboard

## Live Streaming Contract

- Dashboard opens SSE connection to `POST /reply` for live runs
- Same `StreamEvent` JSON frames as existing SSE clients (`tripp chat`)
- Events types handled: `message`, `tool_request`, `tool_result`, `finish`, `error`
- Heartbeat detection (15s interval from server)
- Disconnect → show error, offer reconnect
- Multiple simultaneous SSE connections supported (different browser tabs)
- Swarm SSE (POST `/swarms/run` with SSE) can use same StreamEvent format or simplified progress events

## Approval UX Contract

Dashboard approval panel MUST:

- **Never auto-approve** — every approval requires explicit human action
- **Default to deny** — if uncertain, deny is the safe path
- **Show args summary only** — truncate long args; expand only on click for safe review
- **Avoid exposing secrets** — redact API keys, tokens, passwords from display
- **Show timeout/expiresAt** — if server enforces 5-min auto-deny, show countdown
- **Use POST `/approvals/:id/resolve`** — same API as CLI, no new semantics
- **Preserve ApprovalGate semantics** — the gate is the authority; dashboard is a view

## Swarm Dashboard Contract

Because swarm server endpoints do not exist yet (Phase 6B will add them):

- **Swarm panel is blocked until 6B completes.** Other panels (Overview, Live Run, Approvals, Sessions, Reports, Tools) can proceed in 6C.
- Swarm panel consumes GET `/swarms`, GET `/swarms/:id`, POST `/swarms/run`
- Swarm report panel consumes GET `/swarms/:id/report`
- Dashboard must NOT import `@tripp-reason/swarm` directly — all swarm state comes through server API
- Swarm types from shared can be used for client-side typing (e.g., SwarmRunSummary shape)

## Security Requirements

| Rule | Enforcement |
|------|-------------|
| Local-only server default | CORS: `http://localhost:*` only, bind `127.0.0.1` |
| No secrets in UI | `/status` already filters secrets; dashboard must not add any |
| No direct filesystem access | Dashboard has no Node.js server — browser sandbox only |
| No tool execution except through APIs | All mutations route through server → ApprovalGate |
| No ApprovalGate bypass | Dashboard uses same `/approvals` endpoints as CLI |
| No wildcard remote origins | CORS restricted; dashboard served from same origin in production |
| Request body limits | Server already enforces 1MB cap; dashboard respects it |
| Controlled errors | Server returns structured errors; dashboard displays them, never raw |
| Report access only through stored records | Dashboard reads reports via `/runs/:id/report`, not filesystem |
| No arbitrary file browsing from UI | No directory listing beyond tool results |

## Testing Requirements

- **No live provider dependency** for dashboard tests
- **Mock server/API fixtures** acceptable — use MSW (Mock Service Worker) or fetch mocks
- **Smoke tests:**
  - Build succeeds (Vite build)
  - Health/status panel renders
  - Sessions list renders
  - Report content renders (mock markdown)
  - Approval approve/deny flow with fake pending approval
  - SSE parsing (mock event stream)
  - Tool list renders
  - Swarm panel renders (after 6B endpoints exist)
  - Dark theme applied correctly
  - No errors on initial load with mock server

## Open Questions

| # | Question | Recommended | Status |
|---|----------|-------------|--------|
| 1 | `apps/dashboard` vs `packages/dashboard`? | `apps/dashboard` — it's an application, not a library | **Resolved** ✅ |
| 2 | Should server swarm endpoints be built before UI scaffold? | Yes — Phase 6B adds endpoints, 6C scaffold, 6E swarm panel | **Resolved** ✅ |
| 3 | Should dashboard be static-served by server or separate dev server? | Dev: Vite dev server. Prod: server serves static build from `apps/dashboard/dist/` | **Open** — resolved in 6C |
| 4 | CSS approach: modules, plain CSS, or Tailwind? | Plain CSS or CSS modules preferred (no Tailwind dep unless justified) | **Open** — resolved in 6C |
| 5 | Approval args: full or summary only? | Summary by default; expand on click for trusted operators | **Open** — resolved in 6D |
| 6 | Config editing from dashboard? | Read-only in initial panels. Config editing is Phase 6F+ if needed | **Resolved** ✅ |

## Tmp / Smoke Artifact Policy

Carry forward Phase 5 decision: keep useful smoke scripts under `tmp/`, gitignored. Dashboard smoke tests can use `tmp/phase6*.mjs` or equivalent.

---

*Contract locked 2026-06-03. No dashboard code exists yet. Phase 6B will add server API gaps.*
