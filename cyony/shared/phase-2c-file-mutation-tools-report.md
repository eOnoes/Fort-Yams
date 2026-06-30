# Phase 2C File Mutation Tools Report

## PHASE

Phase 2C — write_file / edit_file Behind ApprovalGate

## STATUS

PASS

## MODEL TIERS USED

- Heavy Technical Thinking — mutation safety, approval flow, backup/rollback behavior
- Fast Technical Builder — implementation, validation scripts
- Code Review / Warden Pass — final audit and report

## FILES CREATED

- `packages/tools/src/writeFile.ts` — File write/create tool with approval, backup, overwrite protection
- `packages/tools/src/editFile.ts` — Targeted text replacement tool with approval, backup, whole-file guard
- `reports/phase-2c-file-mutation-tools-report.md` — This report

## FILES MODIFIED

- `packages/tools/src/gatedContracts.ts` — Removed write_file/edit_file stubs, kept only shellTool
- `packages/tools/src/index.ts` — Added write_file/edit_file exports + activeTools (now 7 tools)
- `packages/core/src/reasonLoop.ts` — Added fail-closed behavior when no ApprovalGate for requiresApproval tools
- `packages/cli/src/runCommand.ts` — Registered git_status, git_diff, write_file, edit_file in dispatcher

## FILE MUTATION TOOLS CREATED

### write_file

- **name**: `write_file`
- **requiresApproval**: `true`
- **input schema**: `{ path: string, content: string, overwrite?: boolean, createParents?: boolean }`
- **defaults**: `overwrite=false`, `createParents=false`
- **safety**:
  - Workdir boundary enforced via `resolveSafePath()`
  - No silent overwrite — returns error if file exists and `overwrite` is not `true`
  - Parent directory creation requires explicit `createParents=true`
  - Backup created at `.tripp/backups/<timestamp>/<relative-path>` before overwrite
  - Backup failure aborts the write (fail-safe)
- **output**: `{ path, created, overwritten, existedBefore, sizeBefore?, sizeAfter, backupPath? }`

### edit_file

- **name**: `edit_file`
- **requiresApproval**: `true`
- **input schema**: `{ path: string, expected: string, replacement: string, replaceAll?: boolean, allowWholeFileReplace?: boolean }`
- **defaults**: `replaceAll=false`, `allowWholeFileReplace=false`
- **safety**:
  - Workdir boundary enforced via `resolveSafePath()`
  - File must exist — error if not found
  - `expected` text must be found in file — error if not found (no write occurs)
  - Empty `expected` string rejected by schema
  - Whole-file replacement requires `allowWholeFileReplace=true`
  - Backup created at `.tripp/backups/<timestamp>/<relative-path>` before write
  - Backup failure aborts the edit (fail-safe)
- **output**: `{ path, replacements, sizeBefore, sizeAfter, backupPath }`

## ACTIVE TOOLS

After this phase, the default active tool set is 7 tools:

| # | Tool | Approval | Phase |
|---|------|----------|-------|
| 1 | `list_dir` | No | 1E |
| 2 | `read_file` | No | 1E |
| 3 | `search` | No | 1E |
| 4 | `git_status` | No | 2B |
| 5 | `git_diff` | No | 2B |
| 6 | `write_file` | **Yes** | 2C ← NEW |
| 7 | `edit_file` | **Yes** | 2C ← NEW |

Exported via `activeTools` array for one-line dispatcher population.

## CONTRACT-ONLY TOOLS

- **shell** — remains contract-only stub in `gatedContracts.ts`. Returns "deferred to Phase 2D" error. Not registered in activeTools. Not executable.

## APPROVAL FLOW

### Approval-before-dispatch

ReasonLoop checks `tool.requiresApproval || event.requiresApproval` before dispatching any tool. If approval is required:

1. **ApprovalGate exists** → calls `approvalGate.check()` with tool name, args, risk level, and context
   - Approved → dispatch proceeds
   - Denied → returns controlled error tool_result with denial reason
   - Gate throws `ApprovalDeniedError` → caught, returns controlled error

2. **No ApprovalGate exists** → **FAIL CLOSED**. Returns controlled error:
   > "Tool \"write_file\" requires approval but no ApprovalGate is configured. Refusing to dispatch (fail-closed)."

   This prevents mutation tools from running in unguarded configurations.

3. **CliApprover** defaults to deny in the CLI runner, requiring explicit terminal approval for each mutation.

### Fail-closed guarantee

The `if (tool.requiresApproval || requiresApproval)` block now unconditionally handles: approved → dispatch, denied → error, no gate → error, gate error → error. There is no path where a requiresApproval tool reaches `toolDispatcher.dispatch()` without a successful approval.

## BACKUP BEHAVIOR

- **Path**: `<workdir>/.tripp/backups/<ISO-timestamp>/<relative-path>`
- **Timestamp format**: ISO 8601 with colons/dots replaced by hyphens (filesystem-safe)
- **For write_file**: Backup created only when overwriting existing file (not for new file creation)
- **For edit_file**: Backup always created (file must exist for edit)
- **Backup failure**: Mutation is aborted. Error returned to caller. No silent skip.
- **Backup content**: Exact UTF-8 copy of file contents at time of backup

