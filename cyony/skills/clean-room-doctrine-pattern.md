# Clean-Room Doctrine Pattern

> Reusable template + worked example for the Doctrine Gate phase of clean-room rebuilds.
> Use this when building a new system that learns from an existing codebase without copying it.

## The Pattern (Abstract)

A clean-room doctrine phase consists of 4-5 documents, all under `docs/` and `reports/` in the new repo. Zero code exists. The sequence is:

1. **Move reference material** to a `.Legacy/` or `.Reference/` path
2. **`docs/DOCTRINE.md`** — identity + anti-bloat armor
3. **`docs/ARCHITECTURE.md`** — package boundaries + contracts
4. **`docs/ROADMAP.md`** — phased build plan with gates
5. **`reports/STEP_0_DOCTRINE_REPORT.md`** — audit of step 0 compliance
6. Optionally: **`docs/MODEL_TIERS.md`** — if model routing matters to the build

---

## DOCTRINE.md Template

```markdown
# [Project] Doctrine

> Enforceable constraints. All future build agents must obey this before writing implementation code.

---

## What [Project] Is

[1 paragraph: what it is, what role it plays in the system, who operates it]

---

## What [Project] Is Not

| [Project] is NOT | Ghost being killed |
|---|---|
| [The reference system] | No branding. No copied code. Clean-room only. |
| A fork | Reference material is read-only. |
| [Specific anti-bloat #1] | [Why this is a ghost] |
| [Specific anti-bloat #2] | [Why this is a ghost] |
| [Specific anti-bloat #3] | [Why this is a ghost] |
| Allowed to [risky operation] without approvals | [Why gate is needed] |

[The more "is not" entries, the better. Name the ghosts, kill them.]

---

## Hard Rules

1. [Core must run without X]
2. [Core must run without Y]
3. [Every run produces [audit artifact]]
4. [Every [risky operation] is logged]
5. [Boundaries are sacred]
6. ...

---

## Phase 1 Allowed Scope

- [Monorepo skeleton type]
- [Shared contracts/schemas package]
- [One concrete implementation of X]
- [Read-only tools/operations only]
- [Audit artifact generation]
- [CLI minimum]

## Phase 1 Forbidden Scope

- ❌ [Feature A] (that is Phase N)
- ❌ [Feature B] (that is Phase N)
- ❌ [Reference system code copying]
- ❌ [Multiple implementations of X]

---

## Clean-Room Rule

The legacy reference at `[path].Legacy/` is **read-only reference material**.

- ✅ Study patterns to extract requirements
- ✅ Reference audit documents for architectural contracts
- ❌ Do not copy source files
- ❌ Do not port code line-by-line
- ❌ Do not preserve naming (rename patterns to project's own vocabulary)
- ❌ Do not preserve folder structure

---

## [Approval/Boundary] Rule

[Operations split into two classes: safe vs gated. Define them.]

---

## [Provider/Tool/Library] Bloat Prevention Rule

Maximum [thing]s at any phase: N.
Current Phase 1 set: [list].
Never add: [specific list].

---

## [Multi-Agent/Worker] Restraint Rule

[If applicable: default = 1/minimal. Max = N with approval. Workers role-bounded.]
```

---

## ARCHITECTURE.md Template

```markdown
# [Project] Architecture

> Package boundaries, dependency direction contracts, runtime responsibilities.

---

## Monorepo Layout

[ASCII tree of packages with one-line purpose comments]

---

## Package Boundaries

### Dependency Direction (strict)

[Which direction dependencies flow. Who is the leaf. Forbidden deps.]

**Forbidden dependencies:**
- [List of forbidden imports]

### Package Responsibilities

#### `shared` (or equivalent leaf package)
[Owns all cross-package contracts. Other packages import from here.]

**Contracts (cross-package interfaces):**
- [Contract A] — what [package B] expects from [package C]
- [Contract B] — what [package D] expects from [package E]

**Import rule:** Every other package imports its contracts from shared. No package defines its own duplicate.

#### `core`
[Imports contracts from shared. Does not define them.]

#### `providers` (or equivalent implementation packages)
[Implements contracts from shared. Does not redefine them.]

[...]

---

## Minimum Phase [N] Runtime Flow

[Step-by-step ASCII flow. What's allowed. What's NOT allowed. Streaming/distinction notes if internal streaming ≠ network streaming.]

---

## [Contract Name] Contract

> **Contract ownership:** [interfaces] are defined in `packages/shared`. Implementations live in [specific packages].

```typescript
interface [ContractName] {
  [shape]
}
```

Phase 1: [implementation A] in `packages/[where]`.
Phase N+: [implementation B] in `packages/[where]`.
```

---

## ROADMAP.md Template

Each phase needs this exact structure:

```markdown
## Phase N — [Name]

**Goal:** [One sentence]

**Allowed:**
- [Package/feature A] — with scope qualifier
- [Package/feature B] — with scope qualifier

**Forbidden:**
- [Feature X] (that is Phase M)
- [Feature Y] (that is Phase M)
- [Reference system code copying]

**Success Condition:**
```
[Concrete test command or observable outcome that proves the phase works]
```

**Required Report:** `reports/phase-N-[name]-report.md`
```

---

## MODEL_TIERS.md Template (when model routing matters)

Use tier labels instead of hardcoded model names in future prompts:

