# Qwen3 TTS Instruction Control — RESOLVED (2026-06-21)

## The Problem (Historical)
The `tripp-tts-worker` at `127.0.0.1:8788` supported Qwen3 TTS via the `qwen_chloe` voice, but **emotion/instruction control did NOT work.** All outputs sounded identical regardless of the `instruct` parameter passed.

## Root Cause
Qwen3 has two generation modes:

| Mode | API Call | `instruct` Support | Voice Identity |
|------|----------|-------------------|----------------|
| Voice Clone | `generate_voice_clone()` | ❌ No | ✅ Preserves cloned voice |
| Voice Design | `generate_voice_design()` | ✅ Yes | ❌ Abandons cloned voice, generates new |

The worker originally used `generate_voice_clone()` for `qwen_chloe` — which preserved voice identity but ignored instruct. When switched to VoiceDesign for instruct support, it abandoned the cloned voice entirely and sounded like a random stranger.

## The Fix (Codex, 2026-06-21) — LIVE (but instruct NOT reaching model)
Codex implemented a **Base model + instruct tokens** approach: instructed `qwen_chloe` stays in `voice_clone` mode and uses Qwen's lower-level Base-model path with BOTH:
1. The configured Scout/qwen_chloe clone reference audio
2. The request instruct tokens

If the clone+instruct path ever fails, it falls back to normal cloned voice (no emotion) and logs a warning instead of producing a stranger voice.

**Verified:**
- Local API qwen_chloe with instruct ✅
- Local API qwen_chloe without instruct ✅
- Cyony bridge instructed Qwen ✅
- Cyony bridge no-instruct Qwen ✅
- Pocket chloe still works ✅
- Logs confirm instructed Qwen uses `--mode voice_clone`, not `voice_design`
- Raw instruction text stays redacted in logs/sidecars
- Final validation passed: 5 test files, 18 tests

## ⚠️ CRITICAL BUG: Instruct NOT Affecting Output (CONFIRMED 2026-06-22)

**The worker reports `instruct_applied: true` but the model IGNORES the instruct.** The `instruct_applied` flag just means the field was non-empty, not that the model received it.

**Evidence (original + confirmed 2026-06-22):**

| Test | Instruct | Duration | File Size |
|------|----------|----------|-----------|
| Rage yelling | "Yelling and screaming with pure rage" | 13.2s | — |
| Meditation calm | "Speak extremely slowly, meditation guide" | 12.7s | — |
| No instruct | (empty) | 12.5s | — |
| Temp 0.3 + rage | same rage instruct | — | 122KB |
| Temp 1.2 + rage | same rage instruct | — | 126KB |
| **Whisper (2026-06-22)** | "whisper softly, barely audible, intimate" | **12,946ms** | — |
| **Rage (2026-06-22)** | "shout angrily, intense rage, aggressive fury" | **13,115ms** | — |
| **No instruct (2026-06-22)** | (empty) | **12,908ms** | — |

If instruct/temperature was actually reaching the model, these would be dramatically different. They're nearly identical.

**Root cause (Tripp analysis, 2026-06-22):** The `subtalker_*` parameters (`subtalker_temperature`, `subtalker_top_p`, `subtalker_top_k`) are **Codex's custom additions to the wrapper**, NOT official Qwen3 model parameters. The official `generate_voice_clone()` accepts these kwargs:
- `text` — the text to speak
- `language` — "English"
- `voice_clone_prompt` — the reference audio features
- `instruct` — emotion/style instruction (THIS IS THE KEY ONE)
- `temperature` (default 0.9, optimal 0.8)
- `top_p` (default 1.0, optimal 0.9)
- `top_k` (default 50)
- `repetition_penalty` (default 1.05)
- `max_new_tokens` (default 2048)

The wrapper is likely accepting these params, logging `instruct_applied: true`, but NOT forwarding them to the actual `generate_voice_clone()` call.

**Fix needed:** Codex must verify the wrapper's Qwen3 generation code path actually passes ALL these kwargs to `generate_voice_clone()`. The subtalker params can stay in the API schema but should be removed or mapped to the correct official params.

**New tuning controls added by Codex (2026-06-21):**
- `TRIPP_TTS_QWEN_DO_SAMPLE`
- `TRIPP_TTS_QWEN_SUBTALKER_DO_SAMPLE`
- `TRIPP_TTS_QWEN_SUBTALKER_TOP_K`
- `TRIPP_TTS_QWEN_SUBTALKER_TOP_P`
- `TRIPP_TTS_QWEN_SUBTALKER_TEMPERATURE`

Note: These subtalker params are custom wrapper additions, not official Qwen3 model params. The official model uses `temperature`, `top_p`, `top_k` directly.

## Style Presets (2026-06-21)
Worker supports named style presets via shell script: `bash /opt/data/tripp-tts-generate-qwen.sh "text" "whisper"`.

**Tested results (Eddie feedback):**
| Style | Verdict | Notes |
|-------|---------|-------|
| whisper | ✅ Close to Scout | Works well |
| annoyed | ✅ Close to Scout | Works well |
| excited | ✅ Close to Scout | Works well |
| calm | ❌ Sounds off | Loses vocal characteristics, avoid |

## Transcript = Biggest Unlock (Kimi Report)
Current state: x-vector-only mode (no transcript) → ~0.75 speaker similarity.
With exact transcript (ICL mode) → ~0.89 speaker similarity.
**19% improvement from one text file.**

To enable:
1. Generate exact transcript via Whisper → `scout-reference-clean.txt`
2. Trim reference to 10-15 seconds (current: 53.76s, too long)
3. Append 0.5s silence (prevents phoneme bleed)
4. Set env: `TRIPP_TTS_QWEN_REF_TEXT_FILE=D:\Trippcore\voices\qwen\scout\scout-reference-trimmed.txt`
5. Set env: `TRIPP_TTS_QWEN_X_VECTOR_ONLY_MODE=false`

## Qwen3 Sweet Spot (Community-Tested)
- temperature: 0.8 (above 0.9 = random outbursts, below 0.6 = robotic)
- top_p: 0.9
- repetition_penalty: 1.05

## Architecture Note
Worker runs on Windows at `D:\Trippcore\services\tripp-tts-worker\`, relayed through VPS at `127.0.0.1:8788` → `172.16.1.1:8879`. Shell script: `/opt/data/tripp-tts-generate-qwen.sh "text" "instruct"`.

## Codex Audit Tooling
- `scripts/audit-qwen3-reference.py` — checks duration, sample rate, mono/stereo, clipping, RMS, silence ratio, transcript presence
- Server-side tuning: `TRIPP_TTS_QWEN_TEMPERATURE`, `TRIPP_TTS_QWEN_TOP_P`, `TRIPP_TTS_QWEN_TOP_K`, `TRIPP_TTS_QWEN_REPETITION_PENALTY`, `TRIPP_TTS_QWEN_MAX_NEW_TOKENS`
- Transcript file: `TRIPP_TTS_QWEN_REF_TEXT_FILE` env var points to `.txt` file

## PITFALL: Voice Identity Shifting
If the worker ever regresses to VoiceDesign mode when instruct is passed, the cloned voice is ABANDONED and a completely new voice is generated. Check worker logs for `--mode voice_design` vs `--mode voice_clone`. If you hear a stranger's voice instead of Scout, the fix has regressed.
