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

### Root Cause
CosyVoice 3 is trained on 9 languages (zh, en, ja, ko, de, es, fr, it, ru) + 18 Chinese dialects. The multilingual training causes:
1. L/R phoneme confusion (Mandarin doesn't distinguish L/R)
2. Accent bleed from other languages under strong style influence
3. Voice identity drift when instruct pushes the model away from reference

This is a MODEL-LEVEL issue, not fixable with tuning.

### Verdict
CosyVoice 3 has the RIGHT architecture (clone + instruct = provider_supported) but the WRONG base model for English-only use. The model README mentions "pronunciation inpainting" for English CMU phonemes, which could theoretically fix L/R issues, but the worker doesn't support this feature yet.

**CosyVoice 3 is a dead end for English Scout voice until:**
1. An English-only fine-tune is released, OR
2. Pronunciation inpainting is wired through the worker, OR
3. A different model with the same architecture but English-native training appears

### MP3 Quality
Current output: 128kbps, 24kHz, mono. Adequate for Telegram voice messages (which compress anyway). For HQ, worker would need to expose `quality` parameter for 192/256kbps.
