# Phase 1B + 1C Execution Reference

Real-world execution of Phases 1B (Store) and 1C (Core Primitives) for Tripp.Reason, 2026-06-02.

## Phase 1B — Store Package (SQLite + Drizzle)

### Files Created
- `packages/store/package.json` — deps: better-sqlite3, drizzle-orm
- `packages/store/tsconfig.json` — extends base, references shared
- `packages/store/src/schema.ts` — 7 Drizzle tables (sessions, runs, messages, events, tool_calls, approvals, reports)
- `packages/store/src/db.ts` — `initSqliteStore(filePath)` with PRAGMA foreign_keys=ON, WAL mode, idempotent DDL
- `packages/store/src/repositories.ts` — 21 repo functions via `createRepositories(db)` factory
- `packages/store/src/reportPaths.ts` — `reportPath(sessionId, runId)` returns `reports/<session>/<run>.md`
- `packages/store/src/index.ts` — barrel exports

### Key Design Decisions
- **Snake_case column names** match shared contract shapes exactly — eliminates mapper layer
- **Repository factory pattern**: `createRepositories(db)` returns all 21 functions bound to one db instance
- **Missing records return null** (not error), `listXxx` returns empty arrays
- **IDs: caller-provided** (store is dumb, core generates)
- **JSON serialization at boundary**: store accepts JS objects, serializes to TEXT for SQLite

### Drizzle Insert Type Issue (resolved)
Drizzle 0.38's `$inferInsert` doesn't include nullable columns unless explicitly marked. Zod contracts use `string | undefined` while Drizzle expects `string | null`. Resolution: `as any` cast on insert values with Zod validating at the boundary. See SKILL.md "Drizzle 0.38 SQLite Nullable Quirk" for details.

### Smoke Test Pattern
12 operations against `:memory:` SQLite: create + query for all entities. All passed including FK constraints.

---

## Phase 1C — Core Primitives

### Files Created (8 source files)
- `packages/core/package.json` — deps: @tripp-reason/shared, @tripp-reason/store
- `packages/core/tsconfig.json` — extends base, references shared + store
- `packages/core/src/ids.ts` — `createId(prefix?)` using `crypto.randomUUID()` (no external UUID dep)
- `packages/core/src/time.ts` — `nowIso()` returning ISO 8601
- `packages/core/src/errors.ts` — 4 classes: TrippCoreError, ApprovalDeniedError, RunFailedError, ReportGenerationError
- `packages/core/src/eventStream.ts` — `createEventStream()` — in-process pub/sub, sync emit, order-preserving
- `packages/core/src/approvalGate.ts` — `createApprovalGate(options)` — safe=auto, mutating/destructive=routes to Approver
- `packages/core/src/reportGenerator.ts` — `generateReport(repos, runId, workdir)` — Markdown from store data + file write + DB record
- `packages/core/src/index.ts` — barrel exports

### Key Design Decisions

**Persist-before-emit** (critical):
Events are stored via repos FIRST, then emitted to EventStream. If a subscriber crashes, the event is already in the store. The store is the source of truth; EventStream is a notification channel.

**ApprovalGate does NOT persist**:
Returns ApprovalResult only. RunManager handles persistence. Separation of concerns: gate = routing, manager = lifecycle.

**RunManager is lifecycle only, NOT ReasonLoop**:
Manages session creation, run lifecycle, message/event recording, and report generation. The actual LLM streaming loop (prompt → provider → tool dispatch → finish) is Phase 1D. RunManager owns WHEN things happen; ReasonLoop owns WHAT happens per turn.

**Report generation is a pure function over store data**:
No LLM calls. Queries 5 tables, builds RunReport data structure, renders Markdown, writes file to disk, persists ReportRecord to store. Validation section is placeholder ("Pending CLI Validation").

**crypto.randomUUID() for IDs**:
Node.js 19+ built-in. Zero external dependency. Prefixed (`sess_`, `run_`, `msg_`, `evt_`, `rpt_`) for log readability.

### Smoke Test Execution Pattern
Full lifecycle: init store → EventStream → ApprovalGate → RunManager → session → run → messages → events → complete → report file written (38 lines of structured Markdown). 10/10 operations passed.

**Workspace package resolution pitfall**: `node smoke-test.mjs` can't resolve `@tripp-reason/store` unless run from the right directory. Solution: use relative dist imports (`../store/dist/index.js`) from within the package directory, NOT workspace package names.

---

## Phase Boundary Rules Enforced

After Phase 1C, the repo contains exactly:
```
packages/
├── shared/   (leaf, imports only zod)
├── store/    (imports shared only)
└── core/     (imports shared + store only)
```

No providers, tools, CLI, server, MCP, swarm, or UI packages exist.
Dependency direction is strict and verified by both manual inspection and `tsc --build`.
