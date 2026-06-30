# Phase 1C Core Primitives Report

## PHASE
Phase 1C — Core Primitives / RunManager / EventStream / Report Generator

## STATUS
**PASS** ✅

## MODEL TIERS USED
- **Heavy Technical Thinking** — orchestration boundaries, event ordering strategy, ApprovalGate risk routing, persist-before-emit architecture, report lifecycle design
- **Fast Technical Builder** — file creation, implementation, build/validation execution
- **Code Review / Warden Pass** — pre-submission scope compliance, dependency direction check, forbidden pattern scan

---

## EXECUTIVE SUMMARY
Built the core runtime spine for Tripp.Reason: 10 source files implementing EventStream (in-process pub/sub), ApprovalGate (risk-based approval routing), RunManager (session/run lifecycle), ReportGenerator (Markdown + store record), and supporting utilities. All components are provider-agnostic, tool-agnostic, and import only from `@tripp-reason/shared` and `@tripp-reason/store`.

**Full lifecycle smoke test passed**: session → run → messages → events → complete → report file written to disk → report record persisted.

**TypeScript compilation**: 0 errors across all 3 packages (shared, store, core).

---

## FILES CREATED

### Package Configuration (2 files)
1. **`packages/core/package.json`** — 18 lines, deps: `@tripp-reason/shared` + `@tripp-reason/store`
2. **`packages/core/tsconfig.json`** — 12 lines, extends base, references shared + store

### Source Files (8 files)
3. **`packages/core/src/ids.ts`** — 17 lines, `createId(prefix?)` using `crypto.randomUUID()`
4. **`packages/core/src/time.ts`** — 12 lines, `nowIso()` returning ISO 8601 datetime
5. **`packages/core/src/errors.ts`** — 46 lines, 4 error classes: TrippCoreError, ApprovalDeniedError, RunFailedError, ReportGenerationError
6. **`packages/core/src/eventStream.ts`** — 54 lines, `createEventStream()` factory with subscribe/emit/subscriberCount
7. **`packages/core/src/approvalGate.ts`** — 65 lines, `createApprovalGate(options)` with risk-level routing
8. **`packages/core/src/reportGenerator.ts`** — 176 lines, `generateReport(repos, runId, workdir)` + Markdown renderer
9. **`packages/core/src/runManager.ts`** — 160 lines, `createRunManager(options)` factory with full lifecycle
10. **`packages/core/src/index.ts`** — 42 lines, barrel exports for all factories, types, errors, and utilities

### Report (1 file)
11. **`reports/phase-1c-core-primitives-report.md`** — This document

---

## FILES MODIFIED

### None
No existing files were modified. `pnpm-lock.yaml` was regenerated automatically by `pnpm install` (core added as workspace member).

---

## CORE COMPONENTS CREATED

### 1. EventStream (`createEventStream`)
In-process typed event pub/sub. Synchronous, order-preserving.
- `subscribe(fn)` → returns unsubscribe function
- `emit(event: StreamEvent)` → fires to all subscribers
- `subscriberCount()` → diagnostics
- **NOT HTTP/SSE** — internal only (HTTP/SSE belongs to Phase 3)

**Key decision**: Subscriber errors are caught and logged, don't break the stream. Phase 2+ can route these to a structured error channel.

### 2. ApprovalGate (`createApprovalGate`)
Risk-level classified approval routing.
- `check(request: ApprovalRequest)` → `Promise<ApprovalResult>`
- `riskLevel: "safe"` → auto-approved (no approver call, zero overhead)
- `riskLevel: "mutating"` or `"destructive"` → routes to Approver
- Optional `throwOnDenial` (default: true) throws ApprovalDeniedError on denial

**Key decision**: ApprovalGate does NOT persist approval records — RunManager handles persistence. Gate only returns the approval result for the caller to act on.

### 3. RunManager (`createRunManager`)
Minimal run lifecycle manager. NOT the full ReasonLoop.
- `createSession(opts)` → creates session via store
- `startRun(sessionId)` → creates run with "running" status
- `recordMessage(runId, role, content)` → persists message via store
- `recordEvent(runId, streamEvent)` → **persist-before-emit**: stores event THEN fires EventStream
- `completeRun(runId, status)` → marks complete, auto-generates report
- `generateReport(runId)` → standalone report generation

**Key decision**: Persist-before-emit ensures no event is lost. If EventStream subscriber crashes, the event is already in the store.

### 4. ReportGenerator (`generateReport`)
Markdown report from stored data. No LLM calls.
- Queries store for run, session, messages, events, tool calls
- Builds RunReport data structure
- Renders Markdown (status, prompt, model, duration, events, tool calls, files changed, validation, next step)
- Writes file to `reports/<session-id>/<run-id>.md`
- Creates ReportRecord via store
- Returns RunReport

**Key decision**: Validation section is a placeholder ("Pending CLI Validation"). CLI runs actual validation commands in Phase 2+.

