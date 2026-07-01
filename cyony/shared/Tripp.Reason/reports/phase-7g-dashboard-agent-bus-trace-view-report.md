# Phase 7G Report — Dashboard Agent Bus + Trace Views

**PHASE:** Phase 7G — Dashboard Agent Bus + Trace Views  
**STATUS:** PASS ✅  
**DATE:** 2026-06-03  

---

## Summary

Added a full Agent Bus read-only control surface to the Tripp.Reason dashboard with HTTP API routes on the server. Eddie can now visually inspect inbox task packets, outbox result packets, Echo/Warden reviews, and the append-only trace ledger — all from the dark-first dashboard. Safe archive/reject actions are available for inbox packets, each emitting trace events.

## FILES CHANGED

| File | Action |
|------|--------|
| `packages/server/src/routes/agents.ts` | **Created** — 9 API routes |
| `packages/server/src/server.ts` | Modified — import + register agent routes |
| `packages/server/package.json` | Modified — added `@tripp-reason/external-agents` dependency |
| `apps/dashboard/src/api/types.ts` | Modified — 9 new Agent Bus types |
| `apps/dashboard/src/api/client.ts` | Modified — 9 new API client functions |
| `apps/dashboard/src/panels/AgentBusPanel.tsx` | **Created** — full Agent Bus dashboard panel |
| `apps/dashboard/src/styles.css` | Modified — Agent Bus styling (150+ lines) |
| `apps/dashboard/src/App.tsx` | Modified — added "Agent Bus" nav item + rendering |

## SERVER ROUTES ADDED (9)

| Route | Method | Description |
|-------|--------|-------------|
| `/agents/status` | GET | Bus health: folder counts, trace stats, malformed count |
| `/agents/inbox` | GET | List inbox task packets (validated, with malformed flag) |
| `/agents/outbox` | GET | List outbox result packets (proposed changes, high-risk count) |
| `/agents/reviews` | GET | List Echo review packets + Markdown report files |
| `/agents/trace` | GET | List/filter trace events (query: limit, eventType, severity, packetId, etc.) |
| `/agents/trace/chain/:eventId` | GET | Causal chain from root to selected event |
| `/agents/read` | GET | Read any packet/result/review/report by path (traversal-protected) |
| `/agents/archive` | POST | Move packet to archive (emits trace event) |
| `/agents/reject` | POST | Move packet to rejected with reason (emits trace event) |

All routes use `safeAgentPath()` for path traversal protection. All JSON goes through external-agents validators.

## DASHBOARD VIEWS ADDED

### Agent Bus Panel (`AgentBusPanel.tsx`)

**Summary Cards (6):**
- Inbox count, Outbox count, Reviews count, Rejected count, Archive count, Trace Events count (with malformed warning)

**Packet Flow Tables (3-column grid):**
- **Inbox table:** Agent, Type, Title, Status. Click to inspect. Malformed rows highlighted red.
- **Outbox table:** Agent, Status, Summary, Proposed changes count, High-risk count. High-risk cells marked red.
- **Echo Reviews table:** Verdict (color-coded), Issues count, Packet ID. Verdict colors: pass=green, block=red, escalate=orange.

**Trace Ledger Table:**
- Columns: Time, Event Type, Severity, Actor, Agent, Summary
- High-risk rows (warning/error/critical, warden_stop, validation_failed_later, etc.) marked with red left border
- Severity coloring: error/critical=red, warning=yellow
- Click to show causal chain

**Detail Pane:**
- JSON or Markdown display for selected packet/result/review
- Archive/Reject action buttons for inbox packets
- Approval boundary warning: "NOT approval and NOT mutation authority"

**Causal Chain View:**
- Vertical timeline from root → target
- Green left border for root, blue for target
- Missing links detected and flagged
- Event type + severity coloring

### TRACE VIEW CAPABILITY

The dashboard surfaces all trace event categories:

- **High-risk events** marked with red left border in trace table
  - `warden_stop_issued`, `warden_stop_resolved`
  - `validation_failed_later`, `root_cause_linked`
  - `subagent_killed`, `schema_validation_failed`
  - Any `error` or `critical` severity
  
- **Causal chain view** follows `parentEventId`/`rootCauseEventId` links backward
  
- **Filtered views** available via trace query params (eventType, severity, packetId, etc.)

- **Subagent events** visible in trace table (`subagent_spawned`, `subagent_completed`, `subagent_killed`, `subagent_audited`)

- **Tool events** visible in trace table (`tools_loaded`, `tools_unloaded`)

## VALIDATION

### Tests

| Suite | Result |
|-------|--------|
| external-agents | **68/68 PASS** |
| CLI | **40/40 PASS** |
| Server build | ✅ |
| Dashboard build (42 modules) | ✅ |
| Dashboard typecheck (tsc -b) | ✅ |

### Import Boundary

| Check | Result |
|-------|--------|
| Dashboard imports runtime packages directly | **0** |
| Dashboard uses HTTP-only for data | ✅ |
| Server imports external-agents (assembly layer) | ✅ (allowed) |
| No forbidden imports | ✅ |
| No new npm dependencies beyond external-agents workspace ref | ✅ |

### Safety Checks

| Check | Result |
|-------|--------|
| No live agent connection | ✅ |
| No OpenClaw adapter | ✅ |
| No Hermes adapter | ✅ |
| No Echo adapter | ✅ |
| No cloud transport | ✅ |
| No mutation authority added | ✅ (archive/reject are lifecycle only) |
| No secrets handling | ✅ |
| No ApprovalGate bypass | ✅ |
| Path traversal protection on all routes | ✅ |
| All JSON validated through external-agents | ✅ |
| Trace events are evidence only | ✅ |
| Legacy untouched | ✅ |
| No watchers/background workers | ✅ |

## BOUNDARY CHECK

| Boundary | Status |
|----------|--------|
| No live agent connection | ✅ |
| No adapters (OpenClaw, Hermes, Echo) | ✅ |
| No cloud transport | ✅ |
| No mutation authority added | ✅ |
| No direct repo write authority for external agents | ✅ |
| No secrets handling beyond rejection/default-deny | ✅ |
| No dependency graph violations | ✅ |
| Trace events are evidence only | ✅ |
| Trace events do not authorize mutation | ✅ |
| ApprovalGate remains authoritative | ✅ |
| Eddie remains final approver | ✅ |

## RISKS / OPEN QUESTIONS

- None. Dashboard is fully read-only with safe archive/reject actions.

## NEXT RECOMMENDED STEP

**Phase 7H** — Optional Live/Cloud Agent Transport Contract or Adapter Spike.
