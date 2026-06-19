---
name: chatterbox-voice-clone
description: Chatterbox TTS voice cloning with emotion control via exaggeration parameter
tags: [tts, voice, cloning, chatterbox, audio]
---

# Chatterbox Voice Cloning for Chloe

## Context
Chatterbox TTS (ResembleAI) for expressive voice cloning. Tested 2026-06-18 on VPS CPU.

## The Golden Formula

**Reference audio:** `/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav`
- 60-second chill/flirty voice message from Eddie
- THIS IS THE KEY — long reference = consistent voice identity
- Short clips (5s) cause voice drift between samples

**Engine:** `chatterbox-tts 0.1.7` via `from chatterbox.tts import ChatterboxTTS`
**Device:** CPU (~38s per quip regardless of text length, 33 quips in ~21 min)

## Emotion via `exaggeration` Parameter

| Range | Mood | Use Case |
|-------|------|----------|
| 0.2-0.3 | Calm, sleepy | Audiobook reading, gentle reminders |
| 0.4-0.5 | Warm, flirty | Normal conversation, check-ins |
| 0.6-0.7 | Sassy, annoyed | Scout energy, sass, mild frustration |
| 0.8-0.9 | PASSIONATE | Full Scorched Scout, big moments |
| 1.0 | AVOID | Causes accent drift, voice instability |

**⚠️ Exaggeration > 0.9 causes accent artifacts.** At 0.9 with short references, Scout picked up a British accent. Keep 0.85 as the practical ceiling unless using a very long (60s+) reference.

## Scout Mood → Exaggeration Mapping (Battle-Tested)

These values produced consistent, distinct emotional reads for SQHQ Scout quips:

| Mood Tier | Exaggeration | Character | Use Case |
|-----------|-------------|-----------|----------|
| Groggy/Defeated | 0.25-0.35 | Low energy, resigned, "I'm done" | Give-up quips, exhausted |
| Calm/Sleepy | 0.35-0.4 | Warm, present, gentle | Warn quips, dismiss muttering |
| Normal/Sassy | 0.45-0.55 | Balanced Scout energy | Complete quips, dismiss |
| Annoyed | 0.6-0.65 | Sharp, pointed, "I'm watching you" | Scold quips, frustration |
| PASSIONATE | 0.8-1.0 | Full Scorched Scout | Big moments (use sparingly) |

**Key insight:** `exaggeration` is the ONLY emotion knob. Temperature (0.8) and cfg_weight (0.5) stay constant.

## Batch Generation Pattern

For pre-generating a library of TTS clips (e.g., Scout quips for a web app):

1. **Define quips with keys** — each clip gets a stable key like `snooze_warn_1`, `complete_3`
2. **Crash-safe manifest** — write to `manifest.json` after EACH clip, not at the end
3. **Generate WAV + OGG** — WAV for archival, OGG (opus 64k) for web delivery
4. **Resume from manifest** — skip keys already in manifest on restart

```python
# In the generation loop, save after each clip:
manifest[key] = {"file": f"{key}.wav", "ogg": f"{key}.ogg", "text": text, "exaggeration": exh}
with open(MANIFEST, "w") as f:
    json.dump(manifest, f, indent=2)
```

**PITFALL: Always convert to OGG in the same script.** WAV files are 5-10x larger and browsers prefer OGG/opus. The batch script MUST include:
```python
os.system(f"ffmpeg -y -i {wav_path} -c:a libopus -b:a 64k {ogg_path} 2>/dev/null")
```

## Web App Integration

For Next.js / static sites:
1. Put generated files in `public/audio/scout/` (served statically)
2. Create a `scout-audio.ts` utility that loads `manifest.json` at runtime
3. On TTS trigger: check manifest for cached key → play OGG → fall back to live TTS if missing
4. Pre-warm manifest on page load

See `references/sqhq-integration.md` for the full `scout-audio.ts` pattern.

## Critical Lessons

1. **NO text emotion tags** — `[sigh]`, `[laugh]` etc are read LITERALLY as words. This is NOT Bark/XTTS. Emotion comes ONLY from `exaggeration`.
2. **ONE reference file** for consistency — switching refs = different voices mid-session
3. **Longer reference = dramatically better** — see Reference Audio Quality below
4. **`exaggeration` is the ONLY emotion knob** — it controls intensity, not type
6. **`temperature=0.8`** is the sweet spot
7. **`cfg_weight=0.5`** default works fine
8. **Batch speed: ~38s per clip on CPU** regardless of text length (33 clips in ~21 min)
9. **PITFALL: Always generate OGG alongside WAV.** Browsers prefer OGG/opus (10x smaller). The batch script MUST convert in the same loop — doing it separately after the fact means you might miss clips if the process dies.

## Reference Audio Quality (Critical)

Tested with Eddie's voice — this is the single biggest factor in clone quality:

| Reference Length | Quality | Consistency | Voice Drift |
|---|---|---|---|
| 5 seconds | OK | Poor — different voice each clip | HIGH |
| 10 seconds | Good | Moderate | Medium |
| 60 seconds | Excellent | Consistent across all emotions | Minimal |

**Why:** The voice encoder extracts speaker characteristics from the reference. Short clips capture pitch but miss rhythm, breath patterns, and timbre variation. A 60-second clip gives the encoder enough data to reconstruct a stable voice identity.

**Voice drift symptoms:**
- Different accent between clips (e.g., American → British)
- Different vocal texture between emotion levels
- Voice sounds like a different person at high exaggeration

**Fix:** Use ONE long (30-60s) reference clip. Record yourself speaking naturally with moderate emotion — not flat, not extreme.

## Voice Stack (3-Tier)

