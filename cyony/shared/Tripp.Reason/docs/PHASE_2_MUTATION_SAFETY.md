# Phase 2 Mutating Tools — Safety Rules

This document defines the safety rules for mutating tools that will be activated in Phase 2. All mutating operations require explicit approval through the ApprovalGate system.

## write_file

**Purpose:** Create or overwrite a file with specified content.

**Safety Rules:**
1. **Workdir boundary enforced** — path must resolve within workdir (use `resolveSafePath`)
2. **requiresApproval: true** — cannot execute without explicit user approval
3. **Dry-run preview** — tool must support preview mode showing what would be written
4. **Backup creation** — if file exists, create backup in `.tripp/backups/<timestamp>/` before overwrite
5. **Rollback support** — backup metadata recorded in `ToolResult.output` for rollback
6. **Size limit** — refuse to write files > 10MB (configurable via tool input override)
7. **Path logging** — all write paths recorded in session events for audit trail

**Approval Context:**
- Show: file path, byte count, whether overwriting existing file
- Show: diff if overwriting (existing content vs new content)

## edit_file

**Purpose:** Apply targeted text replacements to existing files.

**Safety Rules:**
1. **Workdir boundary enforced** — path must resolve within workdir (use `resolveSafePath`)
2. **requiresApproval: true** — cannot execute without explicit user approval
3. **Patch-style edits** — use find/replace pairs, not whole-file rewrites
4. **Edit list** — input must be array of `{oldText, newText}` replacements
5. **Atomic application** — all replacements applied in single operation or none applied
6. **Backup creation** — create backup before any edits
7. **Verification pass** — after applying, verify file contains expected newText
8. **Line count reporting** — result must include count of successful replacements
9. **Refusal on ambiguity** — if oldText not found exactly, refuse edit (no fuzzy matching)

**Approval Context:**
- Show: file path, number of edits, preview of first 3 replacements
- Show: byte count of original file

## shell

**Purpose:** Execute shell commands in the workdir.

**Safety Rules:**
1. **Workdir boundary enforced** — `cwd` must be within workdir, `cd` outside blocked
2. **requiresApproval: true** — cannot execute without explicit user approval
3. **Allowlist mode** — only commands matching allowlist patterns may execute
4. **Default deny** — any command not matching allowlist is refused
5. **No shell chaining** — reject commands containing `&&`, `||`, `|`, `;`, backticks, `$()`
6. **Timeout required** — default 30s, max 300s, user may specify via input
7. **Output capture limit** — stdout/stderr each capped at 100KB (truncate with warning)
8. **No environment variable expansion** — shell executes with sanitized env
9. **Command logging** — all executed commands recorded in session events

**Allowlist (Phase 2 initial):**
- `grep`, `rg` (read-only search)
- `find` (read-only file discovery, must not traverse outside workdir)
- `wc`, `head`, `tail` (read-only file inspection)
- `ls`, `pwd`, `stat` (read-only filesystem queries)
- `date`, `whoami`, `hostname` (system info)
- `git status`, `git diff`, `git log` (git inspection, no mutations)
- `pnpm typecheck`, `pnpm build` (build commands, read-only artifacts)
- `node`, `tsx` (script execution for smoke tests)

**Explicitly Denied:**
- `rm`, `rmdir` (destructive)
- `mv`, `cp` to outside workdir
- `chmod`, `chown` (permission changes)
- `git push`, `git commit`, `git merge` (git mutations)
- `curl`, `wget` (network access)
- `npm publish`, `git push` (publishing)
- Any command with `sudo`

**Approval Context:**
- Show: full command with all arguments
- Show: allowlist category it matches
- Show: estimated risk level

## git_status / git_diff (new Phase 2 tools)

**Purpose:** Inspect git state without mutation.

**Safety Rules:**
1. **Workdir boundary enforced** — must run within workdir
2. **requiresApproval: false** — safe for autonomous use
3. **Output cap** — limit output to 50KB per invocation
4. **No flags beyond allowlist** — only `--stat`, `--short`, `--name-only`, `-- <path>` allowed
5. **Read-only** — cannot modify .git or working tree

## run_tests (new Phase 2 tool)

**Purpose:** Execute test suites to validate changes.

**Safety Rules:**
1. **Workdir boundary enforced** — must run within workdir
2. **requiresApproval: true** — tests may modify state (write temp files, etc)
3. **Test runner allowlist** — `pnpm test`, `jest`, `vitest`, `mocha` only
4. **Timeout required** — default 60s, max 600s
5. **Output capture** — test results captured, failure details preserved
6. **No coverage collection by default** — coverage tools may modify filesystem unexpectedly

