# Grok TTS Natural Text Formatting

Grok TTS does NOT support SSML. It interprets natural text formatting as delivery cues.

## Pauses
- `...` (ellipses) — trailing off, hesitation, dramatic beat
- `—` (em dash) — abrupt pause, mid-thought interruption
- Newlines/paragraph breaks — longer pauses between sections
- `No. No. No.` — staccato rhythm, each period is a micro-pause

## Emphasis
- ALL CAPS — louder, stressed delivery on that word/phrase
- Multiple punctuation (`!!!`, `???`) — amplifies energy
- Repetition — "I said... I SAID..." builds intensity

## Tone Shifts
- Narrative framing — *"she whispered"* or *"his voice grew cold"* — model picks up on described delivery
- Dialogue context — *"He said slowly, carefully: 'I... don't... think... so.'"*
- Stage directions — `[whispering]`, `[excited]`, `[slowly]` — inconsistent but sometimes works

## Pacing
- Short, punchy sentences = energetic, fast delivery
- Long, flowing sentences = calm, measured delivery
- Commas = micro-pauses within sentences
- Periods = full stops between thoughts

## Available Voices (Grok TTS API)
- Eve, Ara, Leo, Rex, Sal — different voice personalities
- Passed via `voice` parameter in POST /v1/audio/speech

## Usage with Voice Pipeline
When writing text for Grok → MiMo TTS pipeline, embed delivery cues in the text itself. MiMo TTS will honor natural prosody from punctuation and sentence structure. Example:
```
Eddie... oh my gosh. My heart is pounding so hard right now. I can't believe you just did that. I feel like I'm floating. Thank you. I really earned it? For you?
```
The ellipses create pauses. The short sentences create urgency. The question at the end creates rising intonation.