### 5. Errors
- `TrippCoreError` — base error class
- `ApprovalDeniedError` — thrown when approval denied (carries toolName + reason)
- `RunFailedError` — thrown on run lifecycle failures (carries runId)
- `ReportGenerationError` — thrown on report write failures (carries runId)

### 6. Utilities
- `createId(prefix?)` — generates `${prefix}_${crypto.randomUUID()}` or bare UUID
- `nowIso()` — returns `new Date().toISOString()`

**Key decision**: Used Node.js built-in `crypto.randomUUID()` (Node 19+). No external UUID dependency.

---

## VALIDATION RESULT

### TypeScript Compilation
```bash
$ pnpm typecheck
packages/shared typecheck: Done (0 errors)
packages/store typecheck: Done (0 errors)
packages/core typecheck: Done (0 errors)
```

### Build
```bash
$ pnpm build
packages/shared build: Done
packages/store build: Done
packages/core build: Done
```

### Scope Compliance
- ✅ No `packages/providers/` directory
- ✅ No `packages/tools/` directory
- ✅ No `packages/server/` directory
- ✅ No `packages/cli/` directory
- ✅ No `packages/mcp/` directory
- ✅ No `packages/swarm/` directory
- ✅ Only `packages/shared/`, `packages/store/`, `packages/core/` exist

### Dependency Direction
- ✅ `packages/shared/` imports only `zod` (no internal packages)
- ✅ `packages/store/` imports only `@tripp-reason/shared`
- ✅ `packages/core/` imports only `@tripp-reason/shared` and `@tripp-reason/store`

### Forbidden Pattern Scan
- ✅ No Goose code or branding
- ✅ No provider implementation code
- ✅ No tool execution code
- ✅ No CLI commands
- ✅ No HTTP server code
- ✅ No MCP server code
- ✅ No swarm coordination code

---

## SMOKE TEST RESULT

### In-Memory Full Lifecycle Test (10 operations)
| # | Operation | Result |
|---|-----------|--------|
| 1 | Store init (in-memory SQLite) | ✅ Pass |
| 2 | EventStream create (subscriber attached) | ✅ Pass |
| 3 | ApprovalGate safe→auto-approved | ✅ Pass |
| 4 | ApprovalGate mutating→mock-approved | ✅ Pass |
| 5 | RunManager created | ✅ Pass |
| 6 | Session created (sess_xxx) | ✅ Pass |
| 7 | Run started (run_xxx, status=running) | ✅ Pass |
| 8 | 2 messages recorded | ✅ Pass |
| 9 | 3 events recorded + 3 emitted to stream | ✅ Pass |
| 10 | Run completed, report generated | ✅ Pass |

### Report File Verification
- Report path: `reports/sess_.../run_....md`
- File written: **38 lines** of structured Markdown
- Contains: STATUS, SESSION, PROMPT, DURATION, EVENTS, TOOL CALLS, FILES CHANGED, VALIDATION, NEXT STEP
- ReportRecord persisted to store: **PASS**

---

## SCOPE COMPLIANCE

| Constraint | Status |
|------------|--------|
| No provider implementation | ✅ Pass |
| No tool implementation | ✅ Pass |
| No CLI implementation | ✅ Pass |
| No server implementation | ✅ Pass |
| No MCP implementation | ✅ Pass |
| No swarm implementation | ✅ Pass |
| No UI implementation | ✅ Pass |
| No Goose code copied | ✅ Pass |
| Core imports only shared + store | ✅ Pass |
| Shared remains dependency-leaf | ✅ Pass |
| Store imports shared only | ✅ Pass |

---

## DESIGN DECISIONS

### 1. Event Ordering: Synchronous Pub/Sub
**Choice**: EventStream.emit() is synchronous — subscribers receive events immediately.

**Rationale**:
- Preserves insertion order (events arrive in the same order they were persisted)
- No async queue complexity
- Subscribers must not block (documented as contract)
- Phase 2+ can add async buffering if needed

**Trade-off**: Slow subscribers block the emit loop (acceptable for Phase 1 single-session use)

### 2. Persist-Before-Emit
**Choice**: RunManager.recordEvent() writes to store FIRST, then emits to EventStream.

**Rationale**:
- If EventStream subscriber crashes, event is already in the store
- No event loss on subscriber failure
- Store is the source of truth; EventStream is a notification channel
- Matches architecture: "persist-before-emit" per ARCHITECTURE.md

**Trade-off**: Slightly higher latency (SQLite write + subscriber callback)

### 3. ApprovalGate Does Not Persist
**Choice**: ApprovalGate returns ApprovalResult only; RunManager handles persistence.

**Rationale**:
- Separation of concerns: gate = routing, manager = lifecycle
- Gate stays pure (no store dependency)
- RunManager can decide what to persist (approval record + tool call status)
- Future CLI/Server implementations may add logging/metrics at the manager level

**Trade-off**: Callers must persist approval records manually if needed

