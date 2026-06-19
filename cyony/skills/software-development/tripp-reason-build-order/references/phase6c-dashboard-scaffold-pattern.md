# Phase 6C Dashboard Scaffold Pattern

Vite + React + TypeScript dashboard app under `apps/dashboard/`. Dark-first, hard edges, plain CSS, HTTP-only API client.

## Workspace Setup

1. Add `apps/*` to `pnpm-workspace.yaml`
2. Create `apps/dashboard/` with its own `package.json`, `tsconfig.json`, `vite.config.ts`

```json
// package.json minimal deps
{
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0", "typescript": "^5.7.0", "vite": "^6.0.0" }
}
```

```json
// tsconfig.json
{ "compilerOptions": { "target": "ES2022", "lib": ["ES2022","DOM","DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx", "strict": true, "noEmit": true } }
```

```ts
// vite.config.ts — proxy /api to local server
export default defineConfig({
  plugins: [react()],
  server: { port: 3001, proxy: { "/api": { target: "http://127.0.0.1:3030", changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") } } }
});
```

Add `/// <reference types="vite/client" />` in `src/vite-env.d.ts` or `import.meta.env` is unknown.

## API Client Pattern

Never import `@tripp-reason/*` packages from dashboard. Define local types in `src/api/types.ts` that mirror server shapes. Use `import.meta.env.VITE_TRIPP_API_BASE` with fallback:

```ts
const BASE = import.meta.env.VITE_TRIPP_API_BASE ?? "http://127.0.0.1:3030";
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
```

## Panel Pattern

Every panel follows the same structure:

```tsx
import { useState, useEffect } from "react";
import { getX } from "../api/client";
import type { X } from "../api/types";

export default function XPanel() {
  const [data, setData] = useState<X[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getX().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="error-box">{error}</div>;
  if (data.length === 0) return <div className="empty-state">No data.</div>;
  return <table className="data-table">...</table>;
}
```

## CSS Design System

Dark-first with CSS custom properties (GitHub-dark inspired):
- `--bg: #0d1117`, `--bg-panel: #161b22`, `--border: #30363d`
- `--text: #c9d1d9`, `--text-dim: #8b949e`
- `--green: #3fb950`, `--red: #f85149`, `--yellow: #d29922`
- `--accent: #58a6ff` (only for active nav border)
- Hard edges: NO `border-radius` anywhere
- Monospaced: `--mono: "SF Mono", "Fira Code", Menlo, monospace`

## Pitfalls

- **`import.meta.env` requires `vite/client` types reference** — add `/// <reference types="vite/client" />` or tsc won't find it
- **Never import `@tripp-reason/*` from dashboard** — all data comes through HTTP API client
- **React types come from `@types/react` devDep**, not from the monorepo. Dashboard has its own package.json.
- **Vite build outputs to `dist/`** — use `pnpm --filter tripp-dashboard build` (tsc + vite)

## Dashboard Validation Checks (Every Phase)

After each dashboard phase, run:

```bash
# 1. Build
pnpm --filter tripp-dashboard build

# 2. Full workspace typecheck
pnpm typecheck

# 3. Verify no @tripp-reason/* imports leak in
grep -rn "from '@tripp-reason" apps/dashboard/src/ || echo "NO_TRIPP_IMPORTS"

# 4. Verify no direct package imports
grep -rn "from.*swarm\|from.*core\|from.*server\|from.*tools\|from.*mcp\|from.*providers\|from.*store" apps/dashboard/src/ || echo "NO_DIRECT_IMPORTS"

# 5. Confirm zero server changes
git diff --stat packages/server/
```

## Phase 6D — Live Run SSE Panel

Adding SSE streaming to the dashboard. The server uses `POST /reply` (not GET), so `EventSource` won't work — must use `fetch` + `ReadableStream`.

### SSE Parser (`api/sse.ts`)

```ts
// connectReplySse(body, callbacks) → AbortController
// Opens POST /reply, reads ReadableStream<Uint8Array>, parses text/event-stream
// Returns AbortController for cancel (stop button)

const controller = connectReplySse(body, {
  onEvent(event: SseEvent) { ... },
  onDone() { ... },
  onError(msg: string) { ... },
  onHeartbeat() { ... }, // optional
});
controller.abort(); // stop button
```

Key parser behaviors:
- Buffer partial frames across `reader.read()` calls
- Split on `\n\n` for complete frames
- `:` prefix = heartbeat comment → skip, call `onHeartbeat`
- Parse `event:` and `data:` fields from each frame
- JSON-parse data into typed `SseEvent` (message/tool_request/tool_result/finish/error)
- Malformed JSON or unknown event type → `console.warn` + skip (never crash)
- `AbortError` → `onDone()` (clean cancel)
- Other errors → `onError(msg)`

### SSE Event Types (local, NOT shared imports)

```ts
type SseEvent = SseEventMessage | SseEventToolRequest | SseEventToolResult | SseEventFinish | SseEventError;

interface SseEventMessage { type: "message"; content: string; role: "assistant"; sessionId?; runId? }
interface SseEventToolRequest { type: "tool_request"; tool: string; args: unknown; requiresApproval: boolean; }
interface SseEventToolResult { type: "tool_result"; tool: string; result: unknown; status: "ok" | "error"; }
interface SseEventFinish { type: "finish"; reason: string; runId: string; reportPath?: string; }
interface SseEventError { type: "error"; message: string; recoverable: boolean; }
```

### LiveRunPanel State Machine

```
idle → (Run button) → running → (stream ends) → finished
  ↑                      ↓                         ↓
  └── (Clear button)     └── (Stop button) → idle  └── (Clear) → idle
                         └── (error) → error → (Clear) → idle
```

