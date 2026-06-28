# MiMo TTS API Architecture

## How MiMo TTS Receives Input (Voicedesign Model)

The API uses chat completions format, NOT OpenAI `/v1/audio/speech`:

```json
{
  "model": "mimo-v2.5-tts-voicedesign",
  "messages": [
    {"role": "user", "content": "<voice description + mood overlay>"},
    {"role": "assistant", "content": "<text to speak with inline tags>"}
  ],
  "audio": {"format": "wav", "optimize_text_preview": true}
}
```

**Critical insight:** The "user" message IS the voice direction. The "assistant" message IS the performance. MiMo reads both and combines them.

## How Mood Works

The `--mood` flag appends a mood overlay to the base voice description:

```
Base voice: "Young woman, early to mid-20s. Light and bright..."
Mood overlay: "Right now she is visibly annoyed. Rubbing the bridge..."
Combined: "Young woman, early to mid-20s. Light and bright... Right now she is visibly annoyed..."
```

This combined string becomes the "user" message. The text with inline tags becomes the "assistant" message.

## Why Inline Tags Work

The "assistant" message (the text) is read by MiMo as something the character SHOULD SAY. But MiMo's training includes audio data with natural speech patterns — pauses, breaths, whispers, emotional beats. When it sees `[pause]` or `[whisper]` in the text, it interprets these as performance instructions because they resemble the kind of natural speech markers that appear in training data.

**Key:** MiMo doesn't literally read `[pause]` as a command. It reads the text holistically and the tags influence how it models the speech audio. The tags are more like emotional cues than mechanical instructions.

## Why Writing Style Matters

The text in the "assistant" message is what MiMo actually speaks. Its sentence structure, pacing, and emotional content directly affect the audio output:

- Short sentences → MiMo models slower speech with natural breaks
- Ellipses → MiMo models trailing thoughts with natural pauses
- Sensory words → MiMo models softer, breathier delivery
- Fragments → MiMo models hesitation and vulnerability
- Instructional text → MiMo models flat, reading-aloud delivery

**The writing IS the direction.** MiMo is not just reading text — it's modeling how a person would SPEAK that text. The better the text captures natural speech patterns, the better the performance.

## Token Budget

Voice description (user message) + spoken text (assistant message) share an 8K token context window.

| Voice Desc Length | Max Text (words) | Max Audio |
|---|---|---|
| Full V3 (~230 chars) | ~450 words | ~90 seconds |
| Short (~40 chars) | ~520+ words | ~70+ seconds |

**Safe zone:** ~450 words with full V3 voice description. For longer content, chunk and concatenate with ffmpeg.

## Three Models

| Model | Input Shape | Use Case |
|-------|-------------|----------|
| `mimo-v2.5-tts-voicedesign` | user=voice desc, assistant=text | Custom voice from description |
| `mimo-v2.5-tts-voiceclone` | user=context, assistant=text, audio.voice=data:URL | Clone from audio sample |
| `mimo-v2.5-tts` | user=style prompt, assistant=text, audio.voice=preset name | Preset voices (Chloe, Mia, etc.) |

**Do NOT mix models.** Using voicedesign shape with voiceclone model = error. Each model expects a specific input shape.
