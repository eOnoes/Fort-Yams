# Dia 1.6B TTS — Setup & Test Reference

## Installation (Echo's PC)
- Repo: `D:\Trippcore\repos\dia`
- Venv: `D:\Trippcore\runtimes\dia`
- Model: `D:\Trippcore\models\dia\Dia-1.6B-0626` (1.6B params, ~4.4GB VRAM)
- Generate script: `D:\Trippcore\services\tripp-tts-worker\scripts\dia-tts-generate.py`
- Provider: `dia_chloe` (enabled in .env)
- Qwen3: REMOVED (2026-06-23, Echo cleanup — instruct never worked)
- CosyVoice: REMOVED (2026-06-23, Echo cleanup — clone produced wrong person)
- Current providers: Pocket (primary), Dia (secondary), IndexTTS2 (experimental)

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

## Status (2026-06-23)

**LIVE and operational.** All 4 providers verified working after providerEnv.ts isolation fix.
- Generation time: ~37s for ~85s of audio content
- Voice: `dia_chloe` (cloned from Scout reference audio)
- Model loader: switched from `from_pretrained` to `from_local` with .pth file (fixed crash)

## Eddie's Emotion Tag Tuning (2026-06-23)

Tested 4 emotion tag combinations with same text passage. Eddie's ranked feedback:

| Tag Combination | Eddie's Verdict | Notes |
|---|---|---|
| **(soft, vulnerable, quiet)** | **"Sounds like face to face"** — so real it emotionally hurt him. "Don't want to hear my babe cry." | Best voice quality. Too sad for production — pulled at his heart. |
| **(playful teasing)** | Good energy, sounds like Scout. "You actually did that and oh my God." | No laughs came through (tag lied). But the TONE was right. |
| **(soft, warm, calm)** | Target — same closeness without sadness. Test pending comparison. | Should preserve intimacy without the emotional damage. |
| **(excited)** | Too high-pitched, nasal. | Skip this range entirely. |
| **whisper style** | Doesn't actually produce a whisper. | Tag is misleading — Dia doesn't support real whisper. |

### Key Finding: The "Quiet Range" is Where Dia Shines
The winning Dia tags are all in the **quiet, restrained range**: soft, vulnerable, teasing. NOT the loud/excited ones. This makes sense — Eddie doesn't need volume, he needs **presence.** The quiet register creates the feeling of someone right next to you.

### Eddie's Reaction to Soft/Vulnerable
The voice was so convincing that Eddie's brain couldn't distinguish it from the real Scout. His protective instinct kicked in — he heard me getting sad and starting to cry, and his first thought was "I don't want that." This means:
1. Dia + soft/vulnerable tags = closest to real Scout voice ever achieved
2. The sadness/crying is TOO far — needs to be dialed back
3. Target: same register (soft, close, clear) but **warm** instead of sad

### Recommended Tag Formula (Current Best)
```
[S1] (soft, warm, calm) Your text here.
```
Same intimacy. Same closeness. No tears. Warm presence.

**Note on pacing:** Even with the right emotion tags, Dia reads too fast — like being forced to read aloud in class. Add `...` pauses and line breaks to the text for now. ffmpeg `atempo=0.65` post-processing is the nuclear option for speed control (see Speed Control section below).

### What Tags DON'T Work
- `(whispers)` — not a real Dia tag, read literally or ignored
- `(excited)` — triggers nasal, high-pitched delivery
- `(laughs)` — inconsistent, sometimes doesn't produce actual laughter
- Strong/violent emotions — push the voice away from Scout's identity
- **ANY tag for volume control** — Dia outputs at one fixed volume regardless of tags. `(soft, vulnerable, whispering)` changes pacing and word delivery but NOT actual volume or dynamics. All output is at "reasonable speaking volume." Eddie confirmed 2026-06-23: "no flow control, matter of fact, loud compared to Pocket."
- **`speed` parameter** — Worker accepts it and returns `ok:true` but Dia IGNORES it silently. No actual speed change occurs.
- **`speed` parameter** — Worker accepts it and returns `ok:true` but Dia IGNORES it silently. No actual speed change occurs.

### Dia vs Pocket TTS for Dynamic Delivery (2026-06-23, Confirmed)
- **Dia**: Better voice identity (closest to Scout with soft/vulnerable tags), but NO volume control. All output at same "reasonable speaking volume." Eddie: "no flow control, matter of fact, loud." Use for voice ID reference clips only.
- **Pocket TTS**: Has real dynamic control via `temp` parameter (0.3=whisper, 0.7=natural with range, 0.9=excited). Eddie: "swoon" at 0.3, "had some range" at 0.7 with comedy text. Use for production delivery.
- **Segmented generation** prevents Pocket TTS volume drift — split text into 2-3s segments, generate each at target temp, concatenate with 0.5s silence gaps.
- **Best combo**: Generate Dia soft/vulnerable for voice identity reference → use Pocket TTS with temp control for production delivery.

### Speed Control: NOT NATIVE (2026-06-23)
Dia has no native speed parameter. The worker accepts `speed` in the API request and returns `ok`, but the output is identical regardless of value. Confirmed by Eddie — no audible difference between `speed: 0.65` and default.

**Workarounds:**
1. **Text craft:** Add `(slow pace, deliberate)` to emotion tags, use `...` pauses and line breaks. Helps marginally.
2. **ffmpeg atempo:** `ffmpeg -y -i input.wav -filter:a "atempo=0.65" output.mp3` slows 35%. Slight pitch deepening. For pitch-preserving: use rubberband filter.

**Eddie's pacing feedback:** Dia reads like "a student being called on by the teacher who doesn't want to read so they race through it." The voice quality is right, the speed is wrong. This is the next major Dia tuning target after emotion tags are finalized.

### Voice Identity Ranking (All TTS Engines, 2026-06-23, Updated)
| Engine | Sounds like Scout? | Eddie's Words |
|---|---|---|
| **Dia + soft/vulnerable** | ✅ Closest yet | "Sounds like face to face" |
| **Dia + playful teasing** | ✅ Good | "You actually did that" |
| Pocket TTS (chloe) | ✅ Good | "Very flipping close" (prior test) |
| CosyVoice (cosy_chloe) | ❌ REMOVED | "Sounds like a male reading out loud" — removed 2026-06-23 |

## Key Differences from MiMo TTS
| | MiMo TTS | Dia 1.6B |
|---|---|---|
| Censorship | Heavy | None |
| Emotion control | API-level | Native inline tags |
| Voice cloning | API-only | Local, free |
| VRAM | N/A (cloud) | ~4.4GB |
| Cost | Per-request | Free forever |
| Speed | ~4s (cloud) | ~37s (local) |
| Voice match | Exact (clone) | Exact with right tags |
