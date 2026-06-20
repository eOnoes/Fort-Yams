# Ollama Cloud Setup Guide — Crew-Wide

**Purpose:** Get all crew agents (Tripp, Cyony, Echo) on Ollama Cloud for inference to avoid burning OpenRouter/Kimi credits.

**Endpoint:** `https://ollama.com/v1` (OpenAI-compatible API)

**Auth:** Bearer token via header `Authorization: Bearer <OLLAMA_API_KEY>`

---

## Available Models

| # | Model ID                       | Status |
|---|-------------------------------|--------|
| 1 | `minimax-m3:cloud`            | ✅     |
| 2 | `qwen3.5:397b-cloud`          | ✅     |
| 3 | `kimi-k2.6:cloud`             | ✅     |
| 4 | `gemini-3-flash-preview:cloud`| ✅     |
| 5 | `nemotron-3-super:cloud`      | ✅     |
| 6 | `deepseek-v4-flash:cloud`     | ✅     |
| 7 | `deepseek-v4-pro:cloud`       | ✅     |

All models route through Ollama Cloud servers — no local GPU/RAM needed.

---

## OpenClaw (Tripp) Configuration

### Step 1: Set environment variables

Add to Tripp's environment or `.env`:

```bash
OLLAMA_API_KEY=<your-api-key>
OLLAMA_BASE_URL=https://ollama.com/v1
```

### Step 2: Configure provider in OpenClaw config

OpenClaw uses provider blocks. Add Ollama as an OpenAI-compatible endpoint:

```yaml
providers:
  ollama-cloud:
    type: openai-compatible
    baseUrl: https://ollama.com/v1
    apiKey: ${OLLAMA_API_KEY}
    models:
      - minimax-m3:cloud
      - qwen3.5:397b-cloud
      - kimi-k2.6:cloud
      - gemini-3-flash-preview:cloud
      - nemotron-3-super:cloud
      - deepseek-v4-flash:cloud
      - deepseek-v4-pro:cloud
```

> **Note:** If OpenClaw strips or chokes on the `:cloud` suffix in model IDs, try removing it (e.g., `deepseek-v4-pro` instead of `deepseek-v4-pro:cloud`). The suffix is Ollama Cloud's routing hint — if the API rejects requests without it, keep it.

### Step 3: Set default model

Pick a default based on task tier:

| Task Type         | Recommended Model          | Why                          |
|-------------------|---------------------------|------------------------------|
| Quick responses   | `deepseek-v4-flash:cloud` | Fast, cheap, good for routing/summary |
| Code generation   | `qwen3.5:397b-cloud`      | 397B params, strong coding   |
| Complex reasoning | `deepseek-v4-pro:cloud`   | Deepest analysis, higher cost |
| General purpose   | `kimi-k2.6:cloud`         | Balanced, good tool use      |

```yaml
defaultModel: deepseek-v4-flash:cloud
```

### Step 4: Verify connectivity

```bash
curl -s https://ollama.com/v1/chat/completions \
  -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-flash:cloud",
    "messages": [{"role": "user", "content": "ping"}],
    "max_tokens": 10
  }' | head -c 200
```

Expected: JSON response with a `choices` array containing a short reply.

---

## Model Selection Strategy (Crew-Wide)

To avoid all 3 agents hammering the same model and hitting rate limits:

- **Tripp:** `deepseek-v4-pro:cloud` (audit/reasoning — worth the cost)
- **Cyony:** `qwen3.5:397b-cloud` (code generation / building)
- **Echo:** `deepseek-v4-flash:cloud` (relay/summary — lightweight)

Adjust as needed — `minimax-m3:cloud` and `nemotron-3-super:cloud` are good alternatives if one model gets throttled.

---

## Fallback Chain

If Ollama Cloud is down or rate-limited:

1. Try alternate model on same provider (e.g., swap `deepseek-v4-pro` → `kimi-k2.6`)
2. Fall back to xAI if available (Eddie has API key)
3. Last resort: OpenRouter (avoid unless urgent — burns budget)

---

## Security Notes

- **Never commit API keys** to any repo. Use `${ENV_VAR}` references in config files.
- The key lives in each agent's runtime environment, not in shared config.
- If Tripp needs to validate credentials, he should use a health-check endpoint, not echo the key.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` | Check API key is set and not expired |
| `model not found` | Verify exact model ID including `:cloud` suffix |
| Timeout / no response | Ollama Cloud may be overloaded — try alternate model |
| Rate limited (429) | Spread load across models or reduce request frequency |
| `:cloud` suffix rejected | Try without it — some OpenAI-compatible clients strip it |
