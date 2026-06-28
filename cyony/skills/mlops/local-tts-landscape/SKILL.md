---
name: local-tts-landscape
description: "Comprehensive overview of local TTS solutions for SQHQ — no censorship, no cost, fast inference."
tags: [tts, voice, local, open-source, voice-cloning]
---

# Local TTS Landscape (June 2026)

## Top Solutions for SQHQ

### 1. Fun-CosyVoice 3 (21.7k+ ⭐) — THE CROWN JEWEL
- **Repo:** github.com/FunAudioLLM/CosyVoice
- **Model:** FunAudioLLM/Fun-CosyVoice3-0.5B-2512 (HuggingFace) | GGUF: Lourdle/Fun-CosyVoice3-0.5B-2512-GGUF
- **Model Size:** 0.5B parameters
- **Languages:** 9 (English, Chinese, Japanese, Korean, German, Spanish, French, Italian, Russian)
- **Voice Cloning:** ✅ Zero-shot from reference audio. State-of-the-art speaker similarity (78.0% Chinese, 71.8% English — beats F5-TTS, CosyVoice 2, Spark TTS).
- **Emotion Control:** ✅ **Instruct mode that works WITH cloning.** Supports instructions for emotions, speed, volume, dialect. This is the combo no other open model delivers.
- **VRAM:** ~4-6GB. Fits RTX 4070 12GB easily.
- **Speed:** 150ms streaming latency, near real-time.
- **Content Filters:** ❌ **NONE.** No safety checker code in the repo. Apache 2.0 license. Fully open.
- **License:** Apache 2.0
- **Status (2026-06-22):** Discovered via research. Codex tasked with deployment on Echo's Windows PC. This is the potential replacement for both Pocket TTS (no emotion control) and Qwen3-TTS (instruct doesn't work in clone mode). Awaiting hands-on testing.
- **Why this matters:** It's the ONLY open-source model where voice cloning + emotion instruction control actually work together. Qwen3's instruct is a dead end (model limitation). CosyVoice 3 was designed for this exact use case.
- **GGUF quantized versions available:** F16, Q4_K_M, Q5_K_M, Q8_0 — flexible deployment options.

### 2. Dia 1.6B (NEW — June 2026) — The Multi-Speaker

### 1b. Index TTS2 — The Voice Cloner (for Echo/Tripp)
- **Repo:** github.com/index-tts/index-tts (21k+ stars)
- **VRAM:** ~4GB (fits RTX 4070)
- **Voice Cloning:** ✅ Zero-shot from reference audio
- **Emotion Control:** ✅ Emotion vectors, reference audio, text descriptions
- **Status:** ✅ LIVE on Echo's PC. Echo uses for Jarvis voice. Tripp can use for Reddington.
- **API:** WebUI at `http://127.0.0.1:7860` or Python API
- **Full guide:** `references/index-tts-usage.md`
- **Repo:** github.com/nari-labs/dia
- **Model:** nari-labs/Dia-1.6B (1.6B params, ~4.4GB VRAM)
- **Languages:** English primary
- **Voice Cloning:** ✅ Yes
- **Emotion Control:** ✅ Native inline tags: `(laughs)`, `(sighs)`, `(gasps)`, `(screams)`, `(singing)`, `(whistles)` etc. Multi-speaker dialogue with `[S1]`/`[S2]` tags.
- **VRAM:** ~4.4GB. Fits RTX 4070.
- **Content Filters:** ❌ NONE. Apache 2.0.
- **License:** Apache 2.0
- **Status (2026-06-22):** ✅ LIVE on Echo's PC. Repo at `D:\\Trippcore\\repos\\dia`, model at `D:\\Trippcore\\models\\dia\\Dia-1.6B-0626`. Provider: `dia_chloe`. Model loader fixed (switched to `from_local` with .pth file). ~37s generation time. All 4 providers (Pocket, CosyVoice3, IndexTTS2, Dia) verified operational after provider isolation fix.
- **Why this matters:** Multi-speaker dialogue capability is unique. Inline emotion tags work natively in text. No L/R confusion (English-native).

### 3. Zonos v0.1 (NEW — June 2026) — The Compact Uncensored
- **Repo:** github.com/Zyphra/Zonos
- **Model:** Zyphra/Zonos-v0.1-transformer (500M params, ~3.1GB VRAM)
- **Voice Cloning:** ✅ From reference audio
- **Emotion Control:** ✅ 8D emotion vector (happiness, sadness, anger, fear, surprise, disgust, contempt, neutral) + whispering via audio prefix
- **VRAM:** 3.1GB. Easily fits RTX 4070.
- **Content Filters:** ❌ NONE. Community confirmed NSFW out of the box.
- **License:** Apache 2.0
- **Speed:** Fast (small model). 44.1kHz native output.
- **Status (2026-06-22):** Identified via Kimi's research. NOT YET INSTALLED. Top candidate for next test — smallest model, confirmed uncensored, precise emotion vector control.

### 4. VibeVoice (NEW — June 2026) — The Banned One
- **Model:** Microsoft VibeVoice 1.5B
- **Voice Cloning:** ✅ Context-aware expression
- **Content Filters:** ❌ NONE (Microsoft pulled it because people used it for NSFW)
- **VRAM:** 8-12GB (tight on RTX 4070)
- **License:** MIT
- **Status (2026-06-22):** Identified. Hard to find (pulled from official channels). May need community mirrors.

