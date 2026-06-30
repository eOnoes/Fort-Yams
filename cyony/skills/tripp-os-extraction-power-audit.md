# Tripp.OS Extraction Boundary Power Audit

## When to Use

After completing extraction stages (packages moved, compatibility barrels wired) but BEFORE sign-off. This is a post-extraction verification — audit only, no build, no fix.

## Audit Steps (Stage 4 Methodology)

### 1. File-Tree Inventory

```bash
find packages/@tripp-os -type f -name '*.ts' | sort
find packages/shared/src -type f | sort
find packages/external-agents/src -type f | sort
```

### 2. Source-Level Export Review

Read every source file in the extracted packages. Check:
- All imports are from `zod`, node built-ins, or the package itself — never `@tripp-reason/*`
- All exports are self-contained, no ReasonLoop references
- JSDoc namespace matches the new package name

### 3. SHA-256 File Identity Check

Compare extraction source vs barrel originals:

```python
import hashlib
for f in files:
    bus_hash = hashlib.sha256(open(f"packages/@tripp-os/agent-bus/src/{f}").read().encode()).hexdigest()[:12]
    ext_hash = hashlib.sha256(open(f"packages/external-agents/src/{f}").read().encode()).hexdigest()[:12]
    match = "MATCH" if bus == ext else "DIFF"
```

If DIFF: run `diff -u` to confirm only JSDoc namespace changes. Zero functional diffs allowed.

### 4. Cross-Package Duplicate Export Scan

Extract every export name from every package, group by name, flag cross-package collisions:

```python
import re
# Scan for: export const, export type, export interface, export function
# Group by export name, report names appearing in >1 package
```

Expected result:
- **agent-bus vs shared**: ZERO overlap
- **contracts vs shared**: some overlap (status enums re-exported, StreamEvent variants, core interfaces)

### 5. Duplicate Classification Taxonomy

For every duplicate found, classify:

| Classification | Definition | Action |
|---------------|-----------|--------|
| **Intentional compatibility alias** | Same name, compatible shape, different format (interface vs Zod schema). Serves same concept at different layer. | Document, defer resolution to Runtime design |
| **Intentional compatibility shim** | Same name, DIFFERENT shape (e.g., broader vs narrower StreamEvent). Serves different granularity layer. | Document, note for Stage 5 reconciliation |
| **Divergent / blocking** | Same name, incompatible shape, accidental collision. | Stop and report |
| **Temporary shim** | Known to be temporary, planned removal. | Document with removal timeline |
| **Future cleanup** | Low-priority, noted for later. | Document |

### 6. Import Path Preservation Audit

Grep for ALL old import paths across the entire monorepo:

```bash
grep -rn "from '@tripp-reason/shared'" packages/*/src --include='*.ts'
grep -rn "from '@tripp-reason/external-agents'" packages/*/src --include='*.ts'
```

Expected: all old paths still resolve through re-export barrels. Zero consumer changes.

Also grep for direct Tripp.OS imports (should only be in barrel files):

```bash
grep -rn "from '@tripp-os/contracts'" packages/*/src --include='*.ts'
grep -rn "from '@tripp-os/agent-bus'" packages/*/src --include='*.ts'
```

### 7. Forbidden Content Scan

Boolean checks — any hit is a scope violation:

```bash
# Must all return zero hits
grep -r "Runtime" packages/@tripp-os/src --include='*.ts' | grep -v "JSDoc\|comment\|runtime checks\|What a Tool"
grep -ri "hermes.*adapter\|hermes.*live\|hermes.*connect" packages/@tripp-os/src --include='*.ts'
grep -ri "openclaw.*adapter\|openclaw.*live" packages/@tripp-os/src --include='*.ts'
grep -ri "codex.*adapter" packages/@tripp-os/src --include='*.ts'
grep -ri "extract.*mcp\|mcp.*extract" packages/@tripp-os/src --include='*.ts'
grep -ri "stage.?1b\|v5.*contract" packages/@tripp-os/src --include='*.ts'
```

### 8. Validation Chain

Run in this exact order:

```bash
# Tripp.OS packages first
cd packages/@tripp-os/contracts && npx tsc --build         # must pass
cd packages/@tripp-os/contracts && npx vitest run            # may have no tests (contracts = types only)
cd packages/@tripp-os/agent-bus && npx tsc --build           # must pass
cd packages/@tripp-os/agent-bus && npx vitest run            # 68/68 expected

# Tripp.Reason consumers next
cd packages/cli && npx vitest run                            # 40/40 expected
cd packages/server && npx tsc --noEmit                       # must pass
cd apps/dashboard && npx tsc --noEmit                         # must pass
```

### 9. Reason-Specific Confirmation

