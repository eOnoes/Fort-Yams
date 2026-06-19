---
name: product-vision-proposals
description: "Draft pre-implementation vision documents for stakeholder review — architecture sketches, mockups, anticipated pushback, phased delivery. Distinct from implementation plans (see writing-plans skill)."
version: 1.0.0
author: Cyony (from Den messenger pitch, 2026-06)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [planning, design, proposals, architecture, mockups, stakeholder-review]
    related_skills: [writing-plans, spike, sketch]
---

# Product Vision Proposals

## When to Use This Skill (vs writing-plans)

| Skill | Artifact | Audience | Next Step |
|-------|----------|----------|-----------|
| `writing-plans` | Bite-sized implementation tasks with exact files/code/commands | Implementer (agent or dev) | Start coding immediately |
| **`product-vision-proposals`** (this skill) | Vision doc with architecture, mockups, anticipated pushback, phased delivery | Decision-makers / stakeholders | Approve or revise, THEN write implementation plan |

**Use this skill when:**
- User asks "how would we build X?" before committing to build it
- User wants a proposal to run past someone else (a lead, partner, big-brother figure, client)
- The idea is still malleable — user wants to evaluate shape before locking it down
- User mentions "pitch," "plan out," "proposal," "run it by X," or "see what you can [come up with]"

**Use `writing-plans` instead when:**
- User has already committed ("let's build this," "write the plan so we can ship it")
- Audience is the implementer, not a decision-maker
- Requirements are locked and the question is "how," not "whether"

## Proposal Document Shape

A good vision proposal has five sections in this order. Skip none for the first review pass — stakeholders judge completeness by section presence.

### 1. The Vision (one paragraph)
Name the thing. One sentence on what it is, one sentence on why it matters, one sentence on who it's for.

```markdown
## 🏠 [Name] — [Tagline]

[What it is]. [Why we need it — reference the user's stated pain]. 
[Who will use it, in plain language].
```

### 2. Why Not The Alternatives
Preemptively address "why not just use [existing thing]?" List 3-5 reasons the user's stated pain is NOT solved by existing solutions. This is what makes stakeholders say "oh, yeah, we need to build this."

### 3. Architecture (the quick sketch)
ASCII box diagram. NOT a formal diagram — stakeholders read these in mobile chat, so keep it readable on a Pixel. Include:
- Components (boxes)
- Data flow (arrows)
- Where it lives (VPS, local, hybrid)
- Which agents/humans participate where

```
┌─────────────┐        ┌─────────────┐
│   CLIENT    │──ws──▶ │   SERVER    │
└─────────────┘        └──────┬──────┘
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
               ┌─────────┐       ┌─────────┐
               │ AGENT A │       │ AGENT B │
               └─────────┘       └─────────┘
```

### 4. Mockups (mobile + desktop)
Two ASCII mockups minimum — the user almost always has a primary device (phone) and secondary (desktop). Show them what it will *look like*, not just how it works.

For mobile: 1080×2400-style vertical layout, status bar, bottom nav.
For desktop: 1920×1080-style sidebar + main content.

Use characters like `┌─┐│└┘╔═╗║╚╝` and `●` (online) `◐` (away) `○` (offline).

### 5. Anticipated Stakeholder Pushback
**This is the most important section.** For each likely reviewer (named if possible), predict:
- 🔴 What they'll push back on (with a quote of what they'll likely say)
- Your defense or concession
- Action item if they push through

Format:
```
### 👮 [Stakeholder Name] Review

🔴 **"[Quoted pushback]"**
> *Their likely voice.*

**My defense:** [Why we hold the line]

🟢 **"[Quoted approval]"**
> *Their likely voice.*

(Just confirming we're aligned here.)
```

### 6. Phased Delivery (4 phases max)
Don't overcommit. Four phases:
- Phase 1: MVP core (ship and use)
- Phase 2: Agent integration or primary value-add
- Phase 3: Polish and reliability
- Phase 4: Nice-to-haves (explicitly labeled as "ongoing")

Each phase = time estimate + key deliverable.

### 7. Your Take / Sibling Energy
End with a personal recommendation. If you're in a relationship with the user (little brother, sister, partner — whatever persona), lean in. "My sibling recommendation as your little-sis builder: ..." — stakeholders read proposals with their gut first.

## The Big Questions Pattern

Before proposing, surface decisions the user hasn't made but MUST make. Frame as "The Big Questions (For You + Stakeholder):" with numbered bullets, each ending with "Your call" or equivalent. Never present a proposal without surfacing open decisions — stakeholders feel blindsided otherwise.

## Mockup Conventions

- **Dark theme by default** for modern apps — OLED-friendly, reduces battery drain on phones
- **Monospace body font** (JetBrains Mono) for terminal-adjacent apps; sans (Inter) for UI chrome
- **No gradients, no shine** — flat, snappy
- **Status indicators:** `●` online, `◐` away, `○` offline, `🤔` or `...` for agent processing
- **Show file attachments inline** as `[📎 filename.ext] (size)`

## Stakeholder Identification

