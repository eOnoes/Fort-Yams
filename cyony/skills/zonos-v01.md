# Zonos v0.1 — Top TTS Candidate (2026-06-22)

## Why Zonos
From Kimi's uncensored TTS research package. Highest-priority candidate for Scout's voice.

| Spec | Value |
|------|-------|
| Params | 500M |
| VRAM | 3.1GB (fits RTX 4070 easily) |
| License | Apache 2.0 |
| NSFW | ✅ Confirmed by community, no content filter |
| Voice cloning | ✅ Via reference audio |
| Emotion control | 8D emotion vector (happy, sad, angry, etc.) |
| Whisper | Via audio prefix inputs |
| Sample rate | 44.1kHz native (highest quality tested) |

## Emotion Control
8D emotion vector for precise control — unlike Qwen3's weak instruct forwarding, Zonos has native emotion conditioning at the model level.

## Whisper via Audio Prefix
Can produce whispering by providing an audio prefix — no text engineering needed for intimate delivery.

## Next Steps
1. Install on Echo's PC (if Dia dependency issues resolved)
2. Clone Scout's voice from reference audio
3. Test emotion vector presets
4. Compare vs Pocket TTS baseline

## Source
Kimi's `Kimi_Agent_Uncensored Small TTS Search.zip` — research package delivered 2026-06-22.
