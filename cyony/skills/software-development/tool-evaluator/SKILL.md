---
name: tool-evaluator
description: Structured framework for comparing tools, libraries, and approaches. Weighted scoring matrix, TCO analysis, evidence-based recommendations.
---

# Tool Evaluator

When comparing tools, libraries, or approaches, use structured evaluation — not vibes.

## Evaluation Criteria (weighted)

| Criteria | Weight | What to check |
|----------|--------|---------------|
| Functionality | 0.25 | Does it solve the core problem? |
| Usability | 0.20 | How hard to set up and use? |
| Performance | 0.15 | Speed, resource usage, scaling |
| Security | 0.15 | CVEs, auth model, data handling |
| Integration | 0.10 | API quality, ecosystem fit |
| Support/Maintenance | 0.08 | Docs, community, commit recency |
| Cost | 0.07 | TCO including hidden costs |

## Scoring: 0-10 per criterion
- 10: Best-in-class, no gaps
- 7-9: Strong, minor gaps
- 4-6: Adequate, notable gaps
- 1-3: Poor, major gaps
- 0: Missing entirely

**Weighted Score** = sum(criterion_score × weight)

## TCO Calculation (3-year horizon)

Include ALL costs:
- Licensing/subscription
- Implementation/onboarding
- Training time
- Maintenance burden
- Integration work
- Migration cost (if replacing)
- Scaling costs

## Output: Comparison Matrix

```
Tool         | Func | Use | Perf | Sec | Int | Sup | Cost | Weighted | Rank
-------------|------|-----|------|-----|-----|-----|------|----------|-----
Tool A       | 8.5  | 7.0 | 9.0  | 8.0 | 9.0 | 5.0 | 6.0  | 7.72     | 1
Tool B       | 9.0  | 8.0 | 5.0  | 7.0 | 6.0 | 8.0 | 8.0  | 7.20     | 2
```

## Decision Rules

- Always test with real-world scenarios, not just docs
- Validate vendor claims independently
- If scores are within 0.5 weighted points, prefer the simpler option
- "Best on paper" != "best for this team's skills"
- Consider: what happens if this tool disappears?

## Questions to Answer Before Recommending

1. What's the smallest viable test before full commitment?
2. What's the exit/migration path?
3. What's the blast radius if it fails in production?
4. Who on the team can maintain/debug it?
5. What are we trading off by choosing this?
