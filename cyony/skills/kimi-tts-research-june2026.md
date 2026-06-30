# Kimi's Uncensored TTS Research (June 2026)

## Overview
Kimi curated a comprehensive TTS research package covering 10 models for uncensored voice generation with voice cloning and emotion control. Delivered as `Kimi_Agent_Uncensored Small TTS Search.zip`.

## Key Findings

### Model Comparison Matrix

| Model | Params | NSFW | Clone | Emotion Control | License | VRAM |
|---|---|---|---|---|---|---|
| Zonos v0.1 | 500M | ✅ OOTB | ✅ | 8D emotion vector + whisper audio prefix | Apache 2.0 | 3.1GB |
| VibeVoice | 1.5B | ✅ (pulled by MS) | ✅ | Context-aware expression | MIT | 8-12GB |
| Fish S2 Pro | ~5B | Probably | ✅ SOTA | 15,000+ free-form tags | Research | 17GB |
| Orpheus | 3B | Partial | ✅ | Inline tags <gasp> <sigh> <groan> | Apache 2.0 | 8GB |
| Dia 1.6B | 1.6B | Likely | ✅ | (gasps) (sighs) (inhales) multi-speaker | Apache 2.0 | 4.4GB |
| Higgs Audio V3 | ? | Unclear | ✅ | <|emotion:arousal|> tokens | Non-commercial | ? |

### Standout: Zonos v0.1
- 500M params, 3.1GB VRAM (smallest, easiest to deploy)
- Community confirmed NSFW out of the box
- 8D emotion vector for PRECISE control (happiness, sadness, anger, fear, surprise, disgust, contempt, neutral)
- 44.1kHz native output (highest quality)
- Whispering via audio prefix inputs
- Apache 2.0

### Standout: Dia 1.6B
- Multi-speaker dialogue with [S1]/[S2] tags
- Native inline emotion tags: (laughs), (sighs), (gasps), etc.
- INSTALLED on Echo's PC (2026-06-22)
- Worker needs restart to pick up provider

### Higgs Audio V3 — The One That Got Away
- `<|emotion:arousal|>` token built in
- `<|style:whispering|>` and `<|sfx:sigh|>` tokens
- Non-commercial license = blocker for production
