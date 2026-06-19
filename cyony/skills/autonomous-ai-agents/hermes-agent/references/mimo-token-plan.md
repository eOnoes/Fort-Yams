# MiMo Token Plan Reference

## Known Quirks

### Dual Config File Gotcha (Hermes)
`hermes config path` may return a DIFFERENT path than `~/.hermes/config.yaml`. On this system it returns `/opt/data/config.yaml` while `~/.hermes/config.yaml` also exists. Always check `hermes config path` before editing config. Edits to the wrong file will silently have no effect.

### Auth
- `api-key:` header — **ONLY this works** on Token Plan endpoint (`token-plan-sgp.xiaomimimo.com`)
- `Authorization: Bearer` returns 401 "Invalid API Key" — this is the standard OpenAI format but MiMo rejects it
- Key prefixes: `tp-` = Token Plan, `sk-` = PAYG, **NOT interchangeable**
- `/v1/models` returns 401 even with valid keys — ignore, just call the API directly
- **Hermes impact:** The OpenAI Python client defaults to `Authorization: Bearer`. MiMo needs a code-level fix in `agent/auxiliary_client.py` — see `references/mimo-auth-header-fix.md`

### Models on Token Plan
| Model | Type | Ctx | Notes |
|-------|------|-----|-------|
| `mimo-v2.5-pro` | Text | 1M | Always disable thinking |
| `mimo-v2-pro` | Text | 1M | Always disable thinking |
| `mimo-v2.5` | Omni (vision/audio/video) | 1M | Disable thinking for agent use |
| `mimo-v2-omni` | Omni | 256K | Disable thinking for agent use |
| `mimo-v2-flash` | Text | 256K | ❌ NOT on Token Plan (PAYG only) |

### Rate Limits
- 100 RPM / 10M TPM — shared across all keys on the account
- Roughly supports 6-7 full agent turns per minute
- Echo (if on same plan) doing light browsing adds ~5-10 RPM — still fine

### TTS Models (All Free on Token Plan as of 2026-06-18)
| Model | Type | Notes |
|-------|------|-------|
| `mimo-v2.5-tts` | Standard TTS | Preset voices (Chloe, Mia, Milo, Dean, etc.) |
| `mimo-v2.5-tts-voiceclone` | Voice Cloning | Clone from audio samples |
| `mimo-v2.5-tts-voicedesign` | Voice Design | Describe any voice in natural language — no reference audio needed |

