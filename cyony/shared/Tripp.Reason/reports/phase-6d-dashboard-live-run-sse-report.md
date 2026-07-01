# Phase 6D Dashboard Live Run SSE Report

## PHASE

Phase 6D — Dashboard Live Run SSE Panel

## STATUS

**PASS**

## MODEL TIERS USED

- **Heavy Technical Thinking** — SSE client design, ReadableStream parsing, event type mapping, approval polling UX, dashboard/server boundary analysis
- **Fast Technical Builder** — implementation of SSE parser, EventCard, LiveRunPanel, styles

## FILES CREATED

```
apps/dashboard/src/api/sse.ts            — SSE client (ReadableStream parser)
apps/dashboard/src/components/EventCard.tsx — Event display cards for all 5 SSE event types
apps/dashboard/src/panels/LiveRunPanel.tsx  — Live Run panel (prompt + SSE + approval polling)
```

## FILES MODIFIED

```
apps/dashboard/src/api/types.ts   — Added SseEvent union types, SseFrame, ReplyRequest
apps/dashboard/src/App.tsx        — Added Live Run to nav (Panel type, PANELS array, render)
apps/dashboard/src/styles.css     — Added live-run, SSE event card, prompt form styles (~105 lines)
```

No server route changes. No package changes outside `apps/dashboard/`.

## LIVE RUN COMPONENTS CREATED

### 1. SSE Parser (`api/sse.ts`)

- **`connectReplySse(body, callbacks)`** — opens SSE connection to POST /reply
  - Sends JSON body with prompt + optional sessionId, title, model, provider, workdir
  - Returns `AbortController` for cancellation (stop button)
  - Calls `onError` for non-2xx, network errors, abort
  - Calls `onDone` on clean stream end or abort
- **`parseSseStream(stream, callbacks)`** — reads `ReadableStream<Uint8Array>`
  - Buffers partial frames across reads
  - Splits on `\n\n` to extract complete frames
  - Skips heartbeat comments (`: heartbeat`)
  - Calls `onHeartbeat` (optional) for liveness indication
- **`parseSseFrame(raw)`** — extracts `event` and `data` fields from a frame
  - Defaults event type to `"message"` if not specified
  - Handles multi-line data (concatenates)
- **`parseEvent(frame)`** — parses JSON data into typed `SseEvent`
  - Validates event type against known set (message/tool_request/tool_result/finish/error)
  - Returns null for unknown types or invalid JSON — consumer handles gracefully

### 2. EventCard Component (`components/EventCard.tsx`)

Dispatches on event.type to render themed cards:

| Event Type | Visual Treatment |
|------------|-----------------|
| `message` | Plain text body, dim badge |
| `tool_request` | Yellow left border, 🔧 badge, needs-approval/auto tag, args preview (max 5 keys, 80-char truncation) |
| `tool_result` | Green (ok) or red (error) left border, ✓/✗ badge, error details for failures |
| `finish` | Green left border, green badge, runId, reportPath (monospace) |
| `error` | Red left border, error message, recoverable tag if applicable |

Args preview safe: truncates strings at 100 chars, objects at 5 entries, no raw JSON blobs.

### 3. LiveRunPanel (`panels/LiveRunPanel.tsx`)

**Prompt Input:**
- Textarea for prompt (disabled while running)
- Optional fields: sessionId, title, model, provider, workdir (all disabled while running)
- Run button (disabled when prompt empty or running)
- Stop button (visible only while running — aborts SSE via AbortController)
- Clear button (visible when run finished/errored — resets all state)

**Streaming Display:**
- Accumulated `streamText` from all message events, rendered in `<pre>` block
- Auto-scroll to latest via `useEffect` on events array
- `max-height: 360px` with overflow scroll

**Event Feed:**
- Ordered list of all events with EventCard rendering
- `max-height: 480px` with overflow scroll
- Show event count in header

**Run Metadata Strip:**
- Shown when sessionId, runId, or reportPath captured
- Monospaced ID display (truncated to 16 chars)
- Status badge (complete/error)

**Error Handling:**
- Connection failure / server unavailable → error message in red box
- POST /reply 400 → parsed server error message
- Network disconnect → controlled error, not raw stack trace
- SSE parse errors → `console.warn`, skipped frame, no crash

**Approval Polling:**
- `setInterval(800ms)` polls GET /approvals while `status === "running"`
- Shows pending count with yellow ⚠ header
- Each approval: tool name, risk badge, Approve/Deny buttons
- Uses existing `approveApproval`/`denyApproval` from API client
- Loading state per-button ("…" while processing)
- Auto-refreshes list after resolve

## SSE BEHAVIOR

| Behavior | Implementation |
|----------|---------------|
| Heartbeat processing | `': heartbeat\n\n'` lines → skipped, optional `onHeartbeat` callback |
| Malformed frame | `console.warn`, event skipped, stream continues |
| Invalid JSON in data | `console.warn`, null returned, skipped |
| Unknown event type | `console.warn`, null returned, skipped |
| Network abort (stop button) | `AbortController.abort()` → caught as `DOMException("AbortError")` → `onDone()` |
| Stream end | `reader.read()` returns `done=true` → calls `onDone()` |
| Partial frame at stream end | Buffer processed in finally block |
| Connection error | Caught in try/catch → `onError(msg)` |

