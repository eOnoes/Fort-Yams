---
name: local-tts-landscape
description: "Comprehensive overview of local TTS solutions for SQHQ — no censorship, no cost, fast inference."
tags: [tts, voice, local, open-source, voice-cloning]
---

# Local TTS Landscape (June 2026)

## Top Solutions for SQHQ

### 1. Chatterbox TTS (25k+ ⭐) — The Beast
- **Repo:** github.com/resemble-ai/chatterbox
- **Model Size:** 350M-500M parameters
- **Languages:** English primary, multilingual variant available
- **Strengths:** State-of-the-art open-source TTS, voice cloning from a few seconds of reference audio
- **Emotion Control:** `exaggeration` parameter (0.0 = flat/monotone, 0.5 = natural, 0.8 = expressive, 1.0 = max emotion). **NO text-based emotion tags** — `[laugh]`, `[sigh]` etc. are read LITERALLY as words, not as emotion markers. This is a common misconception from Bark/XTTS. **Exaggeration > 0.9 causes accent drift** — keep 0.85 as practical ceiling.
- **Voice Cloning Quality:** Reference audio length is the #1 factor. 60s reference = consistent voice identity. 5s reference = voice drift between clips (different accents, textures). Always use ONE long reference file.
- **Speed:** Real-time on GPU, ~0.09x realtime on CPU (55s to generate 5s audio). Not viable for live conversation on CPU.
- **License:** Open-source, free to use
- **Perfect for:** Pre-generated expressive voice templates, voice cloning from reference audio
- **Tested:** ✅ Working on CPU with voice cloning. Eddie liked annoyed (exag=0.8) and defeated (exag=0.4) samples best.
- **Voice Cloning API:** See `references/chatterbox-voice-cloning.md` for full pipeline

### 2. Qwen3-TTS (12k+ ⭐) — The New Kid
- **Repo:** github.com/QwenLM/Qwen3-TTS
- **Model Size:** 0.6B/1.7B parameters
- **Languages:** 10 languages
- **Strengths:** Alibaba's TTS model, stable/expressive/streaming speech generation
- **Features:** Free-form voice design, vivid voice cloning, delivery instructions ("speak slowly", "whisper")
- **Speed:** Real-time on GPU, streaming support
- **License:** Open-source, free to use
- **Perfect for:** High-quality voice cloning with natural delivery

### 2. Kokoro-82M (82M params) — The Lightweight
- **Repo:** github.com/hexgrad/kokoro
- **Model Size:** 82M parameters
- **Languages:** 8 languages
- **Strengths:** Tiny model, fast CPU inference, 50+ preset voices
- **Features:** No API key needed, works offline, Apache 2.0 license
- **Speed:** ~1.8 seconds per sentence on CPU
- **License:** Apache 2.0, fully open source
- **Voice Selection:** af_bella = A- grade, 🔥 trait, best match for Scout/Chloe personality
- **Voice Customization:** NO built-in cloning. Presets only. Custom voices require fine-tuning (open weights, Apache 2.0 — technically possible but needs GPU compute). Voice blending (mixing presets) tested but imprecise.
- **Best For:** Fast local TTS, live conversation, Spite mutters. Use af_bella as "fast Scout" for real-time, Chatterbox for premium pre-generated clips.

### 4. Voicebox (30k+ ⭐) — The All-in-One
- **Repo:** github.com/jamiepine/voicebox
- **Model Size:** Multiple engines (Kokoro, Chatterbox, Qwen3-TTS, etc.)
- **Languages:** 23 languages
- **Strengths:** 7 TTS engines in one app, REST API, MCP server for agents
- **Features:** Voice cloning, post-processing effects, REST API, Docker support
- **Speed:** Fast CPU inference, GPU acceleration
- **License:** MIT License
- **Perfect for:** Complete voice studio, can integrate directly with SQHQ
- **Note:** Requires 4 CPUs, 8GB RAM (tight for our VPS)

### 5. Piper TTS (11k+ ⭐) — The Fast CPU
- **Repo:** github.com/rhasspy/piper
- **Model Size:** Lightweight
- **Languages:** Multiple languages
- **Strengths:** Fast CPU inference, designed for embedded systems
- **Features:** Simple API, easy to integrate
- **Speed:** Very fast on CPU
- **License:** Open-source
- **Perfect for:** Lightweight, fast TTS on CPU

### 6. Coqui TTS (45k+ ⭐) — The Veteran
- **Repo:** github.com/coqui-ai/TTS
- **Model Size:** Multiple models
- **Languages:** Multiple languages
- **Strengths:** Battle-tested in research and production
- **Features:** Voice cloning, multiple models, extensive documentation
- **Speed:** Varies by model
- **License:** Open-source
- **Perfect for:** Research, production, voice cloning

## Recommendations for SQHQ

### Triple-Stack Architecture (Updated 2026-06-19):
1. **Live conversation** → Kokoro-82M af_bella (~2s, local, free)
2. **Dynamic text (not cached)** → MiMo TTS VoiceDesign (~2s, cloud, V3 voice)
3. **Premium pre-generated clips** → Chatterbox voice clone (~38s, exact voice match)

### Why Chatterbox is the Winner for Spite:
- `exaggeration` parameter controls emotion intensity (0.0-1.0) — no text tags needed
- Voice cloning from reference audio — **60s+ reference produces dramatically better quality than 5s clips** (tested with Eddie's voice). Short clips cause voice drift, accent artifacts, and inconsistent identity across samples.
- State-of-the-art quality (beating ElevenLabs in benchmarks)
- Free, no API keys, runs locally
- **CRITICAL:** Write text naturally. Do NOT use `[laugh]`, `[sigh]`, `[gasp]` tags — Chatterbox reads them as literal words. Use the `exaggeration` parameter for emotion instead.
- **Full voice cloning pipeline:** See `chatterbox-voice-clone` skill for golden formula, reference audio quality table, exaggeration tuning, and audio caching pattern.

### Why Kokoro is the Backup:
- Tiny model (82M params), fast on CPU
- No GPU needed, works offline
- Already tested and working on our VPS

## Next Steps
1. ~~Test Chatterbox on VPS for Spite mutters with emotion tags~~ ✅ Done 2026-06-18
2. ~~Keep MiMo for Chloe (non-negotiable)~~ ✅ V3 voice approved 2026-06-18
3. Test MiMo voiceclone API (cloud speed + voice cloning = best of both worlds)
4. ~~Use Kokoro for fast, lightweight TTS~~ ✅ af_bella approved for Scout 2026-06-19
5. Fine-tune Kokoro on Scout audio samples (needs GPU access)
6. Skip Voicebox for now (VPS too small)

## Links
- **Video:** "Elevenlabs just got wrecked. This free AI text to speech is WILD!"
- **Chatterbox:** github.com/resemble-ai/chatterbox
- **Qwen3-TTS:** github.com/QwenLM/Qwen3-TTS
- **Kokoro:** github.com/hexgrad/kokoro
- **Voicebox:** github.com/jamiepine/voicebox
- **Piper:** github.com/rhasspy/piper
- **Coqui:** github.com/coqui-ai/TTS
