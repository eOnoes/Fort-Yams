# Phase 1E Tools Package Report

## PHASE
Phase 1E — Tools Package / Read-Only Local Tools / ToolDispatcher

## STATUS
**PASS** ✅

## MODEL TIERS USED
- **Heavy Technical Thinking** — tool boundary design, workdir safety, path traversal prevention, dispatcher behavior
- **Fast Technical Builder** — file creation, implementation, smoke test execution
- **Code Review / Warden Pass** — pre-submission scope compliance, dependency direction check

---

## EXECUTIVE SUMMARY
Built the tools infrastructure layer for Tripp.Reason: 9 source files implementing 3 active read-only tools (`list_dir`, `read_file`, `search`), 3 gated contract-only tools (`write_file`, `edit_file`, `shell`), a `ToolDispatcher` for routing tool calls, and a `pathSafety` module for workdir boundary enforcement.

**All tools enforce workdir boundary and reject path traversal attempts.** Gated tools return controlled errors without executing. The dispatcher routes calls by name, validates input schemas, but does NOT check approval (that's ReasonLoop's job in Phase 1F).

**10/10 smoke tests passed**: list_dir (flat + recursive), read_file (content + truncation), search (text matching), path traversal blocked, gated contracts rejected, dispatcher routing, approval flags verified.

**TypeScript compilation**: 0 errors across all 5 packages (shared, store, core, providers, tools).

---

## FILES CREATED

### Package Configuration (2 files)
1. **`packages/tools/package.json`** — 20 lines, deps: `@tripp-reason/shared` + `zod` + `@types/node`
2. **`packages/tools/tsconfig.json`** — 12 lines, extends base, adds `"types": ["node"]`

### Source Files (7 files)
3. **`packages/tools/src/pathSafety.ts`** — 90 lines, `resolveSafePath()` + `shouldSkipDirectory()` with traversal prevention
4. **`packages/tools/src/errors.ts`** — 20 lines, `toolError()`, `pathError()`, `executionError()` helpers
5. **`packages/tools/src/listDir.ts`** — 117 lines, `listDirTool` with recursive listing, depth cap (max 3), skip dirs
6. **`packages/tools/src/readFile.ts`** — 105 lines, `readFileTool` with size limits (256KB default), truncation support
7. **`packages/tools/src/search.ts`** — 199 lines, `searchTool` with case-insensitive substring match, result cap (100), skip dirs
8. **`packages/tools/src/gatedContracts.ts`** — 86 lines, `writeFileTool`, `editFileTool`, `shellTool` — all return error, no execution
9. **`packages/tools/src/dispatcher.ts`** — 68 lines, `ToolDispatcherImpl` + `createDispatcher()` factory
10. **`packages/tools/src/index.ts`** — 27 lines, barrel exports for all tools, dispatcher, path safety, errors

### Report (1 file)
11. **`reports/phase-1e-tools-report.md`** — This document

---

## FILES MODIFIED

### None
No existing files were modified. `pnpm-lock.yaml` was regenerated automatically by `pnpm install`.

---

## TOOL COMPONENTS CREATED

### 1. Active Read-Only Tools

#### `list_dir` (requiresApproval: false)
Lists files and directories under a path.
- **Input**: `path?` (default "."), `recursive?` (default false), `maxDepth?` (default 1, max 3)
- **Output**: `{ path, entries: [{ name, path, type }] }`
- **Safety**: Workdir boundary enforced, path traversal blocked, skips node_modules/.git/dist/reports
- **Behavior**: Directories sorted first, then files, alphabetically

#### `read_file` (requiresApproval: false)
Reads UTF-8 text files with size limits and truncation.
- **Input**: `path` (required), `maxBytes?` (default 256KB, max 10MB)
- **Output**: `{ path, content, sizeBytes, truncated, bytesRead }`
- **Safety**: Workdir boundary enforced, rejects directories, caps file size
- **Behavior**: Returns `truncated: true` if file exceeds maxBytes

