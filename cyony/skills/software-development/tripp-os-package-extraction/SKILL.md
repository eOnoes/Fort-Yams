---
name: tripp-os-package-extraction
description: Extract portable Tripp.OS packages (@tripp-os/*) from Tripp.Reason or Tripp.Control — copy source, update namespaces, wire compatibility re-export barrels, handle isolatedModules type exports, update workspace config
trigger: Extracting a package from a Tripp.* monorepo into @tripp-os/*; creating a new @tripp-os/* package; wiring compatibility re-exports; migrating a package from @tripp-reason/* to @tripp-os/*
tags: [tripp-os, extraction, migration, monorepo, compatibility, re-export, contracts, agent-bus]
---

# Tripp.OS Package Extraction Pattern

Extract portable packages from Tripp.* builds (Reason, Control) into `@tripp-os/*` scoped packages. The core principle: **copy source, add compatibility barrel, verify zero consumer breakage, then optionally deprecate the old package.**

## When to Use

- Extracting `@tripp-os/contracts` from `@tripp-reason/shared` (generic status enums + interfaces)
- Extracting `@tripp-os/agent-bus` from `@tripp-reason/external-agents` (full package move)
- Any future Tripp.OS extraction from Tripp.Control, Tripp.Echo, etc.

## When NOT to Use

- Creating a package from scratch with no source package
- Refactoring an existing package in-place
- Moving runtime/execution code (blocked until Stage 4+ power audit)

## The Pattern

### Step 1 — Create the target package scaffold

```bash
mkdir -p packages/@tripp-os/<name>/src/__tests__
```

Create `package.json` with:
- `"name": "@tripp-os/<name>"`, `"version": "0.1.0"`
- Same `type`, `main`, `types`, `exports` shape as the source
- Same production dependencies (zod, etc.)
- Same devDependencies (@types/node, vitest if applicable)
- Workspace ref `"@tripp-os/contracts": "workspace:*"` if needed

Create `tsconfig.json`:
- `"extends": "../../../tsconfig.base.json"` (3 levels up from `packages/@tripp-os/<name>/`)
- Standard `outDir: "dist"`, `rootDir: "src"`, `declaration: true`
- Exclude `dist`, `node_modules`, `src/__tests__`

### Step 2 — Update workspace config

If this is the first `@tripp-os/*` package, add to `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "packages/@tripp-os/*"    # ← ADD THIS
  - "apps/*"
```

Run `pnpm install` after.

### Step 3 — Copy source files

Copy all source files from the origin package to the target:

```bash
for f in file1 file2 file3; do
  cp packages/<origin>/src/${f}.ts packages/@tripp-os/<name>/src/${f}.ts
done
```

**DO NOT move the files** — keep the origin intact. The origin becomes a compatibility re-export barrel.

### Step 4 — Update JSDoc namespaces

Replace all namespace references in source files:

```bash
sed -i 's/@tripp-reason\/<origin>/@tripp-os\/<name>/g' *.ts
```

Check for user-facing string references to "Tripp.Reason" that should stay (approval boundary messages, role names). Only update JSDoc `@trip-*` headers and comment strings like "Tripp.Reason-generated" → "Agent Bus".

### Step 5 — Wire compatibility re-export barrel

Rewrite the origin package's `index.ts` (or the specific file being extracted) as a re-export barrel:

```typescript
// packages/<origin>/src/index.ts
export * from "@tripp-os/<name>";
```

Update the origin's `package.json` to add `"@tripp-os/<name>": "workspace:*"` dependency and **remove** `vitest` from devDeps (tests now live in the extracted package).

### Step 6 — Handle isolatedModules type re-exports (PITFALL)

When a source file re-exports from the extracted package and `isolatedModules: true` is in tsconfig.base.json:

**WRONG** (fails with TS1205):
```typescript
export { RunStatus, RunStatusSchema } from "@tripp-os/contracts";
```

**RIGHT** (separate value and type exports):
```typescript
export { RunStatusSchema } from "@tripp-os/contracts";          // value export
export type { RunStatus } from "@tripp-os/contracts";            // type export
```

`isolatedModules` requires `export type` for type-only re-exports. Split the export list into value exports (Zod schemas, constants, functions) and type exports (TypeScript types).

### Step 7 — Build and test

```bash
pnpm install
pnpm --filter @tripp-os/<name> build
pnpm --filter @tripp-os/<name> test
pnpm --filter <origin> build         # verify barrel works
pnpm --filter @tripp-reason/cli build  # verify consumers
pnpm --filter @tripp-reason/cli test
pnpm --filter @tripp-reason/server build
cd apps/dashboard && pnpm build
```

### Step 8 — Report

Write extraction report to `reports/tripp-os-stage-N-<name>-extraction-report.md`.

## Agent Bus Extraction (Stage 2 — full package move)

For the `@tripp-os/agent-bus` extraction from `@tripp-reason/external-agents`:

- **All 7 source files moved** (constants, schemas, fileBus, traceSchemas, traceLedger, transportSchemas, transport)
- **3 test files moved** (schemas.test.ts, fileBus.test.ts, traceLedger.test.ts)
- **68/68 tests** (inventory said 69 but actual count is 27+14+27=68 — always verify)
- **Origin becomes re-export barrel**: `export * from "@tripp-os/agent-bus"`
- **Zero consumer changes**: CLI and server import from `@tripp-reason/external-agents` which now re-exports transparently

## Contracts Extraction (Stage 1 + Stage 3 — split extraction)

For `@tripp-os/contracts` from `@tripp-reason/shared`:

- **Only generic types move** — status enums (9), interfaces (5), stream events (6)
- **Reason-specific schemas stay** — Session, Run, Message, Event, ToolCall, ApprovalRecord, RunReport, etc.
- **Source file split**: `status.ts` in contracts gets the full enum definitions; `status.ts` in shared becomes a re-export barrel
- **Generic interfaces must be self-contained**: contracts versions of Tool, ProviderAdapter, ToolDispatcher, Approver use generic `ToolResult`, `ProviderRequest`, `ApprovalRequest`, `ApprovalResult` — not Reason schema types

## Validation Checklist

After every extraction, verify:

| Check | Command |
|-------|---------|
| OS package builds | `pnpm --filter @tripp-os/<name> build` |
| OS package tests | `pnpm --filter @tripp-os/<name> test` |
| Origin barrel builds | `pnpm --filter <origin> build` |
| CLI builds | `pnpm --filter @tripp-reason/cli build` |
| CLI tests pass | `pnpm --filter @tripp-reason/cli test` |
| Server builds | `pnpm --filter @tripp-reason/server build` |
| Dashboard builds | `cd apps/dashboard && pnpm build` |
| No consumer import changes | grep for old import — should still resolve |
| No duplicate divergent definitions | Manual review of origin vs OS package |

## Pitfalls

- **Inventory test count is often wrong.** The Stage 2 inventory estimated 69 tests (27+14+28) but the actual count was 68 (27+14+27). Always verify with `grep -c "it("` or vitest output, not the inventory document.
- **`isolatedModules` blocks mixed value/type re-exports.** When `tsconfig.base.json` has `"isolatedModules": true`, you cannot do `export { TypeA, SchemaA } from "..."` if TypeA is a type and SchemaA is a value. Split into separate `export` and `export type` statements.
- **`sed -i` on JSDoc comments also hits user-facing strings.** Always grep after sed to verify only namespace headers changed — approval boundary messages like "Tripp.Reason ApprovalGate" may be correct semantic content.
- **pnpm workspace glob `packages/*` doesn't match nested dirs.** When adding `packages/@tripp-os/*`, you must add a second glob line to `pnpm-workspace.yaml`. Without it, `pnpm --filter @tripp-os/...` silently matches nothing.
- **Origin package.json must drop vitest after extraction.** Tests move to the extracted package. Remove `vitest` from devDeps and the `"test"` script from the origin — the origin is now a thin re-export barrel with no tests of its own.
- **Don't move files — copy them.** The origin package stays alive as a compatibility barrel. Moving files would break consumers until the barrel is in place. Copy first, verify barrel, then optionally remove origin source files later.

## Report Template

For extraction reports, use the format from `references/stage-extraction-report-template.md`.

## References

- `references/stage-extraction-report-template.md` — Report template for Stage N extraction reports (PASS/FAIL, files changed, exports moved, validation commands, boundary checks)
- `references/stage2-agent-bus-pitfalls.md` — Stage 2 specific pitfalls: 68 vs 69 test count, sed hitting approval messages, workspace glob, vitest removal
- `references/stage3-contracts-pitfalls.md` — Stage 3 specific pitfalls: isolatedModules type exports, Reason-specific schemas staying, duplicate definition audit
