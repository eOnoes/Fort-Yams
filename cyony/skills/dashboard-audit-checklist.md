# Dashboard Audit Checklist

Reusable 10-category framework for final dashboard/UI audit phases in clean-room monorepo builds.
Distilled from Phase 6F of Tripp.Reason (2026-06-03).

## 1. Build / Typecheck

- [ ] `pnpm typecheck` passes for all workspace packages
- [ ] `pnpm --filter <dashboard> build` passes (tsc -b + vite build)
- [ ] `pnpm build` passes for full workspace
- [ ] Dashboard module count documented
- [ ] Zero project errors

## 2. Import / Package Boundary

- [ ] Dashboard does NOT import any `@project/*` runtime packages (core, server, tools, store, providers, swarm, mcp)
- [ ] Server does NOT import dashboard
- [ ] Core does NOT import dashboard
- [ ] No `fetch()` calls outside the API layer (api/client.ts, api/sse.ts)
- [ ] Dependencies: ≤5 npm deps, no heavy UI framework, no Tailwind unless explicitly justified

## 3. Server API Compatibility

- [ ] Every client function maps to an existing server route
- [ ] GET endpoints match: health, status, tools, sessions, reports, approvals, swarms
- [ ] POST endpoints match: swarms/run, approvals/:id/resolve, reply (SSE)
- [ ] No client functions reference non-existent routes
- [ ] No server routes were added for dashboard consumption

## 4. Panel Rendering

- [ ] Every panel builds without TypeScript errors
- [ ] Every panel imports only from api/ + components/ (no runtime package imports)
- [ ] Shared components (EventCard, SwarmRunForm, SwarmDetail, etc.) are in components/
- [ ] Empty states handled (no data → friendly message)
- [ ] Error states handled (server down → controlled error display)
- [ ] Loading states handled (async data → loading indicator)

## 5. SSE / Live Streaming

- [ ] SSE parser handles all event types (message, tool_request, tool_result, finish, error)
- [ ] Heartbeat comments (": heartbeat") are skipped, not treated as data
- [ ] Malformed frames → controlled warning, no UI crash
- [ ] Invalid JSON in data field → skip frame, continue
- [ ] Stop button aborts connection (AbortController)
- [ ] Clear button resets all state
- [ ] Run button disabled while streaming
- [ ] Event types use local types, not shared package imports

## 6. Swarm / Mode Safety

- [ ] Fake-only mode if real mode not supported via HTTP
- [ ] Solo/small modes enabled
- [ ] Medium/large/max modes disabled with explanatory tooltip
- [ ] Real mode not exposed in UI
- [ ] Worker count selector respects mode caps
- [ ] Task packet table and result packet table render
- [ ] Warden verdict display (PASS/PARTIAL/FAIL + violations + recommendations)
- [ ] Conflict display (empty state handled)
- [ ] No live swarm SSE unless explicitly implemented

## 7. Approval UX

- [ ] Pending approvals displayed in ApprovalsPanel
- [ ] Pending approvals display in LiveRunPanel while running (if polling)
- [ ] Approve/Deny require explicit click — two distinct buttons
- [ ] No auto-approve anywhere (no automation, no timers)
- [ ] Default-deny posture preserved
- [ ] Args truncated for safety (max 5 keys, 80-char strings)
- [ ] No secrets in args display (grep for api_key/token/secret/password/credential)
- [ ] Action feedback during resolution (loading state)

## 8. Style / UX

- [ ] Dark mode first (dark background, light text, no light theme toggle)
- [ ] Hard edges / 0-radius (only exception: small status dots)
- [ ] No blue-heavy palette (blue OK for interactive elements, not overall palette)
- [ ] Amber/yellow accent for status/warnings
- [ ] Desktop-first (no mobile breakpoints, wide tables with overflow-x)
- [ ] Dense but readable (13px base, compact tables, minimal padding)
- [ ] Monospaced IDs/paths/report filenames
- [ ] Zero animations (no spinners, no transitions beyond status color changes)
- [ ] CSS < 2 KB gzipped is a healthy target

## 9. Security

- [ ] No direct tool execution from dashboard (grep for execute/invoke/callTool — must be 0)
- [ ] All actions go through server APIs (every panel uses api/client.ts functions)
- [ ] No ApprovalGate bypass (dashboard uses same /approvals endpoints as CLI)
- [ ] No secrets in UI (grep for api_key/token/secret/password/credential — must be 0)
- [ ] No direct filesystem access (grep for readFile/writeFile/readdir/mkdir/unlink — must be 0)
- [ ] Report access through API only (not local filesystem)
- [ ] No public/remote assumptions (API base defaults to 127.0.0.1)
- [ ] Controlled errors (structured error display, no raw stack traces)

## 10. Documentation

- [ ] README updated with dashboard quick start (server start + dev server + build + env var)
- [ ] Dashboard panels listed with descriptions
- [ ] Dashboard limitations documented
- [ ] ROADMAP marked with phase completion
- [ ] Phase history updated
