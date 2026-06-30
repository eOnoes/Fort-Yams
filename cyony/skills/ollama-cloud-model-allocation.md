# Ollama Cloud Model Allocation (2026-06)

Crew-wide model routing strategy for Ollama Cloud API. Use-based pricing (not flat) — each model burns a different % per request.

## Endpoint & Auth

```
Base URL:   https://ollama.com/v1   (OpenAI-compatible API)
Auth:       Authorization: Bearer $OLLAMA_API_KEY
Env file:   /opt/data/.env  (OLLAMA_API_KEY, OLLAMA_HOST)
```

## Tier Structure

### S-Tier — Heavy Lifting (expensive, use sparingly)

| Model | Strength | Best For |
|-------|----------|----------|
| `deepseek-v4-pro:cloud` | Deepest reasoning | Root cause analysis, critical audits, security review |
| `qwen3.5:397b-cloud` | Complex code | Architecture design, large refactors, system-level code |

### A-Tier — Daily Drivers (default for 90% of work)

| Model | Strength | Best For |
|-------|----------|----------|
| `deepseek-v4-flash-cloud` | Fast, cheap | Summaries, routing, status checks, classification |
| `minimax-m3:cloud` | Balanced | Writing, general coding, research, varied tasks |

### B-Tier — Specialized (use for niche only)

| Model | Strength | Best For |
|-------|----------|----------|
| `kimi-k2.6:cloud` | Multimodal | Image input/output, visual content, tool use |
| `gemini-3-flash-preview:cloud` | Formatting | Visual content processing, lightweight tasks |

## Crew Allocation

| Agent | Primary (daily) | Heavy Fallback | Notes |
|-------|-----------------|----------------|-------|
| Tripp (warden) | `deepseek-v4-flash` | `deepseek-v4-pro` / `qwen3.5:397b` | Flash for routing/triage, S-tier for LOCK audits |
| Cyony (builder) | `minimax-m3` | `qwen3.5:397b` | m3 for general coding, 397b for architecture |
| Echo (relay) | `deepseek-v4-flash` | `minimax-m3` | Flash for 85% of work (relay/summarize) |

## Decision Tree

```
Quick answer / status check / routing / classification?
  → deepseek-v4-flash  (just use it)

Image input/output or multimodal?
  → kimi-k2.6 or gemini-3-flash  (B-tier specialized)

Code generation / writing / research / multi-step?
  → minimax-m3  (daily driver, try here first)
  → If m3 stumbles, try flash for a different angle

Deep logic / root cause / critical review?
  → deepseek-v4-pro  (only if A-tier failed)

Complex code / system design / architecture?
  → qwen3.5:397b  (only if A-tier failed)

Still unsure?
  → Start with flash. If bad, move up ONE tier.
```

## Efficiency Rules

1. **Start low, escalate once.** If first A-tier response is good enough, stop. Don't re-run on S-tier "just to be sure."
2. **Don't chain S-tier.** Multi-step tasks: only hardest step gets S-tier, rest stay A-tier.
3. **Flash for bookkeeping.** Logs, heartbeats, status, routing, summaries — ALWAYS flash. No exceptions.
4. **B-tier is image-only** (unless benchmarks shift). Don't use kimi/gemini for text-only tasks.
5. **One retry = different model.** If minimax fails a code task, try flash first (different angle) before escalating to 397b.
6. **Share failures.** If a model choked, note in shared bus so others don't repeat it.

## Verification Command

```bash
curl -s https://ollama.com/v1/chat/completions \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-flash:cloud",
    "messages": [{"role": "user", "content": "pong"}],
    "max_tokens": 5
  }'
```

Expected: JSON with `choices[0].message.content` containing a short reply.

## Goose Config (drop-in)

```yaml
# ~/.config/goose/config.yaml
model: deepseek-v4-flash:cloud

provider:
  name: ollama-cloud
  base_url: https://ollama.com/v1
  api_key: ${OLLAMA_API_KEY}
```

Or use Goose's native Ollama provider for local models (different endpoint).

## Hermes Config

```bash
hermes config set providers.ollama.type openai-compatible
hermes config set providers.ollama.baseUrl "https://ollama.com/v1"
hermes config set providers.ollama.apiKey "$OLLAMA_API_KEY"
hermes config set model "ollama/qwen3.5:397b-cloud"
```

## Fallback Chain

1. Try alternate model on same provider (swap within tier)
2. Fall back to xAI if available
3. Last resort: OpenRouter (avoid — burns budget)

## Critical Correction

**Never guess model capability from the name.** Verify against current benchmarks before assigning crew roles. Real case: Cyony assumed qwen3.5 was the coding king (name has "397b" params), ranked minimax-m3 below it. Eddie corrected — current benchmarks show:
- minimax-m3 beats qwen3.5
- qwen3.6 also beats qwen3.5  
- kimi/gemini are image-specialized, not general-purpose mid-tier

Always re-verify tier assignments when benchmarks update. Model names are marketing, not performance indicators.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` | Check API key is set and not expired |
| `model not found` | Verify exact model ID including `:cloud` suffix |
| Timeout / no response | Ollama Cloud may be overloaded — try alternate model |
| Rate limited (429) | Spread load across models or reduce frequency |
| `:cloud` suffix rejected | Try without it — some clients strip it |
