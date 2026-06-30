# Tripp.Reason Chained Audit Pattern

Reusable template for multi-stage chained audits where each stage gates progression to the next.
Used for the Phase 8-J timeout hardening chain (Stages 2A→2B→2C→2D).

## Chain Structure

```
Stage N-A  →  Stage N-B  →  Stage N-C  →  Stage N-D (Consolidation)
   ↓ pass        ↓ pass        ↓ pass            ↓ pass
 continue      continue      continue      DELIVER FINAL
```

**Rule:** Do NOT stop after every clean audit. Stop ONLY for real blockers: validation failure, drift, scope risk, ownership-boundary risk, or operator approval requirement.

## Stop Conditions (Mandatory)

Stop immediately if:
- Validation fails (typecheck break, test failure)
- Typecheck reveals runtime/source errors outside test files
- Package-lock changes unexpectedly
- Dependency changes are required
- Package drift appears outside approved script/test hardening
- Source changes are required outside the target repo
- Runtime command execution becomes less guarded
- Live agents become enabled
- Fake/manual defaults change
- Shared-agent-bus mutation is needed
- Ownership boundary is crossed
- Unknown drift appears
- Next gate requires operator approval

## Decision Tokens Per Stage

Each stage gets its own decision token namespace:

```
TRIPP_REASON_<STAGE>_PASS_<SPECIFIC_RESULT>_CHAINING_TO_<NEXT>
TRIPP_REASON_<STAGE>_PASS_AUDIT_ONLY_<FINDING>_CHAINING_TO_<NEXT>
TRIPP_REASON_<STAGE>_BLOCKED_<REASON>
```

## Allowed vs Forbidden Per Stage

### Allowed (audits can do these without stopping)

- Read-only audit
- Focused tests
- Report creation
- Minimal local test/type hardening (obvious, low-risk, within target)
- Adding missing package scripts pointing to existing tests
- Documentation/report updates

### Forbidden (must stop chain if encountered)

- Dependency installs without approval
- Runtime architecture changes
- New transport / live-agent activation
- Command-execution loosening
- Schema/contract changes without separate gate
- Weakening tsconfig strictness
- Adding `any` casts hiding real defects
- Changing runtime source to satisfy tests
- Changing public schemas without contract gate
- Broad cleanup commands
- Delete/reset/revert operations

## Report Format Per Stage

Each stage report should be compact (the full version lives on disk):

```
# Tripp.Reason — Stage <Name>: <Title>
**Generated:** <timestamp> | **Auditor:** Cyony (Oni)

## Final Decision
<DECISION_TOKEN> — <one-line summary>

## 1. <Key Finding>
## 2. Validation
- Typecheck: <result> | Tests: <count> | Lockfile: <clean/drift>

**Files changed:** <list or "None">
```

## Common Stage Types

### Typecheck Triage Stage
1. Reproduce errors (`pnpm --filter <pkg> typecheck`)
2. Confirm scope (test files only? or source?)
3. Classify cause (strict null on optional schema fields)
4. Patch (non-null assertions or optional chaining in tests)
5. Validate (full typecheck + full test matrix)

### Package Script Coverage Stage
1. List all packages: test files, test scripts, vitest config, devDeps
2. Classify: has tests+script / has tests no script / no tests no script
3. Decision: add scripts (only if tests exist and no new deps needed) or accept

### Timeout Hardening Stage
1. Check every timeout: bounded max, timers cleared, fail-closed classification
2. Confirm timed-out work cannot mutate packet lifecycle
3. Confirm command execution paths behind ApprovalGate
4. Confirm fake/manual transport remains default
5. Sweep for: unbounded retries, polling, background loops, live agents
6. Check trace events for timeout failure coverage

### Consolidation Stage
1. Summarize all prior stages: decision + key result per stage
2. Final validation matrix (typecheck, tests, lockfile, git, boundaries)
3. List files changed across entire chain
4. List remaining yellow flags
5. State chain stop reason
6. Recommend next marker

## Pitfalls

- **Don't stop after clean audits** — the chain rule is "keep moving." Only stop for real blockers.
- **external-agents has tests but no script**: 3 test files, no vitest devDep. Adding a script requires adding vitest → violates "no deps" rule. Accept as-is.
- **Test file type errors**: Fix with non-null assertions (`!`), NOT by weakening tsconfig or changing schemas.
- **pnpm PATH**: Every pnpm command needs `export PATH="/usr/share/nodejs/corepack/shims:$PATH"`.
- **Report accumulation**: Each stage's report goes to `reports/`. Consolidation report references all prior reports.
