# Tripp.OS Extraction Readiness Audit Pattern

## When to use
When assessing which Tripp.Reason packages can become Tripp.OS shared packages.

## Methodology (Phase 7I proven)

### 1. Dependency Truth Matrix
For every package in the monorepo, collect:
- `package.json` dependencies (workspace + external)
- Actual `from "@tripp-reason/*"` imports in source (not just package.json)
- Reason-specific naming (`ReasonLoop`, `RunReport`, `Session`)
- Hardcoded brand strings (`Tripp.Reason`, `Eddie`)

Command:
```bash
for pkg in shared store core providers tools mcp swarm external-agents server cli; do
  node -e "const p=require('./packages/' + '$pkg' + '/package.json');
    const deps = Object.keys(p.dependencies||{});
    const ws = deps.filter(d=>d.startsWith('@tripp-reason'));
    console.log('$pkg ws:', ws.join(',')||'none', 'ext:', deps.filter(d=>!d.startsWith('@tripp-reason')).join(',')||'none');"
done
```

### 2. Reason-Specific Coupling Scan
```bash
grep -rn "@tripp-reason\|Reason\|reason" packages/<pkg>/src/ --include="*.ts" | grep -v "__tests__" | grep -v "node_modules"
grep -rn "Tripp\.Reason\|Eddie\|openclaw\|hermes" packages/<pkg>/src/ --include="*.ts"
```

### 3. Export Surface Inventory
```bash
grep "^export " packages/<pkg>/src/index.ts
grep "^export const.*Schema\|^export interface\|^export type\|^export function\|^export async" packages/<pkg>/src/*.ts
```

### 4. Classification
| Dependency Level | Classification | Action |
|-----------------|---------------|--------|
| Zero workspace deps, only external (zod) | EXTRACT NOW | Copy, rename namespace, update JSDoc |
| Only imports from shared (generic half) | EXTRACT AFTER CLEANUP | Split shared first, then extract |
| Imports Reason-specific schemas | EXTRACT LATER (split) | Split into generic + Reason halves |
| Full ReasonLoop dependency | KEEP REASON-SPECIFIC | Don't extract |
| Assembly layer (imports everything) | KEEP REASON-SPECIFIC | Server + CLI stay |

### 5. Compatibility Matrix
Map Tripp.Control concepts against Reason schemas:
- Agent roles (`openclaw_tripp`, `hermes_cyony`, `openclaw_echo`) — already unified
- Governance trace — same JSONL append-only concept
- Review gate — same advisory Warden pattern
- Task schema — different shapes but compatible
- Budget/Forge — Control has these, Reason doesn't need them → goes in `@tripp-os/contracts`

### 6. Extraction Plan
Stage 1: Package boundary map (this audit)
Stage 2: Compatibility matrix with Tripp.Control
Stage 3: Extract `@tripp-os/contracts` from shared (lowest risk first)
Stage 4: Extract `@tripp-os/agent-bus` from external-agents (zero code changes)
Stage 5: Add compatibility aliases (backward compat)
Stage 6: Extract `@tripp-os/mcp` after contracts stabilize
Stage 7: Full validation (all tests, all builds)
Stage 8: Consider store split (defer — high risk)

### Key Finding from Phase 7I
`@tripp-reason/external-agents` depends ONLY on `zod`. Zero workspace deps. It is the strongest extraction candidate. It can become `@tripp-os/agent-bus` with no behavior changes — only JSDoc namespace updates.

## Stage 1/2 Detailed Inventory Format

When Kimi/Eddie requests a precise extraction inventory before implementation (\"don't move files yet, tell me exactly what moves\"), use this format:

### Per-Stage Sections
```markdown
## STAGE N — <NAME> INVENTORY

### Exact Files Moving
| # | Source File | Target Path | Why Safe | Dependencies | Reason-Specific? |
|---|------------|-------------|----------|-------------|-----------------|

### Exact Exports Moving
| Export Name | Type | Source File | → Target File | Dependencies | Safe? | Notes |
|------------|------|-------------|---------------|-------------|-------|-------|

### Exact Exports Staying
| Export Name | Why It Stays | Reason-Specific? | Future Extract? |
|------------|-------------|-----------------|----------------|

### Compatibility Re-export Shape
Show the exact code for the re-export barrel file.

### Versioning
```
@tripp-os/<pkg> version: 0.1.0
```

### Stage N Tests
| # | Test File | Command | What It Proves | Pre | Post |
|---|----------|---------|---------------|-----|------|

### Standalone Behavior Test (Stage 2+)
Prove the extracted package works without Tripp.Reason present.
```

### Inventory Commands
```bash
# Full export surface per file
for f in packages/<pkg>/src/*.ts; do
  echo "--- $(basename $f) ---"
  grep "^export " "$f" | sed 's/export //' | sed 's/ =.*//' | sed 's/(.*//' | sort -u
done

# Internal dependency edges
for f in packages/<pkg>/src/*.ts; do
  echo -n "$(basename $f): "
  grep "from \"\./" "$f" | sed 's/.*from "\.\//  → /' | sed 's/".*//' | sort -u
done

# Consumer count per export (blast radius)
for exp in <export-list>; do
  count=$(grep -rl "\b${exp}\b" packages/*/src --include="*.ts" | grep -v <pkg>/src | grep -v __tests__ | wc -l)
  echo "  $exp: $count packages"
done

# Reason-specific coupling
grep -rn "@tripp-reason\|Reason\|reason" packages/<pkg>/src/ --include="*.ts" | grep -v __tests__
```

### Key Risk: Interface Dependencies
When extracting interfaces from shared → contracts, check whether the interfaces import types that will stay in Reason. If they do (e.g., `Tool` imports `ToolResult` from `schemas.ts` that stays), define generic versions of those types in contracts first. This is the **only non-trivial code change** in Stage 1.
