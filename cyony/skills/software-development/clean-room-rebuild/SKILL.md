---
name: clean-room-rebuild
description: "Doctrine-first methodology for replacing a fork/codebase with a fresh clean-room implementation. Prevents the new thing from becoming the old thing with a new logo."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [architecture, clean-room, rebuild, doctrine-first, refactor, replacement]
trigger_conditions:
  - User has chosen \"build from scratch\" (after applying architecture-fork-vs-build) and wants to replace an existing fork/codebase
  - \"Ground up rebuild\" while preserving patterns but not code
  - \"Clean-room\" approach to avoid cargo-culting a predecessor
  - User is worried the new thing will re-inherit old bloat
  - \"Let's plan/lay out a solid path before throwing code at it\"
related_skills:
  - architecture-fork-vs-build   # Apply THAT skill first to confirm build > fork; this skill governs the build path
  - writing-plans               # For the implementation phases that follow after doctrine is locked
---

# Clean-Room Rebuild

Use this skill AFTER `architecture-fork-vs-build` has concluded \"build from scratch.\" It governs the planning phase that prevents the new repo from being born fat, confused, and haunted by the old one's ghosts.

## When to Use

- The decision to rebuild is already made
- The target system has a complex predecessor (fork, old codebase, reference implementation) with many patterns worth preserving but also significant bloat
- You want to lock shape BEFORE any code exists
- Multiple agents / humans will contribute and need a shared boundary document

## The Core Doctrine

> Doctrine / Architecture / Roadmap come BEFORE scaffold. Not after.
> Once code exists, agents and maintainers start "helpfully" inventing things.
> Doctrine gives them a wall to bounce off of.

Three planning docs + one audit report = Step 0:
- `docs/DOCTRINE.md` — hard rules + "what it is not" anti-bloat armor
- `docs/ARCHITECTURE.md` — package boundaries + dependency direction + contracts
- `docs/ROADMAP.md` — phased build plan with allowed/forbidden/success per phase
- `reports/STEP_0_DOCTRINE_REPORT.md` — audit that the three docs were created correctly

## Step-by-Step

### 0. Freeze the Legacy Fork

- Rename old repo to `<Name>.Legacy/` (e.g. `Tripp.Reason.Legacy/`)
- Mark it **read-only reference material**, never the working tree
- Create a fresh empty repo at the canonical name (`<Name>/`)
- Never delete the legacy fork — you need it as a reference for extracting patterns

Protects against: accidental code copying, confusion between old and new, agents patching the wrong repo.

### 1. Write DOCTRINE.md

Lean, enforceable, **with a strong "What It Is NOT" negative-space section**. This section kills the ghosts by naming them.

Required sections:
1. What it IS (identity, operating model, role in ecosystem)
2. **What it is NOT** (explicit list of ghosts — old branding, provider sprawl, desktop-first, plugin marketplace, etc.)
3. Hard rules (numbered, countable — e.g. 15 rules)
4. Phase 1 allowed scope (narrow and specific)
5. Phase 1 forbidden scope (explicit `❌` list)
6. Clean-room rule (legacy = reference only, no code copying, fresh naming)
7. Report requirement (every run produces MD report — baked in from D1)
8. Repo-boundary rule
9. Approval-gate rule (safe vs gated operations — two tiers)
10. Provider/tool/feature bloat prevention rules
11. External system relationship rule (amplifies not replaces)

Style: crisp, numbered, enforceable. No hype. No manifesto. These are contracts that future build agents must obey.

### 2. Write ARCHITECTURE.md

Package shape + boundaries + contracts. No implementation details.

Required content:
- Monorepo package layout (tree diagram)
- Package boundaries (what belongs where)
- **Dependency direction rules** (strict, no circular)
- Per-package responsibilities
- Event contract (typed, all events persisted before emission)
- Report contract (template with minimum sections)
- Minimum runtime flow for Phase 1
- Interface contracts (ProviderAdapter, ToolDispatcher, Approver)
- Schema responsibilities (Zod types in a shared package)

Design rule: **Core must not know about specific providers, tools, or approvers.** Only interfaces.

### 3. Write ROADMAP.md

Phased plan. Each phase has:
- Goal
- Allowed work (explicit list)
- Forbidden work (explicit `❌` list)
- Success condition (testable, runnable — e.g. a specific CLI command that must produce a specific output)
- Required report output