**Approval Context:**
- Show: test command and test file patterns
- Show: estimated duration based on prior runs

---

## Approval Flow for Mutating Tools

Phase 2 activates the following approval flow:

1. **Model emits tool_request** with `requiresApproval: true`
2. **ReasonLoop receives tool_request**, checks `ApprovalGate`
3. **ApprovalGate delegates to Approver** (CLI: terminal prompt, API: HTTP endpoint)
4. **Approver presents context** (file paths, diff preview, risk assessment)
5. **User approves or denies** with optional reason
6. **If approved and `throwOnDenial: false`**: dispatch to tool dispatcher
7. **If denied**: emit tool_result with error status and denial reason
8. **Tool executes** (with backup creation, workdir enforcement, etc)
9. **Tool returns result** with backup metadata for rollback
10. **ReasonLoop records tool_result** event (with or without warnings)

## Rollback Mechanism

All mutating tools create backups that can be restored:

- **Backup location**: `.tripp/backups/<timestamp>_<run-id>/`
- **Backup contents**: copy of original file(s) before mutation
- **Backup metadata**: JSON file with timestamps, paths, tool name, run ID
- **Rollback invocation**: separate `tripp rollback <run-id>` command (Phase 2C)
- **Backup retention**: 30 days, then auto-cleaned

## Persistence Warnings in Reports

Phase 2A introduced persistence warning tracking. If any mutating tool's output fails to persist:

- **Run status**: `PARTIAL` (not `PASS`)
- **Report section**: "Persistence Warnings" with operation, message, timestamp
- **Audit trail**: warnings visible to operator for investigation

This ensures audit integrity even when persistence degrades.

---

## Activation Status (Phase 2 Complete)

All tools are active as of Phase 2D. All mutation/execution tools operate behind ApprovalGate.

| # | Tool | Approval Required | Status |
|---|------|-------------------|--------|
| 1 | `list_dir` | No | ✅ Active (Phase 1E) |
| 2 | `read_file` | No | ✅ Active (Phase 1E) |
| 3 | `search` | No | ✅ Active (Phase 1E) |
| 4 | `git_status` | No | ✅ Active (Phase 2B) |
| 5 | `git_diff` | No | ✅ Active (Phase 2B) |
| 6 | `write_file` | **Yes** | ✅ Active (Phase 2C) |
| 7 | `edit_file` | **Yes** | ✅ Active (Phase 2C) |
| 8 | `shell` | **Yes** | ✅ Active (Phase 2D) |
| 9 | `run_tests` | **Yes** | ✅ Active (Phase 2D) |

## Final Safety Confirmations

All confirmed by end-to-end mutation smoke test (Phase 2E, 49/49 assertions PASS):

- ✅ **approval-before-dispatch** — All mutation tools require ApprovalGate. ReasonLoop checks before every dispatch.
- ✅ **no ApprovalGate fails closed** — If no gate is configured, mutation tools return controlled error. No dispatch without approval.
- ✅ **backups created before edit/overwrite** — `.tripp/backups/<timestamp>/` created automatically before write_file (overwrite) and edit_file.
- ✅ **command execution uses spawn with shell: false** — All shell/runTests execution uses `spawn(command, args, { shell: false })`. No shell injection vectors.
- ✅ **dangerous commands rejected** — `rm`, `curl`, `sudo`, `chmod`, etc. rejected by denylist. Everything else rejected by allowlist-first policy.
- ✅ **install/update commands rejected** — npm/pnpm `install`, `add`, `remove`, `update`, `upgrade` blocked.
- ✅ **path traversal blocked** — `resolveSafePath` rejects `..` and absolute paths outside workdir. Verified against `../../../etc/passwd`.
- ✅ **output caps/timeouts active** — Shell: 128KB per stream, 30s timeout. RunTests: 128KB per stream, 120s timeout.
- ✅ **tool-call audit persistence** — `RunManager.recordToolCall()` persists every dispatched tool to the `tool_calls` table. Reports show all tool calls with status icons.
- ✅ **persistence warnings produce PARTIAL status** — Failed event/tool-call persistence adds warnings. Report status is PARTIAL when warnings exist (Phase 2A).

## Activation Prerequisites (All Met)

---

## Safety Philosophy

1. **Default to denial** — when in doubt, refuse the operation
2. **Audit everything** — every mutating operation produces an event
3. **Backup before mutate** — never lose original state
4. **Bound the blast radius** — workdir enforcement prevents accidental global changes
5. **Make rollback easy** — backups are automatic, rollback is one command
6. **Show context in approval** — user should see exactly what will happen before approving
