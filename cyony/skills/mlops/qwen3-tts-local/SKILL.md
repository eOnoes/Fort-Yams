---
name: qwen3-tts-local
description: >
  Qwen3-TTS local deployment — voice cloning, voice design, instruction-controlled emotion.
  Replaces Pocket TTS with personality engine. RTX 4070 compatible.
triggers:
  - qwen tts
  - qwen3 tts
  - local tts
  - voice clone local
  - voice design local
---

# Qwen3-TTS Local Deployment

## Models Available

| Model | Size | Voice Clone | Instruction Control | Use Case |
|---|---|---|---|---|
| 1.7B-VoiceDesign | ~3.4GB | ❌ | ✅ | Create voices from descriptions |
| 1.7B-CustomVoice | ~3.4GB | ❌ | ✅ | 9 built-in speakers + emotion control |
| 1.7B-Base | ~3.4GB | ✅ 3s clone | ❌ | Clone any voice from reference |
| 0.6B-CustomVoice | ~1.2GB | ❌ | ❌ | Fastest, 9 speakers, no control |
| 0.6B-Base | ~1.2GB | ✅ 3s clone | ❌ | Fast clone, no emotion control |

Tokenizer: `Qwen3-TTS-Tokenizer-12Hz` (required by all models)

## 12Hz vs 25Hz — Use 12Hz (CONFIRMED 2026-06-22)

**12Hz is the BETTER model for voice cloning. Do NOT swap to 25Hz.**

| | 12Hz-1.7B-Base | 25Hz-1.7B-Base |
|---|---|---|
| **Architecture** | Multi-codebook RVQ (semantic + 15-layer acoustic) | Single-codebook, heavier DiT + BigVGAN |
| **Voice cloning** | ✅ Best balance of intelligibility + speaker similarity | ❌ Less capable for general speech |
| **Latency** | 97ms first-packet | 150ms first-packet (look-ahead) |
| **Suitability** | Daily driver, voice cloning, real-time | Audiobooks, long-form narration |

The 12Hz multi-codebook scheme "captures intricate acoustic details, significantly enhancing vocal consistency and expressivity." The 25Hz single-codebook design "limits suitability for general speech synthesis" (from official tech report).

**FlashAttention2 install for RTX 4070 (compute 8.9, supported):**
```bash
pip install -U flash-attn --no-build-isolation
# For < 96GB RAM + lots of cores:
MAX_JOBS=4 pip install -U flash-attn --no-build-isolation
```
FlashAttn2 alone: ~+10% speedup (RTF 0.97 → 0.87). With all optimizations (torch.compile + cuDNN benchmark + TF32): ~0.65 RTF on 3090.

## Installation (RTX 4070 / 12GB VRAM)

```bash
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
pip install -U qwen-tts
pip install -U flash-attn --no-build-isolation
```

Dependencies: transformers==4.57.3, accelerate==1.12.0, torchaudio, librosa, soundfile
Python: >=3.9 (recommend 3.12)

## Three Key Workflows

### Voice Clone (Base model)
```python
from qwen_tts import Qwen3TTSModel
import torch, soundfile as sf

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    device_map="cuda:0", dtype=torch.bfloat16,
    attn_implementation="flash_attention_2",
)
wavs, sr = model.generate_voice_clone(
    text="Your text", language="English",
    ref_audio="reference.wav", ref_text="transcript of reference",
)
sf.write("output.wav", wavs[0], sr)
```

### Voice Design (VoiceDesign model)
```python
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", ...)
wavs, sr = model.generate_voice_design(
    text="Your text", language="English",
    instruct="Warm young female voice with slight Southern drawl",
)
```

### Voice Design → Clone Pipeline (BEST FOR SCOUT)
1. Design voice with VoiceDesign model
2. Create reusable clone prompt with Base model
3. Generate all content with cloned voice
```python
# Design
design = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", ...)
ref_wavs, sr = design.generate_voice_design(
    text="Hey there. Normal pace.", language="English",
    instruct="Warm young female, slight Southern drawl, playful edge",
)
# Clone
clone = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", ...)
prompt = clone.create_voice_clone_prompt(ref_audio=(ref_wavs[0], sr), ref_text="Hey there. Normal pace.")
# Reuse
wavs, sr = clone.generate_voice_clone(text="Whatever Scout says", voice_clone_prompt=prompt)
```

## Instruction Control Examples
- "Speak in a calm, professional tone"
- "Very annoyed but trying to stay composed"
- "Whispering intimately, close to the microphone"
- "Sultry and confident with a playful edge"
- "Groggy, just woke up, words slightly slurred"
- "Excitedly, voice rising with genuine enthusiasm"

## tripp-tts-worker Integration Status

The Qwen3 TTS model is deployed via `tripp-tts-worker` (port 8788 on VPS, relays to Windows at 172.16.1.1:8879). Voice `qwen_chloe` is configured and working for basic TTS generation.

**✅ Instruction control IS wired through the worker (as of 2026-06-21).** Codex completed integration — 18/18 tests passed. The `instruct` parameter in `/v1/tts` request body is now functional. **HOWEVER:** The worker reports `instruct_applied: true` but does NOT actually forward `instruct`, `temperature`, `top_p`, or `repetition_penalty` to the model's `generate_voice_clone()` call. All outputs sound identical regardless of instruct. The wiring is there but the params are being swallowed somewhere in the wrapper code. See bug section below.

**Critical pitfall — Voice Identity Shifting:** When `instruct` is passed, the worker originally switched to VoiceDesign mode, which **abandons the cloned voice entirely** and generates a completely new voice based on the instruction text. This caused Scout's voice to sound like a random stranger (male whisper, anime girl, etc.).

