# Phase 6C Dashboard Scaffold + API Client Report

## PHASE

Phase 6C — Dashboard Scaffold + API Client + Core Panels

## STATUS

**PASS**

## MODEL TIERS USED

- **Heavy Technical Thinking** — dashboard boundary design, API client architecture, state/data flow, security posture, panel scope
- **Fast Technical Builder** — implementation of all components, panels, and styling

## FILES CREATED

```
apps/dashboard/package.json
apps/dashboard/tsconfig.json
apps/dashboard/vite.config.ts
apps/dashboard/index.html
apps/dashboard/src/vite-env.d.ts
apps/dashboard/src/main.tsx
apps/dashboard/src/App.tsx
apps/dashboard/src/api/client.ts
apps/dashboard/src/api/types.ts
apps/dashboard/src/components/Layout.tsx
apps/dashboard/src/components/Panel.tsx
apps/dashboard/src/components/StatusBadge.tsx
apps/dashboard/src/components/EmptyState.tsx
apps/dashboard/src/components/DataTable.tsx
apps/dashboard/src/components/ErrorBox.tsx
apps/dashboard/src/panels/OverviewPanel.tsx
apps/dashboard/src/panels/ToolsPanel.tsx
apps/dashboard/src/panels/SessionsPanel.tsx
apps/dashboard/src/panels/ReportsPanel.tsx
apps/dashboard/src/panels/ApprovalsPanel.tsx
apps/dashboard/src/panels/SwarmsPanel.tsx
apps/dashboard/src/styles.css
```

Total: **22 files** created.

## FILES MODIFIED

None. No changes to existing packages, workspace config, or server routes.

## DASHBOARD COMPONENTS CREATED

### App Layout (`Layout.tsx`)

- Top nav bar with app title ("Tripp.Reason Control"), server status indicator, and panel tabs
- Server status indicator: green/orange/red dot with text (connected / disconnected / error)
- Tab-based navigation with 6 panels: Overview, Tools, Sessions, Reports, Approvals, Swarms
- Full-height layout with sticky top nav and scrollable panel area
- No routing library — simple React state for active panel selection

### API Client (`api/client.ts`)

Base URL: `http://127.0.0.1:3030` (default), overridable via `VITE_TRIPP_API_BASE` env var.

Implemented functions:
- `getHealth()` → `GET /health`
- `getStatus()` → `GET /status`
- `getTools()` → `GET /tools`
- `getSessions()` → `GET /sessions`
- `getReports()` → `GET /reports`
- `getApprovals()` → `GET /approvals`
- `getSwarms()` → `GET /swarms`
- `getSwarm(id)` → `GET /swarms/:id`
- `runFakeSwarm(prompt, mode?)` → `POST /swarms/run` (fake-only, mode='solo' or 'small')

Each function returns typed responses with error handling. Non-2xx responses are thrown as typed errors with status and message.

### API Types (`api/types.ts`)

Local types for all API responses — no shared package imports. Types defined:
- `HealthResponse`, `StatusResponse`, `MCPStatusResponse`
- `ToolInfo`, `ToolsResponse`
- `SessionInfo`, `SessionsResponse`
- `ReportInfo`, `ReportsResponse`
- `ApprovalInfo`, `ApprovalsResponse`
- `SwarmInfo`, `SwarmsResponse`
- `SwarmDetailResponse`, `SwarmRunRequest`, `SwarmRunResponse`

### Reusable Components

- **Panel.tsx** — wrapper with title, description, content slot
- **StatusBadge.tsx** — colored badge for status states (connected/disconnected/error, approved/denied/pending, active/completed/failed)
- **DataTable.tsx** — minimal accessible data table with headers and rows
- **EmptyState.tsx** — centered icon + message for empty panels
- **ErrorBox.tsx** — red-bordered error display with message and optional retry

### Panels Implemented

**1. OverviewPanel** — uses `getHealth()` + `getStatus()`
- Server status (up/down with timing)
- Phase, mode display
- Active tools count
- MCP status (enabled/disabled, server count)
- Swarm API status
- Pending approvals count
- Workdir, model, provider (if returned and safe)
- Graceful error state when server unavailable

**2. ToolsPanel** — uses `getTools()`
- Table: tool name, description, requiresApproval, source
- Source inferred from name prefix: `mcp.` = MCP, otherwise = local
- Approval badge (🔒 with red "Required" / ✓ "Auto")

**3. SessionsPanel** — uses `getSessions()`
- Table: session ID, title, status, provider/model, updated
- Status as colored badge
- Empty state when no sessions

**4. ReportsPanel** — uses `getReports()`
- Table: name, type, path (monospaced), size, created
- Path displayed in monospaced font for readability
- File size in human-readable format

**5. ApprovalsPanel** — uses `getApprovals()`
- Table: approval ID, tool name, risk level, args summary, expires
- Risk level as colored badge (low=green, medium=yellow, high=red)
- Read-only list in Phase 6C — no approve/deny buttons
- Approve/deny deferred to Phase 6D when mutation safety is designed

**6. SwarmsPanel** — uses `getSwarms()` + `getSwarm(id)`
- List view: swarm ID (truncated), prompt summary, mode, workers, status, warden
- Click row to see detail panel below
- Detail: task count, result count, conflicts, warden verdict, created/updated
- Fake swarm run form: prompt textarea, mode selector (solo/small only), "Run Fake Swarm" button
- No real mode, no medium/large/max, no live streaming
- Controlled errors: invalid prompt, mode cap rejection, server error

