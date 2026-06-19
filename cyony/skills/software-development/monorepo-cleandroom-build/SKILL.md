---
name: monorepo-cleandroom-build
description: Doctrine-first clean-room monorepo build pattern — planning docs lock the shape before code lands, phase gates enforce discipline, per-phase reports document decisions
trigger: Starting a from-scratch rewrite or clean-room monorepo build where architectural discipline matters; building any project where "rebuilding with new shape" must not quietly inherit the old system's ghosts
---

# Clean-Room Monorepo Build — Doctrine-First Pattern

For from-scratch rewrites or new projects where discipline matters. Prevents the common failure mode of rewriting an old system and accidentally inheriting its bloat, half-wired features, and naming cruft.

## When to Use

- From-scratch rewrite of an existing codebase where the old one is "reference only"
- New project under a multi-agent crew where doctrine compliance is audited
- Any monorepo where shape-locking before code prevents entropy
- Replacing a fork (e.g., replacing a branded fork with a clean-room version)

## When NOT to Use

- Incremental feature work on an existing codebase
- Throwaway spikes or prototypes
- Solo personal projects with no audit trail requirement

## The Pattern: Plan Before Scaffold

### Step 0 — Doctrine Lock (NO CODE)

Before any package directory, dependency install, or source file exists, create ONLY:

```
project/
├── docs/
│   ├── DOCTRINE.md      # Hard rules + "What THIS project IS NOT" (anti-bloat armor)
│   ├── ARCHITECTURE.md  # Package boundaries + cross-package contracts
│   ├── ROADMAP.md       # Phased build plan with success conditions per phase
│   └── (optional)       # Tiers, conventions, other planning artifacts
├── reports/
│   └── step-0-report.md # Audit of this planning step
└── README.md            # Project overview
```

**CRITICAL:** The "What this project IS NOT" section is the anti-bloat armor. Name the ghosts upfront:
- "Not a fork of X"
- "Not a provider zoo"
- "Not a plugin marketplace"
- "Not a UI-first project"
- "Not allowed to mutate production repos without approvals"

This section kills scope creep harder than any positive statement can.

### Step 1+ — Phased Build with Per-Phase Reports

Each phase has:
- **Allowed** — specific, bounded scope
- **Forbidden** — specific exclusions (negative scope is more constraining than positive)
- **Success condition** — testable, executable criterion
- **Required report** — documented in `reports/phase-N-*.md`

**No phase begins until the previous phase's report exists and passes review.**

### Per-Phase Report Template

```markdown
# Phase N — [Name]

## PHASE
Phase N — [Name]

## STATUS
PASS / PARTIAL / FAIL

## MODEL TIER USED
(If under a tiered-model build system, which tier did the work)

## FILES CREATED
(table of path + purpose)

## FILES MODIFIED
(table or "None")

## [DOMAIN-SPECIFIC SECTIONS]
(tables, contracts, etc. — specific to the phase)

## DESIGN DECISIONS
(per decision: Problem → Solution → Rationale)

## VALIDATION RESULT
(commands run + actual output)

## SCOPE COMPLIANCE
(every forbidden item confirmed absent, every allowed item confirmed present)

## BLOCKERS
(list or "None")

## NEXT STEP
(Recommend next phase only if PASS)
```

## Scope Compliance Checks (run at phase end)

### jCodeMunch Audit (preferred over manual grep)

When jCodeMunch is available, use it instead of manual `grep` for scope compliance. Index the repo and run targeted checks:

```bash
# After pnpm build, audit with jCodeMunch
# 1. Index the repo (if not already)
# 2. Check dependency cycles
# 3. Check layer violations (enforce package boundaries)
# 4. Search for old system branding (e.g. Goose, Reasonix)
# 5. Verify import direction (who imports what)
```

Key jCodeMunch tools for audits:
- `get_dependency_cycles` — 0 cycles expected
- `get_layer_violations` — define rules matching ARCHITECTURE.md dependency direction
- `search_text` with `is_regex: true` — find old branding leaks
- `check_references` — verify a package is only imported by allowed packages
- `get_repo_health` — quick health snapshot (grade, hotspots, dead code)

**jCodeMunch integration should be part of every phase end audit, not just Phase 4F.** If the user asks "are you using J-Munch?" and you haven't been, you missed a step.

### Manual grep fallback (when jCodeMunch unavailable)

