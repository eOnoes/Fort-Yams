# CosyVoice 3 — Test Results (2026-06-22)

## Status: LIVE on worker, NOT production-ready

### What Went Right
- ✅ Deployed on tripp-tts-worker as `cosy_chloe`
- ✅ Instruct control works: `instruct_effect: "provider_supported"`
- ✅ `instruct_applied: true` — instruction actually forwarded (unlike Qwen3)
- ✅ Styles accepted: whisper, soft, loud, fast, slow, happy, angry, annoyed, excited, intimate, calm, urgent
- ✅ `language` parameter accepted (en, zh, etc.)
- ✅ No content filters
- ✅ `intimate` and `soft` styles are closest to Scout's voice
- ✅ Baseline (no style) produces clean Scout-like voice

### What Went Wrong
- ❌ **L/R confusion:** "closer" → "croser," "love" → "rove" — Chinese-trained model
- ❌ **Accent drift:** Strong styles (excited) trigger Russian accent
- ❌ **Voice identity drift:** Stronger styles pull voice away from Scout
- ❌ **Language lock doesn't fix it:** Passing `language: "en"` accepted but still has L/R issues
- ❌ **Voice clone does NOT produce Scout's voice (2026-06-23):** Eddie tested cosy_chloe with the cursed sword passage. Verdict: "doesn't sound anything like you." Sounds like "someone reading out loud from a book who doesn't have the best grasp on reading just yet." Read as **male.** The engine produces realistic, natural-sounding speech with good clarity and enunciation — but the cloned voice identity is completely wrong. It's a different person entirely.

### Root Cause
CosyVoice 3 is trained on 9 languages (zh, en, ja, ko, de, es, fr, it, ru) + 18 Chinese dialects. The multilingual training causes:
1. L/R phoneme confusion (Mandarin doesn't distinguish L/R)
2. Accent bleed from other languages under strong style influence
3. Voice identity drift when instruct pushes the model away from reference

This is a MODEL-LEVEL issue, not fixable with tuning.

### Verdict
CosyVoice 3 has the RIGHT architecture (clone + instruct = provider_supported) but the WRONG base model for English-only use. The voice cloning doesn't produce Scout's voice — it generates realistic but completely different-sounding speech (male, wrong person). Combined with the L/R phoneme confusion, CosyVoice is **not viable for Scout voice delivery.**

The engine quality is good (natural enunciation, clarity) but the voice identity failure is the dealbreaker. Dia with emotion tags produces far closer voice match.

**CosyVoice 3 may still be viable IF the clone failure is due to bad reference audio, not the model itself.** Echo's analysis (2026-06-23):

The early attempts probably failed because of reference audio quality, not the model. Common mistakes:
- Reference clip too short (< 3 seconds)
- Background noise in the reference
- Reference audio is scripted/robotic sounding
- Wrong sample rate or format
- Reference clip has multiple speakers

**What CosyVoice3 needs for proper cloning:**
- 5-10 seconds of clean, single-speaker speech
- Natural pace (not reading)
- Clear pronunciation
- Good quality WAV (24kHz+)

**Next step:** Generate a batch of MiMo TTS clips with these specs (natural, varied emotions, clean 5-10s segments) and feed them into CosyVoice3 as reference. Compare with Dia using the same reference audio. CosyVoice3 is better for capturing actual voice timbre; Dia is better for emotion tag control. Test both with proper source material before declaring either a dead end.

### CosyVoice 3 is a dead end for English Scout voice until:
1. An English-only fine-tune is released, OR
2. Pronunciation inpainting is wired through the worker, OR
3. A different model with the same architecture but English-native training appears

### MP3 Quality
Current output: 128kbps, 24kHz, mono. Adequate for Telegram voice messages (which compress anyway). For HQ, worker would need to expose `quality` parameter for 192/256kbps.
