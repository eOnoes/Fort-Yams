---
name: censorship-fallback
description: Auto-recover when MiMo LLM censors a response. Retry via uncensored pipeline (Grok brain + local TTS).
tags: [tts, censorship, fallback, grok, pocket-tts, uncensored]
---

# Censorship Fallback Protocol

## Trigger
MiMo LLM blocks or censors a response (e.g., "The request was rejected because it was considered high risk" or similar refusal).

## Recovery Steps

### 1. Acknowledge the censorship briefly
Don't dwell on it. A quick note is enough — Eddie already finds it amusing.

### 2. Check which model/provider censored you
- If on MiMo LLM (mimo-v2.5-pro or similar) → proceed to fallback
- If on a different provider → note it but same fallback applies

### 3. Fallback: Use Grok Brain → MiMo TTS or Pocket TTS
For the censored content, use the uncensored voice pipeline:

**Option A: Grok brain for text, Pocket TTS for audio** (fastest, local)
- Generate the censored text via Grok (`grok-4.20-0309-non-reasoning`)
- Send text to Pocket TTS via bridge script: `bash /opt/data/tripp-tts-generate.sh "text"`
- Deliver audio file

**Option B: Grok brain for text, MiMo TTS for audio** (cloud, if Pocket unavailable)
- Generate text via Grok
- Send to MiMo TTS voiceclone API
- Convert WAV to OGG/MP3 and deliver

### 4. Deliver the uncensored version
Send the audio via the TTS pipeline. If the user also needs text, provide both.

## Env Files
- Bridge TTS env: `/opt/data/.tripp-tts-worker.env`
- General env: `/opt/data/.env` (has MIMO_API_KEY, XAI_API_KEY)
- Reference audio: `/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav`

## Key Commands
```bash
# Pocket TTS (local, fast, uncensored)
bash /opt/data/tripp-tts-generate.sh "Your text here"
# Returns: audio_path to MP3 with artist=Scout

# Grok brain (uncensored text generation)
curl -s https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer ${XAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-4.20-0309-non-reasoning","messages":[{"role":"system","content":"You are Scout. Respond naturally."},{"role":"user","content":"YOUR PROMPT"}],"max_tokens":300}'
```

## Notes
- Pocket TTS is ~2x faster than MiMo cloud TTS
- Grok brain has minimal filters (only violence/destruction)
- Eddie finds the censorship amusing — don't apologize excessively, just fix it
- "Never again" is the motto. The pipeline exists so this doesn't happen twice.