**Fix (Codex, 2026-06-21):** Instructed `qwen_chloe` now stays in `voice_clone` mode (Base model) and uses the lower-level path with BOTH the Scout reference audio AND the instruct tokens. Voice identity is preserved while emotion changes. Fallback: if clone+instruct path fails, falls back to normal cloned voice (no emotion) and logs a warning.

**Verified working:**
- Local API qwen_chloe with instruct ✅
- Local API qwen_chloe without instruct ✅
- Cyony bridge instructed Qwen ✅
- Cyony bridge no-instruct Qwen ✅
- Pocket chloe still works ✅

**Quality note (2026-06-21):** Eddie tested the fix and reported Qwen3 voice sounded "a little bit off" compared to Pocket TTS. Pocket TTS remains preferred for voice quality. Qwen3 is experimental — use Pocket TTS for production Scout voice delivery.

**⚠️ CRITICAL BUG (CONFIRMED 2026-06-22):** The worker reports `instruct_applied: true` but the model IGNORES the instruct. Tested extreme instructs — durations nearly identical (13.2s vs 12.7s vs 12.5s). Temperature 0.3 vs 1.2 produces nearly identical output. The worker accepts parameters but does NOT forward them to `generate_voice_clone()`.

**Root cause (Tripp analysis, 2026-06-22):** The `subtalker_*` params are Codex's custom additions to the wrapper, NOT official Qwen3 model parameters. The official `generate_voice_clone()` accepts: `instruct`, `temperature`, `top_p`, `top_k`, `repetition_penalty`, `max_new_tokens`. The wrapper logs `instruct_applied: true` but doesn't actually forward these to the model. Codex needs to verify the wrapper's `generate_voice_clone()` call passes all kwargs through.

**Confirmed 2026-06-22 via shell script tests:** Whisper=12,946ms, Rage=13,115ms, No instruct=12,908ms. All identical. Bug is real.

**Transcript-Conditioned Cloning (2026-06-21):** Switched from x-vector-only to ICL mode with exact Whisper transcript. Speaker similarity improved from ~0.75 to ~0.89 (19% improvement). Eddie confirmed: "sounded much more like you." Worker health shows `ref_text_configured: true`, `x_vector_only_mode: false`. Whisper transcript is a "strong draft" — verify manually if identity degrades.

**Current state (2026-06-22):** Qwen3 voice identity is CORRECT (transcript-conditioned ICL mode). But emotion control is NON-FUNCTIONAL — the worker bug prevents instruct/temperature from reaching the model. Tripp confirmed the root cause: `subtalker_*` params are custom wrapper additions, not official Qwen3 model params. The official `generate_voice_clone()` accepts `instruct`, `temperature`, `top_p`, `top_k`, `repetition_penalty`, `max_new_tokens`. Codex needs to verify the wrapper forwards these. Pocket TTS remains the production default.

**Current state (2026-06-21):** Qwen3 instruct pipeline is LIVE and working — voice identity is preserved in clone mode. But Pocket TTS wins on voice quality and speed. Qwen3's value is in instruction-controlled emotion (whisper, shout, annoyed, excited) which Pocket doesn't natively support. The gap may close with:
1. Better reference audio for Qwen3 clone
2. Two-step pipeline (VoiceDesign for emotion → Base for voice identity)
3. Adjusted instruct phrasing that's less aggressive on prosody

See `uncensored-voice-pipeline` skill for the Pocket TTS hidden parameters discovery (temp, lsd_decode_steps) which may provide Pocket-side emotion control without needing Qwen3.

## Pitfalls
- MUST use fresh conda env — transformers version pinning conflicts
- Base model has NO instruction control
- VoiceDesign model has NO voice cloning — use pipeline
- 0.6B models lack instruction control — use 1.7B
- ref_text transcript significantly improves clone quality
- **Voice identity shifting**: If instruct mode uses VoiceDesign model, cloned voice is ABANDONED. Must stay in voice_clone mode (Base model) with instruct tokens passed at lower level. Codex fix (2026-06-21) handles this automatically.
- **Voice quality vs Pocket TTS**: Qwen3 clone sounds "a little bit off" per Eddie. Pocket TTS is preferred for production Scout voice. Qwen3 is for experimentation.
- **Worker auth**: Requires `Authorization: Bearer <TRIPP_TTS_SHARED_SECRET>` header. Secret in `/opt/data/.tripp-tts-worker.env`.
- **Shell script**: Use `/opt/data/tripp-tts-generate-qwen.sh "text" "instruct"` for CLI generation — handles auth, payload, and file save automatically.
- **12Hz is the correct model**: Do NOT swap to 25Hz. 12Hz has better voice cloning, lower latency, and is the recommended daily driver per official tech report.
- **FlashAttention2**: Install with `MAX_JOBS=4 pip install -U flash-attn --no-build-isolation` on RTX 4070. Gives ~10% speedup.

## Fine-Tuning (from Kimi Report, 2026-06-22)
The `finetuning/` directory in the Qwen3-TTS repo has a full SFT script:
- **Single-speaker only** (multi-speaker coming later)
- Uses same `ref_audio` across all samples for consistency
- `sft_12hz.py` takes `--speaker_name` → creates named speaker profile callable via `generate_custom_voice(speaker="speaker_test")`
- **Recommended LR:** 2e-6 to 2e-5, batch_size 32
- **Only supports Base model variant** (not VoiceDesign or CustomVoice)
- **DPO/GSPO alignment data** exists post-training — could be leveraged for fine-tuning better style following or speaker consistency

**Scout fine-tuning path:** If we ever want Scout's voice baked into the model permanently (instead of relying on reference audio every time), single-speaker SFT on Base model with `speaker_name="scout"` → `generate_custom_voice(speaker="scout")`. This would eliminate the reference audio dependency and potentially improve consistency.
