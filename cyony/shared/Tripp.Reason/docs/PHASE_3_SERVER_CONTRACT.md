# Phase 3 Server Contract

> HTTP + SSE boundary for the Tripp.Reason runtime. Defines what the server layer MUST and MUST NOT do before a single line of server code is written.

## Purpose

Phase 3 exposes the existing local ReasonLoop runtime over a local HTTP/SSE boundary. The core runtime (ReasonLoop, ApprovalGate, RunManager, ReportGenerator) remains unchanged. The server is an assembly layer — same relationship to core as the CLI, but over HTTP instead of direct function calls.

```
Phase 1-2 (current):
  CLI → core (direct) → provider/tools/store

Phase 3 (target):
  HTTP client → server (Fastify) → core (same API) → provider/tools/store
```

## Non-Goals

- ❌ No cloud server / remote multi-user system
- ❌ No auth system (unless a local token is explicitly added in Phase 3D+)
- ❌ No dashboard UI (that is Phase 6)
- ❌ No MCP bridge (that is Phase 4)
- ❌ No swarm runtime (that is Phase 5)
- ❌ No new provider architecture
- ❌ No bypass of ApprovalGate
- ❌ No replacement of the CLI — `tripp run` continues to work directly against core

## Server Boundary

### What the server IS

The server is an **assembly layer**, identical in architectural role to the CLI:

- Imports from `shared`, `store`, `core`, `providers`, `tools`
- Wires concrete instances together (same as `runCommand.ts`)
- Exposes HTTP routes that call core functions
- Does NOT define new contracts (all contracts live in `shared`)

### What the server MUST NOT do

- Must not redefine contracts. All contracts live in `shared`.
- Must not put provider/tool logic inside routes. Routes call `ReasonLoop.run()`.
- Must not make core import server. Dependency arrow: `server → core`, never reverse.
- Must not bypass ApprovalGate. Same gate as CLI runs.
- Must not bypass report generation. Every `/reply` run produces a report.

### Dependency Direction

```
server ← core, providers, tools, store, shared (assembly layer)
```

No other package may import server.

## Local-Only Rule

- Default bind: `127.0.0.1`
- Configurable via `TRIPP_SERVER_HOST`
- Warn or reject if binding `0.0.0.0` unless explicitly set
- No remote access by default

## API Routes

### 1. GET /health

Liveness check. No auth, no side effects.

```json
{"status":"ok","version":"0.1.0","uptimeMs":12345,"activeTools":9}
```

### 2. GET /status

Runtime visibility. Must NOT expose secrets (API keys, base URLs).

```json
{
  "providerName":"openai-compatible","model":"deepseek-v4-pro",
  "dbPath":"...","workdir":"...",
  "activeTools":["list_dir","read_file","search","git_status","git_diff","write_file","edit_file","shell","run_tests"],
  "sessionCount":12,"pendingApprovals":0
}
```

### 3. POST /reply

Start a ReasonLoop run, stream events over SSE.

**Request:** `{"prompt":"...","sessionId?":"...","title?":"...","model?":"...","provider?":"...","workdir?":"..."}`

**Response:** `text/event-stream` — SSE frames using existing `StreamEvent` shape from `shared/events.js`. Each event includes `runId` and `sessionId` for client correlation.

SSE events: `message`, `tool_request`, `tool_result`, `finish`, `error`. Optional heartbeat every 15s. If client disconnects, run continues — events persist, client can catch up via `GET /sessions/:id/events`.

Finish event includes `reportPath` for the generated report.

### 4. GET /sessions

List all sessions with id, title, status, provider, model, timestamps.

### 5. GET /sessions/:id

Single session detail with its runs.

### 6. GET /sessions/:id/events

Events for a session or specific run (`?runId=<id>`).

### 7. GET /runs/:id

Full run detail: run record, messages, events, tool calls, report path.

### 8. GET /runs/:id/report

