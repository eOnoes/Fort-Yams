# Phase 3A Server Contract Report

## PHASE

Phase 3A — Server Boundary Plan / HTTP + SSE Contract Lock

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — API boundary design, SSE contract, approval flow over HTTP, server/runtime separation analysis
- **Code Review / Warden Pass** — Scope control, doctrine compliance, security requirements

## FILES CREATED

1. **`docs/PHASE_3_SERVER_CONTRACT.md`** — Full server contract: purpose, non-goals, server boundary, local-only rule, 11 API routes, SSE contract, approval flow, config, security, open questions
2. **`reports/phase-3a-server-contract-report.md`** — This document

## FILES MODIFIED

None. No implementation code was created.

## SERVER CONTRACT SUMMARY

The server contract defines a local HTTP/SSE boundary for the existing runtime. Key architectural decisions:

1. **Server is an assembly layer** — same role as CLI. Imports from shared/store/core/providers/tools. Wires them together. Does not define new contracts.

2. **Core is untouched** — ReasonLoop, ApprovalGate, RunManager, ReportGenerator remain server-agnostic. No `core → server` imports.

3. **Local-only by default** — binds `127.0.0.1`. Explicit warning/rejection on `0.0.0.0`.

4. **Safer implementation path** — Phase 3B starts with read-only HTTP/SSE (no mutations). Phase 3C adds approval queue + mutating tools. Avoids building the entire async approval system before proving streaming works.

## ROUTE CONTRACTS

| # | Route | Method | Purpose |
|---|-------|--------|---------|
| 1 | `/health` | GET | Liveness check |
| 2 | `/status` | GET | Runtime config (no secrets) |
| 3 | `/reply` | POST | Start run, SSE stream events |
| 4 | `/sessions` | GET | List sessions |
| 5 | `/sessions/:id` | GET | Session detail + runs |
| 6 | `/sessions/:id/events` | GET | Events for session/run |
| 7 | `/runs/:id` | GET | Full run detail |
| 8 | `/runs/:id/report` | GET | Generated report |
| 9 | `/tools` | GET | Tool list + schemas |
| 10 | `/approvals` | GET | Pending approvals |
| 11 | `/approvals/:id/resolve` | POST | Approve/deny tool |

## SSE CONTRACT

Event frames map directly to existing `StreamEvent` types from `shared/events.js`. No new event schema.

- `message`, `tool_request`, `tool_result`, `finish`, `error`
- Each event payload includes `runId` and `sessionId` for client correlation
- Optional heartbeat every 15s
- Client disconnect: run continues, events persisted, catch-up via GET endpoints
- Finish event includes `reportPath`

## APPROVAL FLOW DECISION

**Decision: Start Phase 3B with read-only HTTP/SSE only.**

**Rationale:**

Current ApprovalGate is synchronous (CliApprover → terminal prompt). HTTP approval requires async pause/resume, a new ApiApprover, and a pending approval queue. Building all of this before proving streaming works would couple two untested concerns.

**Phase 3B scope (read-only first):**
- `POST /reply` with SSE streaming
- Only safe tools: list_dir, read_file, search, git_status, git_diff
- Mutation tools (`requiresApproval: true`) auto-deny
- No approval queue needed
- Health, status, tools, sessions endpoints

**Phase 3C scope (approval queue):**
- ApiApprover + pending approval store
- GET /approvals + POST /approvals/:id/resolve
- ReasonLoop async pause/resume for approval
- Mutation tools enabled over HTTP

This decouples the two concerns and proves streaming works before adding the approval complexity.

## SECURITY DECISIONS

| Rule | Decision |
|------|----------|
| Local bind | Default `127.0.0.1`. Warn on `0.0.0.0`. |
| CORS | No wildcard. Restrict to localhost origins. |
| Secrets | `/status` must not expose API keys or base URLs. |
| Body cap | 1MB default for POST /reply. 413 on overflow. |
| Errors | No raw stack traces in HTTP responses. |
| Reports | Only serve from `reports/` directory. No arbitrary file access. |
| Verbs | GET + POST only. No DELETE/PUT/PATCH. |
| ApprovalGate | Never bypassed. Same gate as CLI runs. |

## OPEN QUESTIONS

1. Reports: raw Markdown or JSON-wrapper? → Raw default, `?format=json` optional
2. Event store: push (SSE) or poll (GET)? → Both supported
3. CLI chat without server? → Phase 3D: server runs in background
4. Auto-start server? → No, explicit `tripp serve`
5. Max concurrent connections? → Default 10, configurable
6. Existing CLI after server? → CLI continues unchanged, server is alternative

## TMP / SMOKE ARTIFACT DECISION

`tmp/` directory contains Phase 2E smoke test artifacts (`smoke-repo/`, generated reports, backups). These are untracked and safe to leave in place. Recommendation: keep until Phase 3F cleanup pass, then either `.gitignore` or archive. No action needed in Phase 3A.

## SCOPE COMPLIANCE

- ✅ No `packages/server/` created
- ✅ No new packages created
- ✅ No implementation code written
- ✅ No dependencies added
- ✅ No HTTP routes implemented
- ✅ No MCP, swarm, or UI files
- ✅ No Goose code copied
- ✅ Architecture and doctrine remain unchanged
- ✅ All existing package boundaries preserved

## NEXT STEP

### Recommended: Phase 3B — Fastify Server Skeleton + Read-Only HTTP/SSE

**Preconditions (all met):**
- ✅ Phase 3A server contract locked
- ✅ Phase 2 complete (9 tools, approval gate proven)
- ✅ Scope clean (no forbidden packages)
- ✅ Build/typecheck pass

**Phase 3B scope:**
- Create `packages/server/` with Fastify
- Wire existing core (same as CLI)
- Implement health, status, tools, sessions endpoints
- Implement `POST /reply` with SSE streaming (read-only tools only)
- Mutation tools auto-deny (requiresApproval tools return error)
- No approval queue yet