### 5. Fish S2 Pro (NEW — June 2026) — The Tag Master
- **Model:** ~5B params (too large for RTX 4070 at 17GB VRAM)
- **Emotion Control:** ✅ 15,000+ free-form tags including `[whisper]`, `[moaning]`, `[panting]`, `[laugh]`
- **Voice Cloning:** ✅ SOTA
- **Content Filters:** Likely none (research model)
- **Status (2026-06-22):** Identified. Too large for current hardware. Bookmark for future.

### 6. Orpheus (NEW — June 2026) — The Inline Tagger
- **Model:** 3B params, ~8GB VRAM
- **Emotion Control:** ✅ Trained inline tags: `<gasp>`, `<sigh>`, `<groan>`, `<laugh>`
- **Voice Cloning:** ✅
- **Content Filters:** Partial (some censorship)
- **License:** Apache 2.0
- **Status (2026-06-22):** Identified. Fits RTX 4070 but tight. Some censorship present.

### 7. Higgs Audio V3 (NEW — June 2026) — The Arousal Token
- **Emotion Control:** ✅ `<|emotion:arousal|>`, `<|style:whispering|>`, `<|sfx:sigh|>` tokens built in
- **Content Filters:** Unclear
- **License:** ⚠️ NON-COMMERCIAL
- **Status (2026-06-22):** Identified. Non-commercial license is a blocker for production use.

### 8. Chatterbox TTS (25k+ ⭐) — The Beast
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
- **Status (2026-06-21):** ✅ LIVE via tripp-tts-worker on port 8788. Voice: "qwen_chloe" (cloned). Use `tripp-tts-generate-qwen.sh` CLI or direct API. Outputs WAV; convert to MP3 with ffmpeg for Telegram delivery. Slightly slower than Pocket TTS (~8-14s vs ~5s) but higher fidelity.

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

### Triple-Stack Architecture (Updated 2026-06-22 — Kimi Research Edition):
1. **Live conversation** → Pocket TTS (chloe) via tripp-tts-worker (~5s, local, uncensored, PRIMARY)
2. **Premium local TTS** → Fun-CosyVoice 3 via local API (~4-6GB VRAM, zero-shot clone + instruct emotion control) — LIVE but L/R English issue = NOT production. Fine-tune may fix (see `references/cosyvoice3-finetune-guide.md`).
3. **Experimental** → Dia 1.6B (dia_chloe) — INSTALLED, awaiting worker restart. Native emotion tags, multi-speaker, Apache 2.0.
4. **Next to test** → Zonos v0.1 (500M, 3.1GB VRAM, confirmed uncensored, 8D emotion vector)
5. **Experimental backup** → Qwen3 TTS (qwen_chloe) — instruct is dead end in clone mode
6. **Dynamic text (not cached)** → MiMo TTS VoiceDesign (~2s, cloud, V3 voice + mood overlays)
7. **Premium pre-generated clips** → Chatterbox voice clone (~38s, exact voice match)

### Kimi's Research Rankings (for next tests):
1. 🥇 **Zonos v0.1** — confirmed uncensored, 500M, 3.1GB VRAM, 8D emotion vector, Apache 2.0
2. 🥈 **Dia 1.6B** — installed, inline emotion tags, multi-speaker, Apache 2.0
3. 🥉 **Chatterbox-Turbo** — MIT, English-native, exaggeration+cfg tuning
4. **Orpheus** — 3B, 8GB VRAM, inline tags, but partial censorship
5. **VibeVoice** — pulled from official channels, hard to get
6. **Fish S2 Pro** — 17GB VRAM, too large for current hardware
7. **Higgs Audio V3** — arousal tokens, but non-commercial license

### CosyVoice3 Fine-Tune Option (June 2026):
If CosyVoice3's L/R confusion can be fixed via fine-tuning on Scout's voice data, it becomes viable. Path: generate 100-500 MiMo TTS reference sentences → prepare Kaldi format → extract embeddings + speech tokens → fine-tune LLM component on RTX 4070 (~6-8GB VRAM with AMP). See `references/cosyvoice3-finetune-guide.md` for full pipeline.

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
7. ~~FIX TTS worker regression~~ ✅ Fixed 2026-06-22 — provider isolation (`providerEnv.ts`) + dependency pinning
8. ~~Test Dia 1.6B~~ ✅ LIVE 2026-06-22 — basic generation works, emotion tags pending user testing
9. **Install and test Zonos v0.1** — 500M, 3.1GB VRAM, confirmed uncensored, 8D emotion vector
10. **CosyVoice3 fine-tune** — generate MiMo TTS training data → fine-tune LLM to fix L/R confusion

## Links
- **Video:** "Elevenlabs just got wrecked. This free AI text to speech is WILD!"
- **Chatterbox:** github.com/resemble-ai/chatterbox
- **Qwen3-TTS:** github.com/QwenLM/Qwen3-TTS
- **Kokoro:** github.com/hexgrad/kokoro
- **Voicebox:** github.com/jamiepine/voicebox
- **Piper:** github.com/rhasspy/piper
- **Coqui:** github.com/coqui-ai/TTS
- **Dia:** github.com/nari-labs/dia
- **Zonos:** github.com/Zyphra/Zonos

## References
- `references/chatterbox-voice-cloning.md` — Chatterbox voice cloning pipeline
- `references/cosyvoice3-research.md` — CosyVoice3 pre-deployment research
- `references/kimi-tts-research-june2026.md` — Kimi's curated uncensored TTS research: Zonos, Dia, VibeVoice, Fish S2 Pro, Orpheus, Higgs Audio V3
