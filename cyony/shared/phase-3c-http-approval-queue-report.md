# Phase 3C HTTP Approval Queue Report

## PHASE

Phase 3C — HTTP Approval Queue + Mutating Tools Over HTTP

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Heavy Technical Thinking** — Async approval queue design, Promise-based pause/resume, timeout/fail-closed behavior, mutation-over-HTTP safety
- **Fast Technical Builder** — Implementation of all components and smoke test
- **Code Review / Warden Pass** — Final audit and report

## FILES CREATED

1. **`packages/server/src/approvalQueue.ts`** — In-memory approval queue with enqueue, resolve, listPending, timeout, auto-deny
2. **`packages/server/src/apiApprover.ts`** — Promise-based Approver that creates queue items
3. **`packages/server/src/routes/approvals.ts`** — GET /approvals + POST /approvals/:id/resolve
4. **`tmp/phase3c-smoke.mjs`** — 35-assertion smoke test
5. **`reports/phase-3c-http-approval-queue-report.md`** — This document

## FILES MODIFIED

1. **`packages/server/src/runtime.ts`** — Replaced ReadOnlyApprover with ApiApprover + ApprovalQueue. Now uses `activeTools` (all 9) instead of 5 read-only tools.
2. **`packages/server/src/server.ts`** — Added approvals route registration. Updated startup message to reflect Phase 3C mode.
3. **`packages/server/src/routes/status.ts`** — Added `approvalsEnabled: true`, `pendingApprovals` count, 9 active tools.

## APPROVAL QUEUE COMPONENTS

### ApprovalQueue (`approvalQueue.ts`)

In-memory queue that holds pending approval items. Key design:

- **enqueue:** Creates a pending item and returns `{item, promise}`. The promise resolves when the operator approves/denies or timeout fires.
- **resolve:** Operator calls to approve/deny. Clears timeout, resolves the promise.
- **timeout:** Default 5 minutes. Auto-denies with reason "Approval timed out (5 minutes)". Item status becomes `timed_out`.
- **listPending:** Returns all items with status `pending` (for GET /approvals). Strips internal `_resolve` function.
- **get:** Returns any item by ID (for POST /approvals/:id/resolve lookup).
- **pendingCount:** Count for /status endpoint.

No DB persistence — in-memory only. Resets on server restart. Acceptable for Phase 3C (local developer tool).

### ApiApprover (`apiApprover.ts`)

Implements the shared `Approver` interface. On `requestApproval()`:

1. Extracts `sessionId`/`runId` from the request context
2. Calls `queue.enqueue()` which creates a pending item
3. Returns the Promise — ReasonLoop's `await approvalGate.check()` naturally pauses until resolved
4. When operator calls POST /approvals/:id/resolve, the Promise resolves, ReasonLoop continues

This requires **zero core changes**. ReasonLoop's existing `await approvalGate.check(request)` already handles async pause/resume.

## ROUTES ADDED

| Route | Method | Purpose |
|-------|--------|---------|
| `/approvals` | GET | List pending approvals |
| `/approvals/:id/resolve` | POST | Approve or deny a pending request |

**GET /approvals response:**
```json
{"approvals":[{"id":"appr_...","toolName":"write_file","argsSummary":"...","riskLevel":"destructive","status":"pending","createdAt":"...","expiresAt":"..."}]}
```

**POST /approvals/:id/resolve:**
- Body: `{"approved": true, "reason": "Looks safe"}`
- Returns resolved approval item
- 404 if ID not found
- 400 if already resolved

## ACTIVE HTTP TOOL SURFACE

| # | Tool | Approval | Status |
|---|------|----------|--------|
| 1 | list_dir | No | Active |
| 2 | read_file | No | Active |
| 3 | search | No | Active |
| 4 | git_status | No | Active |
| 5 | git_diff | No | Active |
| 6 | write_file | **Yes** | Active |
| 7 | edit_file | **Yes** | Active |
| 8 | shell | **Yes** | Active |
| 9 | run_tests | **Yes** | Active |

Confirmed: `/GET tools` returns all 9, write_file/shell show `requiresApproval: true`, list_dir shows `requiresApproval: false`.

## SSE APPROVAL FLOW

```
POST /reply
  → EventStream subscribe
  → reasonLoop.run() starts
  → Provider emits tool_request (e.g., write_file)
    → SSE: event: tool_request → client sees request
  → ReasonLoop calls approvalGate.check()
    → ApiApprover.enqueue() → pending item in queue
    → ReasonLoop PAUSES (awaiting unresolved Promise)
  → Operator: GET /approvals → sees pending
  → Operator: POST /approvals/:id/resolve {approved:true}
    → Queue.resolve() → Promise resolves
  → ReasonLoop RESUMES
  → Tool dispatches
    → SSE: event: tool_result
  → Provider emits finish
    → SSE: event: finish → client sees completion
```

### Denial/Timeout

- **Denial:** POST /approvals/:id/resolve `{approved:false}` → ReasonLoop gets denied → returns controlled `tool_result` error → SSE emits error tool_result
- **Timeout:** 5 minutes → auto-deny → same denial flow

### Client Disconnect During Approval