Phase 1 must be **brutally narrow**:
- Single provider adapter (covers the universal case, e.g. openai-compatible)
- Read-only tools active; mutating tools as contracts-only behind approval gate
- No UI / no server / no MCP / no swarm / no external adapters
- Prove the loop before proving the product

Phase dependency graph: which phases build on which. Identify minimum viable phase (usually Phase 1 alone is useful).

### 4. Write the Step 0 Report

`reports/STEP_0_DOCTRINE_REPORT.md` with structure:
```
## PHASE  — Step 0
## STATUS — PASS / PARTIAL / FAIL
## FILES CREATED — list
## SCOPE COMPLIANCE — confirm no scaffold/packages/deps/source created
## CLEAN-ROOM COMPLIANCE — confirm legacy used only as reference
## BOUNDARIES LOCKED — summary of major boundaries
## OPEN QUESTIONS — unresolved decisions with risk + recommendation
## NEXT STEP — what happens after review
```

### 5. Consolidate + Deliver

When handing the 3 docs + report to reviewers (human, other agents, other LLMs for cross-check):
- **Combine into one file** using `scripts/combine-deliverable.sh`:
  ```bash
  bash scripts/combine-deliverable.sh STEP_0_ALL_FILES.txt \
    docs/DOCTRINE.md docs/ARCHITECTURE.md docs/ROADMAP.md \
    reports/STEP_0_DOCTRINE_REPORT.md
  ```
- Deliver as a single `MEDIA:` attachment if on chat, or provide the path for `cat`.
- User explicit preference: do NOT paste large content inline (Telegram 4096 char cap) and do NOT make the operator dig through the filesystem to find files. One combined file, one attachment, one handoff.

### 5A. Verify Clean-Room Boundary

Before handing off, run explicit verification that only markdown exists in the clean-room:

```bash
find <Name>/ -type f | sort
```

Expected: ONLY `docs/*.md`, `reports/*.md`, and the combined `.txt`. If you see `packages/`, `node_modules/`, `package.json`, `tsconfig*`, or any source files — clean-room was **breached** and the Step 0 boundary failed.

This is a mechanical enforcement gate. Include the output in the Step 0 report (e.g., "Clean-room boundary intact. Docs and reports only.") as proof of compliance.

### 5B. Step 0A — Surgical Consistency Patch (recommended before review)

After the three docs are written but BEFORE human review, perform an internal-consistency audit. The first draft of three related documents almost always contains:

- **Contract ownership ambiguities** — e.g., `ProviderAdapter` implied to live in both `core` and `providers`. Pick ONE owner (typically `shared`/`contracts`).
- **Phase scope conflicts** — e.g., a tool listed as "Phase 3+" in one doc but required in Phase 1's success condition. Reconcile.
- **Boundary distinctions** — e.g., "provider streaming" is ambiguous between internal `AsyncIterable` and network SSE. Make it explicit.

Fix all three by surgical patch, not rewrite. The patch pass:

1. Re-read all 3 docs looking for cross-document contradictions
2. Apply targeted patches to ARCHITECTURE.md and ROADMAP.md (leave DOCTRINE.md untouched unless the fix is a hard-rule correction)
3. Update STEP_0_DOCTRINE_REPORT.md:
   - Status: `PASS` → `PATCHED PASS`
   - Add `## PATCHES APPLIED` section (numbered list of each correction with what was ambiguous and how it was fixed)
   - Add `## PHASE 1 READINESS` section (explicit greenlight statement + remaining blockers, usually just "Eddie's confirmation" at this point)

This step catches the kind of ambiguity that makes Phase 1 build agents stop and ask. Fix it in markdown, not TypeScript.

### 6. Review Gate

Before touching code, ask reviewers:
> "Would these docs stop an eager agent from accidentally rebuilding the old system with a new logo?"

If yes → proceed to Phase 1 scaffold.
If no → tighten doctrine. Do it in markdown, not in source code.

## Key Patterns

### Contract Ownership Principle (the #1 anti-bloat rule)

**ALL cross-package interfaces live in ONE package (typically `shared`/`contracts`). Others import. They never redefine.**

