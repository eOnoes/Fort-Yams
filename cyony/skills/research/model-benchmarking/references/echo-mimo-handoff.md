# MiMo Handoff for Echo

Copy-paste ready guide for setting up MiMo.

## The One-Liner

Endpoint: `https://token-plan-sgp.xiaomimimo.com/v1`
Auth: Header `api-key: <your_tp_key>`
Critical: Add `"thinking": {"type": "disabled"}` to EVERY request on pro models

## Setup

```bash
# In your Hermes config
BASE_URL: https://token-plan-sgp.xiaomimimo.com/v1
API_KEY: tp-...
```

## Models to Use

| Use Case | Model |
|----------|-------|
| Coding / heavy work | `mimo-v2.5-pro` |
| Vision, TTS, multimodal | `mimo-v2.5-omni` |
| Anything older | `mimo-v2-pro` or `mimo-v2-omni` |

## Testing It Works

```bash
curl -s -X POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "messages": [{"role": "user", "content": "Say hello in one word"}],
    "thinking": {"type": "disabled"},
    "max_tokens": 50
  }'
```

## Gotchas

1. **Docs are wrong** — they say `api.xiaomimimo.com` but that rejects Token Plan keys. Use the SGP subdomain above.
2. **`/models` returns 401** — ignore it. Hardcode model names.
3. **Thinking will eat you alive** — always disable it on pro models. Without this, you get empty responses.
4. **Rate limits exist** — don't hammer it. Use a fallback provider for burst work.
5. **Auto-renew is opt-out** — turn it off in the dashboard unless you want to auto-renew.
6. **No refunds** — once bought, that's it.
7. **Flash model NOT on Token Plan** — `mimo-v2-flash` requires PAYG. Stick with the pro/omni models on the plan.
8. **TTS uses chat completions** — not the OpenAI audio endpoint. Add an `"audio": {"voice": "alloy", "format": "wav"}` field to the request body using the omni model.
9. **Can share the key** — one Token Plan key works for multiple users simultaneously (flat pool, not per-seat). TOS technically says no account sharing but it's a flat-rate pool.
