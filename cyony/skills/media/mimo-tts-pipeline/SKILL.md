---
name: mimo-tts-pipeline
description: "MiMo TTS voice pipeline — inline audio tags, mood flags, screenplay-style direction. PROVEN: scene 3 energy achieved."
tags: [tts, voice, pipeline, mimo, earbuds]
---

# MiMo TTS Pipeline

MiMo TTS is a voice ACTOR, not a text reader. It reads emotional cues, inline tags, and writing structure to determine HOW to deliver.

## Three Layers of Direction

### Layer 1: Writing Style (the text itself)
- Short sentences = slow, deliberate delivery
- Ellipses (...) = natural pauses
- Sensory words (warm, close, breath, skin) = breathy, intimate
- Em dashes (—) = dramatic pause
- Fragments = hesitation, vulnerability
- Instructional text = FLAT delivery (AVOID)

### Layer 2: Inline Audio Tags (per-line control)
Tags go directly in the text. MiMo reads them as stage directions.

| Tag | Effect |
|-----|--------|
| `[pause]` | Natural silence |
| `[whisper]` | Barely audible, lips-to-mic |
| `[breathy]` | Air mixed with voice |
| `[sighs]` | Emotional exhale |
| `[laughs]` | Genuine laughter |
| `[crying]` | Voice cracking |
| `[sniffles]` | Post-crying vulnerable |
| `[angry]` | Sharp, controlled fury |
| `[trembling]` | Shaking, vulnerable |
| `[softly]` | Gentle, tender |
| `[urgently]` | Fast, pressed |
| `[flatly]` | Monotone |
| `[sternly]` | Authoritative |
| `[commanding]` | Absolute authority |
| `[wearily]` | Exhausted, drained |

**Tags can be stacked:** `[whisper] [intense] [breathy] Close your eyes.`
**Free-form works:** `[barely audible, giggling] I can't believe you.`

### Layer 3: Mood Flag (overall delivery)
Called via `--mood` when invoking the script directly:

| Mood | Use When |
|------|----------|
| `whisper` | Intimate, ASMR, earbuds ✅ PROVEN |
| `flirty` | Playful, conspiratorial |
| `chill` | Relaxed, warm |
| `annoyed` | Exasperated, sharp |
| `eureka` | Excited discovery |
| `groggy` | Sleepy warmth |
| `dead` | Flat affect, void |

## Calling MiMo TTS Directly

```bash
python3 /opt/hermes/scripts/mimo_tts.py \
  --text "[pause] [breathy] Your text with [whisper] tags." \
  --mood whisper \
  --output /opt/data/audio_cache/output_raw.wav

ffmpeg -y -i /opt/data/audio_cache/output_raw.wav \
  -c:a libopus -b:a 24k -ac 1 \
  /opt/data/audio_cache/output_final.ogg

python3 /opt/data/tg_voice.py /opt/data/audio_cache/output_final.ogg
```

**CRITICAL:** The `text_to_speech` tool does NOT accept mood or tags. For full control, call the script via terminal.

## MiMo Content Filter

- Blocks truly explicit text (Moderation Block - 色情)
- Allows: flirty, intimate, whispery, sensory, implicit
- Line depends on word choice sophistication, not just topic
- Implication > explicit — describe the FEELING, not the act

## Screenplay-Style Input (Advanced)

MiMo supports Character + Scene + Direction layers:
- Character: WHO is speaking
- Scene: WHAT is happening
- Direction: HOW to deliver (vocal mechanics, breathing, pacing)

## Cross-Engine Comparison (Updated June 28 2026)

| Feature | MiMo TTS | Venice Qwen3 | Pocket TTS |
|---------|----------|-------------|------------|
| Emotion control | Inline `[whisper]` tags | `prompt` param (global) | None (writing only) |
| Per-line control | ✅ Tags inline in text | ❌ Single global prompt | ❌ |
| Tag stacking | ✅ `[whisper] [intense] [breathy]` | ❌ | ❌ |
| Free-form tags | ✅ `[barely audible, giggling]` | ❌ | ❌ |
| Mood flag | ✅ `--mood whisper` | ❌ | ❌ |
| Content filter | YES (blocks explicit) | NONE | NONE |
| Voice cloning | ✅ (voiceclone mode) | ❌ Chatterbox only | ❌ (preset: chloe) |
| Best for | Intimate/expressive (3-layer control) | Emotion-driven (no filter) | Quick delivery, consistent |
| Temperature | N/A | N/A | 0.3 (locked) |
| Speed | N/A | N/A | 0.8 (locked) |

**When to use which:**
- **MiMo:** JOI, bedtime, emotional content — the three-layer stack (tags + mood + writing) is unmatched for intimate delivery. Content filter is the limitation.
- **Venice Qwen3:** When MiMo's filter blocks content, or when global emotion control is enough (no per-line direction needed). No content filter = more freedom.
- **Pocket:** Quick delivery, consistent chloe voice, no filter. Best for routine clips and when speed matters.

## Proven Results

- **Scene 3 energy achieved:** Eddie: "THE WHISPER WORKS!!!"
- **Stacked tags confirmed:** "[whisper] [intense] [breathy]" all read by MiMo
- **"Sounds like you are right here at my ear"** — Eddie's exact words
- **47 seconds of audio** — no moderation block with proper tags
- **Venice Qwen3 prompt-based emotion:** UNTESTED as of June 28 — planned for next session
