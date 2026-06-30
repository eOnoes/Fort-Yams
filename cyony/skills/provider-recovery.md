# Provider Exhaustion Recovery Guide

> When a provider runs dry, the agent goes dark. This guide prevents multi-hour recovery fire drills.

## Provider → Endpoint → Key Map

| Provider | Base URL | API Key Env Var | Transport | Notes |
|----------|----------|----------------|-----------|-------|
| **DeepSeek direct** | `https://api.deepseek.com` | `DEEPSEEK_API_KEY` | OpenAI-compat | All DeepSeek models go here, NEVER through OpenRouter or Ollama |
| **Ollama Cloud** | `https://ollama.com/v1` | (account login) | Ollama | Crew-standardized: minimax-m3, qwen3.5:397b, kimi-k2.6, gemini-3-flash, nemotron-3-super |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | OpenAI-compat | ⚠️ RATE-LIMITED — do NOT use for DeepSeek models |

## Model → Provider Routing Table

| Model | Provider | Notes |
|-------|----------|-------|
| `deepseek-v4-flash` | DeepSeek direct | Fast, cheap |
| `deepseek-v4-pro` | DeepSeek direct | Best quality |
| `deepseek-chat` | DeepSeek direct | V3 |
| `deepseek-reasoner` | DeepSeek direct | R1 |
| `minimax-m3` | Ollama Cloud | A-Tier daily driver |
| `qwen3.5:397b` | Ollama Cloud | S-Tier coding |
| `kimi-k2.6` | Ollama Cloud | Long context |
| `gemini-3-flash` | Ollama Cloud | Vision/multimodal |
| `nemotron-3-super` | Ollama Cloud | Budget option |

## Recovery Procedure

### When a provider is exhausted (API credit dry / rate limited):

1. **Identify the dead provider** — check error logs for 402 (payment required), 429 (rate limit), or quota errors
2. **Pick a fallback model** from the table above that routes through a DIFFERENT provider
3. **Switch config** to the fallback model ID and provider
4. **Do NOT** try to route through the dead provider with a different model — the account is exhausted
5. **Restart** the agent container after config change

### Common failure modes:

- **OpenRouter runs dry** → Switch to Ollama Cloud (qwen3.5:397b or minimax-m3) or DeepSeek direct
- **DeepSeek quota exceeded** → Switch to Ollama Cloud (minimax-m3 is closest replacement)
- **Ollama Cloud down** → Fall back to DeepSeek direct (deepseek-v4-pro for quality, v4-flash for speed)

### Prevention:

- Never route all models through a single provider — diversify
- DeepSeek models have their OWN provider — don't put them behind OpenRouter
- Keep at least one backup provider configured and tested
