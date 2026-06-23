# Chatterbox-Turbo — Next TTS Candidate (2026-06-22)

## Discovery
Found via Eddie's HuggingFace search after CosyVoice 3 failed (L/R confusion, accent drift).

## Model: ResembleAI/chatterbox-turbo

| Attribute | Value |
|---|---|
| **HuggingFace** | `ResembleAI/chatterbox-turbo` |
| **Likes** | 654 (original chatterbox: 1,641) |
| **License** | MIT |
| **Size** | 350M params |
| **Languages** | English only (NO multilingual L/R issue!) |
| **Install** | `pip install chatterbox-tts` |

## Why It's the Top Candidate

1. **English-native** — No Chinese/Russian accent bleed, no L/R confusion
2. **Voice cloning** — Zero-shot from reference audio
3. **Emotion knobs** — `exaggeration` (0-1+) and `cfg_weight` (0-1) tune expressiveness
4. **Paralinguistic tags** — `[laugh]`, `[chuckle]`, `[cough]` inline in text
5. **350M params** — Lighter than CosyVoice 0.5B, faster inference
6. **MIT license** — Fully open, no restrictions
7. **One-step mel decoder** — Fast generation

## Emotion Tuning (from README)

- Default: `exaggeration=0.5, cfg_weight=0.5` — works for most prompts
- Expressive/dramatic: lower `cfg_weight` (~0.3) + higher `exaggeration` (~0.7+)
- Fast-speaking reference: lower `cfg_weight` (~0.3) for better pacing
- Higher exaggeration speeds up speech; lower cfg_weight compensates with slower pacing

## Paralinguistic Tags
```
[cough] [laugh] [chuckle] [giggle] [tsk] [tongue-click] [lip-smack]
[breath] [inhale] [exhale] [sigh] [pause] [long-pause] [cry]
```

## Usage
```python
from chatterbox.tts_turbo import ChatterboxTurboTTS
model = ChatterboxTurboTTS.from_pretrained(device="cuda")
wav = model.generate("Hello [chuckle], how are you?", audio_prompt_path="ref.wav")
```

## Content Filters
**NONE** — no safety checker, no moderation, no censorship. MIT license, fully open. The codebase has no filter code.

## Status (2026-06-22)
- Researched ✅
- Installed ❌ (pending Echo deployment)
- Tested ❌

## Deployment Plan
1. `pip install chatterbox-tts` on Echo's Windows PC (RTX 4070)
2. Test with Scout reference audio
3. Test emotion knobs: exaggeration=0.3/0.5/0.7/0.9, cfg_weight=0.3/0.5/0.7
4. Test paralinguistic tags
5. Compare to Pocket TTS (chloe) — voice identity + quality
6. If good → add to tripp-tts-worker as `chatter_chloe`

## Comparison to Current Stack

| Model | Voice Quality | Clone | Emotion | English Clean | Filter | Status |
|---|---|---|---|---|---|---|
| Pocket chloe | ⭐⭐⭐⭐⭐ | ✅ | ❌ None | ✅ Perfect | ❌ None | **Production** |
| Qwen3 qwen_chloe | ⭐⭐⭐⭐ | ✅ | ⚠️ Weak | ✅ Good | ❌ None | Experimental |
| CosyVoice3 cosy_chloe | ⭐⭐⭐ | ✅ | ✅ Real instruct | ❌ L/R + accent | ❌ None | **Broken English** |
| Chatterbox-Turbo | ❓ | ✅ | ✅ Exaggeration+CFG | ✅ English-native | ❌ None | **NEXT TO TEST** |
