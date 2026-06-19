# Step 0 Doc Templates

Canonical section structure for the three doctrine docs + the audit report.
Use as a skeleton — replace bracketed items with project-specific content.

---

## DOCTRINE.md skeleton

```markdown
# <Project> Doctrine

> Enforceable constraints for the <project> clean-room rebuild.

## What <Project> Is
<1-2 paragraph identity + operating model diagram if relevant>

## What <Project> Is Not
<table: ghost | why it is killed>
Include: old branding, provider sprawl, desktop-first, plugin marketplace,
default-to-swarm, local inference, UI-first, replacing amplified systems,
unapproved mutations, telemetry farm, niche gateways, recipe/scheduler bloat.

## Hard Rules
1. Core must run without UI.
2. Core must run without <later subsystem>.
3. Core must run without <another later subsystem>.
...numbered, countable, 10-20 rules.

## Phase 1 Allowed Scope
<explicit list of what builds>

## Phase 1 Forbidden Scope
<❌ explicit list of what does NOT build>

## Clean-Room Rule
Legacy at <legacy path> = read-only reference.
✅ Study patterns
❌ Copy source files / preserve branding / line-by-line port

## Report Requirement
Every run emits reports/<session-id>/<run-id>.md with minimum sections.

## Repo-Boundary Rule
No full-rewrite, no destructive shell without gate, all touches logged.

## ApprovalGate Rule
Two tiers: safe (no approval) vs gated (requires approval).

## <Feature>-Bloat Prevention Rule
<provider / tool / feature specific cap + "never add" explicit list>

## <Other Agent / System> Relationship Rule
Amplifies not replaces. <relationship diagram>.
```

---

## ARCHITECTURE.md skeleton

```markdown
# <Project> Architecture

> System shape, package boundaries, and runtime contracts.

## Monorepo Layout
<tree diagram>

## Package Boundaries
### Dependency Direction (strict)
<arrow diagram showing legal imports>
**Forbidden dependencies**: <bullet list>

### Package Responsibilities
For each package:
- Contains: <list>
- Phase N scope: <what builds when>
- Interfaces it defines vs consumes

## Event Contract
<typed union of event shapes>
Every event persisted before emission. No events lost.

## Report Contract
<report markdown template with required sections>

## Minimum Phase 1 Runtime Flow
<1. ... 2. ... 3. ... numbered steps from input to report.md>

## ApprovalGate Contract
<interface definitions>
Phase 1: CliApprover. Phase N+: ApiApprover. Phase M+: AutoApprover.

## Provider Adapter Contract
<interface definitions>
Primary adapter covers universal case.
```

---

## ROADMAP.md skeleton

```markdown
# <Project> Roadmap

> Phased build plan. Each phase has goal/allowed/forbidden/success/report.

## Step 0 — Doctrine Lock
**Goal**: ...
**Allowed**: writing docs only
**Forbidden**: packages, deps, source, scaffolding
**Success**: 3 docs + report exist, human approved, no code written
**Report**: reports/STEP_0_DOCTRINE_REPORT.md

## Phase 1 — Kernel / Solo Runtime
**Goal**: prove the loop works end-to-end narrow
**Allowed**: <monorepo skeleton, single provider, read-only tools, report gen>
**Forbidden**: <everything else>
**Success**: <runnable command producing specific output>
**Report**: reports/phase-1-kernel-report.md

## Phase N — <subsystem>
<repeat structure>

## Phase Dependency Graph
<which phases build on which; minimum viable phase identified>
```

---

## STEP_0_DOCTRINE_REPORT.md skeleton

```markdown
# Step 0 Doctrine Report

## PHASE
Step 0 — Doctrine / Architecture / Roadmap Lock

## STATUS
PASS | PARTIAL | FAIL

## FILES CREATED
| # | File | Path |
|---|------|------|
| 1 | DOCTRINE.md | docs/DOCTRINE.md |
| 2 | ARCHITECTURE.md | docs/ARCHITECTURE.md |
| 3 | ROADMAP.md | docs/ROADMAP.md |
| 4 | This report | reports/STEP_0_DOCTRINE_REPORT.md |

**Total files**: N
**Total source files**: 0
**Total packages created**: 0
**Total dependencies installed**: 0

## SCOPE COMPLIANCE
✅ or ❌ for each constraint:
- no scaffold / no packages / no deps / no source / no node_modules
- no server / CLI / provider / MCP / swarm / UI stubs

## CLEAN-ROOM COMPLIANCE
✅ or ❌:
- legacy used only as reference
- no source copying
- no branding preservation
- no line-by-line port

**Reference materials consulted**: <list>

## BOUNDARIES LOCKED
Grouped by category:
- Identity boundaries
- Architectural boundaries
- Phase 1 scope boundaries
- Provider/tool/feature boundaries
- External-system relationship boundaries
- Clean-room boundary

## OPEN QUESTIONS
| # | Question | Risk if unresolved | Recommended resolution |
Blocks Phase 1? (yes/no)

## NEXT STEP
Recommended: human review of 3 docs. Then Phase 1 scaffold.
Before Phase 1 begins, operator should confirm:
- [ ] DOCTRINE.md approved
- [ ] ARCHITECTURE.md approved
- [ ] ROADMAP.md approved
- [ ] <project-specific confirmations>
```

---

## STEP_0_ALL_FILES.txt convention

When delivering the 3 docs + report to reviewers:
- Concatenate into ONE file with `====== FILE N/4: path ======` dividers
- Save as `STEP_0_ALL_FILES.txt` in the repo root
- Deliver as single MEDIA attachment in chat, or provide path for `cat`
- Reason: per-file delivery is fragmented; consolidated file is reviewable in one shot
