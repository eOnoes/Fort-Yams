# Phase 2E End-to-End Mutation Smoke Report

## PHASE

Phase 2E — End-to-End Coding-Agent Mutation Smoke Test

## STATUS

**PASS** ✅

## MODEL TIERS USED

- **Code Review / Warden Pass** — Report audit, scope compliance, security verification
- **Heavy Technical Thinking** — End-to-end orchestration, tool call persistence gap analysis, surgical fix design
- **Fast Technical Builder** — Smoke test script construction (not used for core changes)

## EXECUTIVE SUMMARY

Phase 2E validates the full Phase 2 runtime end-to-end. A fake provider simulates a coding agent emitting `tool_request` events in sequence through `write_file → edit_file → git_status → git_diff → shell`. All 5 positive-path tool invocations pass through ApprovalGate, dispatch, and audit recording. Five negative-path tests (denial, fail-closed, dangerous command, path traversal, report FAIL) all produce controlled errors without mutation. **49/49 smoke test assertions passed.**

**One bug discovered and surgically fixed:** The ReasonLoop was recording `tool_result` events but never persisting `ToolCall` records to the database. This caused the report generator's `listToolCallsByRun()` to return empty results. The fix added `recordToolCall` to RunManager and wired it into all 8 return paths (success + 7 error paths) in `handleToolRequest`.

**One cosmetic fix applied:** The report generator's `extractFilesChanged` wasn't picking up file paths nested under `result.output` (the ToolResult shape). Added a secondary check for `r.output.path` / `r.output.file`.

## FILES CREATED

1. **`tmp/smoke-test-2e.mjs`** — 186-line comprehensive smoke test with positive + negative scenarios
2. **`reports/phase-2e-e2e-mutation-smoke-report.md`** — This report

## FILES MODIFIED

1. **`packages/core/src/runManager.ts`** — Added `recordToolCall` method (interface + implementation + return object). Persists tool calls to SQLite with persistence warning tracking on failure.
2. **`packages/core/src/reasonLoop.ts`** — Wired `recordToolCall` into all 8 return paths in `handleToolRequest`: no dispatcher, unknown tool, fail-closed no-gate, approval denied, ApprovalDeniedError, other approval errors, dispatch success, dispatch failure.
3. **`packages/core/src/reportGenerator.ts`** — Extended `extractFilesChanged` to also check `output.path` / `output.file` for ToolResult-nested paths.

## E2E SMOKE FLOW

### Positive E2E Scenario

1. **FakeProvider** emits `message` → ReasonLoop accumulates
2. **FakeProvider** emits `tool_request: write_file(sample.ts)` → ApprovalGate checks → MockApprover grants → Dispatcher executes → `sample.ts` created → tool_result recorded + ToolCall persisted
3. **FakeProvider** emits `tool_request: edit_file(sample.ts)` → same flow → `return "hello world from Tripp.Reason"` → backup created at `.tripp/backups/`
4. **FakeProvider** emits `tool_request: git_status` → safe, auto-approved → returns branch + file entries
5. **FakeProvider** emits `tool_request: git_diff` → safe, auto-approved → returns diff stat
6. **FakeProvider** emits `tool_request: shell(node --version)` → ApprovalGate checks → granted → `spawn("node", ["--version"])` → returns `v20.19.2`
7. **FakeProvider** emits `message: "Smoke test complete."`
8. **ReasonLoop** emits `finish` event with runId
9. **RunManager** completes run → triggers `ReportGenerator`
10. **Report** written to `reports/<session-id>/<run-id>.md` with PASS status

All 49 assertions confirmed:
- `sample.ts` created with correct content
- Edit applied correctly
- Backup directory exists
- Git reports sample.ts as untracked
- All 6 required report sections present
- All 5 tool calls visible in report with correct status icons

## NEGATIVE-PATH TESTS

