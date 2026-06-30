# Pocket TTS Notes (kyutai/pocket-tts)

## What It Is
- ~300M parameter TTS model from Kyutai (French AI research lab, known for Moshi)
- Codec-based transformer architecture
- "Pocket" sized — designed for speed and edge deployment
- Multi-language: English, French, German, Italian, Portuguese, Spanish
- 20+ pre-built voice embeddings (Les Misérables characters)

## Tested by Eddie (2026-06-19)
- Downloaded and ran via CLI on RTX 4070 12GB
- Fed in 30-second reference audio for voice cloning
- Cloned Chloe/Scout voice successfully
- Speed: "dang near instant" — sub-second generation
- Used Eddie's own response text as test input

## Access
- **Gated model** on HuggingFace — must accept terms at `huggingface.co/kyutai/pocket-tts`
- Requires HF account + agreement to use restrictions
- Total storage ~26.7 GB (all languages); English subset smaller

## License
- CC-BY-4.0 with additional gated agreement terms
- Boilerplate restrictions: no voice impersonation without consent, no misinformation, no harmful content
- **NOT enforced in the model itself** — no content filter, no safety rails
- Standard responsible-use disclaimers

## Hardware
- VRAM: ~1-2GB (very small model)
- RTX 4070 12GB = massive overkill, runs instantly
- CPU compatible but slower
- Designed for edge/mobile deployment

## Voice Cloning
- Supports reference audio input for voice cloning
- Eddie used 30-second reference — worked immediately
- May need shorter reference than Chatterbox (30s vs 60s)

## Comparison to Chatterbox
| | Pocket TTS | Chatterbox |
|---|---|---|
| Speed (GPU) | Near-instant | ~3-5s per clip |
| Speed (CPU) | Fast | ~43s per clip |
| VRAM | ~1-2GB | ~4-6GB |
| Reference audio | 30s works | 60s recommended |
| License | CC-BY-4.0 (gated) | Apache 2.0 (open) |
| Content filters | None | None |

## Status
- Eddie has it running on his PC (RTX 4070)
- Voice clone confirmed working
- Ready for API server setup to connect to Hermes