## APPROVAL UX

- **Polling:** Every 800ms while run is active
- **Display:** Inline in Live Run panel, below run metadata
- **Approve/Deny:** Explicit buttons, no auto-approve, default-deny posture
- **Action feedback:** Per-button loading state, auto-refresh after resolve
- **Cross-panel:** Approvals panel (Phase 6C) still works independently — both consume same API

## VALIDATION RESULT

| Check | Result |
|-------|--------|
| Dashboard build (tsc -b + vite) | PASS (37 modules, 994ms) |
| Full workspace typecheck | 10/10 PASS |
| Dashboard typecheck (tsc -b) | PASS |
| `@tripp-reason/*` imports in dashboard | 0 |
| Direct package imports (core/server/tools/mcp/swarm/providers/store) | 0 |
| Server route modifications | 0 |
| New npm dependencies | 0 |

## SMOKE / STATIC CHECK RESULT

1. ✅ Dashboard builds (37 modules, up from 34 — +sse.ts, EventCard.tsx, LiveRunPanel.tsx)
2. ✅ Live Run panel appears in nav (second item, between Overview and Tools)
3. ✅ SSE parser handles all 5 event types (type union covers message/tool_request/tool_result/finish/error)
4. ✅ Heartbeat comments skipped in `parseSseStream` (startsWith ":" check)
5. ✅ Malformed frames: JSON parse error → console.warn + null return (no crash)
6. ✅ Unknown event types: type check → console.warn + null return
7. ✅ API client base URL default is `http://127.0.0.1:3030`
8. ✅ `connectReplySse` sends JSON body to `${BASE}/reply`
9. ✅ Run button disabled while running, Stop button aborts via controller
10. ✅ No POST /swarms/run SSE implemented
11. ✅ No direct runtime imports
12. ✅ No new server routes

## SECURITY / SCOPE CHECKS

| Rule | Status |
|------|--------|
| No direct runtime imports from dashboard | ✅ Zero |
| No tool execution bypass | ✅ All through POST /reply → server → ApprovalGate |
| No secrets exposed | ✅ Args preview truncated, no raw JSON blobs |
| No direct filesystem access | ✅ Browser sandbox only |
| No server route expansion | ✅ No files modified in packages/server/ |
| Default-deny approval posture | ✅ Buttons require explicit click |
| No auto-approve | ✅ No automation, no timers |
| Controlled errors | ✅ Structured error display, no raw stacks |
| No swarm live SSE | ✅ Deferred |

## STYLE / UX CHECKS

| Requirement | Status |
|-------------|--------|
| Desktop-first | ✅ 960px max-width on live-run |
| Dark mode first | ✅ All styles use CSS variables from dark theme |
| Hard edges | ✅ All `border-radius: 0` (inherited) |
| No blue-heavy palette | ✅ Amber/yellow for tool requests, green/red for status |
| Dense but readable | ✅ Events have compact padding (8px/10px) |
| No animated noise | ✅ Static event cards, color-only badges |
| Monospaced paths/IDs | ✅ runId, reportPath, toolName in monospace |

## DESIGN DECISIONS

### SSE Parser Shape
Native `fetch` + `ReadableStream` with manual text/event-stream parsing. No `EventSource` because:
1. `EventSource` only supports GET — server uses POST /reply
2. `EventSource` doesn't support custom headers or AbortController
3. Manual parsing gives full control over error recovery and heartbeat handling

The parser buffers partial frames across `reader.read()` calls, splits on `\n\n`, and handles edge cases (mid-frame stream end, malformed JSON, unknown types) via controlled warnings, never crashes.

### Approval Polling
800ms interval chosen as balance between responsiveness and server load. Polling only active while run status is "running" — stops automatically when run finishes or errors. Approvals panel remains available as standalone view for cases where polling isn't enough.

### Event Display
Five distinct card types with left-border color coding:
- Yellow = tool requests (needs attention/approval)
- Green = results/finish (ok)
- Red = errors (needs investigation)

Cards include timestamps but are intentionally flat — no expand/collapse for Phase 6D to keep complexity low.

### Run State Handling
Four states: idle → running → finished/error. State diagram:
- `idle`: prompt input active, Run enabled
- `running`: prompt disabled, Stop enabled, stream active, polling active
- `finished`: stream ended normally, Clear enabled
- `error`: stream failed, error displayed, Clear enabled

Clear resets all state including form fields. Prior events are always cleared before new run (no history preservation — simple and predictable).

### Why Advanced Report Viewer Waits
Markdown rendering in the dashboard adds a dependency (react-markdown, marked, etc.) and 50KB+ to the bundle. For a local dashboard where the operator has direct filesystem access, a monospaced path display is sufficient. Phase 6D focuses on the live streaming experience; report viewing can come in Phase 6E or later.

## BLOCKERS

None.

## NEXT STEP

**Phase 6E** — Recommended scope:
- Advanced report viewer (markdown rendering with monospaced fonts)
- SessionsPanel: deep-dive single session view (expand runs, view messages/events)
- SwarmsPanel: improve swarm detail with task/worker/conflict visualization
- Static hosting from server (serve `apps/dashboard/dist/` from Fastify)
- Testing with a running server instance (manual smoke with real SSE stream)
