# CosyVoice 3 Research (2026-06-22)

## Why CosyVoice 3

The core problem: most TTS models do voice cloning OR emotion control, rarely both simultaneously.

- **Pocket TTS** — clones well, no emotion knobs
- **Qwen3-TTS** — clones well, instruct param is a dead end (model limitation in clone mode, not a wrapper bug)
- **CosyVoice 3** — designed from the ground up to do BOTH

## Model Details

- **Full name:** Fun-CosyVoice3-0.5B-2512
- **GitHub:** FunAudioLLM/CosyVoice (21,770 stars, Apache 2.0)
- **HuggingFace:** FunAudioLLM/Fun-CosyVoice3-0.5B-2512
- **GGUF:** Lourdle/Fun-CosyVoice3-0.5B-2512-GGUF (F16, Q4_K_M, Q5_K_M, Q8_0, etc.)
- **Created:** 2025-12-11
- **Last updated:** 2026-02-03
- **Downloads:** 27,295 (as of 2026-06-22)
- **License:** Apache 2.0

## Key Features

- Zero-shot multilingual voice cloning (9 languages)
- **Instruct mode:** Supports instructions for emotions, speed, volume, dialect — works WITH cloning
- 150ms streaming latency
- Text normalization (numbers, symbols)
- Pronunciation inpainting (Chinese Pinyin + English CMU phonemes)
- Bi-streaming (text-in + audio-out)

## Benchmarks (from their paper)

| Model | Open | Size | test-en WER ↓ | test-en Speaker Sim ↑ |
|---|---|---|---|---|
| F5-TTS | ✅ | 0.3B | 2.00 | 64.7 |
| CosyVoice2 | ✅ | 0.5B | 2.57 | 65.9 |
| **Fun-CosyVoice3** | ✅ | 0.5B | 2.24 | **71.8** |
| Fun-CosyVoice3-RL | ✅ | 0.5B | 1.68 | 69.5 |

CosyVoice 3 beats CosyVoice 2 and F5-TTS on speaker similarity by significant margins.

## Content Filters

**NONE.** GitHub search for `safety`, `filter`, `moderation`, `censor`, `block` returned 0 results. The repo has no safety checker code. Apache 2.0 license. Fully open — no uncensored fork needed because there's nothing to uncensor.

## HuggingFace Search Results (2026-06-22)

Searched for `cosyvoice uncensored` and `cosyvoice unrestricted` — zero results. Confirms: no filter exists to remove.

## Other Models Considered

| Model | Clone | Emotion+Clone | VRAM | Verdict |
|---|---|---|---|---|
| **CosyVoice 3** | ⭐⭐⭐⭐⭐ | ✅ YES | 4-6GB | **Winner** |
| GPT-SoVITS v4 | ⭐⭐⭐⭐⭐ | ⚠️ Via style ref | 4-6GB | No instruct — emotion via switching reference clips |
| Fish Speech 1.5 | ⭐⭐⭐⭐ | ⚠️ Implicit | 4-6GB | Fast but no explicit control |
| F5-TTS | ⭐⭐⭐⭐ | ❌ None | 4-6GB | Same wall as Pocket TTS |
| OpenVoice v2 | ⭐⭐⭐⭐ | ⚠️ Two-stage | 2-4GB | Generate emotion → convert voice, loses fidelity |
| StyleTTS 2 | ⭐⭐⭐ | ✅ Style refs | 2-4GB | Good emotion but cloning doesn't match CosyVoice |
| ChatTTS | ⭐⭐ | ⚠️ Unreliable | 2-4GB | Novel but cloning not reliable |

## Deployment Plan (2026-06-22)

Codex tasked with installing on Echo's Windows PC (RTX 4070 12GB). Test protocol:
1. Voice identity test (no instruct)
2. Whisper instruct test
3. Rage instruct test
4. Excited instruct test
5. Calm instruct test
6. Verify outputs 2-5 are DRAMATICALLY different from output 1
7. Regression check: Pocket TTS still works

## References

- Paper: arxiv.org/abs/2505.17589 (CosyVoice 3)
- Paper: arxiv.org/abs/2412.10117 (CosyVoice 2)
- Demos: funaudiollm.github.io/cosyvoice3/