Verify ALL ReasonLoop-shaped schemas remain in `@tripp-reason/shared`:
- `Message`, `ChatMessage`, `Session`, `Run`, `Event`, `ToolCall`, `ApprovalRecord`, `ReportRecord`
- `ProviderRequestSchema`, `ApprovalRequestSchema`, `ApprovalResultSchema`, `ToolResultSchema` (Reason-specific Zod shapes)
- `StreamEvent*` family (ReasonLoop-shaped, `role: z.literal("assistant")`)
- `RunReport`, `ToolCallSummary`, `PersistenceWarning`

None of these were moved into Tripp.OS packages.

### 10. Adapter/Feature Creep Check

Confirm ZERO of the following were added:
- Runtime implementation
- Hermes adapter code
- OpenClaw adapter code
- Codex adapter code
- Dashboard/API/server features
- MCP/store extraction
- Stage 1B/v5 contract expansion
- Windows Job Object / process manager
- New packet behavior
- Broad Tripp.Reason refactor

## Report Template

```markdown
# Tripp.OS Stage N — Extraction Boundary Power Audit Report

## PHASE — Stage N
## STATUS — PASS / PARTIAL / FAIL
## AUDIT SCOPE — Audit-only, no changes
## CONTRACTS PACKAGE AUDIT — dependency surface + export inventory + verdict
## AGENT BUS PACKAGE AUDIT — dependency surface + export inventory + verdict
## FILE IDENTITY — SHA comparison results
## CROSS-PACKAGE DUPLICATE SCAN — table of all overlaps with classifications
## IMPORT PATH PRESERVATION — old paths, consumer counts, direct Tripp.OS imports
## REASON-SPECIFIC CONFIRMATION — list of exports staying in Reason
## VALIDATION RESULTS — table with commands, exit codes, results
## FORBIDDEN CONTENT SCAN — table of checks
## BLOCKERS — list or None
## DRIFT / SCOPE WATCH — confirmation of all forbidden items absent
## FINDINGS — any non-blocking observations
```

## Stage 4A — Contracts Reconciliation Addendum Pattern

When the Stage 4 audit finds mismatches between the original planning inventory and the actual package surface, run a reconciliation pass (Stage 4A) to close the gaps BEFORE Stage 5 begins.

### Mismatch 1: Version Constant Name

If the planning doc specified `PACKAGE_CONTRACT_VERSION` but the implementation uses `CONTRACTS_VERSION`, add a non-breaking alias:

```typescript
export const PACKAGE_CONTRACT_VERSION = CONTRACTS_VERSION;
```

Don't rename the existing constant — that would break consumers. Just add the alias.

### Mismatch 2: Export Count Discrepancy

When the planning inventory reports N exports but the audit finds M:

1. List each export category side-by-side (planned vs actual)
2. Classify each delta as one of:
   - **Inventory miscount**: plan said "10 enums" but only listed 9 — the count was wrong, the list was right
   - **Intentional scope revision**: implementation added recommended extras (e.g., generic helper types the inventory itself recommended)
   - **Implementation drift**: unexpected changes — stop and report
   - **Report error**: audit itself miscounted
3. Confirm no PLANNED exports are MISSING (superset is OK, subset is not)

### Mismatch 3: Missing Tests

If the planning inventory promised tests but none exist:

1. Check if the "test count" was actually a proxy for downstream validation (e.g., "CLI 40 + agent-bus 68 runs after this")
2. Add minimal smoke tests covering:
   - Version constants (exist + match expected values)
   - Status enum exports (exist + are ZodTypes)
   - Generic interface shapes (assignable)
   - StreamEvent schemas (parse valid input)
   - No ReasonLoop/Runtime/MCP/Goose leakage in export names
3. Use `vitest` — same runner as the rest of the monorepo
4. Exclude `src/__tests__` from `tsc --build` in tsconfig

See `templates/contracts-smoke-test.template.ts` for a reusable starting point.

### Reconciliation Report

Produce a separate `reports/tripp-os-stage-4a-contracts-reconciliation-report.md` with:

```markdown
## MISMATCH N — NAME
**Stage 1 claimed:** ...
**Stage 4 found:** ...
**Correction applied:** ...
**Classification:** inventory miscount / intentional scope revision / etc.
```

### Validation After Reconciliation

Same chain as Stage 4: contracts build → contracts test → agent-bus test → CLI test → server typecheck → dashboard typecheck.

---

## Pitfalls

- **pnpm --filter passthrough**: Don't use `pnpm -r run build --filter @pkg` — the filter leaks into sub-script argv. Use `cd packages/@pkg && npx tsc --build` instead.
- **read_file dedup**: Reading same-named files from different packages may be blocked. Use `terminal` with `cat` as bypass.
- **Don't fix findings during audit**: Audit mode is read-only. Classify, don't patch. Any rewrites belong in their own stage.
- **\"FinishReason\" false positive in leakage scan**: The enum name `FinishReason` / `FinishReasonSchema` contains \"Reason\" but is NOT a Tripp.Reason reference — it's a generic lifecycle enum. Exclude it from the forbidden-terms scan in smoke tests.
