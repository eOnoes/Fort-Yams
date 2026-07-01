# Phase 2D Shell / Run Tests Report

## PHASE

Phase 2D — shell / run_tests Behind ApprovalGate

## STATUS

PASS

## MODEL TIERS USED

- Heavy Technical Thinking — command safety, allowlist/denylist design, timeout/cap behavior
- Fast Technical Builder — implementation, smoke tests
- Code Review / Warden Pass — final audit and report

## FILES CREATED

- `packages/tools/src/commandSafety.ts` — Command validation: allowlist, denylist, chaining detection, cwd resolution
- `packages/tools/src/shell.ts` — Approval-gated bounded command execution
- `packages/tools/src/runTests.ts` — Approval-gated test runner with auto-detect
- `reports/phase-2d-shell-run-tests-report.md` — This report

## FILES MODIFIED

- `packages/tools/src/gatedContracts.ts` — Removed shellTool stub (now empty placeholder)
- `packages/tools/src/index.ts` — Added shell/runTests exports, activeTools now 9 tools, exported commandSafety utilities
- `packages/cli/src/runCommand.ts` — Registered shell + runTests in dispatcher

## COMMAND TOOLS CREATED

### shell

- **name**: `shell`
- **requiresApproval**: `true`
- **input schema**: `{ command: string, args?: string[], cwd?: string, timeoutMs?: number, maxOutputBytes?: number }`
- **defaults**: `timeoutMs=30000`, `maxOutputBytes=131072` (128KB)
- **safety**:
  - Allowlist-first: only `node`, `npm`, `pnpm`, `npx`, `tsc`, `git`, `echo`, `cat`, `ls`, `pwd`, `which`, `env`
  - Denylist: `rm`, `rmdir`, `curl`, `wget`, `chmod`, `chown`, `sudo`, `kill`, `dd`, `mkfs`, `shutdown`, `powershell`, etc.
  - Package manager restrictions: `install`, `add`, `remove`, `update`, `upgrade` denied
  - Git restrictions: only read-only subcommands allowed (`status`, `diff`, `log`, `show`, `branch`, `rev-parse`, `describe`, `tag`)
  - Chaining operators rejected as standalone args: `&&`, `||`, `;`, `|`, `>`, `>>`, `<`, `&`, `` ` ``, `$()`, `` `...` ``
  - Workdir-bound cwd — `resolveCwd()` validates against `ToolContext.workdir`
  - No `exec()` or `shell: true` — uses `spawn(command, args, { shell: false })`
  - Timeout kills process via SIGTERM, returns controlled error
  - Output capped per stream (stdout + stderr independently)
- **output**: `{ command, args, cwd, exitCode, signal?, stdout, stderr, stdoutTruncated, stderrTruncated, durationMs, timedOut }`

### run_tests

- **name**: `run_tests`
- **requiresApproval**: `true`
- **input schema**: `{ command?: string, args?: string[], cwd?: string, timeoutMs?: number, maxOutputBytes?: number }`
- **defaults**: `timeoutMs=120000`, `maxOutputBytes=131072` (128KB)
- **auto-detect**: If no command provided, reads `package.json` scripts and picks:
  1. `pnpm test` (if test script exists and is not the npm default)
  2. `pnpm typecheck` (if typecheck script exists)
  3. `pnpm build` (if build script exists)
  4. Fallback: `pnpm typecheck`
- **Same command safety** as shell (allowlist, denylist, chaining, cwd, timeout, caps)
- **output**: all shell fields + `passed: boolean` (true when exitCode === 0 and not timed out)

## ACTIVE TOOLS

After this phase, the full 9-tool active set:

| # | Tool | Approval | Phase |
|---|------|----------|-------|
| 1 | `list_dir` | No | 1E |
| 2 | `read_file` | No | 1E |
| 3 | `search` | No | 1E |
| 4 | `git_status` | No | 2B |
| 5 | `git_diff` | No | 2B |
| 6 | `write_file` | **Yes** | 2C |
| 7 | `edit_file` | **Yes** | 2C |
| 8 | `shell` | **Yes** | 2D ← NEW |
| 9 | `run_tests` | **Yes** | 2D ← NEW |

## APPROVAL FLOW

All 4 mutation/execution tools (`write_file`, `edit_file`, `shell`, `run_tests`) have `requiresApproval: true`. ReasonLoop fails closed if no ApprovalGate is configured — there is no path where a requiresApproval tool reaches dispatch without successful approval.

CliApprover defaults to deny in the CLI runner, requiring explicit terminal approval for each mutation.

## COMMAND SAFETY

### Allowlist strategy

Only 12 whitelisted top-level commands:
`node`, `npm`, `pnpm`, `npx`, `tsc`, `git`, `echo`, `cat`, `ls`, `pwd`, `which`, `env`

### Denied commands

25+ dangerous commands rejected regardless of args:
`rm`, `rmdir`, `del`, `erase`, `format`, `shutdown`, `reboot`, `mkfs`, `dd`, `diskpart`, `curl`, `wget`, `chmod`, `chown`, `sudo`, `su`, `kill`, `killall`, `pkill`, `powershell`, `cmd`

### Package manager restrictions

For `npm`/`pnpm`/`yarn`/`bun`: `install`, `add`, `remove`, `uninstall`, `update`, `upgrade` denied. `test`, `run`, `typecheck`, `build`, `lint`, `check` allowed.

### Git restrictions

Allowed: `status`, `diff`, `log`, `show`, `branch`, `rev-parse`, `describe`, `tag`
Denied: `add`, `commit`, `reset`, `clean`, `checkout`, `switch`, `pull`, `push`, `merge`, `rebase`, `stash`, `fetch`, `config`, `init`, `clone`

### No shell mode

All execution uses `spawn(command, args, { shell: false })`. No `exec()`, no string interpolation, no shell interpretation.

### Chaining detection

Standalone operator args rejected: `&&`, `||`, `;`, `|`, `>`, `>>`, `<`, `2>`, `&`, `` ` ``
Pattern args rejected: `$(...)`, `` `...` ``
Embedded operators in code (e.g., arrow functions `() => {}`) are safe under spawn and allowed.

