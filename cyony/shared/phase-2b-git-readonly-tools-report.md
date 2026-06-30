# Phase 2B Git Read-Only Tools Report

## PHASE

Phase 2B — Git Read-Only Tools / Mutation Baseline Visibility

## STATUS

PASS

## MODEL TIERS USED

- Code Review / Warden Pass — git boundary/safety behavior, output-capping decisions
- Fast Technical Builder — tool implementation, validation scripts

## FILES CREATED

- `packages/tools/src/gitStatus.ts` — Read-only git_status tool
- `packages/tools/src/gitDiff.ts` — Read-only git_diff tool
- `reports/phase-2b-git-readonly-tools-report.md` — This report

## FILES MODIFIED

- `packages/tools/src/index.ts` — Added git tool exports + `activeTools` array
- `.gitignore` — Added to exclude node_modules, dist, tsbuildinfo
- Repository initialized with `git init` (no remote)

## GIT TOOLS CREATED

### git_status

- **name**: `git_status`
- **requiresApproval**: `false`
- **command**: `git status --short --branch`
- **invocation**: `execFile("git", ["status", "--short", "--branch"], ...)` — no shell
- **input**: `{ path?: string, maxBytes?: number }`
- **output**: `{ branchLine?, entries[], raw, truncated, cwd }`
- Parses branch line (## prefix) separately from file status entries
- cwd resolved through pathSafety

### git_diff

- **name**: `git_diff`
- **requiresApproval**: `false`
- **commands**: `git diff [--cached] [--stat] [-- <path>]`
- **invocation**: `execFile("git", args[], ...)` — no shell, args built deterministically
- **input**: `{ path?: string, staged?: boolean, statOnly?: boolean, maxBytes?: number }`
- **output**: `{ staged, statOnly, path?, raw, truncated, cwd }`
- Defaults: `statOnly=true`, `staged=false`
- Path is resolved through pathSafety, then converted to repo-relative for git

## ACTIVE TOOLS

After this phase, the default active tool set is:

1. `list_dir` — Directory listing (Phase 1E)
2. `read_file` — File reading (Phase 1E)
3. `search` — Text search (Phase 1E)
4. `git_status` — Git status (Phase 2B) ← NEW
5. `git_diff` — Git diff (Phase 2B) ← NEW

Exported via `activeTools` array for one-line dispatcher population.

## GATED CONTRACT-ONLY TOOLS

Confirmed still contract-only (requiresApproval=true, execute returns error):

- `write_file` — Not activated, no mutation
- `edit_file` — Not activated, no mutation
- `shell` — Not activated, no execution

## VALIDATION RESULT

| Command | Result |
|---------|--------|
| `pnpm typecheck` | 6/6 packages → 0 errors |
| `pnpm build` | 6/6 packages → Done |

## SMOKE TEST RESULT

All 9 smoke tests passed against a real git repository:

| # | Test | Result |
|---|------|--------|
| 1 | git_status in repo workdir | ✅ ok, 0 entries (clean), branchLine=## master |
| 2 | git_diff statOnly | ✅ ok, 0 bytes (clean) |
| 3 | git_diff staged | ✅ ok, staged=true |
| 4 | git_diff with path filter (statOnly=false) | ✅ ok, full diff returned |
| 5 | Path traversal rejected | ✅ error, "Path traversal detected" |
| 6 | Non-git directory | ✅ error, "Not a git repository" |
| 7 | Output cap (maxBytes=50) | ✅ raw length ≤ 50 |
| 8 | activeTools list = 5 tools | ✅ [list_dir, read_file, search, git_status, git_diff] |
| 9 | Gated tools contract-only | ✅ all 3 return error + requiresApproval=true |

**With controlled diff (staged file + untracked file):**

| Test | Result |
|------|--------|
| git_status shows entries | ✅ entries=["M packages/tools/src/gitStatus.ts", "?? test-temp.md"] |
| git_diff --cached --stat | ✅ "1 file changed, 1 insertion(+)" |
| git_diff --cached -- <path> | ✅ Full diff with hunk header |

## SECURITY / SAFETY CHECKS

- ✅ Read-only git commands only (status, diff — no add/commit/checkout/etc.)
- ✅ No shell string execution (uses `execFile` with explicit args array)
- ✅ No shell chaining (args built via `buildArgs()`, no string concatenation)
- ✅ cwd/workdir boundary enforced via `resolveSafePath()`
- ✅ Output capped (default 64KB, configurable via maxBytes)
- ✅ Timeout enforced (10 seconds, SIGKILL on timeout)
- ✅ Controlled errors: ENOENT → "git not found", timeout → controlled message, non-git → "Not a git repository"
- ✅ No raw stack traces leaked to tool output

## SCOPE COMPLIANCE

- ✅ No mutating tools activated
- ✅ write_file/edit_file/shell remain contract-only
- ✅ No general shell tool exists
- ✅ No server/MCP/swarm/UI created
- ✅ No new provider implementation
- ✅ No Goose code copied
- ✅ Dependency direction valid: tools imports only @tripp-reason/shared + node built-ins
- ✅ child_process used ONLY inside gitStatus.ts and gitDiff.ts

## DESIGN DECISIONS

1. **Git invocation**: `execFile` from `node:child_process` (promisified). Never uses `exec()` or `shell: true`. This prevents all shell injection vectors.

2. **Allowed command set**: Hardcoded arg arrays — `["status", "--short", "--branch"]` for status; dynamically built `["diff", "--cached"?, "--stat"?, "--"?, <path>?]` for diff. No other git subcommands are reachable.

3. **Output cap**: Default 64KB (`maxBytes`). Applied via Node's `maxBuffer` option on execFile, which kills the process on overflow. Additionally truncates `raw` string on return if it exceeds cap.

4. **Timeout**: 10 seconds. Enforced via execFile `timeout` option + `killSignal: "SIGKILL"`. Returns controlled error message on timeout.

5. **statOnly default**: `true`. Most diff use cases want summary first. Full diff opt-in via `statOnly: false`. This prevents accidentally dumping huge diffs.

6. **Dispatcher registration**: Tools exported individually + aggregated in `activeTools` array. Consumers can register all 5 with `createDispatcher(activeTools)`.

7. **Git repo initialization**: Initialized `.git` in the Tripp.Reason directory (was not previously a git repo) and committed the existing codebase. Added `.gitignore` to exclude node_modules/dist/build artifacts.

8. **No store schema changes**: git tools are stateless and read-only — no persistence needed.

## BLOCKERS

None.

## NEXT STEP

Phase 2B is **PASS**. Recommended next: **Phase 2C** — write_file/edit_file behind ApprovalGate.
