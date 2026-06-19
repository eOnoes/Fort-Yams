# Phase 7G Dashboard Agent Bus + Trace View Pattern

Server routes → dashboard types → API client → panel component → CSS → App.tsx wiring.

## Server Route Layer

**File:** `packages/server/src/routes/agents.ts`

Pattern: each route is a standalone export function that takes `(app: FastifyInstance, workdir: string)`.
Server imports `@tripp-reason/external-agents` as an assembly layer — allowed because server is the wiring layer.

### Route list:
- `GET /agents/status` — folder counts, trace stats, malformed count. Uses `fs.readdir` + `validateTraceLedger`.
- `GET /agents/inbox` — `listInboxPackets` → `readTaskPacket` per file. Returns `{ packets: [...] }` with malformed flag.
- `GET /agents/outbox` — `listOutboxPackets` → `readResultPacket` per file. Includes `proposedChangesCount` + `highRiskChangesCount`.
- `GET /agents/reviews` — `listReviewPackets` + `listReportFiles`. Returns `{ reviews, mdReports }`.
- `GET /agents/trace` — `readTraceEvents` with query param filtering (limit, eventType, severity, packetId, resultId, reviewId, runId).
- `GET /agents/trace/chain/:eventId` — `findRootCauseChain` + find selected event. Returns `{ eventId, selectedEvent, chain, chainLength, missingLinks }`.
- `GET /agents/read?path=<relpath>` — `safeAgentPath()` → try task → try result → try review → try md. Returns `{ type, validated, data }`.
- `POST /agents/archive` — body: `{ path }`. Calls `movePacketToArchive` + emits `packet_archived` trace event.
- `POST /agents/reject` — body: `{ path, reason }`. Calls `movePacketToRejected` + emits `packet_rejected` trace event.

### Path safety helper:
```typescript
function safeAgentPath(filePath: string, workdir: string): string {
  const base = agentBusDir(workdir) + path.sep;
  const resolved = path.resolve(workdir, filePath);
  if (!resolved.startsWith(base)) {
    throw Object.assign(new Error("Path outside Agent Bus"), { statusCode: 403 });
  }
  return resolved;
}
```

All route files use this before any filesystem access.

### Registration in server.ts:
Import route functions and call each one after `reportsRoute`:
```typescript
agentsStatusRoute(app, config.workdir);
agentsInboxRoute(app, config.workdir);
// ... all 9 routes
```

## Dashboard Layer

### Types (`api/types.ts`):
Add interfaces mirroring server response shapes:
- `AgentBusStatus` — bus health
- `AgentBusPacketEntry` — inbox entry
- `AgentBusResultEntry` — outbox entry (includes `proposedChangesCount`, `highRiskChangesCount`)
- `AgentBusReviewEntry` — review entry (includes `verdict`, `issueCount`)
- `AgentBusMdReportEntry` — markdown report reference
- `AgentBusTraceEvent` — full trace event shape
- `AgentBusTraceResponse` — `{ events, totalEvents, malformedLines }`
- `AgentBusTraceChainResponse` — `{ eventId, selectedEvent, chain, chainLength, missingLinks }`
- `AgentBusReadResponse` — `{ type, validated?, data?, text?, error? }`

### API Client (`api/client.ts`):
Standard `get<T>(path)` / `post<T>(path, body)` pattern. Each function mirrors a route:
- `getAgentBusStatus()`, `getInbox()`, `getOutbox()`, `getReviews()`
- `getTraceEvents(params?)` — builds URLSearchParams for filter query string
- `getTraceChain(eventId)`, `readAgentFile(filePath)`
- `archiveAgentFile(filePath)`, `rejectAgentFile(filePath, reason)`

### Panel Component (`panels/AgentBusPanel.tsx`):
Uses `useState` + `useEffect` for all data. One `load()` function fetches all 5 endpoints.

**Summary cards (card-grid):** Inbox count, Outbox count, Reviews count, Rejected count, Archive count, Trace Events count. Malformed count shown as red warning.

**Tables (3-column ag-grid):**
- Inbox: Agent, Type, Title, Status. Click row → `handleRead(relativePath)`.
- Outbox: Agent, Status, Summary, Δ (changes), !! (high-risk). High-risk count in red.
- Reviews: Verdict (color-coded), Issues, Packet ID.
- Malformed rows get `row-malformed` class (red text).

**Trace Ledger Table:**
- Columns: Time, Event, Sev, Actor, Agent, Summary
- `isHighRisk()` function checks eventType against high-risk set + severity error/critical
- High-risk rows get `row-highrisk` class (red left border)
- Severity coloring: `sev-critical` (red), `sev-warning` (yellow)
- Click row → `handleChain(eventId)` + `handleRead(sourcePath)`

**Detail Pane (`ag-detail`):**
- Shows when `detail` state is set
- Header shows type, close button (✕)
- JSON: `<pre>` with formatted JSON
- Markdown: `<pre>` with text content
- Error: error-box
- Actions: Archive button + reject input + Reject button (disabled unless reason provided)
- Warning: "NOT approval and NOT mutation authority"

**Causal Chain View:**
- Shows when `chain` state is set and `chain.chain.length > 0`
- Vertical list with colored left borders (green for root, blue for target)
- `missingLinks` flag shown as warning
- Each node: `[eventType] summary`

### CSS (`styles.css`):
Agent Bus section at end of stylesheet. Key classes:
- `.ag-grid` — 3-column table grid
- `.ag-table-wrap` — scrollable table container (max-height: 200px)
- `.ag-table` — sticky headers, compact rows, hover highlight
- `.row-malformed` — red text
- `.row-highrisk` — red left border
- `.sev-critical`, `.sev-warning` — severity colors
- `.verdict-block`, `.verdict-escalate`, `.verdict-pass`, `.verdict-notes`, `.verdict-revise` — verdict colors
- `.ag-detail` — bordered detail pane
- `.ag-actions` — flex row with input + buttons
- `.chain-list`, `.chain-node`, `.chain-root`, `.chain-target` — chain view
- `.btn-text`, `.btn-danger` — button variants

### App.tsx Wiring:
1. Import `AgentBusPanel`
2. Add `"agent-bus"` to `Panel` type union
3. Add `{ id: "agent-bus", label: "Agent Bus" }` to PANELS array
4. Add `{panel === "agent-bus" && <AgentBusPanel />}` to render block
5. Update status strip to current phase

## Pitfalls

### Server missing external-agents dependency
When adding server routes that import from `@tripp-reason/external-agents`, the package must be in server's `package.json` dependencies. If not present, `tsc` fails with "Cannot find module '@tripp-reason/external-agents'". Fix: add `"@tripp-reason/external-agents": "workspace:*"` to server's dependencies, then `pnpm install --filter @tripp-reason/server && pnpm build`.

### safeAgentPath resolves relative to workdir, not cwd
The `safeAgentPath()` helper must resolve the file path relative to the server's configured workdir, not `process.cwd()`. Use `path.resolve(workdir, filePath)` not `path.resolve(filePath)`. The workdir comes from `config.workdir` and is passed to every route registration function.

### Dashboard trace event list: filter on server side
The trace events route supports server-side filtering via query params to keep the response small. Don't load all trace events and filter client-side — use `?packetId=xxx` on the GET request. The API client builds URLSearchParams.

### Archive/reject from dashboard use relative paths
The dashboard sends relative paths like `inbox/task-xxx.json`. The server resolves these against workdir in `safeAgentPath()`. Don't send absolute paths — they won't resolve correctly across environments.
