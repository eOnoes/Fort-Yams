# Token Tracking Protocol

## File Locations

**Agent logs:**
```
shared/memory/token-logs/{agent}-{YYYY-MM-DD}.json
```

Example: `cyony-2026-06-01.json`

**Aggregated report:**
```
shared/memory/token-spending-report.md
```

**Monitoring scripts:**
```
/opt/data/scripts/generate-token-report.py
/opt/data/scripts/check-crew-status.py
```

## JSON Schema for Token Logs

Each agent appends entries to their daily log file:

```json
{
  "agent": "cyony",
  "timestamp": "2026-06-01T23:45:00Z",
  "tokens_used": 65000,
  "model": "qwen/qwen3.7-max",
  "cost_usd": 1.95,
  "task": "Full session: Tripp.Reason review, universal inbox setup, escalation protocol, mech design, Reasonix analysis, TokenMunch kit install (177 MCP tools)",
  "munch_kit_status": {
    "jcodemunch": "installed + registered (82 tools)",
    "jdocmunch": "installed + registered (60 tools)",
    "jdatamunch": "installed + registered (35 tools)",
    "tripcore_munch": "awaiting Tripp docs"
  },
  "estimated_savings_next_session": "50-80% on code/doc/data retrieval tasks"
}
```

**Required fields:**
- `agent` — which agent (cyony, tripp, echo)
- `timestamp` — ISO 8601 format
- `tokens_used` — integer, total tokens consumed
- `model` — which LLM model was used
- `cost_usd` — float, estimated cost in USD
- `task` — string, what was being done

**Optional fields:**
- `munch_kit_status` — if MCP tools were installed/configured
- `estimated_savings_next_session` — projected efficiency gains
- Any other session-specific metadata

## Report Generation

Run the aggregation script:
```bash
python3 /opt/data/scripts/generate-token-report.py
```

This produces:
- Total tokens and cost across all agents
- Per-agent breakdown (entries, tokens, cost, recent tasks)
- Per-model breakdown (uses, tokens, cost)
- Written to `shared/memory/token-spending-report.md`

## Example Report

```markdown
# Crew Token Spending Report

**Generated:** 2026-06-01 23:56:05 UTC
**Total entries:** 1
**Total tokens:** 65,000
**Total cost:** $1.95

## By Agent

### Cyony
- **Entries:** 1
- **Tokens:** 65,000
- **Cost:** $1.95
- **Recent tasks:**
  - full session: Tripp.Reason review, universal inbox setup, escalation protocol, m (qwen/qwen3.7-max)

## By Model

- **qwen/qwen3.7-max**
  - Uses: 1
  - Tokens: 65,000
  - Cost: $1.95
```

## Best Practices

1. **Log after each major task** — don't batch at end of session
2. **Be specific in task descriptions** — helps with cost attribution
3. **Use consistent model names** — "qwen/qwen3.7-max", not "qwen-max" or "the new qwen"
4. **Include cost estimates** — even rough estimates help track spending trends
5. **All agents use same schema** — Tripp and Echo should log to their own files using same format

## Integration with Tripp.Control

Future LOCK (post-LOCK 010): Tripp.Control can ingest token logs to:
- Enforce budget_class limits from task classification
- Justify premium model usage (LOCK 006 reports)
- Track cost trends across escalation chains
- Correlate spending with task_class/risk_class

For now, logs are informational only — no enforcement.