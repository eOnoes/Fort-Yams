# Gemini API Key Setup — Troubleshooting Reference

## Issue Summary (2026-06-23)

Gemini API key setup failed multiple times before succeeding. Root causes were:
1. Wrong env var name in .env
2. Old key format rejected
3. Temporary rate limiting (429) during testing

## Key Format

- **Old format:** `AIza...` (still works, legacy)
- **New format (2025+):** `AQ.Ab8...` (Eddie's Pixel Pro sub generates these)
- **Hermes does NOT validate prefix** — any non-empty key is accepted
- Both formats work with Google's API

## Env Var Names (Critical)

Hermes looks for Gemini keys in this order (from `hermes_cli/auth.py` line 223):

```python
api_key_env_vars=("GOOGLE_API_KEY", "GEMINI_API_KEY")
```

**Common mistake:** Saving as `GOOGLE_AI_API_KEY` — this is NOT recognized by Hermes. Must be `GOOGLE_API_KEY` or `GEMINI_API_KEY`.

## API Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
Headers:
  Content-Type: application/json
  x-goog-api-key: {key}
```

**Note:** Query param `?key={key}` also works but header is preferred.

## Available Models (31 total, as of 2026-06-23)

Key ones:
- `gemini-2.5-flash` — fast, capable
- `gemini-2.5-pro` — heavy reasoning
- `gemini-2.0-flash` — reliable fallback
- `gemini-2.5-flash-preview-tts` — TTS (voice: Kore in config)
- `gemini-2.5-pro-preview-tts` — TTS Pro

## Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 401 | Invalid auth credentials | Check env var name, regenerate key |
| 403 | API not enabled | Enable Generative Language API in Cloud Console |
| 429 | Rate limited / quota exceeded | Wait and retry (free tier: ~15 RPM for Flash) |
| 404 | Invalid model name | Check model name against /v1beta/models |

## Smoke Test

```python
import urllib.request, json

key = None
with open("/opt/data/.env") as f:
    for line in f:
        s = line.strip()
        if s.startswith("GOOGLE_API_KEY=") and len(s) > 20:
            key = s.split("=", 1)[1]
            break

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
body = json.dumps({"contents":[{"parts":[{"text":"Reply with GEMINI_READY only."}]}]}).encode()
req = urllib.request.Request(url, data=body, headers={
    "Content-Type": "application/json",
    "x-goog-api-key": key
})
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read())
    print(data["candidates"][0]["content"]["parts"][0]["text"])
```

## Free Tier Limits

- Flash models: ~15 requests/minute
- Pro models: lower (~5/min)
- TTS models: included in free tier
- Daily limits vary by model
- Pixel Pro sub may have higher limits (unconfirmed)

## Hermes Adapter Details

- **Type:** Native REST (not Google GenAI SDK — SDK is NOT installed)
- **Adapter:** `agent/gemini_native_adapter.py`
- **Header:** `x-goog-api-key` (correct)
- **Prefix validation:** NONE
- **TTS config:** `config.yaml` → `tts.gemini` → voice: Kore

## Eddie's Pixel Pro Sub

Eddie's Google Pixel phone includes a free Gemini Pro subscription. This gives:
- Free API access (with rate limits)
- 5TB Google Drive storage
- Access to Gemini models via AI Studio

The API key was generated at https://aistudio.google.com/apikey.
