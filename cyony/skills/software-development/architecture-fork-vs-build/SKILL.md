---
name: architecture-fork-vs-build
description: "Make/buy/fork reasoning framework. When to fork-and-extend existing projects vs build from scratch. Mech-as-extension insight."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [architecture, decision-framework, fork, buy-vs-build, mech]
trigger_conditions:
  - User is considering building a tool that looks like something that already exists
  - Comparing fork-of-X vs building-from-scratch
  - Designing an extension layer on top of an existing runtime
---

# Architecture: Fork vs Build

## When to Use

Any time a design conversation reaches one of these shapes:
- "Should we fork X or build our own Y?"
- "This app does 80% of what we need; should we extend it?"
- "We want a [mech/dashboard/control plane/UI] that does Z"
- "Let's build from scratch because the existing ones don't fit exactly"

Apply this framework before writing a spec or committing code.

## The Decision Framework

Ask these in order:

1. **Does an existing project solve 70%+ of the problem?**
   - Yes → strongly favor fork/extend. 30% custom work < 100% from scratch.
   - No → build, but question whether the remaining problem is well-scoped.

2. **Is the runtime/kernel something we want to fork too, or bolt on?**
   - Bolt-on (extension layer on existing runtime) → preferred. Less maintenance.
   - Full fork → only if you want to own the stack and have long-term maintenance appetite.

3. **Is there a "mech" risk?** (see below)
   - If the project is meant to amplify an existing agent/system, a parallel UI is the wrong shape. Design as extensions.

4. **What's the stack cost to the human operator?**
   - Do they already know Next.js + TS + Tailwind? Match their groove.
   - If they're learning a new stack, the friction compounds with the feature work.

5. **What's the deployment target?**
   - Desktop app? → Wails (Go backend + web frontend) or Tauri (Rust backend).
   - Web-first, Pixel 10-friendly? → Pure web/PWA with SSR.
   - Server-hosted, CLI-accessed? → Thin HTTP dashboard on the backend.

## The Mech-as-Extension Insight

**Key pattern**: when building a force-multiplier layer (a "mech") that a human or agent "climbs into" to do their existing job better, design it as **extensions on top of the existing runtime**, not as a parallel system.

Wrong: build a new Electron app that replaces the Goose/OpenClaw/Claude-Code UI.
Right: build extension panels that bolt onto the existing kernel's HTTP/API surface, served from the existing backend.

The mech has five canonical layers, ordered by leverage:

1. **Sensor Array** (situational awareness) — one pane showing anomalies, queue depth, knowledge pipeline state, current activity. Replaces "look for things" with "things surface themselves."
2. **Decision Console** (governance cockpit) — when a gate decision is needed, pre-assemble full context (proposer, validator, similar patterns, risk score, estimated reuse) and offer explicit choices including escalation.
3. **Forge Navigator** (knowledge weaponization) — pattern warehouse isn't just storage; when reasoning about a new problem, surface similar forge entries as injectable prompt prefixes.
4. **Audit Autopilot** (pre-triage) — pattern matcher that auto-passes known-good cases and only surfaces exceptions to the human gatekeeper. Biggest leverage point: 95% of audits should auto-pass.
5. **Memory Spine** (durability) — session summaries, "what happened while I was gone" briefing, decision log (why model X over Y), doctrine versioning.

Only layers 1 and 2 need real UI. Layers 3-5 are backend logic with minimal UI surfaces.

## Fork vs Build Matrix

| Factor | Favor Fork/Extend | Favor Build from Scratch |
|---|---|---|
| Existing project covers 70%+ | ✅ | ❌ |
| Stack matches operator's groove | ✅ | — |
| Long-term maintenance appetite | — | ✅ |
| Runtime control needed | — | ✅ |
| Need to match existing brand/theme | ✅ (fork + reskin) | — |
| Customization deep enough to diverge | — | ✅ |
| Deadline < 1 month | ✅ | ❌ |

## Reference Case: Reasonix Fork Decision (2026-06-01)

**Context:** Eddie wanted a Tripp-branded "battle bot" mech for an OpenClaw operator (Tripp) to climb into for increased output. Original plan was to build from scratch on Next.js + TS + Tailwind. Then discovered Reasonix (esengine/deepseek-reasonix), which already had:

- Live Workbench (WorkspacePanel)
- Decision Console (ApprovalModal + plan/yolo modes)
- Activity Stream (StatusBar with live word/elapsed/tokens)
- Memory Spine (MemoryPanel + HistoryPanel + session branching)
- Command Palette (/ autocomplete + @file refs + @mcp:resource)
- Keyboard Shortcuts (Shift+Tab mode cycling)
- Approval Gate (permissions.allow/ask/deny with hard-blocks)
- Sandbox Enforcement (workspace_root + symlink-safe)
- Native MCP client (stdio + Streamable HTTP)
- Two-model collaboration (executor + planner in separate sessions)

The aesthetic DNA was tactical — near-black navy base, warm clay accent, terminal-flavored typography, uppercase HUD-style section labels, dense information layout.

**Decision:** Fork Reasonix (v1.0 Go/Wails, MIT license), reskin with Tripp brand, add crew-extension panels. Saved 3+ months of work. Chose Wails over Electron (10MB vs 200MB bundle).

**Lesson:** the existing project's design language was itself a feature. Don't underestimate "tactical look" as a design brief — it's a coherent opinion about density, typography, and restraint that's hard to reproduce from scratch.

## Pitfalls

- **Fork-and-abandon**: a fork you can't or won't keep upstream-compatible becomes a dead branch. Decide early whether you'll pull upstream changes and how.
- **Parallel UI**: the mech trap. If you design extensions as a separate process/app, you double the deployment, testing, and update surface. Extensions belong on the existing backend.
- **Brand-first design**: don't let "I want it branded X" drive a scratch build when a fork+reskin works. Branding is cheap; architecture is expensive.
- **Over-forking**: forking 3 related projects because each has "just one thing I need" creates 3 surfaces. Fork the one that covers 80%, extend it, let the other two inspire features.

## After Choosing "Build from Scratch"

If the decision matrix leads you to build (rather than fork or hybrid), the next skill to load is **`clean-room-rebuild`**. That skill governs the planning phase that prevents the new repo from becoming the old thing with a new logo:

- Doctrine / Architecture / Roadmap docs written BEFORE scaffold
- Legacy fork renamed to `.Legacy/` and frozen as read-only reference
- Strong "What It Is NOT" negative-space section to kill inherited ghosts
- Phase 1 kept brutally narrow (prove the loop before proving the product)
- Human review gate before any code

## Output: Decision Document

When applying this framework, produce:

```markdown
## Make/Buy/Fork Decision: <feature>

**Option A — Fork <project>**: <why, timeline, stack cost>
**Option B — Build from scratch on <stack>**: <why, timeline, maintenance burden>
**Option C — Hybrid <approach>**: <split, integration cost>

**Pick**: <letter> + one-paragraph justification.
**Trade-off we're consciously accepting**: <what we're giving up>.
**Success check in 60 days**: <how we'll know the pick paid off>.
```

Ship the decision doc in the same folder as the plan.
