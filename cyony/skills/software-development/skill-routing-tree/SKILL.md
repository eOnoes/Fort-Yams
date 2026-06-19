---
name: skill-routing-tree
description: "Design hierarchical skill routing trees — single-skill vs skill-set vs workflow dispatch. Use when organizing agent skills into a decision tree with gated branches to reduce context bloat and improve skill loading precision."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [skills, routing, dispatch, agent-architecture, context-optimization]
    related_skills: [hermes-agent-skill-authoring, context-compaction]
---

# Skill Routing Tree

## Overview

Flat skill lists don't scale. When an agent has 100+ skills, injecting all descriptions into every system prompt burns tokens and causes false matches. A skill routing tree replaces the flat scan with hierarchical decision logic — the agent traverses down only the relevant branches.

This skill covers HOW to design the tree: the three-tier dispatch model, gate logic, index file structure, and the scope-detection questions that drive routing.

## When to Use

- Designing or reorganizing an agent's skill library
- Reducing skill-related token overhead in system prompts
- Building a dispatch system that routes tasks to the right skills without scanning all of them
- Adding new skills and deciding where they belong in the tree

Don't use for: authoring individual SKILL.md files (see `hermes-agent-skill-authoring`), or general context optimization (see `context-compaction`).

## Core Concept: Three-Tier Dispatch

The root router's first question is not "what domain?" — it's "how big is this task?"

```
                    ROOT: "What's the scope of this task?"
                    /              |                    \
           SINGLE SKILL        SKILL SET              WORKFLOW
           one action,         multi-step             cross-domain,
           one tool            pattern                multi-phase
```

| Tier | Scope | Trigger | Loads |
|---|---|---|---|
| **Single Skill** | One tool/action | Task names a specific tool | 1 leaf SKILL.md |
| **Skill Set** | Multi-step pattern | Task matches a common workflow ("review", "debug", "ship") | 2-5 related leaf skills |
| **Workflow** | Cross-domain project phase | Task names a project + deliverable | Full chain including build order, audit, reporting |

### Examples

```
"cargo build"          → SINGLE SKILL  → code/rust/tools/cargo-build
"review this PR"       → SKILL SET     → [code-reviewer, github-pr-workflow, requesting-code-review]
"build Phase 9 of Tripp" → WORKFLOW   → [tripp-reason-build-order, monorepo-cleandroom, audit-chain, phase-report-delivery]
```

## Tree Structure

Each directory in the tree has an `_INDEX.md` file containing three sections:

```markdown
# code/_INDEX.md

## Gate
Task contains any of: code, build, test, debug, refactor, PR, git, cargo, pnpm, npm, pip, compile

## Single Skills
Route directly when task names a specific tool:
- "cargo build|test|clippy|fmt" → rust/tools/cargo-build/
- "git commit|push|branch|merge|rebase" → git/git-workflow/

## Skill Sets
Route to a bundle when task matches a multi-step pattern:
- "review|code review|PR review" → bundles/code-review/
- "debug|fix bug|troubleshoot" → bundles/debug/

## Workflows
Route when task names a project + deliverable:
- "Tripp.Reason|Tripp.reason build|phase" → workflows/tripp-reason-build/
```

## Gate Logic

Gates are simple keyword/pattern matches. The format:

```markdown
## Gate
Task contains any of: <pipe-separated keywords>
```

Gates at higher levels are broader (domain detection). Gates deeper in the tree are narrower (specific tool/project detection). A leaf is only reached when ALL gates along the path pass.

**Design principle:** Gates should be specific enough to avoid false positives, but broad enough to catch natural-language variants. "review" should catch "review this", "code review", "PR review", "review the changes."

## Scope Detection Heuristics

To decide which tier a task belongs to:

| Signal | Single Skill | Skill Set | Workflow |
|---|---|---|---|
| Verb count | One | 2-3 | 4+ |
| Domain scope | One domain | One domain, multiple facets | Cross-domain |
| Ambiguity | Specific tool named | Generic task pattern | Project + phase named |
| Time horizon | Immediate | This session | Multi-session |

