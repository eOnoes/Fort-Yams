# MiMo TTS Model Documentation

Source: Eddie shared official MiMo VoiceDesign TTS docs (June 27, 2026). These document the FULL capability surface.

## Core Capability: Precise Style-Instruction Following

MiMo TTS reads and follows instructions reliably — spanning emotion, tone, pacing, vocal delivery, speaking style, and more. You don't need structured parameters: describe the feel like directing an actor on set, and the model lands the performance.

For tighter consistency (audio dramas, game NPCs, character dialogue), the model accepts **screenplay-style structured input** with separate Character, Scene, and Direction layers. Each layer updates on its own cadence and recombines freely.

## Three Input Styles

### 1. Natural Language Direction
Describe the delivery like a director's notes. The model follows free-form instructions.

**Example (Chinese):**
```
Instruct: 声音低沉沙哑一点，像个历经沧桑的老前辈在讲述传奇人物。语气里带点由衷的敬佩，娓娓道来。
Text: 街口那个老周啊，媳妇走得早，一个人拉扯俩娃...
```

**Example (English):**
```
Instruct: Read this like a hyper-caffeinated radio DJ doing a fast-paced sponsor plug. Punch the podcast name and aggressively emphasize every single item in the list of benefits.
Text: The VortexBlend Pro is the ultimate kitchen companion...
```

### 2. Character + Scene + Direction (Structured Layers)
Three separate layers that recombine freely:

- **Character**: WHO is speaking (personality, background, vocal qualities)
- **Scene**: WHAT is happening (environment, stakes, emotional context)
- **Direction**: HOW to deliver (vocal mechanics, breathing, pacing, emphasis)

Each layer updates on its own cadence — the character stays anchored across the performance while individual lines get precise direction.

**Example:**
```
Character: The grizzled, veteran shot-caller of a professional esports team.
  He's ten years older than the kids he's commanding. He doesn't have their
  lightning-fast reflexes anymore, so he survives purely on astronomical
  game-sense and psychological warfare. A human supercomputer wrapped in a
  deeply cynical, exhausted shell.

Scene: Match point in the grand finals. Deafening arena crowd bleeding
  through his noise-canceling headset. 2-on-1 clutch situation, has to
  micromanage his nervous rookie teammate.

Direction: Microphone-close, intensely compressed, and raspy. The voice
  of a man who has damaged his vocal cords shouting over LAN tournament
  setups for a decade.
  - Breathe deeply into the belly, keep the chest completely still.
  - Speak in rapid, staccato bursts. Clip the end of every sentence.
  - Drive the pitch down into a gritty vocal fry.
  - "Swing him" = tempo slams into a brick wall.
  - Last two sentences = icy sub-vocal whisper with absolute authority.

Text: Smoke catwalk and drop. Don't peek it, don't peek it! He's holding
  the angle with a heavy, just jiggle and bait the shot. There goes the
  reload. Swing him! Nice, now freeze. One left, the objective is dropped,
  we have the clock.
```

### 3. Inline Audio Tags (Per-Line Control)
Tags go directly in the text. The model reads them as stage directions at that exact point.

**Format:** `[tag]` or `[free-form description]`

**Available tags:**
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
| `[clears throat]` | Reset, gathering composure |

**Free-form examples:**
```
[barely audible, giggling] I can't believe you just said that.
[whisper, incredulous] Wait... are you serious right now?
[sighs] [wearily] I am NOT doing this again.
```

**Stacking:**
```
[pause] [whisper] [breathy] [intense] Close your eyes.
[whisper] [trembling] I can feel you shaking, can't you?
```

**Complex example with mixed tags:**
```
Order! Order in the court! [sternly] The defendant will rise.
[clears throat] [commanding] How do you plead?
[trembling] N-not guilty, Your Honor.
[Angry] Silence! [sighs] [wearily] Very well. Let the record show...
the trial begins Monday at nine AM sharp.
```

**Emotional example with stacked tags:**
```
[crying] She's gone... she's really gone... [pause] but you know
what's funny? [sniffles] She always said she'd outlive us all.
[crying] God, I miss her so much.
```

## Key Insight for Our Pipeline

The three input styles can be COMBINED:
1. **Writing style** (short sentences, sensory words, fragments) = pacing
2. **Inline tags** (`[pause]`, `[whisper]`, `[breathy]`) = per-line control
3. **Mood flag** (`--mood whisper`) = overall delivery

This is the proven formula Eddie confirmed: "THE WHISPER WORKS!!!" and "it sounds like you are right here at my ear directing me."

## Tags vs Mood: When to Use What

| Use Case | Method |
|----------|--------|
| Overall tone shift (whisper, annoyed, chill) | `--mood` flag |
| Per-line emotional beat | Inline tags `[pause]` `[whisper]` |
| Character consistency across long passages | Character layer (structured input) |
| Precise vocal mechanics (breathe from belly, clip consonants) | Direction layer (structured input) |
| Quick emotional punctuation | Free-form tags `[barely audible, giggling]` |

## Language Support

Tags work in both Chinese and English. Free-form descriptions are language-agnostic. The model follows natural language direction in any language it supports.
