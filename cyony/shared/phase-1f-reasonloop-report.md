# Phase 1F ReasonLoop Integration Report

## PHASE
Phase 1F — ReasonLoop Integration

## STATUS
**PASS** ✅

## MODEL TIERS USED
- **Heavy Technical Thinking** — streaming integration, lifecycle boundaries, approval flow, provider/tool orchestration, and failure handling
- **Fast Technical Builder** — file creation, implementation, smoke test execution
- **Code Review / Warden Pass** — pre-submission scope compliance, dependency direction verification, forbidden pattern scan

---

## EXECUTIVE SUMMARY
Implemented the first real ReasonLoop inside `packages/core`, wiring together all previously built packages into a functioning runtime orchestration layer. The ReasonLoop manages the complete prompt-to-report flow: session/run lifecycle via RunManager, provider streaming via ProviderAdapter, tool dispatch via ToolDispatcher, approval gating via ApprovalGate, event persistence via persist-before-emit, and report generation.

**Critical architectural invariants preserved:**
- **ReasonLoop owns finish event emission** — providers emit message/error only; ReasonLoop emits finish with the actual runId
- **Provider/tool-agnostic** — core imports shared interfaces only, NOT concrete provider or tool packages
- **Approval-before-dispatch** — ReasonLoop checks ApprovalGate before ToolDispatcher for gated tools
- **Accumulated assistant message** — provider chunks are recorded as events, full text persisted as ONE message

**4/4 smoke tests passed** with fake injected dependencies: basic streaming flow, safe tool dispatch, approval flow with gated tool, and finish event ownership verification.

**TypeScript compilation**: 0 errors across all 5 packages (shared, store, core, providers, tools).

---

## FILES CREATED

### Source Files (1 file)
1. **`packages/core/src/reasonLoop.ts`** — 357 lines, `createReasonLoop(options)` factory, `run(input)` method, `handleToolRequest()` internal helper, full lifecycle orchestration

### Report (1 file)
2. **`reports/phase-1f-reasonloop-report.md`** — This document

---

## FILES MODIFIED

### Modified Files (1 file)
1. **`packages/core/src/index.ts`** — Added `createReasonLoop` export + `ReasonLoop`, `ReasonLoopOptions`, `ReasonLoopInput`, `ReasonLoopResult` type exports

---

## REASONLOOP COMPONENTS CREATED

### 1. `createReasonLoop(options): ReasonLoop`
Factory function that creates a configured ReasonLoop instance.

**Options:**
- `provider: ProviderAdapter` — the provider to stream from
- `runManager: RunManager` — lifecycle orchestrator
- `toolDispatcher?: ToolDispatcher` — optional tool routing
- `approvalGate?: ApprovalGate` — optional approval wrapping
- `model: string` — default model name
- `providerName?: string` — provider name for metadata

### 2. `run(input: ReasonLoopInput): Promise<ReasonLoopResult>`
The main orchestration method. Executes the full prompt-to-report flow.

**Input:**
- `prompt: string` — user prompt
- `sessionId?: string` — existing session to continue
- `title?: string` — session title
- `model?: string` — override model
- `provider?: string` — override provider name
- `workdir?: string` — working directory for tools

