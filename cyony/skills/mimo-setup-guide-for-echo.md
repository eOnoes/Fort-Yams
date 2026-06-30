# MiMo Token Plan Setup Guide (Echo-Ready)

## The One-Page Summary

**Big lie:** Their docs say `api.xiaomimimo.com/v1`. That endpoint REJECTS Token Plan keys. Use `token-plan-sgp.xiaomimimo.com/v1` instead.

**Key format:** `tp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Header:** `api-key: tp-xxxxx` (NOT `Authorization: Bearer` — though both work)

**ALWAYS disable thinking:**
```json
{"thinking": {"type": "disabled"}}
```
Without this, pro models burn your entire output budget on reasoning you never see and return empty responses or just "..." This is the #1 reason MiMo feels broken for agent work.

**Available on Token Plan:**
- `mimo-v2.5-pro` — 1M ctx, heavy coding/audits
- `mimo-v2.5` — omni/multimodal, vision, 1M ctx
- `mimo-v2-omni` — older vision model, 256K ctx

**NOT available:** `mimo-v2-flash` (PAYG only)

---

## Full Setup

### 1. Auth

```
POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions
Headers:
  api-key: tp-xxxxx
  Content-Type: application/json
```

No Bearer prefix needed. The `/v1/models` endpoint returns 401 even with a valid key — this is a known quirk, ignore it.

### 2. Basic Chat Request (Working)

```bash
curl -s -X POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-pro",
    "messages": [{"role": "user", "content": "Say hello in 5 words max"}],
    "thinking": {"type": "disabled"},
    "max_tokens": 100
  }'
```

### 3. Function Calling

Works with standard OpenAI format. Tested with thinking disabled — returns clean JSON tool_calls. Works with nested object schemas, optional params, and array returns.

### 4. Vision

Works with standard `image_url` content parts. **Must use base64 data URIs** — the model CANNOT fetch external URLs (likely due to Chinese provider network restrictions).

```json
{
  "model": "mimo-v2.5",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "What's in this image?"},
      {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
    ]
  }],
  "thinking": {"type": "disabled"}
}
```

Costs ~9 tokens per image — essentially free.

### 5. TTS (Text-to-Speech)

**Does NOT use OpenAI `/v1/audio/speech`.** MiMo TTS works through the chat completions endpoint with an `audio` field in the request body:

```json
{
  "model": "mimo-v2.5",
  "messages": [
    {"role": "user", "content": "Speak in a raspy, Southern-tinged sarcastic tone. Playfully annoyed."},
    {"role": "assistant", "content": "Well well well, look who finally decided to show up. I was starting to think you'd forgotten about lil ol me."}
  ],
  "thinking": {"type": "disabled"},
  "audio": {"voice": "Chloe", "format": "wav"}
}
```

**Available voices:**
- Western: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`, `coral`, `ballad`, `ash`, `verse`, `sage`
- Chinese: `冰糖`, `茉莉`, `苏打`, `白桡`
- Named: `Mia`, `Chloe`, `Milo`, `Dean`

**Voice personality trick:** The `user` role message before the `assistant` voice text acts as a style instruction. Be specific — tone, speed, texture, attitude. "Raspy, Southern-tinged, dry sarcasm" gives a very different result than "cheerful and bright."

**Response format:** Returns JSON with `choices[0].message.audio.data` containing base64 WAV audio. Not a streaming binary response.

### 6. ASR (Speech-to-Text)

Uses `input_audio` type (NOT `audio_url`):

```json
{
  "model": "mimo-v2.5",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Transcribe what you hear."},
      {"type": "input_audio", "input_audio": {"data": "data:audio/wav;base64,...", "format": "wav"}}
    ]
  }],
  "thinking": {"type": "disabled"},
  "asr_options": {"language": "en"}
}
```

### 7. TTS Voices Cheat Sheet

| Voice | Tone / Character | Best For |
|-------|-----------------|----------|
| `Chloe` | Raspy, can do Southern/folksy | Personality, character voice |
| `alloy` | Neutral, clear | Default/general |
| `echo` | Richer, deeper | System messages |
| `fable` | Warm, storytelling | Tutorials |
| `nova` | Professional female | Business |
| `shimmer` | Energetic female | Alerts |
| `coral` | Soft, gentle | Notifications |
| `ballad` | Melodic | Creative |
| `ash` | Neutral male | Default male |
| `verse` | Expressive | Emphasis |

---

## Gotchas (The Real Pain Points)

1. **Wrong endpoint will waste hours** — `api.xiaomimimo.com` rejects Token Plan keys silently. Always use `token-plan-sgp.xiaomimimo.com/v1`.

2. **Thinking WILL eat your output** — Pro models default to deep reasoning that consumes ALL `max_tokens` producing no visible response. Always send `thinking: {"type": "disabled"}` for agent use.

3. **/v1/models returns 401** — Not a real error. Ignore it. Just call the completions endpoint directly.

4. **Rate limits exist and are anti-agentic** — 100 RPM / 10M TPM shared across all keys on your account. That supports about 6-7 full agent turns per minute. If you hammer it faster, you get throttled.

5. **Vision cannot fetch URLs** — Must use base64 data URIs. The provider likely runs behind China network restrictions.

6. **No refunds** — $169/yr flat, non-refundable. Auto-renew is opt-out (ON by default). Turn it off immediately if you're not sure.

7. **"OpenAI-compatible" is approximate** — MiMo passes 90% of OpenAI tests but chokes on extra fields Hermes might send (session metadata, custom fields). If integration fails, strip the request body to the bare minimum.

8. **Flash NOT on Token Plan** — Despite being in their model list, `mimo-v2-flash` is PAYG-only. You get pro models only.

---

## Verification Checklist

Before deciding MiMo is working for your use case:

- [ ] Basic chat completion returns text ✅
- [ ] Thinking disabled returns full response (not truncated) ✅
- [ ] Function calling returns clean JSON tool_calls ✅
- [ ] Vision with base64 image describes correctly ✅
- [ ] TTS plays audio (decode the base64) ✅
- [ ] ASR transcribes a known audio clip correctly ✅
- [ ] 20-request soak test: no rate limits, no degraded quality over time ⚠️ (test this yourself)