State:
- `status`: "idle" | "running" | "finished" | "error"
- `events: SseEvent[]` — full feed
- `streamText: string` — accumulated message content
- `meta: { sessionId?, runId?, reportPath? }` — captured from events
- `abortRef.current: AbortController | null` — for stop button

### Approval Polling During Live Run

```tsx
// Poll GET /approvals every 800ms while running
useEffect(() => {
  if (status !== "running") return;
  const id = setInterval(() => {
    getApprovals().then(r => setPending(r.approvals.filter(a => a.status === "pending")));
  }, 800);
  return () => clearInterval(id);
}, [status]);
```

Show inline approve/deny buttons for each pending approval. Use existing `approveApproval(id)` / `denyApproval(id)` from API client. Default-deny posture — buttons require explicit click.

### EventCard Component

Five themed card types, color-coded by left border:
- `message` → no border, plain text body
- `tool_request` → yellow border, 🔧 badge, needs-approval tag, args preview (5 keys max, 80-char strings)
- `tool_result` → green (ok) / red (error) border, ✓/✗ badge
- `finish` → green border, runId + reportPath in monospace
- `error` → red border, message + recoverable tag

Args preview safety: truncate strings at 100 chars, objects at 5 entries. Never dump raw JSON blobs.

### CSS for Live Run

- `.live-run` → max-width 960px
- `.prompt-input` → full-width textarea, resizable vertical, min-height 64px
- `.prompt-options` → grid of optional fields (sessionId, title, model, provider, workdir)
- `.stream-text` → pre-wrap, max-height 360px, scrollable
- `.event-feed` → max-height 480px, scrollable
.event-card → 8px/10px padding, border-bottom separator
.event-ts → right-aligned timestamp in dim text

## Phase 6E — Swarm Panel Upgrade

Building a usable swarm control surface from the Phase 6C skeleton. Key components:

### 1. Typed Sub-Interfaces (api/types.ts)

Replace `unknown[]` with proper typed interfaces so tables can render without `as any` casts:

```ts
interface SwarmTaskPacket { id, role, title, objective, modelTier?, riskLevel?, timeoutMs?, requiresApproval?, allowedFiles?, allowedTools? }
interface SwarmResultPacket { taskId, role, status, summary, findings?, filesTouched?, toolCalls?, risks? }
interface SwarmWardenVerdict { status: "PASS"|"PARTIAL"|"FAIL", reasoning, violations[], recommendations[] }
interface SwarmConflict { id, file, taskIds[], status, resolution? }
```

### 2. SwarmRunForm — Fake-Only with Mode Caps

```tsx
// Modes: solo (enabled), small (enabled), medium/large/max (disabled + lock + tooltip)
const AVAILABLE_MODES = [
  { value: "solo", enabled: true, workers: [1] },
  { value: "small", enabled: true, workers: [3,4,5] },
  { value: "medium", enabled: false, hint: "HTTP startup approval not implemented yet" },
  // ...
];
```

Key safety rules:
- Real mode NEVER exposed in UI (no toggle, no checkbox)
- `runFakeSwarm()` always sends `fake: true, real: false`
- Disabled modes shown with `🔒` icon and tooltip explaining blocker
- Worker count dropdown only for modes with multiple worker options
- After submit: auto-refresh list + auto-select new swarm detail

### 3. SwarmDetail — Task/Result Tables + Warden + Conflicts

Two 8-column tables:
- **Task packets**: ID, Role, Title, Objective, Tier, Risk (color badge), Timeout, Approval (🔒)
- **Result packets**: Task, Role, Status (green/yellow/red), Summary, Findings count, Files count, Tools count, Risks count

Both tables in `.swarm-table-scroll` wrappers for horizontal overflow.

### 4. WardenVerdictCard

```tsx
// PASS (green) / PARTIAL (yellow) / FAIL (red) badge
// Reasoning text
// Violations list: severity badge + rule name (mono) + detail
// Recommendations: bulleted list
```

### 5. ConflictList

Empty state: "No conflicts detected." in green.
Each conflict: file (mono), status badge (resolved=green, pending=yellow), task IDs (truncated), resolution text.

### 6. SwarmsPanel Orchestration

```tsx
// Load list on mount → click row → viewDetail(id)
// After runFakeSwarm(): await load() + await viewDetail(result.id)
// Selected row highlighted via .swarm-row-selected class
// Top-level error only if list fails; form errors inline
```

### CSS Additions

```css
.swarm-form-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.swarm-detail-bar { badge strip with mode/workers/status/warden/timestamps }
.swarm-table-scroll { overflow-x: auto; }
.warden-violation { flex row: severity badge + rule + detail }
.conflict-item { compact row: file + badges + task IDs + resolution }
```

### Phase 6E Pitfalls

- **Don't use `unknown[]` for swarm packets** — tables need typed fields. Define `SwarmTaskPacket`, `SwarmResultPacket`, etc. locally in `api/types.ts`.
- **Medium/large/max: show disabled, not hidden** — transparency about roadmap is better than hiding options that vanish. Use `disabled` attr + `🔒` + `title` tooltip.
- **Worker count selector only for small mode** — solo is fixed at 1. Don't show dropdown when only one option exists.
- **Auto-select new swarm after run** — `runFakeSwarm()` returns the created swarm's ID in the response. Immediately call `viewDetail(result.id)` so the operator sees results.
- **WardenViolation implicit `any`** — since `taskIds` is typed as `string[]`, map callbacks need explicit `(tid: string)` type annotation.
