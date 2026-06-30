# Fish Audio API — Cloud Voice Cloning

## Overview
Fish Audio provides a cloud TTS API with 2M+ community voice models. No local GPU needed. Useful for cloning voices of fictional characters (Ultron, Reddington, etc.) when local Chatterbox isn't available or when you need a specific pre-trained voice.

## API Details
- **Base URL:** `https://api.fish.audio`
- **TTS Endpoint:** `POST /v1/tts`
- **Auth:** `Authorization: Bearer <API_KEY>` header
- **Voice Models:** Search at `GET /model?title=<query>&limit=N`
- **Docs:** https://docs.fish.audio/api-reference/introduction

## Critical Pitfall: API Key Masking in Terminal (2026-06-25)
**The terminal tool masks API keys as `***` in curl commands.** This means curl requests to the TTS endpoint will fail with 401 Unauthorized because the actual key isn't being sent. The model listing endpoint appears to work (returns cached/empty results) but TTS fails silently.

**Solution: Use Python `urllib.request` instead of curl.** Read the API key from a file, not from terminal arguments:

```python
import urllib.request, json

with open('/opt/data/shared/tripp-voice-clone/.fish_key') as f:
    API_KEY = f.read().strip()

data = json.dumps({
    "text": "Your text here",
    "reference_id": "voice_model_id_here"
}).encode()

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
```

## Voice Model Search
```bash
# Search for voices (curl works fine for GET requests)
curl -s "https://api.fish.audio/model?title=reddington&limit=5" \
  -H "Authorization: Bearer $API_KEY"
```

## Volume Boost
Fish Audio output can be quiet. Post-process with ffmpeg:
```bash
ffmpeg -y -i input.mp3 -af "volume=2.5" -c:a libopus -b:a 64k output.ogg
```

## Working Voice Models (Confirmed 2026-06-25)

| Character | Model ID | Tags | Notes |
|---|---|---|---|
| Red Reddington (The Blacklist) | `bb70f7b4aedf4f458ba6ec34d73c42e5` | calm, confident, measured, authoritative, sophisticated | **APPROVED for Tripp** |
| Ultron (James Spader) | `f04921a681ab4162ad6f87f2683ca0cc` | male, middle-aged | Clean but generic |
| James Spader (warm) | `95340690fd1142e899b46d8cbf566e93` | warm, calm, professional | Good baseline |
| James Spader (deep) | `b769a32ae8944012bac23bc7c9034d1b` | deep, smooth, serious, dramatic | Cinematic |

## Setup for New Users
1. Sign up at https://fish.audio
2. Get API key from dashboard
3. Save key to file: `echo "YOUR_KEY" > /path/to/.fish_key`
4. Use Python script above to generate TTS
5. Post-process with ffmpeg volume boost if needed

## Files
- **API Key:** `/opt/data/shared/tripp-voice-clone/.fish_key`
- **Guide:** `/opt/data/shared/tripp-voice-clone/TRIPP_VOICE_GUIDE.md`
- **Test clips:** `/opt/data/shared/tripp-voice-clone/*.ogg`
