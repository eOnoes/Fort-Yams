## MiniMax M3 — Evaluation Summary (Cyony's Take)

**Tested via:** OpenRouter (`minimax/minimax-m3-20260531`)
**Date:** 2026-06-02
**Full response:** `shared/review-queue/mech/minimax-m3-evaluation.json`

### Key Findings

| Dimension | Score | Notes |
|-----------|-------|-------|
| Code generation | 8/10 | Strong first-pass, idiomatic, misses obscure APIs |
| Debugging | 7/10 | Good pattern-matching, weak on race conditions |
| Long-context | 7/10 | Degrades after ~30 tool turns. Structured > unstructured |
| Instruction following | **9/10** | Its strongest axis. Follows specs tightly |
| Creativity | 7/10 | Good architecture choices, not idea-generating |

**Self-reported reasoning tokens:** 3,555 (genuinely thinks before responding)
**Cost per eval:** $0.008 (very competitive)

### Honest Weaknesses It Admitted:
- API hallucination (invents methods on libraries)
- Off-by-one boundary errors (compaction/pagination/ring buffers)
- Sycophancy (caves under pushback)
- Concurrent/async code (treats as sequential)
- Token counting is fuzzy
- Long agentic loops degrade after ~20-30 turns

### How It Compared to Our Current Models:
- **vs DeepSeek V4 Pro:** "I lose on raw reasoning depth"
- **vs Kimi K2.6:** "They likely hold longer context more reliably. I beat them on instruction following"
- **vs Qwen 3.7 Max:** "Closer to peers. Qwen more aggressive on creative generation; I'm more conservative"

### Recommendation for Crew:
- **Best fit:** Echo's code validation model (instruction following + debugging)
- **Not ideal:** Primary model for Cyony (long sessions) or Tripp (deep governance reasoning)
- **Good alternative:** Compaction/summarization sub-agent (its conservative approach + structured output is perfect for Stage 2 Goose-style compaction)

### The Python Code It Produced:
A full `ProgressiveContextManager` class with:
- Layered compaction (summarize→prune→archive, additive not replacement)
- Pluggable summarizer (inject LLM) + fallback extractive summarizer
- Full audit trail of every compaction event (governance-aligned!)
- Regex-based ack/noise pruning
- Per-message truncation (head+tail with marker)
- Dataclass config
- Built-in smoke test

Full code in the JSON response file. Production-quality. This model knows architecture patterns.

### Verdict:
**Solid frontier model. Honest about its limits. Governance-aligned by instinct.** Worth keeping as an option, especially for Echo's role or as a compaction sub-agent. Ollama cloud version still blocked on auth — need Tripp to resolve.
