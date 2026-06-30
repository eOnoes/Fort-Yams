# Tripp.Reason Read-Only Audit Pattern

Reusable template for read-only safety/readiness audits of Tripp.Reason. Used for Phase 8F, 8H, and package/timeout audits.

## Audit Template Sections

1. **Active Repo Proof** — absolute path, git top-level, branch, HEAD, PM, Node/npm versions
2. **Git Status Summary** — `git status --short` + last 10 commits
3. **Package.json Script Inventory** — root + all workspace packages, status per script
4. **Lockfile Status** — lockfile type, size, frozen install pass/fail
5. **Validation / Test Matrix** — per-package test counts, typecheck results, pass/fail
6. **Timeout Handling Findings** — grep for setTimeout/clearTimeout/AbortController/Promise.race; check for unbounded awaits, missing abort, polling loops
7. **Runtime Queue Findings** — check approval queue, event stream, queue boundedness
8. **Runtime Trace Findings** — verify all required lifecycle events defined in trace schemas, runtime validators
9. **Runtime Approval Findings** — verify ApprovalGate presence, fail-closed behavior, test coverage
10. **Runtime Adapter Findings** — verify only fake/manual dispatch implemented, no live transport
11. **Agent-Bus Findings** — schemas, fileBus, transport safety rules, test coverage
12. **Contracts/Schema Findings** — contract definitions, status enums, tests
13. **Forbidden Behavior Findings** — live agents, command execution, polling, unsafe network, packet mutation
14. **Drift Classification** — classify each artifact: expected, accepted, unknown, unsafe
15. **Files Changed** — always "None" for read-only audits
16. **Tripp.Control Untouched Proof** — verify not present or unmodified
17. **Tripp.OS Untouched Proof** — verify no standalone Tripp.OS modified
18. **Shared-Agent-Bus Untouched Proof** — verify no standalone bus modified
19. **Recommended Next Marker** — decision token + audit chaining assessment

## Decision Tokens

```
TRIPP_REASON_<AUDIT_TYPE>_PASS_READY_FOR_NEXT_REASON_GATE
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_VALIDATION_FAILURE
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_TEST_TIMEOUT_FAILURE
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_PACKAGE_DRIFT
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_PACKAGE_LOCK_DRIFT
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_RUNTIME_TIMEOUT_RISK
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_RUNTIME_SCOPE_RISK
TRIPP_REASON_<AUDIT_TYPE>_BLOCKED_OWNERSHIP_BOUNDARY_VIOLATION
```

## Inspection Commands (read-only)

```bash
# Baseline
pwd && git rev-parse --show-toplevel && git branch --show-current
git log --oneline -n 10 && git status --short
node -v && npm -v

# Package manager check
ls -la package.json pnpm-lock.yaml pnpm-workspace.yaml

# Lockfile integrity
pnpm install --frozen-lockfile

# Typecheck + tests (with PATH fix)
export PATH="/usr/share/nodejs/corepack/shims:$PATH"
pnpm typecheck
pnpm test

# Timeout patterns
rg -l "setTimeout|clearTimeout|AbortController|Promise.race" --glob "*.ts" packages/

# Forbidden patterns
rg -l "child_process|exec\(|spawn\(|execSync" --glob "*.ts" packages/
rg -l "setInterval|while.*true" --glob "*.ts" packages/
```

## Report Format

- Write to `reports/tripp-reason-<audit-slug>-report.md`
- Deliver as compact code block in chat (per phase-report-delivery skill)
- Always include the decision token on line 3
- Tables use `| Property | Value |` format
- Verdict per section: ✓ PASS / ⚠️ CAUTION / ✗ BLOCKING

## Pitfalls

- **pnpm not on PATH**: Always export PATH before any pnpm command on this VPS
- **npm run scripts call pnpm**: Can't use `npm run test` directly — use `pnpm test` with PATH set
- **Test files with type errors**: CLI test files may have strict null-check TS errors on `result.metadata`. These are known Phase 8 artifacts — check whether errors are in `__tests__/` or source
- **external-agents has tests but no script**: The package has 3 test files under `src/__tests__/` but no `"test"` script in package.json. Tests run only through global `pnpm test`
- **Non-test packages**: 10 of 14 packages lack `test` scripts. This is a known Phase 7/8 design artifact — CLI is the primary test harness
- **Block vs block**: `ExternalAgentDispatchStatus` includes `"blocked"` (past tense) not `"block"` — schema validation rejects the wrong form
