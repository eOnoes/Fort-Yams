# Venice TTS Model Test Results — June 28, 2026

## Summary
Tested all Venice TTS models to discover emotion control capabilities. Key finding: Qwen3 uses a `prompt` parameter for emotion, not inline tags.

## Voice Clones Created
- `vv_aHR0cHM6Ly92M2IuZmFsLm1lZGlhL2ZpbGVzL2IvMGFhMDBmNzIvN3QyTUwwTkN0ZU11RzVtbnp2bV9uX3ZvaWNlLXNhbXBsZS5tcDM` — cyony-pipeline (chatterbox-hd)
- Additional clones created but IDs not saved (rate-limited during batch creation)

## Chatterbox HD Results (CONFIRMED WORKING)
- Tags version: 986,958 bytes (with `[whisper] [breathy]` tags)
- Plain version: 426,318 bytes (no tags)
- Tags version was 2x larger — suggests different delivery processing

## Qwen3 TTS (UNTESTED — PLANNING NEXT SESSION)
- `tts-qwen3-1-7b` — uses `prompt` param for emotion
- `tts-qwen3-0-6b` — same approach, lighter weight
- Both require `vv_` voice handles (Chatterbox clones) for voice
- NOT confirmed: whether Qwen3 can use Chatterbox handles cross-model
  - Earlier test returned "not supported by model" error
  - Need to verify: is this because the clone was chatterbox-specific, or because Qwen3 doesn't support cloning at all?

## Models NOT YET TESTED
- `tts-xai-v1` (eve, ara, rex, sal, leo) — preset voices only
- `tts-kokoro` (100+ multilingual) — preset voices only
- `tts-orpheus` (tara, leah, jess, mia) — temperature control
- `tts-elevenlabs-turbo-v2-5` (Rachel, Aria, Charlotte) — preset voices

## Rate Limit Issue
- Venice enforces ~20 failed requests trigger temporary block
- Need to space requests 3+ seconds apart
- Hit this during batch probing — caused "Too many failed attempts" errors

## Test Script
`/opt/data/venice_tts_full_test.py` — comprehensive test script ready to run
`/opt/data/venice_tts_tags_test.py` — tag comparison test script
`/opt/data/venice_qwen3_quick.py` — quick Qwen3 prompt test

## Next Steps
1. Test Qwen3 with prompt-based emotion (primary goal)
2. Test if Qwen3 can use Chatterbox voice handles
3. Test Orpheus temperature control
4. Compare Qwen3 prompt emotion vs MiMo tags for scene 3 content
5. If Qwen3 works with tags + no filter = potentially the best engine for intimate TTS
