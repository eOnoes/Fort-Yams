# Comprehensive Audit Sweep Template

For Tripp.Reason package/timeout/runtime readiness audits and similar deep-dive sweeps. This is the 16-section structure used in the 2026-06-07 package/timeout audit.

## Report Structure

```
1. FINAL DECISION — decision marker block (first thing visible)
2. Active Repo Proof — path, git, branch, HEAD, node/npm/pnpm, lockfile
3. Git Status Summary — clean/dirty, untracked classification
4. Package.json Script Inventory — table: build/typecheck/test/clean/validate per package
5. Validation/Test Matrix — per-package test counts, typecheck, lockfile check
6. Timeout Handling Findings — per-component: mechanism, default, trace, verdict
7. Runtime Queue Findings — polling loops, unbounded awaits, expiry timers
8. Runtime Trace Findings — event type coverage, emission safety, causal chains
9. Runtime Approval Findings — fail-closed posture, trace events
10. Runtime Adapter Findings — named-agent separation, transport stubs, fake-only
11. Agent-Bus Findings — test counts, usage pattern, mutation paths
12. Contracts/Schema Findings — test counts, Zod validation, classification
13. Forbidden Behavior Sweep — 7-item forbidden list, cross-project references
14. Drift Classification — source, lockfile, deps, artifacts, untracked
15. Files Changed — always "None" for read-only audits
16. Boundary Proofs — Tripp.Control, Tripp.OS, shared-agent-bus, Codex, live agents
17. Recommended Next Marker — chaining-ready marker
```

## Decision Marker Convention

Follow the existing naming convention:
```
TRIPP_REASON_{AUDIT_TYPE}_{VERDICT}_{REASON}
```

Examples:
- `TRIPP_REASON_PACKAGE_TIMEOUT_AUDIT_PASS_READY_FOR_NEXT_REASON_GATE`
- `TRIPP_REASON_PACKAGE_TIMEOUT_AUDIT_BLOCKED_PACKAGE_DRIFT`
- `TRIPP_REASON_PACKAGE_TIMEOUT_AUDIT_BLOCKED_RUNTIME_TIMEOUT_RISK`

## Audit Flow

1. **Read-only first** — confirm identity, inventory, validate
2. **Deep-dive components** — timeout, queue, trace, approval, adapter, bus, contracts
3. **Safety sweep** — forbidden terms, cross-project references, boundary violations
4. **Classify drift** — expected vs unexpected untracked files
5. **Deliver report** — MD to disk + HTML for mobile + compact chat summary

## Key Verification Commands

```bash
# Identity
pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short
git log --oneline -5 && node -v && npm -v

# Package manager
npx --yes pnpm@9 -v && ls pnpm-lock.yaml package-lock.json 2>/dev/null

# Script inventory
for d in packages/*/ packages/@*/**/; do node -e "const p=require('./${d}pack...')" ; done

# Validation
npx --yes pnpm@9 typecheck && npx --yes pnpm@9 test

# Lockfile
npx --yes pnpm@9 install --frozen-lockfile
sha256sum pnpm-lock.yaml | cut -c1-16
```

## Forbidden Terms Search

```bash
grep -rn "Tripp\.Control\|Tripp\.OS\|shared-agent-bus\|live.dispatch\|live_dispatch\|experimental_live\|dispatchToReal\|setInterval\|while.*true\|child_process\|execSync\|spawnSync" --include="*.ts" src/
```

All hits should be either:
1. Forbidden-actions lists (the enforcement)
2. Test assertions (verifying absence)
3. Documentation comments (stating boundaries)

## Pitfalls

- **pnpm not on PATH**: Use `npx --yes pnpm@9` — works everywhere
- **Lockfile drift check**: `pnpm install --frozen-lockfile` output says "Already up to date"
- **Untracked reports**: Classify as "expected accepted artifacts" — don't flag as drift
- **Packages without test scripts**: Non-blocking gap — document, don't block
- **Source file boundary checks**: Strip comments before regex matching to avoid false positives from doc strings
- **`@tripp-os/contracts` mentions Tripp.OS**: These are self-referential package comments — expected, not violations
