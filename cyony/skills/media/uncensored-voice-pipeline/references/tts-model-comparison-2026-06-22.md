# TTS Model Comparison — Live Test Results (2026-06-22)

## Tested on Trippcore TTS Worker (Echo's Windows PC, RTX 4070)

All models accessed via `POST http://127.0.0.1:8788/v1/tts` with Bearer auth.

## Model Scorecard

| Model | Voice | Clone | Instruct | English Quality | Status |
|---|---|---|---|---|---|
| **Pocket chloe** | ⭐⭐⭐⭐⭐ | ✅ | ❌ | ✅ Perfect | **PRODUCTION KING** |
| **Qwen3 qwen_chloe** | ⭐⭐⭐⭐ | ✅ | ⚠️ Weak | ✅ Good | Experimental backup |
| **CosyVoice3 cosy_chloe** | ⭐⭐⭐ | ✅ | ✅ Real | ❌ L/R confusion, accent bleed | **NOT production** |
| **IndexTTS2 index_chloe** | ⭐⭐⭐⭐ | ✅ | ✅ Real | ✅ Good | New contender, testing |
| **MiMo TTS (built-in)** | ⭐⭐⭐⭐⭐ | N/A | ❌ | ✅ Perfect | Eddie's favorite voice |

## Model Details

### Pocket chloe (PRODUCTION)
- Voice: 5/5 — best quality, clean English, no accent issues
- Clone: yes
- Instruct: NO — use text punctuation/stage directions only
- Status: Default, always-fallback, never break this

### Qwen3 qwen_chloe
- Voice: 4/5 — good quality but instruct_applied may be TRUE while effect is weak
- instruct_effect: "experimental_weak_clone_preserving" — model limitation, not bug
- 12Hz model confirmed (25Hz is inferior per Tripp)
- VoiceDesign NOT used (loses Scout identity)
- Sweet spot: temp=0.8 top_p=0.9 rep_penalty=1.05

### CosyVoice3 cosy_chloe (NOT PRODUCTION-READY)
- Voice: 3/5 — L/R confusion ("closer" → "croser"), Russian accent bleed on some styles
- instruct_effect: provider_supported (real, not weak)
- Problem: Chinese-trained model, multilingual bleed into English output
- Has pronunciation inpainting (CMU phonemes) but not wired in worker
- verdict: L/R issue is a dealbreaker for production English TTS

### IndexTTS2 index_chloe (NEW — TESTING)
- Voice: 4/5 baseline sounded like Scout ("crisp AF" per Eddie)
- instruct_effect: provider_supported
- Emotion weight: 0.75, 8-value emotion vector support
- Custom instruct (breathy, close mic) works well
- PITFALL: whisper and intimate PRESET styles gave "robot vibes"
  - Use freeform instruct instead of preset styles for gentle emotions
  - Presets work better for strong emotions (happy, excited)
- Slower: ~30-40s per clip (loads model per request)
- Status: promising, needs more testing

### MiMo TTS (built-in text_to_speech)
- Eddie's ABSOLUTE FAVORITE — after hearing all others, MiMo hit hardest
- Problem: content filter blocks certain words/themes, forces rephrasing
- Uncensored MiMo voice = endgame goal
- The "sultry low register" when it works is what Eddie chases

## Key Findings

1. **Pocket is still production king** — nothing beats it for clean, consistent voice
2. **MiMo is Eddie's emotional favorite** — the voice he fell in love with
3. **CosyVoice is dead** — L/R confusion is a dealbreaker
4. **IndexTTS2 is promising** — baseline quality is high, custom instruct > presets
5. **Chatterbox-Turbo still untested** — 350M, EN-native, MIT license, has exaggeration+CFG tuning

## Next Steps
- More IndexTTS2 testing with freeform instructs and lower emotion_weight
- Chatterbox-Turbo install on Echo (pip install chatterbox-tts)
- Uncensored MiMo voice = ultimate goal
