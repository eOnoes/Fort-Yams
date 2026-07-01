# Phase 2A Persistence + Mutation Safety Report

## PHASE
Phase 2A — Persistence Warning Hardening + Mutating Tool Safety Plan

## STATUS
**PASS** ✅

## MODEL TIERS USED
- **Code Review / Warden Pass** — primary audit of persistence failure paths and safety rule completeness
- **Heavy Technical Thinking** — audit/report-state design, mutation boundary analysis
- **Fast Technical Builder** — file edits, smoke test, documentation writing

## FILES CREATED
1. `docs/PHASE_2_MUTATION_SAFETY.md` — Comprehensive safety rules for write_file, edit_file, shell, git_status, git_diff, run_tests
2. `reports/phase-2a-persistence-and-mutation-safety-report.md` — This report

## FILES MODIFIED
1. `packages/shared/src/report.ts` — Added `PersistenceWarningSchema` and `persistenceWarnings?: PersistenceWarning[]` field on RunReport
2. `packages/shared/src/index.ts` — Exported `PersistenceWarning` type and schema
3. `packages/core/src/runManager.ts` — Added in-memory `warningsByRun` Map, `addPersistenceWarning()`, `getWarnings()`, `safeRecordEvent()` helper; wired into report generation
4. `packages/core/src/reasonLoop.ts` — All persistence failure catch blocks now call `runManager.addPersistenceWarning()` or `runManager.safeRecordEvent()`
5. `packages/core/src/reportGenerator.ts` — Accepts optional `persistenceWarnings` param; computes PARTIAL status when warnings exist; renders "PERSISTENCE WARNINGS" section in Markdown

## PERSISTENCE WARNING HARDENING

### Schema Addition (shared)
```ts
export const PersistenceWarningSchema = z.object({
  operation: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  recoverable: z.boolean(),
});
```

### RunManager Changes
- In-memory `Map<runId, PersistenceWarning[]>` (transient per-process, acceptable for Phase 2)
- `addPersistenceWarning(runId, warning)` — appends auto-timestamped warning
- `getWarnings(runId)` — retrieves warnings for report generation
- `safeRecordEvent(runId, event)` — try/catch wrapper that records warning on persistence failure

### ReasonLoop Changes
Every `await runManager.recordEvent(...)` call is now wrapped:
- User message failure → warning
- Stream event loop failures → `safeRecordEvent()` (7 call sites in handleToolRequest)
- Assistant message accumulation failure → warning
- Finish event failure → warning
- Provider stream catch (error event persist failure) → warning

### ReportGenerator Changes
```ts
const hasWarnings = persistenceWarnings && persistenceWarnings.length > 0;
const status = run.status === "completed"
  ? (hasWarnings ? "PARTIAL" : "PASS")
  : "FAIL";
```
Markdown report now includes a `## PERSISTENCE WARNINGS` section with warning type, operation, timestamp, and controlled error message (no stack traces leak).

## MUTATION SAFETY PLAN

Created `docs/PHASE_2_MUTATION_SAFETY.md` (7369 bytes). Key elements:

### write_file
- requiresApproval: true, workdir enforced, backup before overwrite, dry-run preview, 10MB size limit, path logging

### edit_file
- requiresApproval: true, workdir enforced, find/replace pairs only (no whole-file rewrite), atomic application, backup, verification pass, refusal on ambiguous oldText

### shell
- requiresApproval: true, workdir boundary, allowlist mode with default deny, shell chaining blocked (`&&`, `||`, `|`, `;`, backticks, `$()`), timeout required (30s default, 300s max), stdout/stderr 100KB cap, sanitized env, full command logging
- **Allowlist**: grep, rg, find, wc, head, tail, ls, pwd, stat, date, whoami, hostname, git status/diff/log, pnpm typecheck/build, node/tsx
- **Explicitly denied**: rm, rmdir, mv/cp outside workdir, chmod, git mutations, curl/wget, publishing commands, sudo

### git_status / git_diff (new Phase 2 tools)
- requiresApproval: false, read-only, 50KB cap, flag allowlist only

### run_tests (new Phase 2 tool)
- requiresApproval: true, test runner allowlist (jest/vitest/mocha/pnpm test), timeout (60s default, 600s max), no coverage collection

### Rollback Mechanism
- `.tripp/backups/<timestamp>_<run-id>/` with backup metadata JSON
- `tripp rollback <run-id>` command (Phase 2C)
- 30-day retention with auto-cleanup

### Activation Sequence
- Phase 2A ✅ persistence warnings + safety plan (this phase)
- Phase 2B ⏳ git_status + git_diff (read-only, no approval)
- Phase 2C ⏳ write_file + edit_file behind ApprovalGate
- Phase 2D ⏳ shell + run_tests behind ApprovalGate
- Phase 2E ⏳ end-to-end smoke tests

## VALIDATION RESULT

### Build / Typecheck
```
$ pnpm typecheck
packages/shared typecheck: Done
packages/store typecheck: Done
packages/tools typecheck: Done
packages/providers typecheck: Done
packages/core typecheck: Done
packages/cli typecheck: Done

$ pnpm build
All 6 packages: Done
```

### Package Boundary Audit
```
$ grep "from.*@tripp-reason" packages/*/src/*.ts
shared: 0 imports (leaf)
store: imports shared only ✅
tools: imports shared only ✅
providers: imports shared only ✅
core: imports shared + store only ✅
cli: imports shared + store + core + providers + tools ✅ (assembly layer)
```

### Scope Audit
- ✅ No server package
- ✅ No MCP package
- ✅ No swarm package
- ✅ No UI implementation
- ✅ No mutating tool execution (write_file/edit_file/shell remain contract-only)
- ✅ No Goose branding
- ✅ No circular dependencies