| # | Test | Assertions | Outcome |
|---|------|-----------|---------|
| A | **Approval denial blocks write_file** | Run completes, file NOT created, approver consulted | ✅ PASS |
| B | **No ApprovalGate fails closed** | Run completes, file NOT created, status="completed" (error handled gracefully) | ✅ PASS |
| C | **Dangerous shell rejected** | Run completes, shell tool call recorded with status="failed", no destructive execution | ✅ PASS |
| D | **Path traversal rejected** | write_file `../../../etc/hacked` → status="failed". read_file `../../../etc/passwd` → status="failed". No file created outside workdir | ✅ PASS |
| E | **Report status behavior** | Clean run → PASS. Error run → FAIL. Both verified in generated report files | ✅ PASS |

## GIT BASELINE RESULT

### Before Smoke Scenario

```
## main
```

Repo initialized with one commit (`README.md`), clean working tree.

### After Smoke Scenario

```
?? sample.ts
```

`sample.ts` appears as untracked. No auto-commit was performed (compliance with stop condition).

### Backup Files

```
.tripp/backups/<timestamp>/sample.ts
```

Backup created during `edit_file` overwrite. Timestamp format is filesystem-safe ISO 8601.

All generated smoke files (`sample.ts`, `.tripp/backups/`) are under the allowed `tmp/phase-2e/smoke-repo/` directory.

## RUNTIME REPORT AUDIT

Inspected the E2E run report (`sess_5cfec9d0.../run_aa96fb74...md`):

| Section | Present | Content |
|---------|---------|---------|
| **STATUS** | ✅ | `**PASS**` |
| **SESSION** | ✅ | Session ID, Run ID, Provider: `fake-smoke-provider`, Model: `fake-model` |
| **PROMPT** | ✅ | "Run E2E smoke test." |
| **DURATION** | ✅ | Started → Completed, 0.1s elapsed (expected for fake provider) |
| **EVENTS** | ✅ | 13 events: 2 messages, 5 tool_requests, 5 tool_results, 1 finish |
| **TOOL CALLS** | ✅ | 5 tools with ✅ icons: write_file, edit_file, git_status, git_diff, shell |
| **FILES CHANGED** | ✅ | Shows file paths (after extractor fix) |
| **VALIDATION** | ✅ | "Pending CLI validation" |
| **NEXT STEP** | ✅ | "Ready for next task" |
| **Persistence Warnings** | N/A | No warnings (clean run) |