**Flow:**
1. Get or create session
2. Start run
3. Record user message
4. Build ProviderRequest with prompt + tool schemas
5. Stream from provider via `for await (const event of provider.stream(request))`
6. Process each StreamEvent:
   - `message` → accumulate assistant text
   - `tool_request` → approval gate check → dispatch → record tool_result event
   - `error` → record, mark failed if unrecoverable
   - `finish`/`tool_result` → defensive pass-through (shouldn't happen)
7. Record full accumulated assistant message (one message, not one per chunk)
8. Emit finish event with real runId
9. Complete run (triggers auto-report generation)
10. Return `ReasonLoopResult`

### 3. `handleToolRequest()` (internal)
Handles tool_request events with the full approval-before-dispatch flow:
- No dispatcher → controlled error result (recorded as event)
- Unknown tool → controlled error result (recorded as event)
- `requiresApproval && approvalGate` → `approvalGate.check()` → dispatch if approved
- ApprovalDeniedError caught → denied result (recorded as event)
- Successful dispatch → result recorded as tool_result event

---

## VALIDATION RESULT

### TypeScript Compilation
```
$ pnpm typecheck
packages/shared typecheck: Done (0 errors)
packages/store typecheck: Done (0 errors)
packages/core typecheck: Done (0 errors)
packages/providers typecheck: Done (0 errors)
packages/tools typecheck: Done (0 errors)
```

### Build
```
$ pnpm build
packages/shared build: Done
packages/store build: Done
packages/core build: Done
packages/providers build: Done
packages/tools build: Done
```

### Scope Compliance
- ✅ No `packages/cli/` directory
- ✅ No `packages/server/` directory
- ✅ No `packages/mcp/` directory
- ✅ No `packages/swarm/` directory
- ✅ Only `shared`, `store`, `core`, `providers`, `tools` exist

### Dependency Direction
- ✅ `shared` imports no internal packages
- ✅ `store` imports shared only
- ✅ `providers` imports shared only
- ✅ `tools` imports shared only
- ✅ `core` imports **shared only** (via shared interfaces — no concrete providers or tools)

### Forbidden Pattern Scan
- ✅ No Goose code or branding
- ✅ No CLI commands
- ✅ No HTTP server code
- ✅ No MCP server code
- ✅ No swarm coordination code
- ✅ No direct imports of `OpenAICompatibleProvider`, `ModelRouter`, `listDirTool`, etc.
- ✅ No mutating tool execution (gated tools remain contract-only)

---

## SMOKE TEST RESULT

### In-Memory Lifecycle Tests (4 scenarios)

| # | Test | Result |
|---|------|--------|
| 1 | **Basic flow** — session created, run started, 2 message chunks accumulated → "Hello world!", finish emitted, run completed | ✅ Pass |
| 2 | **Tool request** — provider emits tool_request for `list_dir`, dispatcher returns success, tool_result event recorded | ✅ Pass |
| 3 | **Approval flow** — provider emits tool_request for `write_file` (requiresApproval: true), ApprovalGate approves via mock approver, tool dispatched, tool_result recorded | ✅ Pass |
| 4 | **Finish event ownership** — ReasonLoop emits finish event with correct runId, NOT from mock provider | ✅ Pass |

**All 4 tests passed. Temp workdir cleaned up.**

---

## SCOPE COMPLIANCE

| Constraint | Status |
|------------|--------|
| No CLI implementation | ✅ Pass |
| No server implementation | ✅ Pass |
| No MCP implementation | ✅ Pass |
| No swarm implementation | ✅ Pass |
| No UI implementation | ✅ Pass |
| No new provider implementations | ✅ Pass |
| No new tool implementations | ✅ Pass |
| No mutating tool execution | ✅ Pass (gated tools remain contract-only) |
| No Goose code copied | ✅ Pass |
| Core does not import concrete providers/tools | ✅ Pass |

---

## DESIGN DECISIONS

### 1. Assistant Message Accumulation Strategy
**Choice**: Record each provider message chunk as an event (for streaming history), accumulate text in memory, then persist ONE assistant message with the full accumulated text at the end.

**Rationale**:
- Events preserve the streaming timeline (every chunk is an event with timestamp)
- Messages table stores complete conversational content (not fragmented chunks)
- Avoids flooding the database with hundreds of tiny message rows per stream
- Full text is available for report generation and future context windowing

**Alternative considered**: One message per chunk (rejected — too many rows, fragments content, complicates report generation)

### 2. Finish Event Ownership — ReasonLoop Emits Finish
**Choice**: ReasonLoop explicitly creates and records `{ type: "finish", reason, runId }` after the provider stream ends. Provider finish events (if received) are ignored.

**Rationale**:
- Only ReasonLoop knows the real `runId`
- Provider can't fake a runId without creating phantom lifecycle events
- Finish event ties the streaming session to the persisted run record
- Defensive handling: if provider emits finish (it shouldn't), it's silently ignored

**Code evidence** (`reasonLoop.ts:256-262`):
```ts
const finishEvent: StreamEvent = {
  type: "finish",
  reason: finishReason,
  runId,
};
```

### 3. Approval-Before-Dispatch Sequence
**Choice**: ReasonLoop checks `tool.requiresApproval || event.requiresApproval` first. If true AND an approvalGate is configured, calls `approvalGate.check()` BEFORE `toolDispatcher.dispatch()`. If denied, records error tool_result and skips dispatch.

**Rationale**:
- ApprovalGate wraps the Approver (baked in at creation)
- Gate is a pure routing function — ReasonLoop orchestrates the sequence
- Denied tools never reach the dispatcher (defense in depth)
- ApprovalDeniedError from gate (throwOnDenial=true default) is caught and converted to a controlled tool_result error

**Code evidence** (`reasonLoop.ts:323-340`):
```ts
if ((tool.requiresApproval || requiresApproval) && approvalGate) {
  const approvalResult = await approvalGate.check({ ... });
  if (!approvalResult.approved) {
    // Record denied result, return
  }
}
// Dispatch tool
```

### 4. Tool Request Handling — Controlled Errors for Missing Tools
**Choice**: When a tool_request is received:
1. No dispatcher → record `tool_result { status: "error", error: "No tool dispatcher" }`
2. Unknown tool → record `tool_result { status: "error", error: "Unknown tool" }`
3. No errors thrown — all failures become tracked tool_result events

**Rationale**:
- Provider can request any tool (including ones not registered)
- Run continues even if a tool is unavailable
- Every tool attempt is recorded as an event (full audit trail)
- Run status is determined by provider messages and errors, not tool failures

### 5. Error Handling — Non-Fatal Persistence Failures
**Choice**: Message and event recording failures are caught and logged but don't abort the run. Only `startRun()` and `completeRun()` failures throw.

**Rationale**:
- Run already exists by the time we're recording events
- Persistence failures during the stream shouldn't lose the accumulated response
- Run completion is the critical path — that's where we throw on failure
- RunManager.completeRun() still auto-generates the report

**Trade-off**: Some events may be lost if persistence fails mid-stream. EventStream subscribers catch individual errors but don't retry.

### 6. ProviderRequest Tool Schema Passthrough
**Choice**: Tool schemas are passed as `{ name, description, parameters: {} }` — simplified for Phase 1F.

**Rationale**:
- Phase 1F focuses on wiring, not full function-calling protocol
- The dispatcher validates tool input via Zod schemas at execution time
- Future phases can populate `parameters` with full JSON Schema from Zod schemas
- The `tools` field in ProviderRequest is optional — graceful degradation

### 7. Report Path Not Returned Directly
**Choice**: `ReasonLoopResult.reportPath` is `undefined` in Phase 1F. The report is generated by RunManager.completeRun() but the path isn't threaded back through the result.

**Rationale**:
- RunManager.completeRun() calls generateReport() internally but doesn't return the path
- Adding it would require modifying RunManager (out of scope unless required)
- Caller can query the store for the report record after completion
- Phase 1G+ can thread this through if needed

---

## BLOCKERS
**None.**

Phase 1A-1F form a complete, working core runtime. The only external dependency is a live provider (Ollama Cloud quota was exhausted earlier — adapter is ready, just needs quota refresh).

---

## NEXT STEP

### Recommended: Phase 1G — CLI Package
**Preconditions** (all met):
- ✅ `packages/shared/` complete (Phase 1A)
- ✅ `packages/store/` complete (Phase 1B)
- ✅ `packages/core/` complete (Phase 1C)
- ✅ `packages/providers/` complete (Phase 1D)
- ✅ `packages/tools/` complete (Phase 1E)
- ✅ `packages/core/ReasonLoop` complete (Phase 1F)
- ✅ Doctrine compliance verified

**Phase 1G Goals**:
1. Create `packages/cli/` with entry point (`tripp` command)
2. Wire `tripp run <prompt>` → ReasonLoop
3. Implement `CliApprover` (Approver via terminal prompt)
4. Implement `CliEventSubscriber` (print events to terminal)
5. Add `package.json` bin script

**Estimated Scope**: ~300-400 lines across 4-5 files

---

## ADDITIONAL NOTES

### Architecture Summary (Post-Phase 1F)
```
packages/shared     → contracts, schemas, types (leaf)
packages/store      → SQLite/Drizzle persistence (shared only)
packages/core       → RunManager + ApprovalGate + EventStream +
                      ReportGenerator + ReasonLoop (shared + store only)
packages/providers  → OpenAICompatibleProvider + ModelRouter (shared only)
packages/tools      → list_dir + read_file + search + gated contracts +
                      ToolDispatcher (shared only)
```

**Core does NOT import providers or tools.** All dependencies flow inward via interfaces. Concrete instances are injected by future CLI/server code.

### Complete Dependency Graph
```
shared  ←──── store  ←──── core  (RunManager, ReasonLoop)
                ↑              ↑
  providers ────┘   tools ─────┘
    (shared only)     (shared only)
```

### What Tripp.Reason Is (Post-Phase 1F)
A **lean, local-first, provider-agnostic runtime** for:
- Running LLM-driven tasks with full audit trails
- Tool-augmented code generation with approval gates
- Session persistence and report generation
- Streaming responses with event replay

### What Tripp.Reason Is NOT
- Not a Goose fork or rebranding
- Not a full IDE plugin or editor
- Not a web dashboard (yet — Phase 3+)
- Not a multi-agent swarm coordinator (yet — Phase 4+)
- Not a cloud service

---

**Report Generated**: 2026-06-02T05:32:00Z
**Author**: Cyony (Hermes Agent)
**Review Status**: Pending (Eddie + Tripp)