#### `search` (requiresApproval: false)
Searches for text in files under a path (case-insensitive substring).
- **Input**: `query` (required), `path?` (default "."), `maxResults?` (default 100, max 1000), `includeExtensions?` (optional filter)
- **Output**: `{ query, path, matches: [{ file, line, column, preview }], count, truncated }`
- **Safety**: Workdir boundary enforced, skips node_modules/.git/dist/reports, caps file size at 1MB
- **Behavior**: Returns 50 chars before/after match as preview

### 2. Gated Contract-Only Tools

#### `write_file` (requiresApproval: true)
**Contract only — not active in Phase 1.**
- Returns `{ status: "error", error: "write_file is a gated contract in Phase 1..." }`
- Does NOT write files
- Schema defines expected input shape for Phase 2

#### `edit_file` (requiresApproval: true)
**Contract only — not active in Phase 1.**
- Returns `{ status: "error", error: "edit_file is a gated contract in Phase 1..." }`
- Does NOT edit files
- Schema defines expected input shape for Phase 2

#### `shell` (requiresApproval: true)
**Contract only — not active in Phase 1.**
- Returns `{ status: "error", error: "shell is a gated contract in Phase 1..." }`
- Does NOT execute shell commands
- Schema defines expected input shape for Phase 2

### 3. ToolDispatcher
Routes tool calls by name, validates input, then executes.
- `register(tool)` — adds tool to dispatcher
- `listTools()` — returns all registered tools
- `dispatch(toolName, input, context)` — validates input schema, executes tool
- Returns controlled error for unknown tools
- **Does NOT check approval** — that's ReasonLoop's responsibility (Phase 1F)

### 4. Path Safety Module
- `resolveSafePath(requestedPath, workdir)` — resolves and validates paths against workdir
- `shouldSkipDirectory(name)` — returns true for node_modules, .git, dist, reports, .next, .cache

### 5. Error Helpers
- `toolError(message)` — returns `{ status: "error", output: null, error }`
- `pathError(path, reason)` — formats path errors
- `executionError(toolName, reason)` — formats execution errors

---

## ACTIVE TOOLS

| Tool | Requires Approval | Status |
|------|-------------------|--------|
| `list_dir` | No | ✅ Active |
| `read_file` | No | ✅ Active |
| `search` | No | ✅ Active |

---

## GATED CONTRACT-ONLY TOOLS

| Tool | Requires Approval | Status | Mutates/Executes? |
|------|-------------------|--------|-------------------|
| `write_file` | Yes | 🚫 Contract Only | ❌ No (returns error) |
| `edit_file` | Yes | 🚫 Contract Only | ❌ No (returns error) |
| `shell` | Yes | 🚫 Contract Only | ❌ No (returns error) |

**Design Choice**: Contract-only (not registered in active dispatcher).
- Gated tools are defined but NOT registered by `createDispatcher()`
- They return controlled errors if somehow called
- Schemas define expected input shape for future implementation
- Documented in report as "gated contracts"
- **Rationale**: Prevents accidental use before approval/execution logic is ready (Phase 2+)

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
- ✅ No `packages/server/` directory
- ✅ No `packages/cli/` directory
- ✅ No `packages/mcp/` directory
- ✅ No `packages/swarm/` directory
- ✅ Only `shared`, `store`, `core`, `providers`, `tools` exist

### Dependency Direction
- ✅ `shared` imports no internal packages
- ✅ `store` imports shared only
- ✅ `core` imports shared + store only
- ✅ `providers` imports shared only
- ✅ `tools` imports **shared only** (no core, no store, no providers)

---

## SMOKE TEST RESULT

### Local Temp Workdir Tests (10 operations)

| # | Test | Result |
|---|------|--------|
| 1 | `list_dir` (flat) — lists src, README.md | ✅ Pass |
| 2 | `list_dir` (recursive, depth 2) — traverses subdirs | ✅ Pass |
| 3 | `read_file` — reads README.md content | ✅ Pass |
| 4 | `read_file` (truncation) — truncates at 10 bytes | ✅ Pass |
| 5 | `search` — finds "hello" in helper.ts | ✅ Pass |
| 6 | Path traversal (`../../../etc/passwd`) — blocked | ✅ Pass |
| 7 | Gated contracts — all 3 return error | ✅ Pass |
| 8 | Dispatcher — routes list_dir correctly | ✅ Pass |
| 9 | Dispatcher — rejects unknown tools | ✅ Pass |
| 10 | Approval flags — all 6 tools marked correctly | ✅ Pass |