All three are included with Token Plan subscription and currently free (don't consume credits).

### TTS API Format
NOT OpenAI `/v1/audio/speech`. Uses chat completions with `audio` field.

**Standard TTS (`mimo-v2.5-tts`):**
```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "Bright, cheerful, slightly excited tone."},
    {"role": "assistant", "content": "Text to speak out loud."}
  ],
  "audio": {"format": "wav", "voice": "Chloe"}
}
```
Preset voices: `mimo_default`, `冰糖`, `茉莉`, `苏打`, `白桡`, `Mia`, `Chloe`, `Milo`, `Dean`

**Voice Design (`mimo-v2.5-tts-voicedesign`):**
```json
{
  "model": "mimo-v2.5-tts-voicedesign",
  "messages": [
    {"role": "user", "content": "Heavy Russian accent, gruff middle-aged male, blunt and matter-of-fact."},
    {"role": "assistant", "content": "You want my opinion? Fine. This plan will not work."}
  ],
  "audio": {"format": "wav", "optimize_text_preview": true}
}
```
No `voice` field needed — the user message IS the voice description. Works across accents, ages, timbre, recording texture. Multi-language (Chinese, English, varied accents).

Response: JSON with base64-encoded WAV at `choices[0].message.audio.data`

### ⚠️ PITFALL: Standard vs VoiceDesign API shape

**These two models use different request shapes. Mixing them up → HTTP 400.**

- **Standard TTS** (`mimo-v2.5-tts`): `audio.voice` MUST be a preset name (`Chloe`, `Mia`, etc.). The `user` message is a *style/tone* prompt (e.g., "Sarcastic, excited"). Passing a voice description string in `audio.voice` → `400: Unknown voice: <description>`.
- **VoiceDesign** (`mimo-v2.5-tts-voicedesign`): NO `audio.voice` field at all. The `user` message IS the full voice description. Add `"optimize_text_preview": true` to the `audio` object.

Rule of thumb: if you're describing the voice's personality/accent/texture, you want voicedesign. If you're picking from a list of names, you want standard.

### VoiceClone (`mimo-v2.5-tts-voiceclone`)
`audio.voice` is REQUIRED and MUST be a `data:` URL (not raw base64, not HTTP URL):
```json
{
  "model": "mimo-v2.5-tts-voiceclone",
  "messages": [
    {"role": "user", "content": ""},
    {"role": "assistant", "content": "Text to speak."}
  ],
  "audio": {"format": "wav", "voice": "data:audio/wav;base64,<base64_encoded_reference_audio>"}
}
```
- Supported voice reference formats: **WAV, MP3** (NOT OGG)
- `user` message can be empty — it's not required for voiceclone
- Response format same as other TTS models: `choices[0].message.audio.data` = base64 WAV
- ~4s latency for short text
- Errors:
  - No `audio.voice` → `400: audio.voice must not be empty for voice clone model`
  - Raw base64 in `audio.voice` → `400: audio.voice must be a DataURL for voice clone model`
  - HTTP URL → `400: audio.voice must be a DataURL for voice clone model`
  - OGG reference → `400: Unsupported audio.voice source format: ogg. Supported formats: [wav, mp3]`

### ASR Format
Uses `input_audio` type, NOT `audio_url`. Required structure:
```json
{
  "model": "mimo-v2.5-asr",
  "messages": [{"role": "user", "content": [{"type": "input_audio", "input_audio": {"data": "data:audio/wav;base64,..."}}]}],
  "asr_options": {"language": "en"}
}
```

### Vision
Works with standard OpenAI image format. Sends images as tokens (~9 tokens per image). Thinking can be disabled.

**Config pitfall:** The vision auxiliary config MUST use `key_env: MIMO_API_KEY` (not `api_key: ''`). Empty `api_key` causes 401 because no key is sent. Also requires the auth header code fix (`references/mimo-auth-header-fix.md`).

```yaml
# CORRECT vision config:
auxiliary:
  vision:
    provider: xiaomi
    model: mimo-v2-omni
    base_url: https://token-plan-sgp.xiaomimimo.com/v1
    key_env: MIMO_API_KEY
    timeout: 120
```

**Config `auth_header` does NOT exist.** Adding `auth_header: api-key` to config.yaml is silently ignored — the fix must be in `auxiliary_client.py` code.

**Model name versioning quirk:** The omni models are picky about exact model ID. What works:
- `mimo-v2.5` (omni, no suffix) — may work but sometimes returns "Not supported model"
- `mimo-v2-omni` (v2 omni) — safest bet for vision on Token Plan
- `mimo-v2.5-pro` — ❌ text-only, rejects image_url with "No endpoints found that support image input"
- `mimo-v2.5-omni` — ❌ often returns "Not supported model" on Token Plan despite being listed

If vision fails with `mimo-v2.5`, try `mimo-v2-omni`. If both fail, the Token Plan may not support vision on your tier — fall back to a different provider. The `/v1/models` endpoint returning 401 means you can't reliably discover which models support vision without trial and error.

### Referral Program (As of 2026-06-18)
- 10% kickback on basic Token Plan (NOT 20% as email claimed — that's for Pro/Max plans)
- Credits expire in 40 days
- Credits CANNOT be used to buy another Token Plan
- Invitee gets 10% off first order
- 30-day window for first paid order after binding
- Max 30 paid orders for kickbacks
- No self-referrals (detected via login environment + network signals)