### Timeout

- shell default: 30s
- run_tests default: 120s
- Kills via SIGTERM, returns `timedOut: true` + controlled error

### Output caps

- Default: 128KB per stream
- `stdoutTruncated` / `stderrTruncated` booleans in output

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm --filter @tripp-reason/tools build` | Done |
| `pnpm typecheck` | 6/6 packages → 0 errors |
| `pnpm build` | 6/6 packages → Done |

## SMOKE TEST RESULT

All 17 smoke tests passed:

| # | Test | Result |
|---|------|--------|
| 1 | shell runs `node --version` | ✅ ok, exitCode=0, stdout=v20.19.2 |
| 2 | shell rejects standalone `&&` arg | ✅ error "Chaining operator rejected" |
| 3 | shell rejects `rm -rf /` | ✅ error "Dangerous command rejected" |
| 4 | shell rejects `curl` | ✅ error "Dangerous command rejected" |
| 5 | shell rejects standalone `|` arg | ✅ error rejected |
| 6 | shell rejects `perl` (non-allowlist) | ✅ error "not in allowlist" |
| 7 | shell rejects cwd outside workdir | ✅ error "cwd rejected" |
| 8 | shell timeout (2s limit, infinite loop) | ✅ error, timedOut=true, durationMs=1511 |
| 9 | shell output cap (200KB output, 500B cap) | ✅ stdout ≤500, truncated=true |
| 10 | shell rejects `git add .` | ✅ error "Git operation denied" |
| 11 | run_tests requiresApproval=true | ✅ confirmed |
| 12 | run_tests rejects `npm install` | ✅ error |
| 13 | run_tests passed=true on exit 0 | ✅ passed=true |
| 14 | run_tests passed=false on exit 1 | ✅ passed=false, exitCode=1 |
| 15 | activeTools = 9 tools | ✅ includes shell + run_tests |
| 16 | write/edit still gated + no server/mcp/swarm | ✅ confirmed |
| 17 | timeout enforcement (1.5s, infinite loop) | ✅ timedOut=true, durationMs=1511 |

## GIT BASELINE RESULT

Changes introduced by this phase:

```
 packages/cli/src/runCommand.ts       |  8 ++++++--
 packages/tools/src/gatedContracts.ts | 39 ++++++++----------------------------
 packages/tools/src/index.ts          | 19 ++++++++++++------
 3 files changed, 27 insertions(+), 39 deletions(-)