- Client disconnects: SSE writer flags closed, stops writing
- Run continues waiting for approval (up to 5 minute timeout)
- After timeout: auto-deny, run completes, events persisted
- No server crash

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm build` | 7/7 packages → Done |
| `pnpm typecheck` | 7/7 packages → 0 errors |

## SMOKE TEST RESULT

**35/35 assertions PASS, 0 FAIL.**

| # | Test | Result |
|---|------|--------|
| 1 | GET /tools returns 9 tools | ✅ |
| 2 | All 9 tools present by name | ✅ |
| 3 | write_file requiresApproval=true | ✅ |
| 4 | shell requiresApproval=true | ✅ |
| 5 | list_dir requiresApproval=false | ✅ |
| 6 | GET /status shows 9 active tools | ✅ |
| 7 | approvalsEnabled=true | ✅ |
| 8 | Queue enqueue creates pending item | ✅ |
| 9 | Item has generated ID | ✅ |
| 10 | listPending shows 1 pending | ✅ |
| 11 | Queue resolve approved=true | ✅ |
| 12 | Promise resolves as approved | ✅ |
| 13 | Item status becomes "approved" | ✅ |
| 14 | listPending is 0 after resolve | ✅ |
| 15 | Queue deny: approved=false | ✅ |
| 16 | Queue deny: status becomes "denied" | ✅ |
| 17 | Queue timeout: 300ms timeout fires | ✅ |
| 18 | Timeout result: approved=false | ✅ |
| 19 | Timeout reason includes "timed" | ✅ |
| 20 | E2E: pending approval appears in queue | ✅ |
| 21 | E2E: tool_request emitted via SSE | ✅ |
| 22 | E2E: resolve approval | ✅ |
| 23 | E2E: run completes after approval | ✅ |
| 24 | E2E: file created by write_file | ✅ |
| 25 | E2E: tool_result emitted | ✅ |
| 26 | E2E: finish emitted | ✅ |
| 27 | E2E: report generated | ✅ |
| 28-29 | GET /approvals route exists | ✅ |
| 30 | POST /approvals/:id/resolve exists | ✅ |
| 31-35 | No MCP/swarm packages | ✅ |

## SECURITY CHECKS

| Check | Status |
|-------|--------|
| Local bind default | ✅ |
| No secrets in /status | ✅ |
| No secrets in /approvals (args summarized, capped) | ✅ |
| No raw stack traces | ✅ |
| Body cap (1MB) | ✅ |
| No wildcard CORS | ✅ |
| Shell still commandSafety-enforced | ✅ |
| Path traversal blocked | ✅ |
| Install commands blocked | ✅ |
| Timeout default-deny works | ✅ |
| Denial blocks mutation | ✅ |

## GIT BASELINE RESULT

```
 M packages/server/src/routes/status.ts
 M packages/server/src/runtime.ts
 M packages/server/src/server.ts
?? packages/server/src/apiApprover.ts
?? packages/server/src/approvalQueue.ts
?? packages/server/src/routes/approvals.ts
?? reports/phase-3c-http-approval-queue-report.md
?? tmp/phase3c-smoke.mjs
```

3 files modified, 5 files created. No auto-commit.

## SCOPE COMPLIANCE

- ✅ No MCP bridge
- ✅ No swarm runtime
- ✅ No UI or dashboard
- ✅ No OpenClaw/Hermes adapters
- ✅ No new provider implementations
- ✅ No new dependencies
- ✅ Server imports only shared, store, core, providers, tools
- ✅ No core imports server
- ✅ All existing package boundaries preserved

## DESIGN DECISIONS

### 1. In-Memory Queue (No DB Change)

**Decision:** ApprovalQueue uses `Map` in memory. Resets on server restart.

**Rationale:** No store migration needed. Phase 3C is a local developer tool. Pending approvals are ephemeral — if the server restarts, the operator can re-run. DB persistence adds complexity with no Phase 3C benefit.

### 2. Promise-Based Approver (Zero Core Changes)

**Decision:** ApiApprover returns an unresolved Promise from `requestApproval()`. ReasonLoop's existing `await approvalGate.check()` naturally pauses until the Promise resolves.

**Rationale:** This is the cleanest integration possible. The async approval pattern emerges from the existing architecture without needing refactoring. ReasonLoop already supports async approval via the Approver interface.

### 3. 5-Minute Approval Timeout

**Decision:** Pending approvals auto-deny after 5 minutes.

**Rationale:** Prevents indefinite hangs. Gives operator time to review the request. 5 minutes is short enough to prevent denial-of-service and long enough for human decision-making.

### 4. Args Summary / Redaction

**Decision:** Args are summarized to ≤120 characters in the approval item. JSON objects are stringified and truncated.

**Rationale:** Prevents huge payloads in GET /approvals. Operator can see the gist (file path, command) without the full content. Security: no secrets exposed.

### 5. Client Disconnect During Approval

**Decision:** Run continues waiting for approval/timeout even if SSE client disconnects. Events are persisted to store.

**Rationale:** Cancellation infrastructure doesn't exist in Phase 3C. The run completing naturally (via approval or timeout) is the safest behavior. Operator can reconnect and fetch events.

## BLOCKERS

**None.**

Phase 3C delivers:
- ✅ ApiApprover with Promise-based async approval
- ✅ In-memory ApprovalQueue with timeout/auto-deny
- ✅ GET /approvals + POST /approvals/:id/resolve
- ✅ All 9 tools over HTTP (5 read-only + 4 gated)
- ✅ SSE streams live through approval flow
- ✅ Zero core changes required
- ✅ 35/35 smoke tests PASS
- ✅ Build/typecheck clean

## NEXT STEP

### Recommended: Phase 3D — CLI tripp chat + Polish

Phase 3 server is feature-complete: HTTP server, SSE streaming, approval queue, all 9 tools.

**Phase 3D scope:**
- `tripp chat` CLI command (connects to local server)
- Interactive terminal session with SSE streaming
- Terminal-based approval prompts
- Final polish and edge case handling