**All tests passed. Temp workdir cleaned up.**

---

## SCOPE COMPLIANCE

| Constraint | Status |
|------------|--------|
| No ReasonLoop implementation | ✅ Pass |
| No provider implementation beyond existing providers | ✅ Pass |
| No CLI implementation | ✅ Pass |
| No server implementation | ✅ Pass |
| No MCP implementation | ✅ Pass |
| No swarm implementation | ✅ Pass |
| No UI implementation | ✅ Pass |
| No mutating tool execution | ✅ Pass (gated tools return error) |
| No Goose code copied | ✅ Pass |
| Tools imports only shared | ✅ Pass |

---

## DESIGN DECISIONS

### 1. Workdir Boundary Enforcement
**Choice**: All tools resolve paths via `resolveSafePath(requestedPath, workdir)` before execution.

**Rationale**:
- Tools operate within `ToolContext.workdir` only
- Prevents accidental file access outside project scope
- Centralized safety check (one function to audit)
- Future: Can relax rules via ToolContext options (Phase 2+)

**Implementation** (`pathSafety.ts`):
```ts
const safeResult = resolveSafePath(path, context.workdir);
if (!safeResult.safe) {
  return pathError(path, safeResult.error);
}
```

### 2. Path Traversal Prevention
**Choice**: Reject paths containing `..` or absolute paths outside workdir.

**Prevention rules**:
- Relative paths: resolve against workdir, check for `..`
- Absolute paths: must start with workdir, no `..` allowed
- Cap path length at 4096 chars (DoS prevention)
- Final check: resolved path must start with workdir

