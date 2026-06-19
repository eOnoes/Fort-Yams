---
name: parallel-recon-sweep
description: "Run parallel reconnaissance across multiple repos, tools, products, or options using delegate_task batch with a consistent per-source report card + comparative summary. Use when you need to evaluate N alternatives in one pass — GitHub repos, SaaS tools, frameworks, libraries."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [research, recon, delegate_task, parallel, comparison, evaluation]
    related_skills: [capability-dispatch, hermes-agent, subagent-driven-development]
trigger_conditions:
  - User provides a list of 2-5 URLs/repos/tools to evaluate
  - User asks "compare these" or "which of these should we use"
  - User wants a recon sweep across multiple sources in one response
  - User cares about consistent output format across sources (report cards)
---

# Parallel Recon Sweep

## Overview

When the user hands you 2-5+ targets to evaluate (repos, tools, UIs, frameworks), run them in parallel via `delegate_task(tasks=[...])` with a single consistent prompt template per target. Each subagent produces a uniform "report card" and you synthesize a comparative summary at the end.

Max batch size: 3 concurrent subagents (Hermes default). For >3 targets, split into batches.

## When to Use

- Evaluating 2-5 alternatives against common criteria
- Surveying multiple GitHub repos for a feature set
- "Which of these could fill this role?" questions
- Recon that the user will use to make a decision
- When user explicitly wants all options surveyed (not just "pick one")

## When NOT to Use

- Deep-dive research on ONE target (single delegate_task with goal param, not tasks=)
- Simple Q&A that doesn't need parallelism
- Tasks that depend on each other (A's output informs B)

## Prompt Template

Every per-target task prompt should include the same required sections. Consistency lets the user scan quickly.

```
Research {TARGET_NAME} at {URL}. Produce a Recon Report covering:
1. What it is + stars/forks/license/maturity signals
2. Core capabilities (list)
3. {CRITERION_1}: yes/no/partial + evidence
4. {CRITERION_2}: yes/no/partial + evidence
5. {CRITERION_3}: yes/no/partial + evidence
6. UI/style rating (minimalist/balanced/feature-heavy) if applicable
7. Install/deployment complexity
8. Fit assessment for {USER_CONTEXT}
9. Bottom line recommendation

Be thorough — read README, scan repo structure, search web if needed.
Report length: comprehensive but focused.
```

Always pass enough context that the subagent understands the user's actual use case, not just the evaluation criteria.

## Subagent Configuration

```python
delegate_task(tasks=[
    {"goal": "Research {REPO_1}...", "context": "...", "toolsets": ["web", "terminal"]},
    {"goal": "Research {REPO_2}...", "context": "...", "toolsets": ["web", "terminal"]},
    {"goal": "Research {REPO_3}...", "context": "...", "toolsets": ["web", "terminal"]},
])
```

- `web` toolset lets subagents fetch READMEs, search for star counts, check docs sites
- `terminal` lets them `git clone` and inspect local if needed
- Pass the USER's constraints/preferences in `context`, not in `goal` — goal is the task, context is the frame

## Synthesizing the Output

After subagents return:

1. **Quick-compare table** — one row per target, columns = key decision criteria
2. **Winner pick with reasoning** — "X is the only one that does Y"
3. **Trade-offs per target** — what you give up by choosing it
4. **Honest caveats** — "None of these actually fit the minimalist requirement"
5. **Next step recommendation** — "Try X, and if it fails, fall back to Y"

## Pitfalls

1. **Subagents cannot use clarify.** They have ZERO memory of your conversation. Every criterion, every target URL, every user preference must be in the goal or context fields.
2. **Subagent summaries are self-reports.** If a subagent claims "it supports X," verify with a quick check before presenting as fact.
3. **Timeout risk.** Recon of large repos can take 5+ minutes. Use generous timeout or set notify_on_complete.
4. **Rate limits.** Don't fire 3 requests to the same GitHub API endpoint simultaneously in a way that looks like abuse.
5. **Don't batch >3.** Hermes delegation default max concurrent is 3. Going higher needs config change.
6. **Don't skip the synthesis.** Raw subagent dumps are noise. Your value-add is the comparative summary.
7. **Interrupted parent kills children.** If the user sends a new message mid-sweep, subagents are cancelled. For long sweeps, use cron or background terminal.

## Example: Session-Extracted Run

**User asked:** "Here are 5 Hermes UIs. Which supports cloud models, can link OpenClaw, and is minimalist?"

**Approach:** 3 concurrent delegate_task calls (one timed out partway, re-ran separately). Each subagent produced uniform report with: stars, cloud support table, multi-agent support, UI style rating, tech stack, install complexity, fit assessment.

**Final response included:**
- Per-project report cards
- Comparison table (cloud models / multi-agent / OpenClaw link / minimalist / install)
- Honest finding: "None of these are minimalist"
- Winner + fallback recommendation
- Connection to related project (The Den proposal already pitched to user)

## Related Skills

- `subagent-driven-development` — for build tasks, not research
- `capability-dispatch` — for routing ONE task to a specialist, not evaluating many targets
- `writing-plans` — when research converts to an implementation plan