## SMOKE TEST RESULT

Created and ran `smoke-test-2a.mjs` (3 scenarios, cleaned up after execution):

### Test 1: Clean Run (no warnings)
```
✅ Status: PASS (in Markdown)
✅ No "## PERSISTENCE WARNINGS" section
✅ Assistant message: "Hello world!" (accumulated correctly)
✅ 3 events recorded (message + message + finish)
```

### Test 2: Run with Injected Warning
```
✅ Status: PARTIAL (in Markdown)
✅ "## PERSISTENCE WARNINGS" section present
✅ Warning rendered with operation "recordEvent"
✅ Warning message "Simulated persistence failure..." visible
✅ Programmatic runManager.getWarnings() returns 1 warning
```

### Test 3: Failed Run with Warning
```
✅ Status: FAIL (in Markdown, FAIL takes precedence over PARTIAL)
✅ "## PERSISTENCE WARNINGS" section still visible on failed run
```

**All 3 scenarios PASSED.** Smoke test file removed from packages/core/ per stop condition.

## SCOPE COMPLIANCE

- ✅ No mutating tool execution activated — write_file/edit_file/shell remain contract-only (return error without executing)
- ✅ No server/MCP/swarm/UI created
- ✅ No new provider implementations
- ✅ No Goose code copied
- ✅ Dependency direction valid — shared ← store ← core ← (providers, tools) → cli
- ✅ No store schema changes — warning tracking is in-memory in RunManager (Map per-run)
- ✅ `safeRecordEvent` is internal helper, not exported (not polluting public API)

## DESIGN DECISIONS

### 1. In-Memory Warning Storage (No Schema Change)
**Decision**: Track warnings in `Map<runId, PersistenceWarning[]>` on RunManager instance.

**Rationale**:
- Store schema change would force migrations — overkill for Phase 2
- Warnings only matter for the in-flight run being reported
- Once report is generated, the warnings are baked into the report file
- Process death mid-run loses warnings but run is incomplete anyway (no false confidence)

**Trade-off**: If process dies after warnings but before report generation, the next invocation won't see prior warnings. Acceptable — operator can detect the incomplete run from the "cancelled" status instead.

### 2. Status Mapping: Warnings → PARTIAL
**Decision**:
```
no warnings + completed → PASS
warnings + completed → PARTIAL
failed (any) → FAIL
```

**Rationale**:
- PARTIAL signals "completed but with audit gaps" — operator must investigate
- FAIL always takes precedence (don't hide failures behind warnings)
- Three states sufficient for Phase 2 — can extend later if needed

### 3. safeRecordEvent Helper
**Decision**: Add internal helper on RunManager that wraps `recordEvent` with try/catch + warning tracking.

**Rationale**:
- ReasonLoop had 11 recordEvent call sites — wrapping each would duplicate error handling
- Single helper = single source of truth for persistence failure behavior
- Helper is internal (not exported), doesn't pollute public API

### 4. Warnings Section Placement in Markdown
**Decision**: Warnings section appears AFTER "## FILES CHANGED" and BEFORE "## VALIDATION".

**Rationale**:
- Files Changed is the operational outcome — more important
- Validation is operational verification — warnings should inform it
- Next Step already references warnings ("Review persistence warnings — audit trail is incomplete")

### 5. Mutation Safety Allowlist Philosophy
**Decision**: Default-deny for shell commands, with strict allowlist.

**Rationale**:
- Default-deny is the safest model for arbitrary command execution
- Allowlist makes the threat model explicit and auditable
- Mutating commands (rm, mv, git push, etc.) require explicit future-doctrine approval, not just approval gate
- Shell chaining disabled because `cmd1 && cmd2` is two logical commands in one — approval granularity lost

### 6. Backup-First Mutation Policy
**Decision**: All mutating tools create backup before mutation; rollback via separate command.

**Rationale**:
- "Never lose original state" — core safety principle
- Backup metadata includes timestamp, run ID, tool name — full audit trail
- Separate rollback command (Phase 2C) allows surgical undo without re-running the loop
- 30-day retention balances disk usage vs undo window

## BLOCKERS
**None.**

All preconditions met:
- ✅ ProviderResponse drift resolved (Phase 1H)
- ✅ Persistence warning hardening complete
- ✅ Safety rules documented
- ✅ Smoke tests verified all 3 status mappings
- ✅ Build/typecheck clean across all 6 packages

## REQUIRED PHASE 2 CORRECTIONS
None — Phase 1H and this phase resolved all known carryover items.

## NEXT STEP

### Recommended: Phase 2B — Read-Only Git Insights
**Preconditions (all met):**
- ✅ Phase 2A PASS — persistence warnings working
- ✅ Phase 1H PASS — documentation drift patched
- ✅ PHASE_2_MUTATION_SAFETY.md defined rules for git_status/git_diff

**Phase 2B Goals:**
1. Implement `git_status` tool (requiresApproval: false)
2. Implement `git_diff` tool (requiresApproval: false)
3. Add flag allowlist (only safe git flags permitted)
4. Register in ToolDispatcher (alongside read-only file tools)
5. Smoke test: git operations inside a test workdir

**Why git_status/git_diff BEFORE write_file/edit_file:**
- These are **read-only** — no approval needed, no risk
- They provide essential context for the operator before approving mutations
- "Show me what changed" is the first question after any mutation
- Safe to ship without waiting for the full write_file/edit_file safety review

**Estimated Scope:** ~300-400 lines across 4 files (2 tools + dispatcher registration + smoke test)

---

**Report Generated**: 2026-06-02T07:15:00Z
**Author**: Cyony (Hermes Agent)
**Review Status**: Pending (Eddie + Tripp)