| # | Tier | Use For | Preferred Models |
|---|------|---------|-----------------|
| 1 | **Heavy Technical Thinking** | Architecture, contracts, hard bugs | [3-4 model names] |
| 2 | **Fast Technical Builder** | Scaffolds, wiring, straight implementation | [3-4 model names] |
| 3 | **Creative Architecture Scout** | Exploration, alternate designs | [3-4 model names] |
| 4 | **Budget Daily Driver** | Docs, small patches, routine review | [3-4 model names] |
| 5 | **Code Review / Warden Pass** | Drift checks, doctrine compliance | [3-4 model names] |
| 6 | **Vision / Image Analysis** | Screenshots, diagrams | [1-2 model names] |
| 7 | **Research / Search Assist** | External info, discovery | [1-2 model names] |
| 8 | **Direct API Fallback** | Provider failure, isolated tests | [2-4 model names] |

**Routing Rules:**
1. Select freely within a tier — no per-request operator input needed.
2. Prefer tier labels over hardcoded model names in build prompts.
3. Use cheapest capable tier for routine work.
4. Warden/review tier is mandatory before phase transitions.
5. No budget bypass — never select models outside the allowed inventory.

---

## STEP_0_DOCTRINE_REPORT.md Template

```markdown
# Step [N] Doctrine Report

## PHASE
Step N — [Description]

## STATUS
PASS / PARTIAL / PATCHED PASS / FAIL

## FILES CREATED
- [file list]
- [Zero count of implementation files]

## SCOPE COMPLIANCE
✅ No implementation scaffold created
✅ No packages/ directory exists
✅ No package.json created
✅ No tsconfig / build config created
✅ No source code files created
✅ No dependencies installed

## CLEAN-ROOM COMPLIANCE
✅ [Reference system] used only as reference material
✅ No source code copied
✅ No branding preserved
✅ No folder structure replicated

## BOUNDARIES LOCKED
- [Summary of what each doc locks]

## OPEN QUESTIONS
- [Numbered list, with "none block next phase" note]

## PATCHES APPLIED (if Step 0A happened)
- [Surgical corrections list]

## PHASE 1 READINESS (or next phase readiness)
**Approved to begin upon operator's confirmation.**
- Blocks remaining: [none from doctrine] / [list any]

## NEXT STEP
[Recommended action for operator]
```

---

## Surgical Patch Pass Pattern (Step 0A)

After doctrine is written, a second pass often catches internal contradictions:

**Common contradictions to check:**
- Contract ownership — does any package claim to own a contract that should live in shared?
- CLI/feature phasing — does a feature exist in Phase N but get required by Phase 1?
- Streaming distinction — is "internal async streaming" different from "network streaming"?
- Approval implementation — where does `CliApprover` vs `ApiApprover` live?

**Patch rules:**
- Modify only `ARCHITECTURE.md`, `ROADMAP.md`, and the step report
- Do NOT touch `DOCTRINE.md` unless absolutely required (identity is stable)
- Use replace-mode patches with clear `old_string` → `new_string` targeting
- Mark status as `PATCHED PASS`
- Add a `## PATCHES APPLIED` section to the step report

---

## Worked Example: Tripp.Reason (June 2025)

**Reference system:** Block's `goose` AI coding agent (Rust, 30+ providers, Electron desktop)
**New system:** Tripp.Reason (TypeScript pnpm monorepo, 5 providers max, local web dashboard)

**What doctrine locked:**
- Clean room: `Tripp.Reason.Legacy/` frozen, new `Tripp.Reason/` has only docs + reports
- 15-item "is NOT" list (not Goose, not a fork, not a provider zoo, not desktop-first, not a plugin marketplace, not a swarm launcher by default, not local inference, not UI-first, not a replacement for OpenClaw/Hermes, etc.)
- 15 hard rules including "Doctrine trumps code"
- Contract ownership: all cross-package interfaces in `packages/shared`
- 9 packages with strict dependency direction
- 6-phase roadmap with explicit forbidden-scope per phase
- 8-tier model routing doctrine
- 25-worker swarm cap with manual approval required

**Litmus test passed:**
> "Would these docs stop an eager agent from accidentally rebuilding Goose with a new logo?"
> Yes, because: the forbidden list names the ghosts, the contract ownership rule prevents duplication, and the clean-room rule explicitly bans line-by-line porting.

**Phase 1 target remained narrow:**
```
tripp run "List the files in /tmp and summarize them"
→ Provider streams response (internally, NOT via HTTP/SSE)
→ read_file + list_dir tools execute
→ Events persisted to SQLite
→ Session persisted to SQLite
→ Run report generated at reports/<session-id>/<run-id>.md
```

One provider. Read-only tools active. Mutating tools as gated contracts only. No server, no MCP, no swarm, no UI.

---

## Anti-Patterns to Avoid During Doctrine Writing

1. **"Weeks of doctrine"** — doctrine is weeks → days, not a novel. 3-5 pages per doc max.
2. **"Doctrine as dumping ground"** — split into DOCTRINE (rules), ARCHITECTURE (shape), ROADMAP (phases). Don't put everything in one file.
3. **Vague "is not" list** — "not bloat" is useless. "Not a provider zoo (max 5 at v1, 1 in Phase 1)" is enforceable.
4. **Missing forbidden-scope per phase** — allowed + forbidden is the pair that prevents scope creep.
5. **Contract ownership left ambiguous** — "who defines this interface?" MUST have one answer.
6. **Streaming distinction left implicit** — if internal streaming ≠ network streaming, document the boundary or Phase 1 accidentally builds a server.
7. **Doctrine written inside the legacy folder** — clean-room path must be fresh; legacy is read-only reference.
8. **Skipping the step report** — without it, you can't prove the clean-room boundary is intact before scaffold begins.
