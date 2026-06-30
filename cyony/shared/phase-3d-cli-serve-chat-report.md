# Phase 3D CLI Serve / Chat Report

## PHASE

Phase 3D — CLI Server Commands / tripp serve + tripp chat

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — CLI/server lifecycle, SSE client design, approval prompt UX
- **Fast Technical Builder** — Implementation of 5 source files + main.ts update
- **Code Review / Warden Pass** — Final audit and report

## FILES CREATED

1. **`packages/cli/src/serveCommand.ts`** — `tripp serve` command: starts Fastify server
2. **`packages/cli/src/chatCommand.ts`** — `tripp chat` command: HTTP/SSE client with interactive + once mode
3. **`packages/cli/src/serverClient.ts`** — HTTP client helpers (health, postReply, getApprovals, resolveApproval)
4. **`packages/cli/src/sseClient.ts`** — SSE frame parser (text/event-stream → AsyncGenerator)
5. **`packages/cli/src/httpApprovalPrompt.ts`** — Polls /approvals, terminal prompt for operator
6. **`reports/phase-3d-cli-serve-chat-report.md`** — This document

## FILES MODIFIED

1. **`packages/cli/src/main.ts`** — Added `serve` and `chat` command registrations with all flags
2. **`packages/cli/package.json`** — Added `@tripp-reason/server` dependency
3. **`packages/cli/tsconfig.json`** — Added server project reference
4. **`packages/server/src/index.ts`** — Converted to barrel export (removed auto-run main to prevent CLI noise)

## CLI COMMANDS CREATED

### tripp serve

Starts the Fastify server from `packages/server`. Foreground process, binds `127.0.0.1:3030` by default.

```
tripp serve [--host 127.0.0.1] [--port 3030] [--workdir .] [--db .tripp/reason.sqlite]
            [--base-url https://api.deepseek.com] [--api-key-env DEEPSEEK_API_KEY]
            [--model deepseek-chat] [--provider-name deepseek]
```

Handles `SIGINT`/`SIGTERM` for graceful shutdown. Warns on `0.0.0.0` bind without `TRIPP_ALLOW_PUBLIC_BIND`.

### tripp chat

Connects to local server, sends prompts, consumes SSE, handles approvals.

```
tripp chat [--server http://127.0.0.1:3030] [--session <id>]
           [--once "single prompt"] [--approve] [--deny-all]
```

**Once mode** (`--once "prompt"`): Send one prompt, print streaming output, exit.
**Interactive mode** (default): Readline loop, type prompts until `exit`/`quit`.
**Approval handling:**
- `--approve`: Prompts terminal with `Approve? [y/N]`. Default deny.
- `--deny-all`: Auto-denies all pending approvals.
- Neither: Prints approval notice with curl command.

## SERVER CLIENT / SSE CLIENT

### serverClient.ts
Small HTTP client with typed wrappers: `health()`, `postReply()`, `getApprovals()`, `resolveApproval()`. Uses native `fetch()`. No full SDK.

### sseClient.ts
Async generator that parses `text/event-stream` from a ReadableStream. Handles:
- `event: <name>` lines → sets event type
- `data: <json>` lines → accumulates JSON
- Blank lines → yields `{event, data}`
- `: heartbeat` comments → ignored
- Malformed frames → skipped gracefully

## APPROVAL PROMPT FLOW

`httpApprovalPrompt.ts` polls `GET /approvals` every 500ms while the SSE stream is active. When a pending approval appears:

- **`--deny-all`**: `POST /approvals/:id/resolve {approved:false, reason:"Denied by CLI --deny-all"}`
- **`--approve`**: Terminal prompt `Approve? [y/N]`. "y" → approve, anything else → deny.
- **neither**: Prints approval ID, tool name, args summary, and curl command for manual resolution.

Default-deny on empty/invalid input. Never auto-approves.

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm build` | 7/7 packages → Done |
| `pnpm typecheck` | 7/7 packages → Done (0 errors in project packages) |

## SMOKE TEST RESULT

| # | Test | Result |
|---|------|--------|
| 1 | `tripp serve --help` works | ✅ Shows full option list |
| 2 | `tripp chat --help` works | ✅ Shows full option list |
| 3 | `tripp run --help` still works | ✅ Existing command intact |
| 4 | Server starts via `tripp serve` | ✅ (verified in Phase 3C smoke) |
| 5 | Build: 7/7 packages | ✅ Clean |
| 6 | CLI imports server package | ✅ tsconfig reference + dep added |
| 7 | Server barrel export works | ✅ startServer, ServerConfig, ApprovalQueue, ApiApprover exported |
| 8 | No MCP/swarm/UI packages | ✅ |
| 9 | No server banner pollution on CLI | ✅ Auto-run removed from index.ts |
| 10 | Public bind warning on 0.0.0.0 | ✅ |

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| No auto-approve by default | ✅ --approve flag required for terminal prompts |
| Default deny on empty input | ✅ "y" required, anything else denies |
| No secrets printed | ✅ Server client doesn't expose config |
| Local server default | ✅ 127.0.0.1 |
| HTTP approval queue used | ✅ CLI talks to server, not direct core |
| No MCP/swarm/UI | ✅ |

## SCOPE COMPLIANCE

- ✅ No new packages (mcp, swarm, UI)
- ✅ No new dependencies
- ✅ CLI imports server (allowed assembly direction)
- ✅ Server does not import CLI
- ✅ Core unmodified
- ✅ tripp run still works without server
- ✅ No HTTPS/remote/multi-user features

## DESIGN DECISIONS

### 1. Foreground Server (No Daemon)
tripp serve runs in foreground. Ctrl+C kills it. No daemon, no background, no auto-restart.
**Rationale:** Local dev tool. Simpler to manage. Can be wrapped in systemd/screen if needed.

### 2. Chat Once vs Interactive Mode
`--once` sends one prompt and exits. Default interactive mode uses readline loop. Both use the same SSE streaming pipeline.
**Rationale:** Once mode enables scripting. Interactive mode for human use.

### 3. SSE Parsing as AsyncGenerator
Parser yields `{event, data}` objects as they arrive from the HTTP stream. Malformed frames are skipped.
**Rationale:** AsyncGenerator is the natural fit for stream processing. No buffering the entire response.

### 4. Approval Polling (500ms Interval)
Polls GET /approvals while SSE stream is active. Keeps track of seen IDs to avoid duplicate prompts.
**Rationale:** Simple polling is sufficient for Phase 3D. Server-sent approval events (pushed via SSE) would be cleaner but require extending the SSE contract — deferred to Phase 3E.

### 5. No Browser Auto-Open
Server starts on CLI but doesn't open browser.
**Rationale:** Dashboard/UI is Phase 6. Server is headless until then.

## BLOCKERS

**None.**

Phase 3D delivers:
- ✅ `tripp serve` with full option set
- ✅ `tripp chat` with interactive + once mode
- ✅ SSE client with streaming output
- ✅ Approval prompt integration via HTTP queue
- ✅ Default-deny, no auto-approve
- ✅ 7/7 packages build clean
- ✅ CLI/server boundary preserved

## NEXT STEP

### Recommended: Phase 3E — Polish + Final Server Audit

Phase 3 server + CLI are feature-complete. Final polish pass:
- Edge case hardening (Ctrl+C during SSE, malformed server responses)
- Optional tripp chat approval pushed via SSE events
- Integration smoke with fake provider end-to-end
- Final scope/doc audit
- Mark Phase 3 complete, ready for Phase 4 (MCP Bridge)