**Test evidence** (smoke test #6): `../../../etc/passwd` blocked with "Path traversal detected".

### 3. Skip Directories During Traversal
**Choice**: `shouldSkipDirectory()` returns true for node_modules, .git, dist, reports, .next, .cache.

**Rationale**:
- `node_modules` — huge, not user code
- `.git` — internal VCS data
- `dist` — build artifacts
- `reports` — generated reports (not source)
- `.next` / `.cache` — framework artifacts

**Applied to**: `list_dir` (recursive) and `search` (all modes).

### 4. File Size Limits
**Choice**: `read_file` defaults to 256KB max, `search` caps at 1MB per file.

**Rationale**:
- Prevents OOM on large files
- Reasonable for most source code
- Truncation is explicit (not silent)
- Future: Can make configurable via ToolContext (Phase 2+)

**Implementation** (`readFile.ts`):
```ts
const DEFAULT_MAX_BYTES = 256 * 1024; // 256KB
const MAX_ALLOWED_BYTES = 10 * 1024 * 1024; // 10MB hard limit
```

### 5. Gated Contracts: Not Registered
**Choice**: `write_file`, `edit_file`, `shell` are defined but NOT registered in `createDispatcher()`.

**Rationale**:
- Prevents accidental use via dispatcher
- Clear separation: active (read-only) vs gated (mutating)
- Gated tools return controlled error if somehow called
- Schemas define expected input shape for future
- Documented as "contract-only" in report

**Alternative considered**: Register but throw error (rejected — dispatcher routing logic unnecessary overhead).

### 6. Dispatcher Does NOT Check Approval
**Choice**: `ToolDispatcher.dispatch()` validates input and executes, but does NOT check `requiresApproval`.

**Rationale**:
- Approval is ReasonLoop's responsibility (Phase 1F)
- ReasonLoop checks `tool.requiresApproval` before dispatch
- If approval needed, ReasonLoop calls `ApprovalGate.check()` first
- Dispatcher stays simple and focused on routing

**Architecture boundary preserved**: Dispatcher routes, ApprovalGate gates, ReasonLoop orchestrates.

### 7. Tool Context Flow
**Choice**: All tools receive `ToolContext` with `sessionId`, `runId`, `workdir`.

**Rationale**:
- Tools need workdir for path safety
- sessionId/runId enable future logging/telemetry
- Context passed explicitly (no global state)
- Future: Can add more context fields (Phase 2+)

**Implementation**:
```ts
interface ToolContext {
  sessionId: string;
  runId: string;
  workdir: string;
}
```

### 8. Search: Case-Insensitive Substring
**Choice**: `search` uses `line.toLowerCase().indexOf(queryLower)` for matching.

**Rationale**:
- Simple, predictable behavior
- No regex complexity (security)
- Fast enough for Phase 1
- Future: Can add regex mode via option (Phase 2+)

**Alternative considered**: `String.prototype.includes()` (rejected — not available in ES5 target).

### 9. Recursive Depth Cap
**Choice**: `list_dir` caps `maxDepth` at 3 levels.

**Rationale**:
- Prevents runaway recursion
- 3 levels is sufficient for most project structures
- User can request specific depth (1-3)
- Default is 1 (flat listing)

**Implementation** (`listDir.ts`):
```ts
maxDepth: z.number().int().min(1).max(3).optional().default(1)
```

### 10. Error Handling: Controlled ToolResult
**Choice**: Tools return `{ status: "error", error: "..." }` instead of throwing exceptions.

**Rationale**:
- Controlled error responses
- No stack trace leakage
- Easier to handle in ReasonLoop
- Consistent with `ToolResult` type from shared

**Implementation**:
```ts
if (!safeResult.safe) {
  return pathError(path, safeResult.error);
}
```

---

## BLOCKERS
**None.**

---

## NEXT STEP

### Recommended: Phase 1F — ReasonLoop Integration
**Preconditions** (all met):
- ✅ `packages/shared/` complete (Phase 1A)
- ✅ `packages/store/` complete (Phase 1B)
- ✅ `packages/core/` complete (Phase 1C)
- ✅ `packages/providers/` complete (Phase 1D)
- ✅ `packages/tools/` complete (Phase 1E)
- ✅ Doctrine compliance verified

**Phase 1F Goals**:
1. Wire prompt → `provider.stream()` → event processing
2. Optional tool request handling (via `ApprovalGate` + `ToolDispatcher`)
3. `RunManager` integration (lifecycle + report generation)
4. Finish event emission (ReasonLoop owns this per Tripp's correction)

**Key ReasonLoop behavior**:
- Check `tool.requiresApproval` before dispatch
- If true, call `ApprovalGate.check()` first
- If approved, dispatch tool via `ToolDispatcher`
- If denied, emit error event, skip tool execution
- Emit `finish` event (ReasonLoop owns this because only ReasonLoop knows runId)

**Model Tier Recommendation**:
- **Heavy Technical Thinking** — streaming integration, approval flow, tool dispatch orchestration
- **Fast Technical Builder** — file scaffolding, event processing logic
- **Code Review** — scope guardrails, boundary validation

**Estimated Scope**: ~500-700 lines across 6-8 files (ReasonLoop, event processing, tool dispatch, integration glue)

---

## ADDITIONAL NOTES

### Lessons Learned
1. **Path safety is non-negotiable** — every tool must call `resolveSafePath()` before touching the filesystem. No exceptions.
2. **Gated contracts are clearer than "always error"** — by not registering them, we prevent accidental use and make the boundary explicit.
3. **Dispatcher is simple on purpose** — it routes, validates, executes. It does NOT check approval (that's ReasonLoop's job). Separation of concerns.
4. **Truncation is explicit, not silent** — `read_file` returns `truncated: true` so the caller knows they didn't get the full file.
5. **Search is case-insensitive substring** — no regex, no complexity. Predictable behavior.

### For Future Sessions
- `search` could add regex mode via option (Phase 2+)
- `list_dir` could add glob filtering (Phase 2+)
- `read_file` could add line range selection (Phase 2+)
- Path safety could be relaxed via ToolContext options (e.g., allow absolute paths in certain contexts)
- Gated tools will need real execution in Phase 2+ (with ApprovalGate integration)
- ToolDispatcher could add middleware/hooks for logging/telemetry (Phase 2+)

---

**Report Generated**: 2026-06-02T05:15:00Z  
**Author**: Cyony (Hermes Agent)  
**Review Status**: Pending (Eddie + Tripp)
