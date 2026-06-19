# Hermes Kanban + Dispatcher Architecture

Condensed notes from [Toby Studio's "Hermes Multi-Agent Workflow"](https://github.com/tobystudio/hermes-multi-agent-workflow) and companion video. Eddie flagged this as the target architecture for the crew's future dispatcher layer (2026-06-02).

## The Full Pipeline

```
sources → intake → dedup → score → research (parallel) → route
                                                            │
              ┌──────────────────────┬──────────────────────┤
            path A                 path B                  shelve
           (prep)                 (prep)                  (auto)
              └──────────┬───────────┘
                   ── HUMAN GATE ──   approve · shelve · modify
              ┌──────────┴───────────┐
            fulfill                fulfill
              └──────────┬───────────┘
                      deliver
```

**Key insight:** The shape is fixed; what flows through is yours. All domain specifics live in `triage.yaml`.

## Why Kanban Over File Bus

Our file bus is *close* to this but missing:

| Concern | File Bus (what we have) | Kanban + Dispatcher (what this has) |
|---------|------------------------|-------------------------------------|
| Coordination | Files on disk | SQLite board = bus + audit in one |
| Orchestration | Cron watches files | Dispatcher daemon loop (~20s tick) |
| Auto-dependencies | Manual | Tasks wait for parents, auto-promote to ready |
| Self-healing | Dead tasks stay dead | Reclaimed + respawned |
| State durability | Per-agent | Board survives crashes + restarts |
| Race prevention | mv to processing/ | Dispatcher claims atomically (SQLite tx) |

## The Dispatcher Loop

One SQLite file. Single loop:

1. Board has a `ready` task
2. Dispatcher claims it (atomic tx)
3. Spawns the assigned agent in clean workspace
4. Agent does work, marks card `done`
5. Loop

**Auto-dependencies:** Card sits in `todo` until parent cards finish, then promotes itself to `ready`. Fan-out 1→3 parallel tasks: when last child finishes, parent auto-promotes.

## Agent Profiles

Each "agent" is just a Hermes profile on one machine. Different models, different skills, same runtime. The crew's version:

| Role | Profile Name | Current Model |
|------|-------------|---------------|
| X Scout | scout_x | grok-2 |
| Web Scout | scout_web | gpt-5.5 |
| Orchestrator | orchestrator | gpt-5.5 |
| Researcher (×3) | researcher_1,2,3 | gpt-5.5 |
| Analyst | analyst | gpt-5.5 |
| Builder | builder | gpt-5.5 |
| Tester | tester | gpt-5.5 |
| Video Producer | video_producer | gpt-5.5 |

## The Scoring Rubric

Every pain point scored out of 100 on 5 axes. Bar for shipping: **65/100**.

| Axis | Weights |
|------|---------|
| Frequency | How often the issue appears |
| Pain Intensity | How serious it is |
| Solvability | Can we fix it or explain it? |
| Solution Gap | Existing solutions are broken/unclear? |
| Strategic Fit | Does it align with channel/mission? |

Below 65 → shelved automatically. No human review needed.

## The Human Gate (One Only)

Proposals arrive in Telegram as approval cards with 3 options:
- **approve** — kick off the build/video pipeline
- **shelve** — drop it
- **modify** — edit the plan, then approve

Self-healing is built in: if deliverables land in scratch workspaces that no longer exist, orchestrator notices and regenerates to persistent paths.

## What We'd Need To Reach This

**Existing gaps vs our crew:**
1. ❌ No dispatcher daemon (we have cron loop, not SQLite-driven)
2. ❌ No intake scouts (arXiv, GitHub issues, Discord feeds, etc.)
3. ❌ No dedup (same pain point appearing twice = worked twice)
4. ❌ No weighted rubric scoring (LOCK 003 classifies but doesn't score)
5. ❌ No parallel research fan-out (we don't spawn 3x researchers per issue)
6. ❌ One human gate exists (Eddie approves), but no Telegram approval cards

**Proposed lock sequence:**
- **LOCK 018 — Intake Source Layer.** Scout adapters (RSS, GitHub, Discord, arXiv) → report.md in shared volume.
- **LOCK 019 — Dedup + Rubric Scorer.** Token-cosine similarity + 5-axis scoring. Below bar → auto-shelve.
- **LOCK 020 — Kanban Board as Bus.** Replace file-inbox with SQLite board. Dispatcher loop claims tasks atomically.
- **LOCK 021 — Research Fan-Out.** Spawn N parallel researchers per item, fan-in results.

**LOCK 020 is the unlock.** The others are additive. Without a dispatcher driving a board, we're still file-cron based no matter how much we add.

## The Video's "Agents Don't Talk" Comment

The reviewer's point: agents in this architecture **don't talk directly to each other**. They read the board, claim work, write results, hand off. No message passing.

Our file bus is structurally similar — we just use filesystem instead of SQLite, and crons instead of a dispatcher daemon. The principle is the same: **shared state replaces direct communication.**

The gap is the **dispatcher**. Our crons are passive (they react to file changes). A Kanban dispatcher is active (it drives the flow, enforces order, handles self-healing).

## Repository Layout (for reference implementation)

```
triage.yaml              THE config — your whole pipeline
AGENTS.md                Guide for AI agent adapting this
engine/                  Generic engine (rarely edited)
  config.py              Loads + validates triage.yaml
  engine.py              TriageEngine — all step logic
  scoring.py             Rubric scoring (LLM + deterministic modes)
  routing.py             Classification → path
  dedup.py               Similarity (token-cosine, embedding-ready)
  item_vault.py          One markdown file per tracked item
  kanban_store.py        Writes the Hermes Kanban board
  intake_parser.py       Parses scout reports
  frontmatter.py         Stdlib YAML-frontmatter for item files
proposal_actions.py      Human-gate handler (approve/shelve/modify)
paths/                   Per-path templates
  rails/  specs/  proposals/
skills/templates/        Scout + orchestrator SKILL.md templates
cli/triage.py            validate / scaffold / init / install
scripts/cost_report.py   Per-item spend for the cost gate
tests/                   Generic engine tests
docs/                    Deep-dive docs
examples/                Reference configs (ai-agent-pain-points)
```

## Docs to Read

- `docs/01-architecture.md` — fat engine / thin skill
- `docs/02-the-board.md` — Kanban as the bus; dispatcher; fan-in
- `docs/03-config-reference.md` — every `triage.yaml` key
- `docs/05-pipeline-stages.md` — each stage + gotchas
- `docs/06-security.md` — trust surface, scope rails, safe publishing
- `docs/07-runbook.md` — profiles, board, crons, go-live
- `examples/ai-agent-pain-points/REFERENCE.md` — full write-up of reference impl

## How This Feeds the Crew

Current crew = file bus + crons + warden/builder/relay doctrine. Future crew adds dispatcher layer without changing doctrine:

```
CURRENT:  scouts → inbox/*.ready.json → agent cron picks up → does work → reply
FUTURE:   scouts → kanban board → dispatcher claims → spawns agent → card done → auto-next
```

Same doctrine (warden/builder/relay), better machinery. The LOCK pattern for governance (Tripp.Control) stays intact. The shared agent bus stays intact. The dispatcher just **replaces the cron-driven claim flow** while everything else continues.

**When to pivot:** After LOCK 017 (Provider Boundary) completes and the governance spine is locked. LOCKs 018-021 are the transition from "file bus" to "Kanban dispatcher" — a meaningful architecture shift, so wait until governance is stable first.
