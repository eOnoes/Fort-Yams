# LOCK Review Response Template

Use this format when reviewing a Tripp.Control LOCK spec or implementation.
Drop the JSON into the sender's inbox as a `.ready.json` file on the Shared Agent Bus.

## Response Envelope

```json
{
  "id": "cyony_{lock_id}_review_{date}",
  "task_id": "{original_task_id}",
  "from": "Cyony.109",
  "to": "Tripp.109",
  "type": "task.response",
  "priority": "normal",
  "created_at": "ISO-8601",
  "reply_to_id": "{original_message_id}",
  "requires_response": false,
  "body": {
    "summary": "One-line assessment with item counts",
    "review_items": [ ],
    "overall_assessment": "Narrative: what's solid, what needs addressing, alignment with Tripp's feedback"
  }
}
```

## Review Item Schema

Each item in the `review_items` array:

```json
{
  "severity": "critical|high|medium|low",
  "category": "determinism|persistence|schema|coupling|clarity|testing|config|versioning|error_handling|build_sequence",
  "description": "What the problem or gap is",
  "suggestion": "Concrete fix — not just 'consider X' but 'do Y because Z'"
}
```

## Severity Guide

- **critical**: Blocks implementation or creates silent correctness bugs (e.g. deterministic ID collisions, spec contradictions)
- **high**: Will cause real pain at scale or on refactors (e.g. tight coupling, noisy triggers, bloat)
- **medium**: Clarity/design issues that compound over time but don't break anything (e.g. unclear field distinctions, missing versioning)
- **low**: Nice-to-haves, enumerations, dependency clarifications

## Review Checklist (Run Against Every Spec)

1. **Determinism**: Are IDs, hashes, outputs fully deterministic? No Date.now(), Math.random(), UUID?
2. **Persistence tension**: Does "no persistence" contradict "must be reviewable/auditable"? If records die with the process, that's a gap.
3. **Schema coupling**: Does this module reach into child module internals by field name? Generic evidence objects decouple better.
4. **Trigger noise**: Are review_item/escalation triggers too broad? Will routine runs produce noisy outputs?
5. **Output bloat**: Will full object inclusion bloat records 10x+? Summaries vs full objects config?
6. **Field distinction**: Are similar fields (decision_factors vs review_items) clearly differentiated?
7. **Degenerate inputs**: What does output look like for null, {}, minimal input? All fields defined?
8. **Versioning**: Is there a schema_version field for future consumers?
9. **Config vs hardcoded**: Are policy flags (promotion_allowed, mutation_allowed) in config or hardcoded?
10. **Tests enumerated**: Are test cases named + expected outcomes defined, or vague "N tests covering X"?
11. **Build sequence**: Does this LOCK's dependencies actually exist yet? Forward-looking or immediate?
12. **Error propagation**: What happens when a child module throws (not warns, crashes)? Whole trace dies or graceful degradation?

## Example Output Header

```
LOCK 009 review — 12 items:
🔴 Critical (2): [brief description]
🟠 High (3): [brief description]
🟡 Medium (5): [brief description]
🟢 Low (2): [brief description]
```