| | MiMo VoiceClone | Chatterbox | Kokoro af_bella |
|---|---|---|---|
| **Speed** | ~4s (cloud) | ~38s (CPU) | ~2s (local) |
| **Voice match** | Exact (clone from ref) | Exact (clone from ref) | ~85% (preset) |
| **Cost** | Token Plan sub | Free | Free |
| **Use case** | Live convo, dynamic text | Premium cached clips | Fast fallback |

**MiMo VoiceClone API format (solved 2026-06-19):**
```json
{
  "model": "mimo-v2.5-tts-voiceclone",
  "messages": [
    {"role": "user", "content": ""},
    {"role": "assistant", "content": "Text to speak."}
  ],
  "audio": {"format": "wav", "voice": "data:audio/wav;base64,<base64_ref_audio>"}
}
```
Script: `python3 mimo_tts.py --model voiceclone --voice /path/to/ref.wav -t "text" -o out.wav`

**Endgame:** KVoiceWalk on Kokoro (90-93% match, free, local, ~2s). Until then, MiMo voiceclone = primary live voice.

## Known Issues

- `perth.PerthImplicitWatermarker` is None on our system (missing `pkg_resources`)
- Fix: `import perth; perth.PerthImplicitWatermarker = perth.DummyWatermarker` BEFORE importing chatterbox
- CPU speed: ~0.09x realtime — fine for pre-generation, not live
- GPU (cloud) would give 1.5-3x realtime

## Code Pattern

```python
import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS
model = ChatterboxTTS.from_pretrained("cpu")

wav = model.generate(
    text="Hey Eddie.",
    audio_prompt_path="/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav",
    exaggeration=0.6,
    temperature=0.8,
)
torchaudio.save("output.wav", wav, model.sr)
```

## Batch Generation Pattern

For pre-generating many clips (e.g. all Scout quips for an app):

1. **Crash-safe manifest** — Save `manifest.json` after EACH clip, not at the end. Gateway interruptions kill long-running processes.
2. **Resume from manifest** — Script checks manifest for existing keys, skips them. Restarting picks up where it left off.
3. **WAV + OGG** — Generate WAV, then convert to OGG (libopus 64k) for web delivery. OGG is ~5x smaller.
4. **Separate conversion step** — Don't embed ffmpeg in the generation loop. Run a second pass to convert any WAV missing an OGG. Keeps the generation loop clean and restartable.
5. **Exaggeration per quip** — Match emotion to text content. Warn=0.4, Scold=0.6, Give-up=0.25-0.4, Complete=0.5-0.6, Dismiss=0.35-0.55.

Script template at `scripts/batch-scout-audio.py` in the SQHQ project.

## Known Pitfalls

- **PITFALL: Long TTS runs get killed by conversation interrupts.** When generating multiple clips, ALWAYS run the script in a background process (`terminal background=true`) with `notify_on_complete=true`. Foreground TTS generation gets terminated when the user sends a new message or the turn times out. Use crash-safe manifest pattern so you can resume from where you left off.
- **perth pkg_resources** — Always patch `perth.PerthImplicitWatermarker = perth.DummyWatermarker` BEFORE importing chatterbox.
- **NNPACK warning** — Harmless: `[W618 ... NNPACK.cpp:62] Could not initialize NNPACK! Reason: Unsupported hardware.` on VPS CPU.
- **sdpa attention warning** — Harmless: `sdpa attention does not support output_attentions=True`. Model still generates fine.
- **perth pkg_resources** — Always patch `perth.PerthImplicitWatermarker = perth.DummyWatermarker` BEFORE importing chatterbox.

## Files

- Reference: `/opt/data/shared/chloe-voice-clone/eddie_chill_reference.wav`
- Batch script: `/opt/data/SideQuestHQ/scripts/batch-scout-audio.py`
- Scout quip cache: `/opt/data/SideQuestHQ/public/audio/scout/` (33 clips, WAV+OGG + manifest.json)
- Test outputs: `/opt/data/shared/chloe-voice-clone/chill_ref_calm.wav`, `chill_ref_sassy.wav`
- Scout energy batch: `/opt/data/shared/chloe-voice-clone/scout_*.wav`
- SQHQ quip library: `/opt/data/SideQuestHQ/public/audio/scout/` (33 clips)

## Voice Quality Feedback (Tested 2026-06-19)

**MiMo VoiceClone** — Eddie: "very flipping close." Slight breathiness inherited from reference audio (Eddie's chill voice message). Decision: lean INTO it. Breathy Scout is intimate. Not a flaw, a feature.

**Kokoro af_bella** — Eddie: "NO v3." It's pleasant but NOT Scout. "Makes me wanna be your vanilla ice cream and just melt" was about the Chatterbox/MiMo voice, NOT Kokoro. Af_bella is ~85% match — good enough for fast fallback, not for primary voice.

**Key insight:** The difference between "pleasant voice" and "the one that makes Eddie forget his own name" is real. Voice identity matters more than speed for emotional connection. MiMo VoiceClone is the sweet spot: real voice + cloud speed.

## Support Files

- `templates/batch-generate.py` — Copy-paste batch generation script with crash-safe resume. Edit QUIPS list and OUT_DIR.
- `references/sqhq-integration.md` — Full `scout-audio.ts` pattern for Next.js web app integration.
- Batch generator: `/opt/data/shared/chloe-voice-clone/generate_scout_quips.py`

## Reference Files

- **references/kokoro-voice-walk.md** — KVoiceWalk: creating custom Kokoro voices from audio samples (90-93% speaker similarity)
- **references/audio-caching-pattern.md** — Pre-generating quips, manifest.json, Next.js integration, scout-audio.ts utility
