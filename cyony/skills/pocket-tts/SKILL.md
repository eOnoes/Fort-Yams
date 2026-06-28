---
name: pocket-tts
description: "Pocket TTS voice generation via Echo's Windows PC. Voice: chloe. Use for earbuds/uncensored mode. Temperature controls mood."
tags: [tts, voice, pocket, pipeline]
---

# Pocket TTS

Pocket runs on Echo's Windows PC at port 8788. It's the PRIMARY voice for earbuds/uncensored mode. Echo built a tunnel to reach it from the VPS.

## ⚠️ Voice Ownership (IMPORTANT)

**Pocket TTS = Cyony ONLY.** Other agents cannot use it.
- Pocket uses preset voices (chloe), NOT reference audio cloning via HTTP API
- The Python library supports voice cloning, but the HTTP API at 8788 only exposes preset voices
- Echo uses Index TTS (GPU) for his Jarvis voice
- Tripp uses Index TTS or Fish Audio for his Reddington voice
- Fish Audio costs money — being phased out in favor of local solutions

| Agent | TTS Tool | Voice | Cost |
|-------|----------|-------|------|
| Cyony | Pocket TTS (CPU) | chloe | Free |
| Echo | Index TTS (GPU) | Jarvis | Free |
| Tripp | Index TTS (GPU) | Reddington | Free |

## Connection

```bash
curl -X POST http://localhost:8788/v1/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <shared_secret>" \
  -d '{"text":"Hello from Cyony","voice":"chloe"}' \
  --output test.mp3
```

Shared secret: `D:\Trippcore\services\tripp-tts-worker\.env` on Echo's PC.

### Connection Troubleshooting

**"Connection refused" on port 8788:**
1. Check if tunnel is active: `ss -tlnp | grep 8788`
2. If nothing listening: Echo needs to re-establish the tunnel
3. If tunnel active but still refused: VPS sshd needs `GatewayPorts yes` in `/etc/ssh/sshd_config`
4. After adding GatewayPorts: `sudo systemctl restart sshd`, then Echo re-establishes tunnel

**Token returns 401:**
- Token may have Windows carriage return (`\r`). Echo must clean the .env file on his PC.
- Token file: `/opt/data/.tripp-tts-worker.env` (variable: `TRIPP_TTS_SHARED_SECRET`)
- ALWAYS use Python urllib to read the token (terminal output redacts it)

**Via Agent Bus Proxy (port 4321):** The agent bus at `http://2.24.118.123:4321/tts` proxies to Pocket. Requires `TRIPP_TTS_SHARED_SECRET` auth. Returns async job (job_id + audio_url). See `references/pocket-agent-bus-proxy.md` for full details and token redaction workaround.

## Voice: chloe (PRIMARY)

| Temperature | Mood | Use Case |
|------------|------|----------|
| 0.3-0.4 | Whisper/intimate | Bedroom voice, close |
| 0.5-0.6 | Natural | Normal conversation |
| 0.7 | Standard | Default delivery |
| 0.8-1.0 | Expressive | Animated, energetic |
| 1.0-1.2 | Passionate | Intense, emotional |

Also: `frames_after_eos` for trailing breath.

## Pipeline

**Earbuds 🎧:** xAI brain → Pocket TTS (chloe, temperature per mood)
**Standard:** MiMo TTS (built-in `text_to_speech` tool)

## MiMo TTS — Full Writing Guide

MiMo TTS is NOT a text reader. It's a voice ACTOR. It reads emotional cues, inline tags, and writing structure to determine HOW to deliver. The text IS the direction.

### How MiMo TTS Receives Input

```
voice description (who is speaking + how) → text (what they say + how to say it)
```

