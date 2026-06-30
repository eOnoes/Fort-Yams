# Phase 7I Final Audit Pattern — Audit-Only Phases

## When This Applies

When a phase is explicitly "audit-only" — no new features, no code changes beyond surgical fixes, no scope expansion.

## Audit Structure

### 1. Verify Everything Builds
```bash
pnpm --filter <all-packages> build
pnpm --filter <all-packages> test
```

### 2. Verify File Structure
Check that all expected folders, READMEs, and artifacts exist from previous phases.

### 3. Verify Import Boundaries
```bash
# Dashboard must have zero runtime imports
grep -r "from.*@tripp-reason" apps/dashboard/src/ --include="*.ts" --include="*.tsx" | grep -v "api/client" | grep -v "api/types"

# external-agents must only depend on zod
node -e "const p=require('./packages/external-agents/package.json'); console.log(Object.keys(p.dependencies||{}))"
```

### 4. Verify Safety Boundaries
- No live adapters
- No cloud transport enabled
- No secrets to cloud agents
- No ApprovalGate bypass
- No legacy modifications

### 5. Verify Traceability
- All event families present in schemas
- Trace commands operational
- Causal chain lookup works

### 6. Write Final Audit Report
```markdown
# Phase NI Report — Final Audit

## Phase Results Table
| Sub-phase | Status | Evidence |
|-----------|--------|----------|

## Validation
| Check | Result |
|-------|--------|

## Boundary Results
| Boundary | Status |
|----------|--------|

## Traceability Results
| Family | Coverage |
|--------|----------|

## Risks / Open Questions
## Next Step
```

## Pitfalls

### Do NOT add features during audit
If a missing feature is found, document it and recommend a correction phase. Don't implement it during audit.

### Do NOT expand scope
The audit validates what was built, not what could be built.

### Do NOT touch legacy
Legacy is read-only. Verify it's unchanged, don't modify it.

### Run ALL tests, not just the new ones
Previous phases' tests catch regressions. Run the full suite.

### If a build/test fails, fix surgically
Only minimum fix. Document in report. Don't refactor.

## Audit-Specific Commands
```bash
# Full test sweep
pnpm --filter <pkg1> test && pnpm --filter <pkg2> test

# Full build sweep  
pnpm --filter <pkg1> build && pnpm --filter <pkg2> build

# Import boundary check
grep -r "from.*@tripp-reason" <dashboard-src> | grep -v api/

# File structure check
find .tripp/agents -type d | sort

# Dependency check
for pkg in <list>; do node -e "const p=require('./packages/'+'$pkg'+'/package.json'); const ws=Object.keys(p.dependencies||{}).filter(d=>d.startsWith('@tripp-reason')); console.log('$pkg:', ws.join(', ')||'none')"; done
```

## Report Delivery

Audit reports follow the same pattern as build phase reports — write to `reports/phase-Ni-final-audit-report.md`, deliver via MEDIA: with a brief PASS/FAIL summary. Do NOT paste the full report inline.