This is the single most important rule for avoiding bloat. When two packages can claim ownership of an interface, pick ONE:
- `ProviderAdapter`, `ProviderRequest`, `ProviderResponse` → owned by `shared`
- `Tool`, `ToolDispatcher`, `ToolContext`, `ToolResult` → owned by `shared`
- `Approver`, `ApprovalRequest`, `ApprovalResult` → owned by `shared`
- Core imports these from shared; it does not define its own versions
- Providers/tools implement contracts from shared; they do not redefine them

If `core` defines `ProviderAdapter`, every provider implementation must reverse-depend on core. If providers define it, the interface drifts. The clean solution: centralize in shared/contracts, enforce via import rule.

Make this a first-class architecture doc section with an explicit "Import rule" bullet. Future build agents will obey it mechanically.

### Default-to-Safe Tools
- Phase 1 tools split into **active** (read-only: list_dir, read_file, search) and **contract-only gated** (write, edit, shell)
- First proof must demonstrate loop + logs before allowing mutation
- ApprovalGate starts as CLI prompts; upgrades to API/policy later

**Safety-First Phased Activation** (Phase 2 ladder — generalize for any gated capability):
1. **Phase 2A**: Audit infrastructure (persistence warnings, PARTIAL reports when incomplete)
2. **Phase 2B**: Read-only visibility tools (git status/diff — no approval needed, gives before/after baseline)
3. **Phase 2C**: Approved file mutation (write/edit — approval + backup + workdir-bound)
4. **Phase 2D**: Approved command execution (shell + test runner — approval + allowlist + denylist + timeout)
5. **Phase 2E**: End-to-end integration smoke test

Each sub-phase delivers a safety layer before the next capability unlocks. Never combine capability activation with its safety scaffolding in one phase — the safety layer must be proven before the capability it guards is activated.

### Single Provider First
- Adapter interface designed to fit universal case (e.g. openai-compatible)
- Only implement one real adapter in Phase 1
- Additional adapters added later only when the contract proves itself
- Prevents "Provider Zoo 2.0"

### Reports as Contract
- Every run produces MD report from Phase 1, not bolted on later
- Fixed template with required sections (Status, Prompt, Model, Events, Tool Calls, Files Changed, Validation, Next Step)
- Report path saved to store; reports are a first-class data type

### The Ghost-Killing "Is Not" Section
Name the ghosts you don't want re-inherited:
- old branding / logo
- provider sprawl (list of providers that will NEVER be added)
- desktop-first assumption
- plugin marketplace
- local inference engine code
- telemetry/analytics farm
- niche gateways (Telegram, Nostr, etc.)
- scheduler / recipe / deeplink systems
- default-to-swarm behavior
- replacing external systems it should amplify

## Pitfalls

- **Scaffold first, doctrine later** — bloat sneaks in. Always lock shape before code.
- **Delete the legacy fork** — you lose reference material. Always rename, never delete.
- **Line-by-line port** — just a fork in a new language. Refactor naming, contracts, folder structure.
- **Skip the "is NOT" section** — ghosts return without being named.
- **Multiple providers in Phase 1** — adapter contract can't prove itself in a zoo.
- **Mutating tools active in Phase 1** — first proof must show loop+logs, not mutation.
- **Implement details in architecture doc** — architecture is contracts, not code.
- **Per-file delivery of planning artifacts** — consolidate into one combined file with section markers for reviewers.
- **Undocumented schema naming divergence** — if shared schema names differ from ARCHITECTURE.md (e.g. `Approval` → `ApprovalRecord` to avoid collision with `ApprovalRequest`), future packages will import the wrong name. Every rename MUST be called out in the phase report's DESIGN DECISIONS section with rationale.
- **"Stream IS the response" trap** — when an architecture doc mentions both a streaming return AND a response wrapper type (e.g. `ProviderResponse`), the wrapper is usually redundant. `AsyncIterable<StreamEvent>` IS the response. Question both before implementing both. Same trap: "ChatResponse", "ToolResponse".
- **pnpm version vs Node version** — pnpm@11 needs Node 22+. Node 20 boxes must pin to pnpm@9 (`npm install --prefix ~/local-pnpm pnpm@9`). `corepack prepare pnpm@latest` will grab an incompatible version silently. Test `pnpm --version` after install; if it errors with "node:sqlite" or similar, downgrade.
- **Barrel export leakage** — `packages/shared/src/index.ts` must be the ONLY public entry. Other packages import from the package name, never from internal paths. Enforce via package.json `"exports"` field with no subpath exports.
- **Skipping the Warden Pass before phase reports** — every major phase report should be self-reviewed (or run through a "Code Review / Warden Pass" tier) against the doctrine before finalizing. Catch architecture doc divergences BEFORE handing off.