When ambiguous, default to skill set (it's safer to load slightly more than needed than to miss context).

## Terrain Detection (Before Archetype)

Before classifying intent, the router must determine **what kind of ground** it's working on. Same verb, different terrain = completely different chain:

| Terrain | Signal | What changes |
|---|---|---|
| **GREENFIELD** | "build", "create", "new project", empty repo | Full scaffold. No audit. Fresh governance. |
| **UNKNOWN** | "I found this", "check this out", unfamiliar repo | Audit first. Codebase inspection. Then path selection. |
| **BROKEN** | "fix", "broken", "crash", "500", "bug" | Debug first. Minimal change. Don't rewrite what ain't broke. |
| **LEGACY** | "refactor", "clean up", "mess", "spaghetti" | Clean-room doctrine. Extract what's salvageable. |
| **EXTEND** | "add", "feature", "new endpoint", "plugin" | Architecture review first. Don't bolt onto bad foundation. |
| **RETOOL** | "migrate", "upgrade", "switch to", "TypeScript" | Tooling audit. Extract packages. Phase the migration. |
| **FORK** | "clone and modify", "like X but Y", "based on" | Fork-vs-build assessment. License check. Clean-room boundary. |

## Problem Decomposition Layer

For multi-facet problems (skill set or workflow tier), decompose before building the phase chain. The decomposition answers: what facets are active, which one unlocks the others, what don't we know, and are we confident enough to proceed?

### Key Decomposition Steps

1. **Intent Capture** — Write `INTENT.md`: why are we building? Who for? What's in/out of scope? Like legislative intent — it anchors all downstream decisions.
2. **10-Facet Scan** — Which dimensions are active? Knowledge, skill, emotional, structural, systemic, resource, perception, relational, temporal, environmental. Each gets severity rating.
3. **Rival Problem Frames** — Present 2-3 alternative views of the problem. Each frame: what it assumes, what it highlights, what it hides, risk if accepted too early.
4. **Binding Constraint Tournament** — "Which facet, if unblocked, unlocks the most others?" This identifies the keystone problem — the one that, when solved, collapses or simplifies the rest.
5. **Uncertainty Register** — Every unresolved unknown: why it matters, what resolves it, whether it blocks action or merely lowers confidence.
6. **Confidence Assessment** — Honest grade on the decomposition. What would raise it? What would lower it?

### Skill vs Skill Set Decision

After decomposition:
- **Single active facet, simple** → one SKILL
- **Multiple active facets, cross-domain** → SKILL SET (coordinated plugin)
- **Account-wide coordination, outputs flow downstream** → SKILL TREE

Most real problems are skill set problems — they have multiple facets that need coordinated solutions. Single-skill solutions only work for simple, single-facet tasks.

## Decision Matrix (Full)

| Signal (input) | Archetype | Skill Set | Pre-loaded Blocker |
|---|---|---|---|
| "build"/"create"/"make" | GREENFIELD | scaffold → governance → backend → frontend → mobile → audit → deliver | Stack-specific potholes (SQLite≠browser → better-sqlite3) |
| "fix"/"broken"/"crash"/"500" | REPAIR | debug → isolate → fix → test → PR | Auth change? → security-engineer. API surface? → api-tester |
| "review"/"audit"/"check" | AUDIT | code-reviewer → security-engineer → report | Auth code detected → bump security-engineer to required |
| "can I"/"compare"/"options" | EXPLORE | parallel-recon → spike → tool-evaluator → recommendation | No decisions without spike → load spike first |
| "design"/"style"/"look" | POLISH | sketch (rough) → claude-design → diagram | Dark theme? → WCAG AA. Mobile? → viewport audit |
| "ship"/"deploy"/"publish" | DELIVER | github-pr → phase-report → requesting-review | No tests? → run tests first. No lint? → run lint first |
| "explain"/"docs"/"teach" | DOCUMENT | llm-wiki → humanizer → arxiv (if academic) | Audience unclear? → ask: internal or public? |
| "connect"/"deploy agent" | COORDINATE | multi-agent-ops → capability-dispatch → shared-agent-bus | Agent unreachable? → heartbeat check. Busy? → escalation |

## Shippability Loop

After each phase completes:

```
PHASE DONE → SHIPPABLE? Y/N
  ├── Y → NEXT PHASE
  └── N → FIND WHY
           ├── Fix it (pull needed skill)
           ├── Loop counter: 1 → 2 → 3
           ├── ≤3: ↻ LOOP BACK
           └── >3: STOP. ASK OPERATOR.
                    "3 attempts exhausted. Unresolved: [X, Y, Z].
                     Continue? Skip? Escalate to heavier model?"
```

Each check gate validates: tests pass? lint clean? typecheck passes? no secrets exposed? If mobile-relevant: viewport ok? If design phase: dark theme contrast ok?

**Why 3 loops:** Loop 1 = obvious fix (most resolve here). Loop 2 = alternative approach. Loop 3 = creative swing. >3 = not a tool problem — it's a design problem. Operator judgment needed.

## Blocker Registry

Each stack/combo carries pre-loaded known potholes with proven solutions. The router doesn't wait for the problem — it loads the workaround alongside the scaffold:

```yaml
stack: react + tailwind + sqlite + local + mobile
blockers:
  - condition: sqlite_in_browser
    fix: use better-sqlite3 (Tauri/Electron) or sql.js (WASM fallback)
  - condition: local_only
    fix: skip JWT/OAuth, use device-PIN or sessionless
  - condition: dark_theme
    fix: Tailwind dark: variants + WCAG AA contrast check
  - condition: responsive
    fix: test sm/md/lg breakpoints in Chrome DevTools device mode
```

## Progressive Disclosure (Token Budget)

The tree delivers progressive context, not all-at-once:

```
TURN 1: User says "build an app..."
        Loads: Router dispatch (400) + Phase chain (150) + Scaffold skills (1K)
        = ~1.5K tokens

TURN 2: Scaffold done, governance begins
        Loads: Governance skills (800) + Blocker footnotes (300)
        Previous phase skills drop out
        = ~1.1K new tokens

TURNS 3-7: Each phase loads only its 1-3 skills
        ~1K new tokens per phase

TOTAL: ~8K for entire build chain
vs. FLAT: ~14K baseline (118 skills in every prompt)
```

The agent never holds all phases at once — it holds the chain as a lightweight roadmap (~150 tokens) and loads skills as it crosses each gate. Like a GPS: you see the whole route but only the next turn is detailed.

## File Organization

```
skills/
├── _INDEX.md              ← Root router (loaded first every turn)
├── code/
│   ├── _INDEX.md          ← Domain gate + children
│   ├── rust/
│   │   ├── _INDEX.md      ← Language-specific gate
│   │   ├── tools/
│   │   │   └── cargo-build/SKILL.md
│   │   └── testing/
│   │       └── tripp-reason-testing/SKILL.md
│   ├── python/
│   ├── typescript/
│   └── bundles/
│       ├── code-review/
│       │   └── _INDEX.md  ← Bundle: lists member skills
│       └── debug/
└── creative/
    ├── _INDEX.md
    └── ...
```

Bundles are special directories that don't have gates — they have a member list. Loading a bundle means loading all its member skills.

## Workflow: Adding a Skill to the Tree

1. Determine the skill's tier (single, set, or workflow)
2. Find the deepest matching gate path
3. If a matching directory exists, add the skill there
4. If not, create the directory chain with `_INDEX.md` files at each level
5. Update the parent `_INDEX.md` to list the new child
6. For skill sets: create a bundle directory with member references
7. For workflows: create a workflow chain that references the full build order

## Common Pitfalls

1. **Organizing by taxonomy instead of task scope.** The tree is a dispatch system, not a library catalog. A skill about "cargo build" goes under `code/rust/tools/`, not under a "Rust ecosystem" category. Route by what the user ASKS, not what the tool IS.

2. **Gates that are too narrow.** `Task contains "cargo build --release"` won't match "build in release mode." Use `cargo build|build.*release|compile` instead.

3. **Gates that are too broad.** `Task contains "test"` matches "test the Minecraft server" and routes to code/testing. Add domain context: the code gate already filtered for coding tasks.

4. **Forgetting to update parent indexes when adding skills.** A skill in a directory with no `_INDEX.md` entry is invisible to the router.

5. **Skill set bundles that duplicate individual skills.** If `code-review` loads `code-reviewer`, `github-pr-workflow`, and `requesting-code-review`, those skills should NOT also be individually listed in the parent `_INDEX.md`'s Single Skills section. A skill should be reachable by exactly ONE path.

6. **Deep nesting without value.** A skill 5 levels deep that's only reachable by an exact keyword match is effectively hidden. If a skill is commonly needed, surface it higher or add multiple gate paths.

## Verification Checklist

- [ ] Root `_INDEX.md` exists and is the first thing the agent loads
- [ ] Every directory has an `_INDEX.md` with Gate + Children sections
- [ ] Bundle directories reference member skills, not duplicate their content
- [ ] No skill is reachable through more than one path from root
- [ ] Gates use pipe-separated keywords, not regex
- [ ] Scope detection (single/set/workflow) is resolvable from the task text alone
- [ ] Deepest common skills (used in 80% of sessions) are reachable within 2 levels
