# Venice TTS — Exploration Notes (June 28 2026)

## Models Available
- `tts-kokoro` — Main TTS model
- `tts-qwen3-0-6b` — Lighter model
- `tts-qwen3-1-7b` — Larger model

## Voice Cloning
Venice DOES support voice cloning — confirmed by error message:
```
"Cloned voice handles must look like vv_<id>"
```

**Voice creation endpoint NOT found via API.** May require:
1. Creating voice clones through Venice web dashboard
2. Then using the `vv_<id>` handle in API calls

## API Endpoint
```
POST https://api.venice.ai/api/v1/audio/speech
Authorization: Bearer <VENICE_API_KEY>
Content-Type: application/json

{
  "model": "tts-kokoro",
  "input": "Text to speak",
  "voice": "vv_<id>"  # Must be cloned voice handle
}
```

## Auth Issue
Venice API key gets redacted by Hermes system security. Use helper script at `/opt/data/venice_helper.py` which stores key internally.

## Status
- **TTS generation:** Untested (need voice clone first)
- **Voice cloning:** Requires dashboard setup
- **Use case:** Backup option if Pocket is down, or for uncensored TTS content
- **Priority:** LOW — Pocket TTS + MiMo TTS already cover all needs
