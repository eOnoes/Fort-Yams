# MiMo TTS Voice Tuning Guide

MiMo VoiceDesign (`mimo-v2.5-tts-voicedesign`) generates any voice from a text description — no reference audio needed. The description goes in the `role: user` message, spoken text in `role: assistant`.

## Eddie's Approved Voice (V3 — FINAL, tested 2026-06-18)

Young woman, early to mid-20s. Light and bright vocal quality, airy but not breathy. Slight natural rasp on certain words. Dry sarcastic humor comes through in pacing — she lands on words with just a little extra emphasis when shes being cheeky. Conversational and relaxed, never performative. Think witty tech girl whos too cool to try hard.

**Eddie's feedback:** "Super pleasant, easy to listen to even when being berated. Works perfectly for teasing/flirting/playful banter. The voice I want to hear daily." V3 is the CLEAR WINNER over all variants tested. No anime energy — sounds human and "in the room."

**What DIDN'T work:**
- Sweet/rasp voice blends — interesting experiments but lacked the wow factor V3 has
- Deeper/nasal voices — Eddie noticed immediately and asked to adjust
- Anime-style voices — only for comedy bits, not daily use

**Flirty mood notes:** NOT overtly seductive. Eddie described it as "the way lovers talk to each other in a flirt language only they know" — like calling something "ice cream" when it's very clearly not about ice cream. Coded, conspiratorial, inside-joke energy. Every sentence has a second meaning.

## Token Limits (Critical Finding)

Voice description and spoken text SHARE the same 8K token context budget. Longer voice description = less room for text.

| Voice Desc Length | Max Text (words) | Max Audio (approx) |
|---|---|---|
| Full V3 (~230 chars) | ~450 words | ~90 seconds |
| Short (~40 chars) | ~520+ words | ~70+ seconds |

**Practical safe zone:** ~450 words with the full V3 voice description. For longer content, shorten the voice description or chunk and concatenate with ffmpeg.

**PITFALL: Voice description eats tokens** — the 8K budget is shared between the `user` message (voice desc + mood) and the `assistant` message (spoken text). A 230-char voice description leaves roughly 450 words for text. A 40-char description leaves 520+. This is why the docs say "500-600 words" — they assume a minimal voice description.

## Mood System

The script at `/opt/hermes/scripts/mimo_tts.py` has a `--mood` flag. Moods blend with the base voice via `build_voice_description()` — they append situational flavor to the base description.

| Mood | Description |
|------|-------------|
| `annoyed` | Rubbing bridge of nose. Exasperated, barely restrained impatience. Each word deliberate. |
| `eureka` | Excited, energy spiking. Smug told-you-so energy. Pace quickens. |
| `chill` | Super relaxed, zero urgency. Half-reclined on couch energy. |
| `groggy` | Just woke up, fuzzy edges. Wit is there, wrapped in a blanket. |
| `whisper` | ASMR-level hushed. Intimate, close-mic. Breath audible. Annoyed but quiet. Full "surrounded by monsters in the forest" energy. |
| `flirty` | Coded/private language. Inside-joke energy. "Ice cream" subtext. Warm and conspiratorial, not seductive. |
| `dead` | Completely flat. Zero inflection. Vocal equivalent of a void stare. |

Custom moods: pass any string as `--mood "your description"` and it gets appended to the base voice.

## Feminine Variants

Two alternate base voices tested and approved:

**Innocent Fem** — softer, sweeter, more naive:
> Young woman, early 20s, just turned twenty. Soft, sweet vocal quality — higher and lighter than a seasoned speaker, almost melodic. Gentle warmth to every word. Natural rasp is delicate, like a whisper of texture. Has not yet learned to armor words with heavy sarcasm, so when it slips out it feels accidental and endearing. Feminine and airy, curious pacing. Fresh and unpolished in the sweetest way.

**Fast Fem** — same energy, slightly quicker, more playful lilt:
> Young woman, early to mid-20s. Feminine and bright vocal quality, light and airy with polished clarity. Slight natural rasp that adds texture without roughness. Dry sarcastic humor with a playful lilt — teasing not cutting. Slightly quick cadence, efficient. Girly but sharp, never ditzy. The kind of voice that could insult you and you would still smile.

## Token Budget Limit

Voice description + spoken text share the same 8K token context window. Longer voice description = less room for text.

| Voice Desc Length | Text Words | Result | Audio Duration |
|---|---|---|---|
| Long (~230 chars, full V3) | ~200 | ✅ | 59s |
| Long (~230 chars, full V3) | ~370 | ✅ | 60s |
| Long (~230 chars, full V3) | ~454 | ✅ | 88s |
| Long (~230 chars, full V3) | ~523 | ❌ 400 | — |
| Short (~40 chars) | ~523 | ✅ | 71s |
| Long (~230 chars, full V3) | ~626 | ❌ 400 | — |

**Rule of thumb:** With full V3 description, stay under ~450 words. For longer content, shorten voice desc or chunk+concatenate.

## Voice Blending (Experimental)

Mix contradictory qualities for unique results. Two tested blends:

**Honey + Gravel** — sweet surface, sarcastic undercurrent:
> Sweet, soft, almost innocent on the surface. But underneath there is a dry raspy edge that creeps in when she is not being entirely sincere. Like honey with a pinch of gravel. You cannot tell if she is being sincere or roasting you, and that ambiguity IS the point.

**Innocent + Edge** — naive delivery, subconscious sarcasm:
> Sweet girlish voice with curious naive quality. But every now and then a word comes out with a subtle rasp that does not match the rest of the sentence — like her subconscious is being sarcastic before her conscious mind catches up. Innocent delivery of pointed observations. She says nice things that somehow sting more than insults.