Example: Overwriting `packages/tools/src/foo.ts` in workdir `/opt/data/shared/Tripp.Reason` creates backup at:
```
/opt/data/shared/Tripp.Reason/.tripp/backups/2026-06-02T04-30-15-123Z/packages/tools/src/foo.ts
```

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm typecheck` | 6/6 packages → 0 errors |
| `pnpm build` | 6/6 packages → Done |

## SMOKE TEST RESULT

All 15 required smoke tests passed:

| # | Test | Result |
|---|------|--------|
| 1 | write_file creates new file | ✅ created=true, file exists with correct content |
| 2 | write_file refuses overwrite without flag | ✅ error "already exists", file unchanged |
| 3 | write_file overwrites with flag + backup | ✅ overwritten=true, backup contains original |
| 4 | edit_file replaces text + backup | ✅ replacements=1, backup created |
| 5 | edit_file refuses when text missing | ✅ error "not found", no write |
| 6 | edit_file replaceAll | ✅ replacements=2, all instances replaced |
| 7 | path traversal rejected | ✅ error for `../../../etc/pwned` |
| 8 | approval flags verified | ✅ write_file, edit_file, shell all requireApproval=true |
| 9 | fail-closed flags verified | ✅ All mutation tools flagged (ReasonLoop enforces) |
| 10 | shell remains contract-only | ✅ error "deferred to Phase 2D" |
| 11 | activeTools = 7 (includes write/edit, excludes shell) | ✅ Confirmed |
| 12 | edit_file whole-file guard | ✅ error "entire file" when expected = full content |
| 13 | edit_file whole-file with allowWholeFileReplace | ✅ Replaces full content |
| 14 | write_file createParents=true | ✅ Creates deep/nested/ directories |
| 15 | write_file without createParents | ✅ error "Parent directory" |

## GIT BASELINE RESULT

Changes introduced by this phase (before commit):

```
 packages/cli/src/runCommand.ts       | 18 +++++++--
 packages/core/src/reasonLoop.ts      | 18 ++++++++-
 packages/tools/src/gatedContracts.ts | 78 ++++++------------------------------
 packages/tools/src/index.ts          | 34 ++++++++++------
 4 files changed, 65 insertions(+), 83 deletions(-)
```

New files: `writeFile.ts`, `editFile.ts`, report.

git_status correctly shows the 4 modified + 3 new files as untracked/staged changes.
git_diff --stat correctly shows the change volume.

## SECURITY / SAFETY CHECKS

- ✅ Workdir boundary enforced — `resolveSafePath()` on all inputs
- ✅ Path traversal blocked — `../../../etc/pwned` rejected
- ✅ No silent overwrite — `overwrite=true` required, error otherwise
- ✅ Parent directory creation controlled — `createParents=true` required
- ✅ Backup-before-modify — `.tripp/backups/<timestamp>/<relative-path>`
- ✅ Backup failure aborts mutation — no silent skip
- ✅ Approval denial blocks mutation — ReasonLoop returns controlled error
- ✅ No ApprovalGate fails closed — requiresApproval tools cannot dispatch without gate
- ✅ Shell not active — remains contract-only stub
- ✅ Whole-file replacement guarded — `allowWholeFileReplace` required

## SCOPE COMPLIANCE

- ✅ write_file/edit_file active only behind ApprovalGate
- ✅ shell remains contract-only
- ✅ No general shell execution
- ✅ No run_tests
- ✅ No server/MCP/swarm/UI created
- ✅ No new provider implementation
- ✅ No Goose code copied
- ✅ Dependency direction valid: tools imports only @tripp-reason/shared + node built-ins
- ✅ CLI assembles concrete tools (tools package is concrete-tool-agnostic)

## DESIGN DECISIONS

1. **Overwrite policy**: Explicit `overwrite=true` flag required. Default false. This prevents accidental file destruction. New file creation never triggers overwrite logic.

2. **Edit strategy**: Targeted expected/replacement pattern (not whole-file rewrites by default). Counts occurrences, rejects if zero, supports `replaceAll` for multiple replacements. Whole-file replacement requires explicit `allowWholeFileReplace=true` to prevent accidental total rewrites.

3. **Backup strategy**: `.tripp/backups/<ISO-timestamp>/<repo-relative-path>`. Always inside workdir. Backup failure = mutation abort. This provides a simple, auditable rollback point without requiring git commits. Timestamps are filesystem-safe (colons/dots → hyphens).

4. **Active tool registration**: Added to `activeTools` array. Consumers use `createDispatcher(activeTools)` for one-line setup. CLI separately lists all 7 tools explicitly for visibility.

5. **Approval fail-closed**: Changed ReasonLoop from `if (requiresApproval && approvalGate)` to `if (requiresApproval) { if (!approvalGate) fail; else check; }`. This prevents a configuration where mutation tools are registered but approval is accidentally skipped.

6. **Whole-file replacement guard**: `edit_file` rejects when `expected === fullFileContent` unless `allowWholeFileReplace=true`. This prevents targeted-edit tools from being abused as whole-file rewriters (that's write_file's job with explicit overwrite=true).

7. **Backup not needed for new files**: write_file only creates backups when overwriting existing content. New file creation has no prior state to preserve.

## BLOCKERS

None.

## NEXT STEP

Phase 2C is **PASS**. Recommended next: **Phase 2D** — shell/run_tests behind ApprovalGate.