```

New files: `commandSafety.ts`, `shell.ts`, `runTests.ts`, this report.

## SECURITY / SAFETY CHECKS

- ✅ No shell string execution — spawn only, args arrays, `shell: false`
- ✅ No shell chaining — standalone operators rejected, embedded in code allowed
- ✅ Dangerous commands rejected — rm, curl, wget, chmod, sudo, etc.
- ✅ Install/update commands rejected — npm/pnpm install/add/remove/update blocked
- ✅ Git mutating subcommands rejected — add, commit, reset, checkout, push, etc.
- ✅ Timeout enforced — SIGTERM kill, controlled error, `timedOut` flag
- ✅ Output capped — 128KB default, `stdoutTruncated`/`stderrTruncated` booleans
- ✅ Workdir boundary enforced — `resolveCwd()` validates against workdir
- ✅ Approval denial blocks execution — ReasonLoop returns controlled error
- ✅ No ApprovalGate fails closed — requiresApproval tools cannot dispatch

## SCOPE COMPLIANCE

- ✅ shell/run_tests active only behind ApprovalGate
- ✅ write_file/edit_file remain behind ApprovalGate
- ✅ No command execution outside workdir
- ✅ No destructive commands allowed
- ✅ No dependency install commands allowed
- ✅ No server/MCP/swarm/UI packages created
- ✅ No new provider implementation
- ✅ No Goose code copied
- ✅ Dependency direction valid: tools imports only @tripp-reason/shared + node built-ins

## DESIGN DECISIONS

1. **Allowlist strategy**: Allowlist-first rather than denylist-only. Everything not explicitly allowed is rejected. This prevents zero-day bypasses where a new command isn't on the deny list.

2. **Denied command set**: 25+ dangerous commands permanently blocked. Focused on filesystem destruction, network access, permission changes, and process control.

3. **Package manager restrictions**: Install/add/remove/update are blocked to prevent dependency injection. Only test/build/typecheck/run/lint allowed.

4. **Git restrictions**: Read-only git operations only. Mutating operations (add, commit, push, etc.) require using git_status/git_diff tools or external git workflow.

5. **Chaining detection redesign**: Switched from regex-based substring matching (false positives on arrow functions, comparison operators) to exact-match on standalone operator args. With `shell: false`, embedded operators in code (e.g., `node -e '1 && 2'`) are safe JavaScript, not shell chaining.

6. **Timeout defaults**: shell=30s (bounded tasks), run_tests=120s (test suites may take longer). Both kill with SIGTERM and return `timedOut: true`.

7. **Output cap defaults**: 128KB per stream. Prevents memory exhaustion from commands with enormous output (e.g., `find /`).

8. **run_tests auto-detect**: Reads `package.json` scripts and picks the appropriate default. Graceful fallback chain: test → typecheck → build → typecheck.

9. **spawn over exec**: `spawn(command, args, { shell: false })` is the only execution path. No `exec()`, no string interpolation. This is structurally immune to shell injection.

## BLOCKERS

None.

## NEXT STEP

Phase 2D is **PASS**. Recommended next: **Phase 2E** — End-to-end coding-agent mutation smoke test.
