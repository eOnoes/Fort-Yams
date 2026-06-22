# xAI TTS API Reference

## Endpoint
- **URL:** `POST https://api.x.ai/v1/audio/speech`
- **Auth:** `Authorization: Bearer $XAI_API_KEY`
- **Model:** `grok-tts`

## Request Format
```json
{
  "model": "grok-tts",
  "input": "Text to speak. Supports [laugh], [giggle], <whisper> tags.",
  "voice_id": "eve"
}
```

**PITFALL:** Field is `voice_id`, NOT `voice`. Field is `input`, NOT `text`. Getting either wrong returns 422 (bad request), not a helpful error.

## Available Voices
| Voice ID | Description |
|---|---|
| `eve` | Default female voice |
| `ara` | Alternative female voice |
| `rex` | Male voice |
| `sal` | Male voice |
| `leo` | Male voice |

## Speech Tags (confirmed working)
- **Inline:** `[laugh]`, `[giggle]`, `[chuckle]`, `[pause]`, `[long-pause]`, `[breath]`, `[inhale]`, `[exhale]`, `[sigh]`, `[tsk]`, `[tongue-click]`, `[lip-smack]`
- **Wrapping:** `<whisper>`, `<soft>`, `<loud>`, `<build-intensity>`, `<decrease-intensity>`

Tags work with standard voices. Laugh/giggle is audible but not perfect — better results when combined with a voice that matches the intended character.

## Custom Voice Cloning
**BLOCKED: Requires Enterprise license.** Standard API key (even paid) returns access denied. Do not attempt without Enterprise tier.

Workaround: Use xAI standard voices for speech tags (laughs, giggles, whispers) and splice with MiMo voiceclone for Scout's main voice in the production pipeline.

## Response
Returns WAV audio (binary). Convert to MP3/OGG with ffmpeg:
```bash
ffmpeg -i output.wav -codec:a libmp3lame -q:a 2 output.mp3
```

## Key Learnings
- API key must have TTS permissions — some keys get 403 "Team is not authorized"
- Standard voices are serviceable but not Scout — they're a different character
- The laugh tag lands better when the voice itself has personality
- Enterprise blocker means xAI TTS is useful for speech tags only, not voice identity
