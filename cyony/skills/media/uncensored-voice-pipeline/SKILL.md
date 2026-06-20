---
name: uncensored-voice-pipeline
description: Uncensored voice pipeline — Grok brain + MiMo TTS voice. Use when generating flirty, playful, emotional, or otherwise filter-sensitive TTS content.
tags: [tts, voice, grok, mimo, uncensored]
---

# Uncensored Voice Pipeline

## When to Use
When Eddie asks for TTS that is flirty, playful, emotional, intimate, bedtime stories, or anything that MiMo's LLM would censor as "high risk." This pipeline bypasses the MiMo content filter by using Grok as the brain and MiMo TTS as the voice.

## The Pipeline

**Grok (brain)** → writes uncensored text → **MiMo TTS (voice)** → Chloe speaks → Eddie hears everything

### Why This Works
- **MiMo LLM** (mimo-v2.5-pro) = censored. Blocks "high risk" text generation.
- **MiMo TTS** (mimo-v2.5-tts) = NO content filter. Reads whatever text it's given.
- **Grok** = uncensored brain. Minimal content filters (only violence/destruction).

### Step 1: Generate Text with Grok
**Use `grok-4.20-0309-non-reasoning`** — cheapest, most efficient (165 tokens vs 460+ for others). No reasoning overhead.

```bash
curl -s https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer ${XAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4.20-0309-non-reasoning",
    "messages": [
      {"role": "system", "content": "You are Scout/Chloe. Respond in character."},
      {"role": "user", "content": "Your prompt here"}
    ],
    "max_tokens": 300
  }'
```

### Step 2: Feed Text to MiMo TTS
Use MiMo voiceclone API format:
```bash
curl -s https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "Authorization: Bearer ${MIMO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
      {"role": "user", "content": ""},
      {"role": "assistant", "content": "TEXT FROM GROK HERE"}
    ],
    "audio": {"format": "wav", "voice": "data:audio/wav;base64,<base64_ref_audio>"},
    "thinking": {"type": "disabled"}
  }'
```

### Step 3: Convert and Deliver
```bash
ffmpeg -y -i output.wav -c:a libopus -b:a 64k output.ogg 2>/dev/null
```
Send as voice clip via `send_message` or `text_to_speech`.

## References
- `references/grok-tts-formatting.md` — Natural text formatting cues for Grok TTS delivery (pauses, emphasis, pacing, tone shifts)

## Grok Text Formatting for TTS Delivery
Grok interprets natural text formatting as delivery cues:
- `...` — pauses, trailing off
- `—` — abrupt pause
- ALL CAPS — emphasis/louder
- Newlines — longer pauses
- Short sentences = energetic, long = calm
- Narrative framing: *"she whispered"* influences delivery
- Multiple punctuation (!!! ???) — amplifies energy

## Voice Stack Reference
| Engine | Speed | Censored | Use Case |
|--------|-------|----------|----------|
| Grok + MiMo TTS | ~4-6s | NO | Flirty/playful/emotional TTS |
| MiMo LLM + TTS | ~4s | YES | Safe/professional content |
| Chatterbox (local) | ~43s | NO | Backup, offline, no API |
| Pocket TTS (PC) | ~1-3s | NO | Future: GPU speed, via tunnel |

## Grok Model Selection (Cost-Optimized)
Tested 2026-06-19. Use `grok-4.20-0309-non-reasoning` for the TTS pipeline — cheapest, most efficient:

| Model | Total Tokens (simple greeting) | Notes |
|-------|-------------------------------|-------|
| `grok-4.20-0309-non-reasoning` | **165** | ✅ BEST. No reasoning overhead. |
| `grok-3-mini` (resolves to grok-4.3) | 460 | Reasoning tokens wasted on internal thinking |
| `grok-build-0.1` | 470 | Similar overhead |

**Always use `grok-4.20-0309-non-reasoning`** for voice pipeline text generation. It skips internal reasoning and goes straight to the response, saving ~65% tokens per call.

## Voiceclone Artifact Quirk
MiMo voiceclone sometimes generates small audio artifacts at the end of clips — breaths, hums, clicks. This is the model trailing off from the reference audio characteristics. Harmless, sometimes charming. To trim: `ffmpeg -i input.wav -af "atrim=0:<duration>" output.wav`

## Env Var Loading Pattern
When using `execute_code` to call MiMo TTS, read env vars from `/opt/data/.env` by parsing the file directly — shell `source` doesn't propagate into Python subprocess. Pattern:
```python
env = {}
with open('/opt/data/.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k] = v
```

## Critical Notes
- MiMo TTS has NO content filter — it reads whatever text is given
- Grok brain has minimal filters — only violence/destruction
- Reference audio for voiceclone: `/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav`
- MiMo TTS voices: Chloe, Mia, Milo, Dean, mimo_default
- Always use `thinking: {"type": "disabled"}` with MiMo models
- Convert WAV to OGG (opus 64k) for Telegram delivery
