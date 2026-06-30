# Kimi Deep Dive Report — Local TTS Architecture (2026-06-21)

12-agent parallel research swarm produced a 1,900-line engineering spec for Trippcore's local TTS stack. Key findings distilled below.

## Three-Tier Architecture

| Tier | Model | VRAM | Device | Role | Latency |
|------|-------|------|--------|------|---------|
| 1 | Pocket TTS (~100M) | ~234 MB RAM | CPU | Narration, fallback (80% of requests) | ~200ms first chunk |
| 2 | Qwen3-TTS 1.7B | ~6-7 GB | GPU (sequential) | Voice clone + mood | ~300-500ms |
| 3 | Orpheus 3B (Q8_0) | ~4-5 GB | GPU (sequential) | Paralinguistic tags | ~400-600ms |

**Critical constraint:** Only ONE GPU model in VRAM at a time. ModelManager enforces unload-before-load with `torch.cuda.empty_cache()` + `gc.collect()`. 5-minute keep-alive to avoid cold-start.

**Routing logic:**
- No mood/clone/tags → Pocket TTS (Tier 1)
- voice_id + mood → Qwen3-TTS (Tier 2)
- Inline tags (laugh/sigh) → Orpheus (Tier 3)
- Fallback chain: Tier 3 → Tier 2 → Tier 1

## Orpheus 3B — 8 Trained Tags

| Tag | Reliability | Example |
|-----|-------------|---------|
| `<laugh>` | ~90% | "That's hilarious! <laugh>" |
| `<chuckle>` | ~90% | "<chuckle> Well, I suppose..." |
| `<sigh>` | ~85% | "<sigh> I was afraid this would happen." |
| `<gasp>` | ~75% | "<gasp> You mean it was him?" |
| `<cough>` | ~75% | "Excuse me <cough>, as I was saying..." |
| `<sniffle>` | ~70% | "I'm fine <sniffle>, really." |
| `<groan>` | ~65% | "<groan> Not another meeting." |
| `<yawn>` | ~60% | "It's past midnight <yawn>" |

Tags are trained tokens in the tokenizer vocabulary — actual acoustic events, not post-processed effects. Tags work best when surrounding text justifies the emotion.

**Chatterbox comparison:** 9 tags (adds `[shush]`, `[clear throat]`). Uses bracket syntax `[laugh]` vs Orpheus XML `<laugh>`. Only Chatterbox has verified simultaneous cloning+tags.

## RTX 4070 VRAM Reality
- 8 GB total, ~6.5-7.0 GB usable (WDDM reserves 15-20%)
- Qwen3 1.7B bf16: ~8 GB → OOM
- Qwen3 1.7B float16 + SDPA: ~6-7 GB → fits, no headroom
- Orpheus 3B Q8_0: ~4-5 GB → fits
- Flash Attention 2 NOT available on Windows; SDPA is the only option
- float16 is 15-20% faster than bf16 on consumer NVIDIA cards

## Sentence-Level Streaming
Most impactful latency optimization: feed completed sentences to TTS as LLM emits them (not buffering full response). Cuts perceived latency by 60-80%. TTFA (time-to-first-audio) matters more than total duration.

## License-Safe Stack
All approved models are permissive:
- Pocket TTS: MIT
- Qwen3-TTS: Apache 2.0
- Orpheus: Apache 2.0
- Chatterbox Turbo: MIT

Excluded: F5-TTS (CC-BY-NC), XTTS-v2 (CPML, company shut down), Fish Audio S2 Pro (research-only), IndexTTS2 (Bilibili authorization required).

## MP3 Pipeline
- 96 kbps CBR mono LAME for speech (transparent quality)
- OGG Opus 32 kbps for Telegram voice messages
- SHA-256 content-hash caching (24h TTL)
- VAD trim before compression
- Source WAV retained permanently; compressed formats are disposable derivatives

## 5-Week Implementation Plan
1. **Foundation** — Pocket TTS + MP3 pipeline + caching
2. **Voice Cloning** — Qwen3 0.6B/1.7B + Whisper transcript + reference optimization
3. **Expressiveness** — Orpheus 3B + emotion abstraction layer + tag translation
4. **Speed & Streaming** — Chatterbox Turbo + sentence-level streaming + warm-up
5. **Telegram & Polish** — OGG Opus delivery + Prometheus metrics + health checks

## Benchmark Targets
- Speaker similarity ≥ 0.70
- TTFA P95 < 500ms
- RTF ≥ 2.0x
- 15-item quality checklist
