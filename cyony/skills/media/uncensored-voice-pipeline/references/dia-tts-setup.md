# Dia 1.6B TTS — Setup & Test Reference

## Installation (Echo's PC)
- Repo: `D:\Trippcore\repos\dia`
- Venv: `D:\Trippcore\runtimes\dia`
- Model: `D:\Trippcore\models\dia\Dia-1.6B-0626` (1.6B params, ~4.4GB VRAM)
- Generate script: `D:\Trippcore\services\tripp-tts-worker\scripts\dia-tts-generate.py`
- Provider: `dia_chloe` (enabled in .env)
- Qwen3: DISABLED (freed ~4GB VRAM)

## Restart Worker Required
```bash
cd D:\Trippcore\services\tripp-tts-worker
npx tsx src/server.ts
```

## Test Commands
```bash
# Basic
curl -X POST http://127.0.0.1:8788/v1/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d '{"text": "[S1] Hey! This is Dia speaking. (laughs)", "voice": "dia_chloe"}'

# Emotion tags
-d '{"text": "[S1] (sighs) I can'\''t believe that happened. (laughs) But honestly, it'\''s hilarious.", "voice": "dia_chloe"}'

# Whisper style
-d '{"text": "[S1] This is a whisper test.", "voice": "dia_chloe", "style": "whisper"}'

# Multi-speaker dialogue
-d '{"text": "[S1] Hey, what'\''s your name? [S2] I'\''m Dia! [S1] Nice to meet you. [S2] You too! (laughs)", "voice": "dia_chloe"}'
```

## Emotion Tags
(laughs), (sighs), (gasps), (coughs), (clears throat), (screams), (singing), (mumbles), (sniffs), (claps), (whistles)

## Health Check
```bash
curl http://127.0.0.1:8788/health
# Should show: dia_tts_configured: true, dia_chloe in voices
```

## Status (2026-06-22)

**Installed:** ✅ Worker shows `dia_chloe` in voices, `dia_tts_configured: true`
**Model loads:** ❌ `DiaModel.from_pretrained` crashes with code 1
**Other providers after restart:**
- Pocket `chloe`: ❌ Python import error
- IndexTTS2 `index_chloe`: ❌ transformers version conflict (GenerationMixin)
- Qwen `qwen_chloe`: ❌ Disabled to free VRAM (expected)

**Root cause:** Likely dependency conflict introduced during Dia installation. The worker restart exposed the conflict across all providers.

**Fix needed:** Investigate Python dependency state on Echo's PC. Restore Pocket first (production), then diagnose Dia loading issue.

## Key Differences from MiMo TTS
| | MiMo TTS | Dia 1.6B |
|---|---|---|
| Censorship | Heavy | None |
| Emotion control | API-level | Native inline tags |
| Voice cloning | API-only | Local, free |
| VRAM | N/A (cloud) | ~4.4GB |
| Cost | Per-request | Free forever |