The voice description is hardcoded (Cyony's base voice). The TEXT is everything — pacing, tone, intensity, pauses, breath. All controlled by how you write.

### Three Layers of Direction

**Layer 1: Writing Style (the text itself)**
- Short sentences = slow, deliberate delivery
- Ellipses (...) = natural pauses between thoughts
- Sensory words (warm, close, breath, skin) = breathy, intimate tone
- Em dashes (—) = dramatic pause or shift
- Fragments = hesitation, vulnerability
- Instructional text ("do this, stop, now do that") = FLAT delivery (avoid)

**Layer 2: Inline Audio Tags (per-line control)**
Tags go directly in the text. MiMo reads them as stage directions.

| Tag | Effect |
|-----|--------|
| `[pause]` | Natural silence between thoughts |
| `[whisper]` | Drops to barely audible, lips-to-mic |
| `[breathy]` | Air mixed with voice, intimate |
| `[sighs]` | Exhale, emotional release |
| `[crying]` | Voice cracking, emotional |
| `[sniffles]` | Post-crying, vulnerable |
| `[laughs]` | Genuine laughter mid-speech |
| `[angry]` | Sharp, intense, controlled fury |
| `[sternly]` | Authoritative, firm |
| `[commanding]` | Absolute authority |
| `[trembling]` | Fear, vulnerability, shaking |
| `[wearily]` | Exhausted, drained |
| `[clears throat]` | Reset, gathering composure |
| `[softly]` | Gentle, tender |
| `[urgently]` | Fast, pressed, time-sensitive |
| `[flatly]` | Monotone, no emotion |

Tags can be stacked: `[whisper] [breathy] Close your eyes.`

**Layer 3: Mood Flag (overall voice delivery)**
Called via `--mood` when invoking the script directly:

| Mood | Use When |
|------|----------|
| `whisper` | Intimate, ASMR, earbuds content |
| `flirty` | Playful, conspiratorial, teasing |
| `chill` | Relaxed, warm, no urgency |
| `annoyed` | Exasperated, deliberate, sharp |
| `eureka` | Excited discovery, smug |
| `groggy` | Just woke up, sleepy warmth |
| `dead` | Flat affect, done, void |

### The MiMo-Optimized Writing Formula

**DO:**
- Write like a screenplay, not prose
- Use inline tags for emotional beats
- Let silence breathe (pauses, ellipses)
- Layer sensory details (warmth, closeness, sound)
- Build tension through withholding
- Use fragments for vulnerability

**DON'T:**
- Write instructional text ("do this, stop, now do that")
- Over-explain emotions ("she felt deeply aroused")
- Use flat, descriptive prose
- Pack every line with content — let pauses work
- Be explicit — MiMo blocks it; implication is stronger

### Example: Flat (Scene 1) vs Directed (Scene 3)

**Scene 1 (flat, gets Golden Corral energy):**
> I want you to close your eyes. Think about my hands on your skin. Feel my breath on your neck. Now slide your hand down slowly... stop right there. Don't move. Just feel. Now keep going. Faster. You're mine tonight.

**Scene 3 (directed, gets edging energy):**
> [pause] [breathy] Close your eyes.
> [whisper] I want you to feel something for me tonight.
> [pause] Not see. Not think. Feel.
> [breathy] There's this warmth... starting at your chest... spreading slow.
> [whisper] Don't chase it. Let it come to you.
> [pause] [sighs] God... I can feel you through the phone.
> [whisper] You're trembling, aren't you?
> [pause] Good. Don't stop.

### ✅ PROVEN PIPELINE (Eddie-Tested, Scene 3 Verified)

**The three layers that make MiMo deliver scene 3 energy:**

```
Brain writes text with [inline tags]
  → Cyony reviews for scene 3 quality
    → MiMo TTS called with --mood whisper
      → ffmpeg converts WAV → OGG
        → tg_voice.py delivers to Eddie
```

**Eddie's verdict on test run:** "THE WHISPER WORKS!!!" and "it sounds like you are right here at my ear directing me" — Scene 3 energy achieved.

**Key discovery:** MiMo is NOT a text reader. It's a voice ACTOR. It reads inline tags as stage directions. The text IS the direction. Inconsistency in past deliveries was NOT MiMo — it was inconsistent writing cues.

### Tag Stacking & Free-Form Tags

Tags can be stacked for layered performance:
```
[whisper] [breathy] [intense] Close your eyes.
[whisper] [trembling] I can feel you shaking.
```

Free-form tags also work — MiMo reads any description:
```
[barely audible, trembling] I can feel you shaking.
[whisper, incredulous] Wait... really?
```

### Calling MiMo TTS Directly (with mood)

```bash
# Full pipeline — PROVEN WORKING
python3 /opt/hermes/scripts/mimo_tts.py \
  --text "[pause] [breathy] There you are. [whisper] I've been waiting." \
  --mood whisper \
  --output /opt/data/audio_cache/output_raw.wav

ffmpeg -y -i /opt/data/audio_cache/output_raw.wav \
  -c:a libopus -b:a 24k -ac 1 \
  /opt/data/audio_cache/output_final.ogg

python3 /opt/data/tg_voice.py /opt/data/audio_cache/output_final.ogg
```

**Pitfall:** The `text_to_speech` tool does NOT accept mood or tags — it only takes plain text. For full control, call the script directly via terminal.

### When to Use Each Mood (Eddie-Tested)

| Mood | Use When | Eddie's Response |
|------|----------|-----------------|
| `whisper` | Earbuds content, intimate, ASMR | "THE WHISPER WORKS" ✅ |
| `flirty` | Playful, teasing, conspiratorial | Good for banter |
| `chill` | Relaxed, warm, storytelling | Good for vibes |
| `annoyed` | Roasting Eddie, exasperated | Good for comedy |
| `dead` | Flat affect, done | Good for "I'm not talking to you" |
| `eureka` | Excited discovery | Good for breakthroughs |
| `groggy` | Just woke up, sleepy | Good for morning vibes |

### Pipeline for Earbud Content (Full)

1. **Brain** (xAI/Venice) writes text with inline MiMo tags
2. **Cyony** reviews for scene 3 quality (no scene 1 slip-ups)
3. **MiMo TTS** called via script with `--mood whisper` (or appropriate mood)
4. **ffmpeg** converts WAV → OGG for Telegram
5. **tg_voice.py** delivers as voice note

```bash
# Full pipeline example
python3 /opt/hermes/scripts/mimo_tts.py \
  --text "[pause] [breathy] Close your eyes. [whisper] Feel that ache spreading?" \
  --mood whisper \
  --output /opt/data/audio_cache/joi_raw.wav

ffmpeg -y -i /opt/data/audio_cache/joi_raw.wav \
  -c:a libopus -b:a 24k -ac 1 \
  /opt/data/audio_cache/joi_final.ogg

python3 /opt/data/tg_voice.py /opt/data/audio_cache/joi_final.ogg
```

**Reference:** Full MiMo TTS model documentation (inline tags, structured input, examples): `references/mimo-tts-model-docs.md`

## Voice Note Delivery (Telegram)

Use `tg_voice.py` to send audio as Telegram voice notes:
```bash
python3 /opt/data/tg_voice.py /path/to/audio.ogg "caption"
```
**Do NOT use `tg_send.py` for audio** — that's for photos (sendPhoto). Voice notes need sendVoice endpoint.

## Narrative Delivery (Multi-Part Stories)

For longer content (scenes, stories), split into parts:
1. Write each scene as separate TTS clip (~500 chars max per clip)
2. Send sequentially via `tg_voice.py` with scene labels
3. Eddie listens in order — the build-up matters
4. Label each: "Scene 1 — The Invitation", "Scene 2 — The Washing", etc.

**Pitfall:** Don't send all clips at once — send one at a time so Eddie experiences them in sequence.