### Styling (`styles.css`)

- Desktop-first layout
- Dark mode base (dark backgrounds: `#0a0a0f` base, `#12121a` surface, `#1a1a26` elevated)
- Hard edges, 0-radius (no rounded corners)
- No blue-heavy palette — amber/gold primary accents, green/red/orange for status
- Monospaced fonts for log/report paths (`JetBrains Mono`, `Fira Code`, fallback to system mono)
- Dense but readable: 13px base, compact tables
- No animations beyond background transitions on status indicators

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| Full workspace typecheck | 10/10 PASS |
| Dashboard build (tsc -b + vite build) | PASS (34 modules, 961ms) |
| Forbidden package imports | 0 found |
| `@tripp-reason/*` imports in dashboard | 0 found |
| Server route modifications | 0 |

## SMOKE / STATIC CHECK RESULT

1. ✅ Dashboard package builds (tsc + vite)
2. ✅ API client base URL default is `http://127.0.0.1:3030`
3. ✅ `VITE_TRIPP_API_BASE` env var overrides base URL (via `import.meta.env`)
4. ✅ OverviewPanel handles server unavailable gracefully (try/catch in API client + ErrorBox)
5. ✅ All panels use API client functions, no direct fetch calls
6. ✅ No POST /reply implemented
7. ✅ No Live Run SSE panel implemented
8. ✅ No imports from core/server/tools/mcp/swarm/providers/store
9. ✅ No server routes added or modified
10. ✅ Swarm panel fake-only, mode capped at solo/small

## STYLE / UX CHECKS

| Requirement | Status |
|-------------|--------|
| Desktop-first | ✅ No mobile breakpoints, 900px+ oriented |
| Dark mode first | ✅ Dark backgrounds, light text, no light theme toggle |
| Hard edges / 0-radius | ✅ All `border-radius: 0` |
| No blue-heavy palette | ✅ Amber/gold primary, green/red/orange status |
| Dense but readable | ✅ 13px base, compact tables, small panels |
| No animated noise | ✅ Static panels, background color transitions only |
| Monospaced paths | ✅ Reports path column, swarm IDs in monospace |

## SCOPE COMPLIANCE

| What | Implemented? |
|------|-------------|
| Vite + React + TS scaffold | ✅ |
| API client | ✅ 9 functions |
| Basic app layout | ✅ Top nav + tabs |
| OverviewPanel | ✅ |
| ToolsPanel | ✅ |
| SessionsPanel | ✅ |
| ReportsPanel | ✅ |
| ApprovalsPanel (read-only) | ✅ |
| SwarmsPanel (list + detail + fake run) | ✅ |
| Live Run SSE panel | ❌ (deferred, as specified) |
| POST /reply UI | ❌ (deferred) |
| Dashboard-initiated tool execution | ❌ (deferred) |
| Advanced report viewer | ❌ (deferred) |
| Config editing | ❌ (deferred) |
| OpenClaw/Hermes adapters | ❌ (deferred) |
| New server APIs | ❌ (no changes) |
| Tailwind or heavy UI framework | ❌ (plain CSS) |
| Routing library | ❌ (simple state toggle) |

## DESIGN DECISIONS

### apps/dashboard location
Separate `apps/` directory keeps the dashboard as a standalone Vite app, fully isolated from the monorepo's package build chain. It only shares the pnpm workspace for dependency management. This prevents dashboard deps (React, Vite) from leaking into server packages.

### Plain CSS over Tailwind
Tailwind would add 3+ MB of node_modules and config complexity. Plain CSS in a single `styles.css` keeps bundle size minimal (3.91 KB gzipped) and makes the styling intent explicit. The dark-first, hard-edge aesthetic is achievable with ~200 lines of CSS.

### No routing library
Six panels with tab navigation don't need React Router. A simple `useState<string>` for the active panel keeps the bundle smaller and avoids deep-linking complexity that isn't useful for a local dashboard. If deep-linking becomes needed later, adding react-router is straightforward.

### Local response types vs shared types
Local types in `src/api/types.ts` avoid any import of `@tripp-reason/shared`. While `shared` could be imported as type-only without runtime cost, the local approach is simpler for Phase 6C and guarantees zero coupling. If types drift, the dashboard fails at its API boundary rather than silently.

### Read-only approvals panel
Approve/deny buttons require designing the mutation UX carefully (default-deny, explicit click, no auto-approve, result display). Deferred to Phase 6D to keep Phase 6C focused on read-only panels and the API client foundation.

### Fake swarm run form
Added as an optional extra in the SwarmsPanel. POST /swarms/run was already implemented in Phase 6B server routes, so adding a simple form was straightforward. Mode is capped at solo/small. No real mode, no medium/large/max. All errors are displayed inline.

## BLOCKERS

None.

## NEXT STEP

**Phase 6D** — Recommended scope:
- ApprovalsPanel: approve/deny buttons with POST /approvals/:id/resolve
- Server mutation safety review for approval resolution
- SessionsPanel: deep-dive single session view (if APIs exist)
- ReportsPanel: markdown rendering (if lightweight renderer added)
- Testing with a running server instance (manual smoke test)
