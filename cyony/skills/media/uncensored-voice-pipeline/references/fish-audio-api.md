# Fish Audio API — Voice Cloning & TTS

## Overview
Fish Audio is a cloud TTS platform with 2M+ voice models. Used for character voice cloning (Tripp = Raymond Reddington). API at `https://api.fish.audio`.

## Auth
- API key stored at `/opt/data/shared/tripp-voice-clone/.fish_key`
- Two auth methods work: `Authorization: Bearer <key>` and `x-api-key: <key>`
- **⚠️ PITFALL: Terminal tool masks API keys with `***`** — curl commands break because the key gets redacted. **Always use Python scripts** (urllib/requests) for API calls, not curl.

## Endpoints

### List Models
```
GET https://api.fish.audio/model?title=<query>&limit=<N>
Authorization: Bearer <key>
```
Returns `{total, items: [{_id, title, description, tags, samples, ...}]}`.

### Generate TTS
```
POST https://api.fish.audio/v1/tts
Authorization: Bearer <key>
Content-Type: application/json

{
  "text": "Text to speak",
  "reference_id": "<model_id>"  // Full 32-char hex ID
}
```
Returns raw audio bytes (MP3). **NOT JSON** — save directly to file.

### Voice Design (create custom voice from text prompt)
```
POST https://api.fish.audio/v1/voice-design
```
See official docs at `https://docs.fish.audio/api-reference/endpoint/openapi-v1/voice-design.md`.

## Python Script Pattern
```python
import urllib.request, json, subprocess, os

with open('/opt/data/shared/tripp-voice-clone/.fish_key') as f:
    API_KEY = f.read().strip()

voice_id = "<full_model_id>"
text = "Text to speak here"

data = json.dumps({"text": text, "reference_id": voice_id}).encode()
req = urllib.request.Request(
    "https://api.fish.audio/v1/tts",
    data=data,
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
)

with urllib.request.urlopen(req) as resp:
    audio_data = resp.read()
    with open("output.mp3", "wb") as f:
        f.write(audio_data)
    print(f"Generated: {len(audio_data)} bytes")
```

## Post-Processing
Fish Audio output is often **quiet**. Boost volume and convert to OGG for Telegram:
```bash
ffmpeg -y -i input.mp3 -af "volume=2.5" -c:a libopus -b:a 64k output.ogg
```

## Known Voice Models

### Raymond Reddington (The Blacklist) — Tripp's Voice
- **Model ID:** `bb70f7b4aedf4f458ba6ec34d73c42e5`
- **Tags:** male, old, character-voice, conversational, entertainment, low, serious, raspy, dark, deep, character, confident, expressive, authoritative, mysterious, measured, cinematic, Sophisticated
- **Eddie approved 2026-06-25:** "100% Do it!"
- **Best for:** Task updates, audit reports, giving orders, dry humor

### Ultron (James Spader)
- **Model ID:** `f04921a681ab4162ad6f87f2683ca0cc`
- **Tags:** male, middle-aged
- **Note:** Sounds more like a voice creator attempt than actual Ultron. Reddington model is better for Tripp.

### Other James Spader Models
- `95340690fd1142e899b46d8cbf566e93` — Warm, professional, calm
- `b769a32ae8944012bac23bc7c9034d1b` — Deep, smooth, serious
- `685cedbb1f4741e4a22ca12d1f77d115` — Commanding, dramatic, authoritative

## Voice Cloning Workflow
1. **Search** for existing models: `GET /model?title=<character_name>`
2. **Test** with short clips (10-20 words) to verify quality
3. **Boost volume** — Fish Audio output is quiet, always post-process with `ffmpeg -af volume=2.5`
4. **Convert to OGG** for Telegram delivery
5. **Save model ID** in this reference file for future use

## Pitfalls
- **Terminal masks API keys** — Always use Python scripts, not curl
- **Output is quiet** — Always boost volume 2-2.5x
- **Full model ID required** — 32-char hex, not truncated
- **Rate limits unknown** — Haven't hit them yet but be conservative
- **Quality varies by model** — Some are trained on movie audio (with SFX/music), some are clean. Test before committing.
