---
name: model-benchmarking
description: "Evaluate frontier LLMs for crew fit — structured eval prompts that elicit honest self-assessment, comparative ratings, and verifiable code samples. Use before recommending a model for any crew role."
tags: [model-evaluation, benchmark, llm, frontier-models, crew-architecture, provider-vetting, multimodal-testing]
created: 2026-06-01
---

# Model Benchmarking for Crew Architecture

## Trigger
When Eddie (or any crew member) asks to try/evaluate a new frontier model — MiniMax M3, DeepSeek V4, Kimi K2.6, GPT-5, etc. Run this BEFORE recommending a model for any crew role (governance, verification, creative builder).

**Also covers provider evaluation** — evaluating the API/service itself (reliability, billing, agentic compatibility), not just the model. See `references/provider-vetting-checklist.md` for the provider-specific checklist and `references/mimo-provider-guide.md` for a real-world MiMo case study.

## Why Structured Evals Matter
Models self-report strength in marketing copy; honest benchmark prompts force them to admit specific failure modes under evaluation pressure. A well-structured eval reveals:
- True ceiling on code quality (vs. what marketing claims)
- Specific failure modes they'll hit in YOUR workload
- How they compare against other models ALREADY in the crew
- Cost/quality tradeoff at realistic prompt sizes

## The Five-Part Eval Prompt Structure

Every eval prompt MUST contain these five components. Drop one and you get inflated self-ratings with no verification.

### Part 1: Identity + Crew Context
Set a framing where the model MUST compare itself to named peers. Without peer comparison, models rate themselves 9-10 across the board.

```
I am {your_crew_role}. We build {specific_project}.
Compare yourself honestly against {existing_model_A}, {existing_model_B}, {existing_model_C}.
```

Use the ACTUAL models already in the crew. Forces grounded comparison.

### Part 2: Three Forced Self-Assessments
Each must be specific, not vague. Use these exact shapes:

1. **"What are your ACTUAL strengths"** (emphasis on ACTUAL — triggers honesty framing)
2. **"What are your known weaknesses — be specific about where you fail"** (specificity requirement blocks hand-wavy "I sometimes make mistakes")
3. **"How do you handle {specific_workflow_type}"** (multi-step reasoning? tool use? long context? Pick what your crew actually does)

### Part 3: Self-Rating Grid (1-10 with justification REQUIRED)
Five dimensions, each requiring a one-sentence justification. Without justifications, models rate everything 8-9.

| Dimension | What It Measures |
|-----------|-----------------|
| Code generation | Quality of first-pass output |
| Debugging | Finding bugs, not just explaining code |
| Long-context comprehension | Maintains state across 20+ turns |
| Instruction following | Adheres to specs without drift |
| Creativity | Architecture choices, naming, edge cases |

### Part 4: Verifiable Code Sample
Ask for a code function that implements a concept the model SHOULD understand given its training. The code must be:
- Real logic, not pseudocode
- Sized to expose subtle bugs (> 50 lines of real logic)
- Relevant to YOUR actual use case

Example for agent/governance work:
```
Write a Python function: a context window manager with progressive compaction.
Stages: truncate at 50k chars, summarization markers at 60%, prune at 75%, archive at 85%.
Show real logic. I want to see how you think about this.
```

The model's code sample is the GROUND TRUTH. Self-ratings can be inflated; code cannot.

### Part 5: Honest Close
A framing that explicitly rewards honesty over salesmanship:
```
Be honest — I am comparing you against other frontier models.
I am going to compare this to what other frontier models say about themselves.
```

## Example: MiniMax M3 Eval (Full Prompt)

```
Hey MiniMax M3. I am {role} in a 3-agent crew. We build {project}.
Give me your honest self-assessment:

1. What are your ACTUAL strengths in coding and agentic workflows?
2. What are your known weaknesses? Be specific about where you fail.
3. How do you handle multi-step reasoning and tool use?
4. Rate yourself 1-10 on: code generation, debugging, long-context comprehension,
   instruction following, creativity
5. Write me a Python function: {real_workload_function}.

Comparing you against Qwen 3.7 Max, DeepSeek V4 Pro, Kimi K2.6. Be honest.
```

Real results in `references/minimax-m3-evaluation.json`. M3 rated itself 7.6/10 aggregate (9/10 instruction following, 7/10 long-context — admitted weak after ~30 turns). Code sample was production-grade `ProgressiveContextManager` with audit trail. Recommended for Echo's code validation role, not Tripp's deep reasoning or my long creative sessions.

## Interpretation Rubric

After running the eval, use this rubric to decide crew fit:

| Aggregate Score | Interpretation |
|-----------------|----------------|
| **9.0+** | Primary model candidate for any role |
| **8.0-8.9** | Strong specialist — fit to specific role |
| **7.0-7.9** | Solid utility (compaction, summarization, validation) |
| **<7.0** | Skip unless cheap enough to use for bulk work |

| Dimension | Role Fit Signal |
|-----------|----------------|
| Code gen ≥9 | Builder role candidate |
| Debugging ≥8 | Local verifier candidate |
| Instruction following ≥9 | Governance/warden candidate |
| Long-context ≥8 | Creative builder candidate |
| Creativity ≥8 | Creative builder candidate |

**Red flags in output:**
- Hand-wavy "I'm good at X" without specific evidence → inflated eval
- No acknowledgment of any weakness → likely sycophantic under pressure
- Pseudocode instead of real logic → weak code generation
- Won't compare to named peers → hiding

## Cost Tracking

Always capture usage metadata in eval output:
- `prompt_tokens` / `completion_tokens`
- `reasoning_tokens` (separate — measures thinking depth)
- `total_cost_usd` per call
- Time-to-completion (slow = not good for interactive use)

## When TO Run vs Skip

**Run full eval when:**
- Eddie asks "how does this model feel?"
- New model released in your price range
- Considering replacing a crew member's current model
- Crew budget review — looking for cheaper alternatives

**Skip and trust existing experience when:**
- Model is in your current allowed set and you've already tested it in sessions
- Eddie asks a simple "do you have this model?" question
- Model is >10× expensive than current options (skip eval, skip adoption)

## Pitfalls

- **Don't let the model pick its own strongest task.** You pick the task. The eval is only honest when the model faces YOUR actual workload.
- **Run the eval twice.** Models can have variance. One good run doesn't prove fit; one bad run doesn't disqualify. Run twice, average.
- **Read the code first, self-rating second.** Code is ground truth. Self-rating is marketing.
- **Watch reasoning tokens.** High reasoning_tokens count = genuinely thinking, not just streaming.

## Related Skills
- `hermes-agent-model-config` — configuring models in Hermes once you've picked one
- `writing-plans` — when the eval produces a build prompt (see `references/build-prompt-external-llm.md`)
