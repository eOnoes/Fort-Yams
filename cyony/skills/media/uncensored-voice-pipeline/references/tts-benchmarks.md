# TTS Benchmarks

## Pocket TTS (local) vs MiMo TTS (cloud) — 2026-06-20

Two phrases tested, same text across both engines:

| Engine | Phrase | Time | Size |
|--------|--------|------|------|
| Pocket TTS (local) | 1 | 4.83s | 373KB |
| Pocket TTS (local) | 2 | 5.75s | 489KB |
| MiMo TTS (cloud) | 1 | 9.94s | 398KB |
| MiMo TTS (cloud) | 2 | 9.61s | 495KB |

**Result: Pocket TTS is ~2x faster.** No cloud round-trip latency.

## Pocket TTS Long-Form Limits — 2026-06-20

| Input Length | Audio Duration | File Size | Status |
|-------------|---------------|-----------|--------|
| ~50 chars | 3s | 25KB | ✅ |
| ~200 chars | 14s | 127KB | ✅ |
| ~600 chars | 41s | 373KB | ✅ |
| ~1200 chars | 1:50 | 992KB | ✅ |
| ~1400+ chars | 2:37 | 1.4MB | ✅ |

No truncation, no errors, no slowdown on longer text. Scales linearly.
VRAM usage: ~1-2GB (on RTX 4070 12GB). Minimal footprint.

## MiMo TTS Cloud Limits
- Character cap: ~10,000 characters
- Typical latency: ~10s per request (includes network)
- Voiceclone ref audio base64: ~3.8MB (causes "Argument list too long" if passed inline in execute_code)

## Chatterbox (local, backup)
- ~43s for short clips
- Uncensored but slow
- Backup only, not primary