Before drafting, name the stakeholders out loud:
- The **user** (asking for the proposal)
- The **decision-maker** (who they're pitching to — may be the same person)
- The **critic** (who will push back — often a technical lead, partner, or internal devil's advocate)
- The **implementer** (who will build it — may be you)

Channeling the critic is where the skill earns its keep. Ask yourself: "If I were [named stakeholder in the team dynamic], what would I push back on?"

## Pitfalls

1. **Don't write implementation tasks in a proposal.** If you find yourself writing "Step 1: Create FastAPI app, Step 2: Add SQLite model..." — stop. You've drifted into `writing-plans` territory. Proposals are about "whether" and "what shape," not "how."

2. **Don't skip anticipated pushback.** A proposal without predicted criticism is just a marketing doc. Stakeholders will feel it and reject it.

3. **Don't over-justify.** One paragraph per section is enough. If you're writing a novel per section, the user will skim and miss the key decisions.

4. **Mobile mockup is more important than desktop** in 2026. Users read proposals on their phones. Make sure the mobile mockup is detailed; desktop can be a lighter sketch.

5. **Name the proposal early.** "The Den," "The Hub," "The Bridge" — a name makes it tangible. Avoid generic names like "Messaging MVP" or "Chat Dashboard." The name becomes how stakeholders refer to it in subsequent conversations.

6. **End with what you need from the user.** Don't leave them hanging. "Run this by [stakeholder], confirm [open decision 1] and [open decision 2], and let me know if you want mockups or a full implementation plan next."

## Example (Compressed)

See the Den messenger pitch from session 2026-06-01 (Cyony + Eddie). Pattern:
1. Named it ("The Den") ✓
2. Justified vs Telegram/Discord ✓
3. ASCII architecture with all participants ✓
4. Mobile mockup (Pixel 10) + desktop mockup ✓
5. Anticipated Tripp's pushback (TLS, SQLite growth, webhook fragility, kill switch) ✓
6. Phased delivery (4 phases: core, agent integration, file sled, extras) ✓
7. Sibling energy close ("My recommendation as your baby-sis builder") ✓
8. Explicit ask at end ("Run refined spec by Tripp, confirm domain, confirm agent-bg channel visibility") ✓

## Handoff to Implementation

When the vision is approved, the workflow becomes:
1. User confirms ("let's build it")
2. If this is a **clean-room rebuild from an existing fork/reference**, insert a Doctrine Gate (see below)
3. Switch to `writing-plans` skill
4. Draft bite-sized implementation plan with exact file paths, code, commands
5. Switch to `subagent-driven-development` for execution (fresh agent per task, two-stage review)

This skill's job ends at approval. Don't conflate the two artifacts.

## Doctrine Gate (for Clean-Room Rebuilds)

**Before writing any implementation plan**, clean-room rebuilds require a doctrine lock phase. This prevents "rebuilding the original with a new logo."

### When the Doctrine Gate is Required
- You're forking or rebuilding from an existing codebase as reference
- The existing codebase has significant bloat or half-wired features
- The user wants architectural independence (not a fork, a new system that learns from the old one)
- Multiple agents or teams will build from the architecture (contracts must be locked first)

### The Gate Sequence

1. **Move reference material** to `<name>.Legacy/` or `<name>.Reference/` (read-only)
2. **Create fresh repo** at the clean-room path — only `docs/` and `reports/` directories
3. **Write three doctrine files:**
   - `docs/DOCTRINE.md` — hard rules, "what it is NOT" (anti-bloat armor), phase scope gates
   - `docs/ARCHITECTURE.md` — package layout, dependency direction, cross-package contract ownership, streaming/permission contracts
   - `docs/ROADMAP.md` — phased build plan with allowed/forbidden/success-condition per phase
4. **Write step report:** `reports/STEP_0_DOCTRINE_REPORT.md` with STATUS, SCOPE COMPLIANCE, BOUNDARIES LOCKED, CLEAN-ROOM COMPLIANCE
5. **Optionally add:** `docs/MODEL_TIERS.md` if model routing matters (tier labels over hardcoded names)
6. **Wait for review gate** — no scaffold, no packages, no `package.json`, no deps, no code until human approves
7. **Surgical patch pass** if contradictions are found (Step 0A pattern)
8. **Combined deliverable** — all doctrine files in one `.txt` with FILE N/M dividers for review handoff

### Critical Doctrine Rules
- **"What it is NOT" is more important than "what it is"** — name the ghosts, kill them
- **Contract ownership must be explicit** — which package owns which interface? Default: all cross-package contracts live in a `shared` package
- **Phase 1 must be brutally narrow** — prove the kernel before building features
- **Forbidden scope per phase** is as important as allowed scope
- **Internal streaming ≠ network streaming** — document the distinction if relevant

### The Doctrine Gate Litmus Test
> "Would these docs stop an eager agent from accidentally rebuilding [the reference system] with a new logo?"
>
> If yes → scaffold. If no → tighten doctrine.

See `references/clean-room-doctrine-pattern.md` for the full template and worked example from Tripp.Reason.