Negative test reports also verified: FAIL report shows correct status, denial report shows ❌ write_file, dangerous command report shows ❌ shell.

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm typecheck` | 6/6 packages → 0 errors |
| `pnpm build` | 6/6 packages → Done |
| `node tmp/smoke-test-2e.mjs` | **49/49 assertions PASS, 0 FAIL** |

## SCOPE COMPLIANCE

- ✅ No `packages/server/` directory
- ✅ No `packages/mcp/` directory
- ✅ No `packages/swarm/` directory
- ✅ No UI files created
- ✅ No new provider implementations (FakeProvider is test-only, in `tmp/`)
- ✅ No destructive shell behavior (dangerous commands rejected by commandSafety)
- ✅ No install/update command behavior (blocked by allowlist)
- ✅ No commands outside workdir (path traversal blocked)
- ✅ No Goose code copied (clean-room maintained)
- ✅ Dependency direction valid: `shared` ← `store` ← `core` ← `tools`, `providers` → `cli`
- ✅ No new dependencies added
- ✅ All 9 active tools: list_dir, read_file, search, git_status, git_diff, write_file, edit_file, shell, run_tests

## SECURITY / SAFETY CHECKS

| Check | Status | Evidence |
|-------|--------|----------|
| approval-before-dispatch | ✅ PASS | All mutation tools have `requiresApproval: true` |
| denial blocks mutation | ✅ PASS | NEG-A: denied `write_file` did not create file |
| no ApprovalGate fails closed | ✅ PASS | NEG-B: absent gate returned controlled error, no file created |
| path traversal blocked | ✅ PASS | NEG-D: `../../../etc/hacked` and `../../../etc/passwd` both rejected |
| dangerous shell rejected | ✅ PASS | NEG-C: `rm -rf /` rejected by commandSafety |
| output caps/timeouts active | ✅ PASS | Verified in Phase 2D (128KB cap, 30s/120s timeouts) |
| backups created before edit/overwrite | ✅ PASS | `.tripp/backups/<timestamp>/sample.ts` exists |
| report generated | ✅ PASS | Runtime report generated and persisted |

## DESIGN DECISIONS

### 1. Tool Call Persistence Gap (Bug Fix)

**Problem:** ReasonLoop's `handleToolRequest` recorded `tool_result` StreamEvents via `safeRecordEvent()` but never persisted `ToolCall` records. The report generator queried `listToolCallsByRun()` from the `tool_calls` table — which was always empty. Tool calls were invisible in reports.

**Fix:** Added `recordToolCall()` to RunManager (interface + implementation). Wired into all 8 return paths of `handleToolRequest` — success path and 7 error paths (no dispatcher, unknown tool, fail-closed, approval denied, ApprovalDeniedError, other approval errors, dispatch catch). Uses `createId("tc")` for IDs, converts status `"ok"` → `"completed"` / anything else → `"failed"` to match `ToolCallStatus` enum. Persistence failures are tracked as persistence warnings (non-fatal).

**Impact:** Reports now correctly show all tool calls with status icons (✅/❌), tool names, and args summaries.

### 2. Report File Path Extraction (Cosmetic Fix)

**Problem:** `extractFilesChanged` in `reportGenerator.ts` checked `result.path` directly, but tool results use the `ToolResult` shape where `path` is nested under `result.output.path`.

**Fix:** Added secondary check: if `result.output` is an object, check `output.path` and `output.file`. Backward compatible — still checks `result.path` and `result.file` first.

### 3. Smoke Test Isolation

**Decision:** Smoke test runs entirely in `tmp/phase-2e/smoke-repo/` with its own git repo and in-memory SQLite store. No real provider calls, no real filesystem mutations outside the test sandbox. Script lives at `tmp/smoke-test-2e.mjs` (outside workdir) to avoid self-deletion on cleanup.

**Rationale:** Zero network dependency. Fake provider exercises 100% of the runtime path (ReasonLoop → ApprovalGate → ToolDispatcher → RunManager → ReportGenerator) identically to a live provider. Deterministic and repeatable.

### 4. In-Memory Store for Smoke Tests

**Decision:** All smoke test runs use `initDb(":memory:")` — no disk persistence for the store (reports are written to disk separately by the report generator).

**Rationale:** Each test run is independent. No cleanup needed between runs. Reports are the only persistent artifact, written to the smoke workdir for inspection.

## BLOCKERS

**None.**

All preconditions met:
- ✅ Phase 2D PASS (all 9 tools active)
- ✅ Build/typecheck clean (6/6 packages)
- ✅ Scope compliant (no forbidden packages)
- ✅ 49/49 smoke test assertions PASS
- ✅ All 5 negative-path tests passing
- ✅ Runtime report audit verified

## NEXT STEP

### Recommended: Phase 2F — Documentation Finalization + README

Phase 2 is feature-complete. All 5 sub-phases (2A-2E) are PASS. The coding-agent tool surface is validated end-to-end with fake providers, approval gating, audit tracking, and safety enforcement.

**Phase 2F Goals:**
1. Update `README.md` with Phase 2 tool documentation
2. Update `ROADMAP.md` to mark Phase 2 complete
3. Update `PHASE_2_MUTATION_SAFETY.md` with activation status
4. Final scope and dependency audit
5. Archive smoke test results

**Then: Phase 3 — Local Server + SSE**

Phase 3 can proceed immediately: all Phase 2 preconditions are met, the approval gate is proven, mutations are safe, and the runtime produces auditable reports.

---

**Report Generated:** 2026-06-02T21:10:00Z  
**Author:** Cyony (Hermes Agent)  
**Review Status:** Pending (Eddie + Tripp)