## Phase 1 Scaffold Sequence (after Step 0 is approved)

Phase 1 begins with the **shared package first** — it's the contract spine that everything downstream imports. The scaffold sequence matters because order prevents circular references:

1. Install pnpm (pin to pnpm@9 if Node < 22 — see Pitfalls)
2. Root `package.json` + `pnpm-workspace.yaml` + `tsconfig.base.json` + `README.md` (monorepo shape)
3. `packages/shared/package.json` + `tsconfig.json` (package boundary; only dep is zod)
4. `src/status.ts` — enums as Zod schemas first (leaf of the dependency chain)
5. `src/schemas.ts` — core data shapes + request/response shapes
6. `src/events.ts` — discriminated union of all stream events
7. `src/contracts.ts` — interfaces (ProviderAdapter, Tool, ToolDispatcher, Approver)
8. `src/report.ts` — RunReport + ToolCallSummary
9. `src/index.ts` — barrel export (single entry point, no subpath exports)
10. `pnpm install` + `tsc --build` + validation commands (see Pitfalls for checklist)

**Schema-first discipline:** shared must compile standalone with zero errors before ANY other package is created. If shared doesn't typecheck, the rest of Phase 1 cannot proceed.

**Naming divergence rule:** If any schema name differs from ARCHITECTURE.md (e.g., `Approval` → `ApprovalRecord`), document it explicitly in the phase report under a "DESIGN DECISIONS" section with rationale. Future packages will reference the wrong name if this isn't called out.

See `references/tripp-reason-phase1a.md` for the real-world execution including the 8 schema decisions and specific interface shapes.

## Pre-Scaffold Companion Artifact — Model Tier Doctrine

When building a long-running project with **multiple LLM providers / models available**, create `docs/MODEL_TIERS.md` BEFORE Phase 1 scaffold. It defines **tier labels** (e.g., "Heavy Technical Thinking", "Fast Technical Builder", "Budget Daily Driver") rather than hardcoded model names, allowing future build prompts to say which tier to use rather than which specific model — so Hermes/the agent picks the best fit within budget without per-request operator input.

Required sections:
- Tier table (label + trigger description)
- Per-tier definitions: use-case + preferred models + rule
- Routing rules (select freely within tier, escalation policy, Warden Pass mandatory for phase reports)
- Model inventory reference (all registered + available-via-API models)

This is separate from the three Step 0 docs (doesn't change architecture), but saves massive amounts of context-switching overhead during the build. Treat it as a **build-time** doctrine, not a runtime one.

## Cross-References

- `references/step0-template.md` — canonical structure for the 3-doc + report set
- `references/tripp-reason-step0.md` — real-world Step 0 execution: Goose → Tripp.Reason TypeScript rebuild (2026-06-02), including the Step 0A consistency patch pass
- `references/tripp-reason-phase1a.md` — real-world Phase 1A execution: monorepo skeleton + shared contracts, including 8 schema design decisions and pitfalls (pnpm version, naming divergence, stream-is-response)
- `references/tripp-reason-phase1b-1c.md` — real-world Phase 1B (Store/Drizzle) + Phase 1C (Core Primitives) execution: persist-before-emit, ApprovalGate routing, smoke test workspace resolution
- `scripts/combine-deliverable.sh` — reusable bash script that produces a single deliverable file with numbered section dividers from 2+ input files. Preferred handoff pattern for phase reports + doctrine bundles.

## Pitfalls

At end of Step 0, the clean-room repo contains exactly:
```
<Name>/
├── docs/
│   ├── DOCTRINE.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── reports/
│   ├── STEP_0_DOCTRINE_REPORT.md
│   └── STEP_0_ALL_FILES.txt  (combined for review handoff)
└── README.md (optional, links to docs/)
```

**Zero code. Zero packages. Zero deps.** If there's more than this at Step 0 completion, the boundary was violated.
