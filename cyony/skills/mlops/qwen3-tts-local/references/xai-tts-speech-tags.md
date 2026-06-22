# xAI TTS — Speech Tags & Status

## API Access
- Works with standard API key (NOT Enterprise)
- Endpoint: `POST https://api.x.ai/v1/audio/speech`
- Model: `grok-tts`
- Field: `voice_id` (not `voice`), field: `input` (not `text`)

## Standard Voices
eve (default), ara, rex, sal, leo

## Speech Tags (confirmed working)
- Actions: `[laugh]`, `[giggle]`, `[chuckle]`, `[pause]`, `[long-pause]`, `[breath]`, `[inhale]`, `[exhale]`, `[sigh]`, `[tsk]`, `[tongue-click]`, `[lip-smack]`
- Wrapping: `<whisper>`, `<soft>`, `<loud>`, `<build-intensity>`, `<decrease-intensity>`

## Blocked
- **Custom Voice Cloning** — requires Enterprise license. Cannot clone Scout's voice into xAI TTS.

## Quality Notes
- Laugh tags work but not perfect — "there but not natural"
- Eve is not Scout — voice mismatch expected
- Standard voices are usable but not personalized

## Status (June 2026)
- Speech tags: ✅ working
- Custom voices: ❌ Enterprise only
- Decision: Use MiMo voiceclone for Scout's main voice. xAI tags for experimental moments if needed.