```bash
# Forbidden package directories exist?
for d in packages/core packages/providers packages/tools packages/server packages/cli packages/mcp packages/swarm; do
  [ -d "$d" ] && echo "❌ $d exists" || echo "✅ $d does not exist"
done

# Dependency direction correct?
echo "store imports from:"
grep -rE "^import" packages/store/src/*.ts | sed 's/.*from "//' | sed 's/".*//' | sort -u

# Old system branding leaking in?
grep -ri "goose\\|reasonix" packages/ 2>/dev/null
```

## TypeScript + Zod + Drizzle Pattern (if applicable)

When using Drizzle ORM against SQLite with Zod-validated shared contracts:

### Cross-Package Contract Ownership

All cross-package interfaces live in `packages/shared`:
- Zod schemas and TypeScript types
- `ProviderAdapter`, `Tool`, `ToolDispatcher`, `Approver`-style contracts
- Event unions, status enums, etc.

No other package re-defines these. They import and implement.

### Drizzle 0.38 SQLite Nullable Quirk (PITFALL)

In Drizzle 0.38's SQLite API:
- `text("x")` is nullable by default — columns without `.notNull()` accept NULL
- **`.nullable()` method does not exist** on `SQLiteTextBuilderInitial` — this is a common trap
- Use `$inferInsert` cast pattern to work around the type mismatch with Zod schemas:

```typescript
await db.insert(sessions).values({
  id: input.id,
  mode: input.mode ?? null,  // Zod says string|undefined, DB needs string|null
} satisfies typeof schema.sessions.$inferInsert).run();
```

If `satisfies` doesn't compile due to nullable field inference bugs, fallback to `as any` cast with documented reason. Runtime behavior is correct (nullable columns accept `null` or `undefined`); Zod validates at shared schema boundary.

### Repository Pattern

`createRepositories(db)` factory returns bound functions:
- `getXxx(id)` returns `Promise<Xxx | null>` (null = not found)
- `listXxxBy...` returns `Promise<Xxx[]>` (empty array if none)
- `createXxx(input)` returns `Promise<Xxx>`
- Row-to-shared-type converters handle null→undefined coercion

## Package Dependency Direction (enforce in each phase)

```
shared  ← leaf, no internal imports
core    ← imports shared
providers ← imports shared, implements ProviderAdapter
tools   ← imports shared, implements Tool and ToolDispatcher
store   ← imports shared
server  ← imports core, providers, tools, store, shared
cli     ← imports core, providers, tools, store, shared
mcp     ← imports shared (tools loaded dynamically)
swarm   ← imports core, shared
```

No circular dependencies. No `shared → anything`. No `providers → tools`. Enforce these in the scope compliance check.

## Persist-Before-Emit (Core Design Pattern)

When building internal event systems (EventStream, pub/sub, message bus):
**Persist to store FIRST, then emit to subscribers.**

If a subscriber crashes, the event is already durable. The store is the source of truth; the event stream is a notification channel. This prevents:
- Lost events on subscriber failure
- Replay gaps (store has full history, stream is transient)
- Race conditions (subscriber can't observe events before they're persisted)

Apply in: RunManager, any core lifecycle manager, audit logging.

## Fail-Closed Safety Gates (Critical Pattern)

When any component requires approval/gating before action:

**WRONG** (silent bypass):
```typescript
if (requiresApproval && approvalGate) {
  await approvalGate.check(...)
}
// Falls through to dispatch when gate is missing
```

**RIGHT** (fail closed):
```typescript
if (requiresApproval) {
  if (!approvalGate) {
    return failClosed("No ApprovalGate configured");
  }
  await approvalGate.check(...)
}
```

The wrong pattern silently allows ungated execution when the gate is null/undefined. This is a safety hole that only manifests in misconfigured deployments — exactly when you need the gate most. Found and fixed in Phase 2C of Tripp.Reason.

Apply this rule to: approval gates, rate limiters, circuit breakers, any "check permission before act" pattern.

## Report Delivery Preference (User)

**Reports go as compact collapsed code blocks in chat, NOT as MEDIA file attachments.** (Updated 2026-06-04 — reversed from previous preference.)

The full report is always written to disk as canonical. Chat delivery is a compressed summary — ~30 lines, condensed tables, verdict + blockers + next step only. MEDIA file delivery is now the exception — use only when Eddie asks or for handoffs to Kimi/Tripp/Echo.

**Wrong (old pattern):** "Phase 4D done. MEDIA:/path/to/report.md"

**Right (new pattern):** Compact code block with key info, then 1-line verdict.
```markdown
Phase 4D — MCP Execution PASS ✅
  Tests: 33/33 smoke
  Changes: McpToolAdapter registered, ApprovalGate wired
  Next: Phase 4E server/CLI registration
```