Generated report. Raw Markdown (`text/markdown`) with optional JSON wrapper (`?format=json`).

### 9. GET /tools

All registered tools: name, description, requiresApproval, inputSchema summary.

### 10. GET /approvals

Pending approval requests. For operator dashboard/CLI.

### 11. POST /approvals/:id/resolve

Approve or deny a pending tool request. `{"approved":true,"reason":"Looks safe"}`. Timeout: 30s → auto-deny.

## SSE Contract

SSE event frames map directly to `StreamEvent` types from `shared/events.js`:

| SSE event | StreamEvent type | Direction |
|-----------|-----------------|-----------|
| `message` | message | provider → client |
| `tool_request` | tool_request | provider → client |
| `tool_result` | tool_result | loop → client |
| `finish` | finish | loop → client |
| `error` | error | provider/loop → client |

Data payload: `JSON.stringify(streamEvent)` with `runId`/`sessionId` injected.

Client disconnect: run continues, events persisted, catch-up via GET endpoints.

## Approval Over HTTP

### Challenge

Current approval is synchronous (CliApprover → terminal prompt → operator types y/n). HTTP has no terminal. Approval must become asynchronous: create pending record, pause ReasonLoop, wait for `POST /approvals/:id/resolve`, resume with result.

### Required Changes

1. **ApiApprover** — new approver in `packages/server/`, creates pending approval records
2. **ApprovalQueue** — in-memory or store-backed queue keyed by runId
3. **ReasonLoop pause/resume** — biggest change: must support pausing mid-tool-request
4. **Timeout** — 30s auto-deny to prevent indefinite hangs

### Implementation Sequence (Safer Path)

**Phase 3B — Read-Only HTTP/SSE:**
- `POST /reply` SSE streaming with safe tools only (list_dir, read_file, search, git_status, git_diff)
- Mutation tools auto-denied (`requiresApproval` tools return error)
- Health, status, tools, sessions endpoints
- No approval queue needed

**Phase 3C — HTTP Approval Queue:**
- ApiApprover + pending approval store
- `GET /approvals` + `POST /approvals/:id/resolve`
- Mutation tools enabled over HTTP
- ReasonLoop async pause/resume

**Phase 3D — CLI tripp chat:**
- `tripp chat` connects to local server SSE
- Interactive terminal session

## Server Config (Environment Variables)

```bash
TRIPP_SERVER_HOST=127.0.0.1
TRIPP_SERVER_PORT=3030
TRIPP_OPENAI_COMPATIBLE_BASE_URL=...
TRIPP_OPENAI_COMPATIBLE_API_KEY=...
TRIPP_MODEL=deepseek-v4-pro
TRIPP_PROVIDER_NAME=openai-compatible
TRIPP_DB_PATH=/path/to/tripp.db
TRIPP_WORKDIR=/opt/data/shared/Tripp.Reason
```

## Security Requirements

| Rule | Detail |
|------|--------|
| Local bind only | Default 127.0.0.1, warn on 0.0.0.0 |
| ApprovalGate never bypassed | Same gate as CLI |
| No CORS wildcard by default | Restrict to localhost origins |
| Request body cap | 1MB default for POST /reply |
| No raw stack traces in responses | Controlled error messages |
| No secrets in /status | Never expose API keys |
| Report file access constrained | Only `reports/` directory |
| GET + POST only | No DELETE/PUT/PATCH for runtime state |

## Open Questions

1. Reports as raw Markdown or JSON-wrapped? → Raw default, `?format=json` optional.
2. Event store: push (SSE) or poll (GET)? → Both. SSE for live, GET for catch-up.
3. How does `tripp chat` work without server? → Phase 3D: server runs in background, CLI connects via HTTP.
4. Auto-start server on first CLI run? → No. Explicit `tripp serve`.
5. Max concurrent SSE connections? → Default 10, configurable.
6. Existing CLI after server? → CLI continues to work. Server is an alternative.

---

*Contract lock. No server code until Phase 3B.*
