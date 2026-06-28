# Telegram Voice Note Delivery

## Problem
`MEDIA:/path/to/file.ogg` in text response does NOT always deliver as a playable voice note on Telegram. It may appear as text with no play button.

## Solution: sendVoice API
Use the Telegram `sendVoice` endpoint directly via `/opt/data/tg_voice.py`:

```bash
python3 /opt/data/tg_voice.py /path/to/audio.ogg "optional caption"
```

## How it works
The script:
1. Reads bot token from `/opt/data/.env` (TELEGRAM_BOT_TOKEN)
2. Reads the audio file
3. Sends via `sendVoice` endpoint (not sendPhoto)
4. Returns OK on success

## Key difference
- `sendPhoto` → photo attachment (wrong for audio)
- `sendVoice` → voice note with waveform and play button (correct)
- `MEDIA:` tag in text → unreliable delivery on Telegram

## For Multi-Part Narratives
1. Generate each scene as separate TTS clip via `text_to_speech` tool
2. Each clip saves to `/opt/data/audio_cache/`
3. Send each via `tg_voice.py` with scene label
4. Send sequentially — build-up matters

## Pitfall
Don't use `tg_send.py` for audio — that's the photo sender (sendPhoto endpoint).