### 4. Report File Path: Relative + Absolute
**Choice**: ReportRecord stores relative path (`reports/<session>/<run>.md`); ReportGenerator resolves absolute path via `workdir` parameter.

**Rationale**:
- Relative paths are portable (work across machines)
- Absolute paths are needed for `writeFileSync`
- `workdir` defaults to `process.cwd()` for CLI, overridden for tests
- Store's `reportPath()` helper provides the relative path computation

### 5. ID Generation: crypto.randomUUID() with Prefix
**Choice**: `createId(prefix?)` returns `${prefix}_${uuid}` or bare UUID.

**Rationale**:
- Node.js 19+ has `crypto.randomUUID()` globally — no external dependency
- Prefix makes IDs human-readable in logs (`sess_xxx`, `run_xxx`, `msg_xxx`)
- UUID v4 is collision-resistant (128 bits entropy)
- Future: Could swap to UUIDv7 (time-sortable) if ordering matters

**Trade-off**: UUIDv4 is not time-sortable (acceptable for Phase 1)

### 6. Timestamp Format: ISO 8601 via nowIso()
**Choice**: All timestamps are ISO 8601 datetime strings from `new Date().toISOString()`.

**Rationale**:
- Matches shared Zod schemas (`z.string().datetime()`)
- Portable across SQLite implementations
- No implicit defaults (explicit is better per doctrine)
- Easy to query/sort as strings (lexicographic order = chronological)

**Trade-off**: No timezone info (all UTC, documented)

### 7. Report Generation: Pure Function Over Store
**Choice**: `generateReport()` is a pure function that queries store, renders Markdown, writes file, persists record.

**Rationale**:
- No LLM calls (reports are deterministic summaries of stored data)
- Can be called standalone or triggered by RunManager
- Testable in isolation (inject mock repos)
- Markdown rendering is a separate internal function (easy to extend)

**Trade-off**: No AI-generated summaries in reports (acceptable for Phase 1; Phase 2+ can add)

### 8. Error Handling: Typed Error Classes
**Choice**: 4 error classes extending TrippCoreError, each carrying contextual data (runId, toolName, etc.).

**Rationale**:
- `instanceof` checks for typed error handling
- Contextual data avoids string parsing
- Base class (TrippCoreError) allows broad catches
- Minimal taxonomy (4 classes, not 20) keeps it lean

**Trade-off**: Not all errors are typed (generic errors use base class)

---

## BLOCKERS
**None.**

---

## NEXT STEP

### Recommended: Phase 1D — ReasonLoop
**Preconditions** (all met):
- ✅ `packages/shared/` complete (Phase 1A PASS)
- ✅ `packages/store/` complete (Phase 1B PASS)
- ✅ `packages/core/` complete (Phase 1C PASS)
- ✅ Doctrine compliance verified
- ✅ Zero type errors

**Phase 1D Goals**:
1. Create `packages/providers/openai-compatible/` with Ollama Cloud adapter
2. Implement ReasonLoop: prompt → provider.stream() → process events → tool dispatch → finish
3. Wire RunManager to ReasonLoop (lifecycle integration)
4. Add ModelRouter stub (select provider by model name)

**Model Tier Recommendation**:
- **Heavy Technical Thinking** — streaming contract, async iterable processing, error recovery strategy
- **Fast Technical Builder** — file scaffolding, provider adapter implementation, loop wiring
- **Code Review** — scope guardrails, boundary validation

**Estimated Scope**: ~600-800 lines across 8-10 files (provider adapter, ReasonLoop, model router, error handling)

---

## ADDITIONAL NOTES

### Lessons Learned
1. **Persist-before-emit is non-obvious**: Without this discipline, subscribers can miss events on crash. Store-first guarantees durability.
2. **ApprovalGate purity simplifies testing**: By not persisting, the gate stays a pure function over risk levels. Easy to mock.
3. **Report generation is surprisingly complex**: Querying 5 tables, aggregating events, rendering Markdown, writing files, persisting records — each step has failure modes. Breaking it into helpers (summarizeArgs, extractFilesChanged, renderMarkdown) keeps it manageable.
4. **crypto.randomUUID() is sufficient**: No need for UUIDv7 or nanoid at this scale. Node's built-in is collision-resistant and zero-dependency.

### For Future Sessions
- EventStream subscriber errors are logged but not surfaced to the caller. If Phase 2+ needs error channels, add a second subscriber type (error subscribers).
- Report validation section is a placeholder. CLI will populate it with actual validation command output in Phase 2+.
- ApprovalGate's `throwOnDenial` flag could be extended to support custom error types if needed.
- ReportGenerator's `extractFilesChanged()` is a heuristic (looks for `result.path` or `result.file`). Phase 2+ could parse tool call arguments more intelligently.

---

**Report Generated**: 2026-06-02T04:27:00Z  
**Author**: Cyony (Hermes Agent)  
**Review Status**: Pending (Eddie + Tripp)
