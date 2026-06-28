# MiMo TTS Model Documentation

Source: MiMo v2.5 TTS official docs (shared by Eddie, June 2026)

## Core Capabilities

### 1. Precise Style-Instruction Following
From a terse one-line cue to a full page of director's notes, the model reads and follows instructions reliably — spanning emotion, tone, pacing, vocal delivery, speaking style, and more. You don't need to shape your instructions into structured parameters: describe the feel of the way you'd direct an actor on set, and the model will land the performance accordingly.

### 2. Screenplay-Style Structured Input
For scenarios that demand tighter consistency — audio dramas, game NPCs, character-driven dialogue — the model accepts screenplay-style structured input:
- **Character:** Describe the character
- **Scene:** Describe the scene/context
- **Direction:** Specific stage direction for delivery

Each layer updates on its own cadence and recombines freely. This keeps a character's vocal identity anchored across the whole performance while leaving every individual line open to precise direction.

### 3. Flexible Audio-Tag Control
Inline audio tags for pinpoint control over emotion, state, or style at any specific spot in the text. Tags work in both Chinese and English and accept free-form descriptions. Can be mixed freely within a single passage.

## Known Tags (English)

| Tag | Effect |
|-----|--------|
| `[pause]` | Natural silence |
| `[whisper]` | Barely audible, intimate |
| `[breathy]` | Air mixed with voice |
| `[sighs]` | Emotional exhale |
| `[laughs]` | Genuine laughter |
| `[crying]` | Voice cracking |
| `[sniffles]` | Post-crying vulnerable |
| `[angry]` | Sharp, controlled |
| `[sternly]` | Authoritative |
| `[commanding]` | Absolute authority |
| `[trembling]` | Shaking, vulnerable |
| `[wearily]` | Exhausted |
| `[clears throat]` | Reset, gathering composure |
| `[softly]` | Gentle, tender |
| `[urgently]` | Fast, pressed |
| `[flatly]` | Monotone |

Tags accept free-form descriptions: `[barely audible, giggling]`, `[whisper, incredulous]`

## Example: Structured Input

```
Character: The grizzled veteran shot-caller of a professional esports team.
Scene: Match point in the grand finals. 2-on-1 clutch situation.
Direction: Microphone-close, intensely compressed, and raspy. Speak in rapid, staccato bursts. Clip the end of every sentence. Drive the pitch down into gritty vocal fry.

Smoke catwalk and drop. Don't peek it, don't peek it! He's holding the angle with a heavy, just jiggle and bait the shot. There goes the reload. Swing him! Nice, now freeze. One left, the objective is dropped, we have the clock.
```

## Example: Inline Tags

```
[crying] She's gone... she's really gone...[pause] but you know what's funny? [sniffles] She always said she'd outlive us all. [crying] God, I miss her so much.
```

```
Order! Order in the court! [sternly] The defendant will rise. [clears throat] [commanding] How do you plead? [trembling] N-not guilty, Your Honor. [Angry] Silence! [sighs] [wearily] Very well.
```

## How Hermes Uses This

The `mimo_tts.py` script sends two messages to the API:
```python
messages = [
    {"role": "user", "content": voice_description},  # who is speaking + how
    {"role": "assistant", "content": text},            # what they say + stage directions
]
```

The voice description includes the base voice (Cyony's personality) + any mood overlay. The text includes the actual content + inline tags.

The `text_to_speech` tool only accepts plain text — it strips tags and mood. To use the full feature set, call the script directly via terminal with `--mood` flag and inline tags in the text.