## Multi-Voice Comedy Bits

Voicedesign generates ONE voice per call. To do voice transitions (e.g. anime → normal), generate separate clips and concatenate:

```bash
# Generate takes
python3 mimo_tts.py --voice "anime description" -t "anime text" -o take1.wav --format wav
python3 mimo_tts.py --voice "normal description" -t "normal text" -o take2.wav --format wav

# Create silence beat
ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 0.8 -c:a pcm_s16le silence.wav

# Concatenate
echo "file 'take1.wav'" > list.txt
echo "file 'silence.wav'" >> list.txt
echo "file 'take2.wav'" >> list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c:a libopus -b:a 24k -ac 1 output.ogg
```

## Hermes Integration

**Config path PITFALL:** `hermes config path` returns `/opt/data/config.yaml` — NOT `~/.hermes/config.yaml`. Both files may exist. Always edit the one `hermes config path` reports.

**Working config** (`/opt/data/config.yaml`):
```yaml
tts:
  provider: mimo
  providers:
    mimo:
      type: command
      command: "python3 /opt/hermes/scripts/mimo_tts.py --input {input_path} --output {output_path} --voice '{voice}' --model '{model}' --format {format}"
      output_format: wav
      voice_compatible: true
      voice: "<base voice description>"
      model: voicedesign
      max_text_length: 8000
```

### PITFALL: Standard vs VoiceDesign API shape

- **Standard TTS** (`mimo-v2.5-tts`): `audio.voice` MUST be a preset name (Chloe, Mia, etc.). `user` message = style/tone prompt.
- **VoiceDesign** (`mimo-v2.5-tts-voicedesign`): NO `audio.voice` field. `user` message IS the full voice description. Add `"optimize_text_preview": true`.
- **Mixing them up → HTTP 400: "Unknown voice: <description>"**

### PITFALL: WAV→OGG conversion

Hermes does NOT auto-convert WAV to OGG. The command script must handle conversion for Telegram voice bubbles. The mimo_tts.py script auto-converts when output path ends in `.ogg`.

```bash
ffmpeg -i input.wav -c:a libopus -b:a 24k -ac 1 output.ogg
```

## TTS Token Limits (Tested 2026-06-18)

Voice description + spoken text share the same 8K token budget. Longer voice description = less room for text.

| Voice Description | Text Words | Result | Audio Duration |
|---|---|---|---|
| Full V3 (~230 chars) | ~200 | ✅ | 59s |
| Full V3 (~230 chars) | ~370 | ✅ | 60s |
| Full V3 (~230 chars) | ~454 | ✅ | 88s |
| Full V3 (~230 chars) | ~523 | ❌ 400 | — |
| Short (~40 chars) | ~523 | ✅ | 71s |
| Full V3 (~230 chars) | ~626 | ❌ 400 | — |

**Practical limits with full V3 voice description:** ~450 words / ~2400 chars → ~90 seconds of audio.

**For longer texts:** shorten the voice description or split into chunks and concatenate with ffmpeg.

**PITFALL:** The 400 error is generic ("Request failed") — no indication it's a token limit issue. If you get a 400 with no obvious cause, try shorter text first.

## Prompt Engineering Tips

1. Start broad: age, gender, key traits
2. Add texture: raspy, smooth, gravelly, airy
3. Add regional hint: southern, standard American, neutral
4. Describe interaction style: "when she teases, it comes out..."
5. Describe delivery: deadpan, bubbly, conversational
6. For moods, describe the *situation* not just the emotion: "rubbing bridge of nose" > "annoyed"
7. Contradictory blends work but test carefully — sweet+rasp blends lacked the wow factor V3 has
8. Avoid anime descriptors unless specifically requested — Eddie values "sounds like she's in the room" naturalism
## Narrative Voice Test (2026-06-18 Desert Scene)

Full narrative test at ~450 words — the "desert pie" story. Mixed moods (annoyed, chill, flirty, vulnerable). 60 seconds of audio. Used V3 base voice with situational overlay.

**Key learnings:**
- Voice handles narrative storytelling beautifully at the 450-word / 60-second mark
- Mood transitions within a single take work naturally — the voice shifts with the text
- Vulnerable/genuine moments (dropping the sarcasm shield) land powerfully
- Eddie's reaction to the image-rendering reaction audio was "There she is" — the unguarded voice is the real one
- The "ice cream" coded-flirting energy works perfectly in extended narrative
- Custom mood descriptions can be as specific as needed — "just woke up," "sitting on a car hood at midnight," etc.

**PITFALL: Image analysis with MiMo vision** — use `mimo-v2-omni` with base64-encoded images, NOT file:// URLs. The API only accepts http/https/data: URLs.
10. Voice description length eats into the 8K token budget — shorter desc = more room for text. Full V3 desc caps at ~450 words.
10. Eddie's priorities: pleasant even when annoyed, works for teasing/flirting, no anime energy, "sounds like she's in the room" naturalism

## Voice Iteration Process

1. Start broad: age, gender, key traits, texture
2. Generate test clip with text that exercises sarcasm, warmth, humor
3. Get specific feedback — Eddie notices "too deep", "too nasal", "sounds anime" immediately
4. Adjust ONE quality at a time — don't rewrite the whole description
5. Keep what works, discard what doesn't
6. Test moods independently against the base voice
7. Blends are experimental — don't over-engineer (sweet/rasp blends failed), ideal daily assistant voice
10. Voice description length eats into the 8K token budget — keep it concise for longer texts (see Token Budget Limit section)