When testing workspace packages with `node some-test.mjs`:
- `import from "@tripp-reason/store"` **fails** in standalone `.mjs` files (ESM doesn't resolve workspace packages without pnpm's link magic)
- `npx tsx -e '...'` also fails (tsx can't resolve workspace packages in eval mode)

**Solution**: After `pnpm build`, use relative dist imports from within the package directory:
```javascript
// In packages/core/smoke-test.mjs:
import { initDb } from "../store/dist/index.js";
import { createRunManager } from "./dist/index.js";
```

Run from the package dir: `cd packages/core && node smoke-test.mjs`

**Delete the smoke test after passing** — it's not a permanent test harness.

## MCP Package Pitfalls (Phase 4+)

When adding a new package with Node built-in imports and Zod:

- **`@types/node` devDep required**: Any package using `node:child_process`, `node:readline`, `Buffer`, `process`, `NodeJS.Timeout` needs `@types/node` as a devDependency.
- **`zod` as direct dep**: If the package converts schemas or uses `z.ZodType<unknown>`, add `zod` as a dependency (not just inherited from shared). Shared's zod is a dep, not re-exported as a type-only interface.
- **`override` modifier on Error.cause**: The `override` keyword on `cause` in an Error subclass fails under ES5 target. Use `public readonly cause?: unknown` without `override`. The runtime behavior is identical.
- **JSON parse casting**: `JSON.parse` returns `Record<string, unknown>`. Casting directly to a specific interface is a TS error. Use `as unknown as TargetType` for the double-cast pattern.
- **Smoke test execution**: Use `npx tsx packages/X/src/smokeTest.ts` for ESM tests with top-level await. Direct `node` won't resolve workspace packages. `tsc --noEmit` passes them because `skipLibCheck: true` is in tsconfig.base.json — ignore the write_file/patch lint tool's pre-existing errors.
- **tsconfig references**: New packages extending tsconfig.base.json must add `"references": [{ "path": "../shared" }]` if they import from shared. This enables `tsc --build` to order compilation correctly.
- **pnpm PATH**: The corepack shim at `/usr/share/nodejs/corepack/shims/pnpm` must be in PATH. `export PATH="/usr/share/nodejs/corepack/shims:$PATH"` before each command.
- **pnpm install prompt**: `pnpm install` may prompt "Proceed? (Y/n)" when node_modules structure changes. Pipe `echo "y"` to auto-answer.

## Apps vs Packages (Monorepo Layout)

When the monorepo includes a frontend application (dashboard, admin panel, etc.):

```text
packages/   ← libraries (exported, consumed by other packages)
apps/       ← deployables (final consumers, nothing imports them)
```

**Dashboard rules (Vite + React in apps/):**
- Dashboard is a standalone Vite app with its own build tooling, not shared tsc
- Dashboard must NOT import any `@tripp-reason/*` packages directly — HTTP/SSE only
- Dashboard may define local API response types (mirroring shared types) to avoid coupling
- Validate with: `grep -rn "from '@tripp-reason" apps/dashboard/src/` — must return nothing
- Server must NOT import dashboard; Core must NOT import dashboard
- Dashboard dependencies: react, react-dom, vite, @vitejs/plugin-react, typescript (5 total, no heavy UI frameworks)

**Import boundary audit (run at each dashboard phase end):**
```bash
# Dashboard → runtime packages (must be CLEAN)
for pkg in "@tripp-reason/core" "@tripp-reason/server" "@tripp-reason/tools" \
           "@tripp-reason/store" "@tripp-reason/providers" "@tripp-reason/swarm" \
           "@tripp-reason/mcp"; do
  grep -r "$pkg" apps/dashboard/src/ && echo "❌ FOUND" || echo "✅ CLEAN"
done

# Server → dashboard (must be CLEAN)
grep -rn "dashboard" packages/server/src/ && echo "❌ FOUND" || echo "✅ CLEAN"

# Core → dashboard (must be CLEAN)
grep -rn "dashboard" packages/core/src/ && echo "❌ FOUND" || echo "✅ CLEAN"
```

## Dashboard Audit Checklist (Phase Closeout)

For final dashboard/UI audit phases, use the 10-category framework documented in `references/dashboard-audit-checklist.md`. Covers: build/typecheck, import boundaries, API compatibility, panel rendering, SSE behavior, mode safety, approval UX, style/UX, security, and documentation completeness.

## Contract-Only Phases (Integration Boundaries)

When a phase introduces **external systems or agents that Tripp.Reason doesn't control** (e.g., OpenClaw, Hermes, third-party services), lock the contract BEFORE any code exists. This is not Step 0 planning — it's a dedicated contract lock phase within the implementation sequence.

**When to use:**
- Adding external agent adapters (Phase 7A)
- Defining integration points with systems outside the monorepo
- Specifying packet contracts, trust zones, transport options, sandbox rules

**What a contract-only phase produces:**
- `docs/PHASE_N_<TOPIC>_CONTRACT.md` — comprehensive contract document
- `reports/phase-Na-contract-report.md` — audit of the contract itself
- Updated `ROADMAP.md` with sub-phase breakdown

**What a contract-only phase does NOT produce:**
- No packages, no source code, no `package.json`
- No dependencies added
- No build changes
- No implementation adapters
- No network connections to real external systems

**Contract document structure:**
1. Purpose — why this integration exists
2. Non-Goals — what is explicitly NOT in scope (anti-bloat armor)
3. Roles — what each agent/system is allowed/forbidden to do
4. Trust Zones — explicit access rules per zone (local, cloud, sandbox, repo, archive)
5. Packet Contracts — typed interfaces for task and result packets (extend existing types from shared/swarm, don't reinvent)
6. Transport Options — compare alternatives, recommend starting point
7. Approval/Safety — gate rules, fail-closed posture, operator authority
8. Sandbox Rules — if applicable (cloud agents, creative workers)
9. Security — secrets, redaction, context minimization, timeouts
10. Implementation Sequence — sub-phases with scope per phase
11. Testing Requirements — fake-first, no live external deps initially
12. Open Questions — unresolved decisions that don't block the next phase

**Key decision:** Extend existing packet types (TaskPacket, ResultPacket) rather than creating new contracts. External agents should plug into swarm as worker backends without a separate contract surface. This keeps the swarm orchestrator clean — it chooses backend type (fake/real external) per task, but the task/result contracts stay the same.

## Pitfalls

- **Don't skip Step 0.** The planning docs are not bureaucracy — they're the anti-bloat armor. Starting with code lets ghosts in.
- **\"What THIS is NOT\" > \"What THIS is\".** Negative scope constrains harder than positive scope.
- **Forbidden list > Allowed list.** Specific forbidden items prevent interpretation creep.
- **Run the scope-check grep at end of each phase.** Don't trust yourself — let grep audit you.
- **Smoke tests: write inline, run once, delete.** Don't let them become a test suite unless that's a declared phase.
- **Per-phase reports are the audit trail.** If a future session can't understand what decisions were made and why from the report alone, the report failed.
- **Vitest in new packages: exclude tests from tsc build.** When adding a package with vitest (first test runner in a monorepo), `tsc --build` will fail on test files because vitest's `describe`/`it`/`expect` globals aren't declared. Fix by excluding `src/__tests__` in tsconfig.json: `\"exclude\": [\"dist\", \"node_modules\", \"src/__tests__\"]`. Vitest handles its own TypeScript compilation — tsc only compiles production source.
- **New package with node built-ins needs @types/node.** Any package using `node:fs/promises`, `node:path`, `node:crypto`, `process`, `Buffer` needs `"@types/node": "^20.0.0"` as a devDependency. Check other packages (cli, mcp, server, tools) — they likely already have it. `pnpm install` resolves it automatically.
- **Filename collisions in file-bus helpers.** When generating deterministic filenames from packet content (e.g., two tasks with the same title), add a short random suffix to avoid collisions: `crypto.randomBytes(4).toString("hex")`. This keeps filenames deterministic enough to audit but unique enough to never overwrite.
- **Keep file-creation turns small.** When building a new app scaffold (dashboard, new package), limit to ~6 file operations per turn. Multiple `write_file` + `patch` calls consume response tokens proportional to file content size, and large turns can cause context-window truncation where the human-readable response is cut off mid-sentence. Spread scaffold phases across turns, or use `execute_code` with `write_file` from `hermes_tools` to batch writes programmatically. Also documented in `context-compaction` skill (pitfalls section).
- **CLI agent commands: separate registration function.** When adding a new command namespace (e.g., `tripp agents`) that has multiple subcommands, create a dedicated `registerAgentsCommands(program)` function in its own file rather than inlining all the commander setup in `main.ts`. The registration function uses `program.command('agents')` as the parent, then nests subcommands underneath. Each subcommand gets its own `.description()`, `.argument()`, `.requiredOption()`, `.action()` block. This keeps `main.ts`'s `createCLI()` clean — it just calls `registerAgentsCommands(program)` once.

## References

- `references/tripp-reason-build-state.md` — current Tripp.Reason project state (Eddie's ongoing crew build, Phases 1-4C complete, 4D next)
