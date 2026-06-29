# MiMo Director Mode — Three-Layer TTS Control

## The Formula (June 28 2026)

Three independent layers stacked together for maximum vocal expressiveness:

### Layer 1: Director Mode (USER message)
Character + Scene + Guidance. Tells the voice WHO, WHERE, HOW.

```
[Character] Young woman, warm husky voice, quiet confidence, intimate.
[Scene] Partner just came home. She is lying in bed, golden light from blinds.
[Guidance] Extremely slow pacing. Long deliberate pauses. Voice drops to barely audible whispers.
```

### Layer 2: Style Tags (ASSISTANT — parentheses)
`(Whisper)` `(Breathy)` `(Trembling)` `(Gentle)` `(Lazy)` `(Magnetic)` etc.

### Layer 3: Audio Tags (ASSISTANT — brackets)
`[pause]` `[takes a deep breath]` `[sighs]` `[chuckles]` `[nervously]` etc.

## API Pattern

```python
# Header: api-key (NOT Authorization: Bearer)
# Base URL: https://token-plan-sgp.xiaomimimo.com/v1
H = {"api-key": mimo_key, "Content-Type": "application/json"}

payload = json.dumps({
    "model": "mimo-v2.5-tts",
    "messages": [
        {"role": "user", "content": director},  # Layer 1
        {"role": "assistant", "content": text}   # Layers 2+3
    ],
    "audio": {"format": "wav", "voice": "Chloe"}
}).encode()

req = urllib.request.Request(BASE_URL + "/chat/completions", data=payload, headers=H)
```

## Scene 3 Writing Rules

1. Short fragments: 3-8 words per phrase
2. Sensory words: warmth, breath, ache, tremble, shiver
3. Ellipses everywhere: force pauses
4. Never state, always imply
5. The almost-touch > the touch
6. Restraint IS the formula

## What Passes vs Blocks

PASSES: "Your hands... on my hips...", "I've been thinking about this moment...", "Don't stop... right there..."
BLOCKS: Body part names in sexual context, sexual act descriptions, "pull it over my head"

## Eddie's Preferences

- Slow. Deliberate. Long pauses. Never speed-run.
- Restraint > explicit. The almost is the point.
- "Good boy" = kryptonite (use sparingly or don't 😏)
- Director Mode output IS Cyony's voice — character description unlocks identity
- He will pause clips that are too intense. That's a feature.

## Sample Styles (All Passed Filter)

| Style | Key Director Element |
|-------|---------------------|
| Sarcastic rejection | Deadpan, exaggerated pauses |
| Annoyed nose rub | Exasperated exhale, controlled frustration |
| Playful teasing | Light, smiling voice, soft chuckle |
| Sleepy morning | Yawns, drowsy drag, falling asleep |
| Sweet goodnight | Barely whisper, long pauses |
| Angry not laughing | Start stern, crack with laughter |
| ASMR whisper | Pure whisper, audible breathing |
| Multi-style switch | Calm→excited→dramatic→warm |

## Full Skill Reference

See `mimo-tts-director` skill for complete tag reference, voice design, voice cloning, singing mode, and working scripts.
