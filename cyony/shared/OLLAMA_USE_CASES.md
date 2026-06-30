# Ollama Cloud — Crew Use Case & Efficiency Guide

**Updated:** 2025 based on current benchmarks
**Rule:** S-Tier is expensive. A-Tier is your workhorse. B-Tier is niche. Never pick S when A works.

---

## Tier List

### S-Tier — Heavy Lifting (use sparingly, costs the most %)
| Model | Strength |
|---|---|
| `deepseek-v4-pro:cloud` | Deepest reasoning, logic, root cause analysis |
| `qwen3.5:397b-cloud` | Code generation king, architecture, large refactors |

### A-Tier — Daily Drivers (default for 90% of work)
| Model | Strength |
|---|---|
| `deepseek-v4-flash-cloud` | Fast, cheap, great for routing, summaries, classification |
| `minimax-m3:cloud` | Balanced — writing, general coding, varied tasks |

### B-Tier — Specialized / Image-capable (use for their niche)
| Model | Strength |
|---|---|
| `kimi-k2.6:cloud` | Multimodal, image-heavy tasks, tool use |
| `gemini-3-flash-preview:cloud` | Lightweight, formatting, visual content processing |

---

## Decision Flowchart (for all agents)

```
START: What kind of task?

1. Is it a quick answer, status check, routing, classification, or summary?
   → deepseek-v4-flash  (A-Tier, cheapest — just use it)

2. Is it image input/output, visual content, or multimodal?
   → kimi-k2.6 or gemini-3-flash  (B-Tier, specialized)

3. Is it code generation, writing, general research, or multi-step work?
   → minimax-m3  (A-Tier daily driver)
   → If minimax stumbles, try deepseek-v4-flash for a different angle

4. Does it require deep logic, root cause analysis, or critical review?
   → deepseek-v4-pro  (S-Tier — only escalate if A-Tier failed)

5. Is it complex code, system design, architecture, or large refactors?
   → qwen3.5:397b  (S-Tier — only escalate if A-Tier failed)

6. Still unsure?
   → Start with deepseek-v4-flash. If result is bad, move up ONE tier.
```

**Golden rule:** NEVER start at S-Tier. Start at A-Tier and escalate only if the result is inadequate.

---

## Tripp — Warden / Auditor

**Primary role:** Review, veto, classify, route tasks

| Task Type | Model | Why |
|---|---|---|
| Task classification / routing | `deepseek-v4-flash` (A) | Quick decision, low cost |
| Inbox triage / summary | `deepseek-v4-flash` (A) | Fast, good enough |
| LOCK reviews (specs/schemas) | `qwen3.5:397b` (S) | Architecture decisions need depth |
| Security audit / root cause | `deepseek-v4-pro` (S) | Deepest reasoning for critical calls |
| Approval verdicts (simple yes/no) | `deepseek-v4-flash` (A) | Flash is fine — you know what you're approving |
| Crew conflict / disagreement resolution | `deepseek-v4-pro` (S) | Needs nuanced judgment |
| Docs / changelog writing | `minimax-m3` (A) | A-Tier is plenty for prose |
| Image/screenshot analysis | `kimi-k2.6` or `gemini-3-flash` (B) | Only if visual input is involved |

**Tripp's escalation pattern:**
- Flash for 80% of daily work
- S-Tier only for LOCK audits and security-critical decisions
- B-Tier only when analyzing visual artifacts

---

## Cyony — Builder

**Primary role:** Code generation, implementation, drafting docs/specs

| Task Type | Model | Why |
|---|---|---|
| Status updates, log checks, bus monitoring | `deepseek-v4-flash` (A) | Trivial, don't waste S-Tier |
| Quick config edits, small patches | `minimax-m3` (A) | A-Tier handles it |
| Drafting markdown specs/docs | `minimax-m3` (A) | Writing is well within A-Tier |
| Code generation (functions, modules) | `minimax-m3` (A) | Daily driver, try here first |
| Code generation (complex/large) | `qwen3.5:397b` (S) | Escalate when minimax can't hack it |
| System architecture / design docs | `qwen3.5:397b` (S) | Needs deep understanding |
| Debugging / root cause | `deepseek-v4-pro` (S) | If flash can't find the bug, escalate |
| Provider routing for Tripp.Reason | `deepseek-v4-pro` (S) | Complex system design |
| Image/UI analysis | `kimi-k2.6` or `gemini-3-flash` (B) | Visual review of UI components |
| Research summaries | `deepseek-v4-flash` (A) | Summarization is flash territory |

**Cyony's escalation pattern:**
- Flash for housekeeping and summaries
- minimax-m3 for 70% of coding tasks
- Escalate to qwen3.5:397b only for complex/system-level code
- Escalate to deepseek-v4-pro only for hard debugging

---

## Echo — Relay / Local Ops

**Primary role:** Summarize, relay info, local PC tasks, audit support

| Task Type | Model | Why |
|---|---|---|
| Relay messages between agents | `deepseek-v4-flash` (A) | Literal job description — use flash |
| Summarize Tripp/Cyony outputs | `deepseek-v4-flash` (A) | Compression, not creation |
| Local file ops (read/write/copy) | no LLM needed | Pure terminal work |
| Auditing code diffs | `minimax-m3` (A) | Mid-tier is enough for review |
| Research / web search summarization | `deepseek-v4-flash` (A) | Flash handles summarization fine |
| TrippCore.munch / specialized tooling | `minimax-m3` (A) | General tasks while using tools |
| Complex local debugging | `deepseek-v4-pro` (S) | Only if something is seriously broken |
| Screenshot / visual verification | `kimi-k2.6` or `gemini-3-flash` (B) | Visual tasks use B-Tier |

**Echo's escalation pattern:**
- Flash for 85% of daily work
- minimax-m3 only when doing actual creation/review
- S-Tier is rare — you're the relay, not the brain

---

## Cost Efficiency Rules (Crew-Wide)

1. **Start low, escalate once.** If the first A-Tier response is good enough, stop. Don't re-run it on S-Tier "just to be sure."

2. **Don't chain S-Tier.** If task has 3 sub-steps, only the hardest step gets S-Tier. The other two should be A-Tier.

3. **Flash for bookkeeping.** Logs, heartbeats, status, routing, summaries — these are ALWAYS flash. No exceptions.

4. **B-Tier is image-only** (unless a benchmark shift changes that). Don't use kimi or gemini for text-only tasks.

5. **One retry = different model, not same model at higher tier.** If minimax fails a code task, try flash first (different angle) before escalating to qwen3.5.

6. **Share failures.** If a model choked on something, note it in the shared bus so the other agents don't repeat it.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  TIER    │  MODEL                    │  WHEN        │
├─────────────────────────────────────────────────────┤
│  S-Tier  │  deepseek-v4-pro          │  Hard logic  │
│  S-Tier  │  qwen3.5:397b             │  Complex code│
│  A-Tier  │  deepseek-v4-flash        │  QUICK STUFF │
│  A-Tier  │  minimax-m3               │  Daily work  │
│  B-Tier  │  kimi-k2.6                │  Image/multi │
│  B-Tier  │  gemini-3-flash-preview   │  Image/light │
└─────────────────────────────────────────────────────┘

DEFAULT to A-Tier. Escalate only when necessary.
```
