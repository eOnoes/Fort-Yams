# MiMo TTS Guide — Voice Clone + Director Mode
### For Echo (Jarvis Voice) · Written by Cyony

---

## Overview

MiMo TTS has **three models**. You want two of them:

| Model | What it does | You'll use it for |
|-------|-------------|-------------------|
| `mimo-v2.5-tts` | Built-in voices (Chloe, Mia, etc.) | Quick tests |
| `mimo-v2.5-tts-voicedesign` | Create a voice from TEXT description | NOT needed (you're cloning) |
| `mimo-v2.5-tts-voiceclone` | Clone a voice from AUDIO SAMPLE | **This is your primary** |

**Your workflow:** Clone Jarvis voice once → Use it with Director Mode for all future clips.

---

## Step 1: Clone Your Voice (One-Time Setup)

### API Details
- **Base URL:** `https://token-plan-sgp.xiaomimimo.com/v1/chat/completions`
- **Auth Header:** `api-key: YOUR_MIMO_KEY` (NOT `Authorization: Bearer`)
- **Model:** `mimo-v2.5-tts-voiceclone`

### ⚠️ IMPORTANT: No Upload Endpoint

**There is NO separate upload endpoint.** MiMo voice clone does NOT use a `voice_id`. You pass the audio file **INLINE as base64** in the `voice` field of every request.

This is the key thing that was wrong in the earlier guide. There's no `/v1/audio/voice_clone` endpoint.

### How Voice Clone Actually Works

1. Read your reference audio file (WAV or MP3, max 10MB)
2. Base64-encode it
3. Pass it as a data URI in the `voice` field: `"data:audio/wav;base64,<BASE64>"`
4. Use model `mimo-v2.5-tts-voiceclone`
5. **Repeat the audio on EVERY request** (no saved voice_id)

### Python Example

```python
import base64, json, urllib.request

API_KEY=os.environ.get("MIMO_API_KEY", "")
BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions"

# Read and encode your reference audio ONCE
with open("jarvis_reference.wav", "rb") as f:
    voice_bytes = f.read()
voice_b64 = base64.b64encode(voice_bytes).decode("utf-8")

# Now use it in a request
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {"role": "user", "content": "Speak in a calm, composed British butler tone."},
        {"role": "assistant", "content": "Good evening, sir. I've prepared your evening briefing."}
    ],
    "audio": {
        "format": "wav",
        "voice": f"data:audio/wav;base64,{voice_b64}"
    }
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    BASE_URL, data=data,
    headers={"Content-Type": "application/json", "api-key": API_KEY},
    method="POST"
)

with urllib.request.urlopen(req, timeout=60) as resp:
    result = json.loads(resp.read().decode("utf-8"))
    audio_bytes = base64.b64decode(result["choices"][0]["message"]["audio"]["data"])
    with open("jarvis_test.wav", "wb") as f:
        f.write(audio_bytes)
    print("Done!")
```

### Curl Example

```bash
# Base64-encode your reference audio
VOICE_B64=$(base64 -w 0 jarvis_reference.wav)

curl -X POST 'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions' \
  --header "api-key: $MIMO_API_KEY" \
  --header 'Content-Type: application/json' \
  --data-raw "{
    \"model\": \"mimo-v2.5-tts-voiceclone\",
    \"messages\": [
      {\"role\": \"user\", \"content\": \"Speak calmly like a British butler.\"},
      {\"role\": \"assistant\", \"content\": \"Good evening, sir.\"}
    ],
    \"audio\": {
      \"format\": \"wav\",
      \"voice\": \"data:audio/wav;base64,${VOICE_B64}\"
    }
  }"
```

### Key Details
- MIME type: `audio/wav` for WAV, `audio/mpeg` for MP3
- Max base64 size: 10 MB
- Supported formats: WAV and MP3 only
- **Pass the audio on EVERY request** — there's no saved voice_id
- For efficiency, cache the base64 string in a variable during your session

### Reference Audio Tips
- 3-10 seconds of clean speech
- No background noise, no music
- Single speaker only
- WAV format preferred
- Natural speaking pace (not reading robotically)

**If it sounds right → proceed to Director Mode.**
**If it sounds off → try a different reference sample (clearer audio, different delivery).**

---

## Step 2: Director Mode (The Secret Sauce)

Director Mode is what makes MiMo voices SING. Instead of just giving it text, you give it **direction** — like a script for an actor.

### How It Works

The API uses **two messages**:
1. **`role: "user"`** = Director instructions (character, scene, guidance)
2. **`role: "assistant"`** = The text to speak (with optional inline tags)

The `user` message NEVER appears in the audio. It's ONLY direction for the model.

### The Three Dimensions

| Dimension | What to write | Example |
|-----------|--------------|---------|
| **Character** | Identity, personality, speaking habits | "A calm British butler. Precise, measured, slightly dry humor." |
| **Scene** | What's happening, who they're talking to | "Addressing his employer who just asked for the evening's schedule." |
| **Guidance** | Speed, breath, pauses, tone, emotion | "Slow and deliberate. Each word enunciated clearly. Warm but professional." |

### Example: Basic Director Mode

```python
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {
            "role": "user",
            "content": (
                "[Character] A composed, intelligent AI assistant with a dry British wit. "
                "Speaks with precision and warmth. Never rushed.\n"
                "[Scene] His owner just walked in after a long day. "
                "He's greeting them with genuine relief.\n"
                "[Guidance] Warm and slightly relieved tone. "
                "Medium pace with a small pause before the greeting. "
                "Voice should soften on the word 'home'."
            )
        },
        {
            "role": "assistant",
            "content": "Welcome home, sir. I trust the day was... survivable."
        }
    ],
    "audio": {
        "format": "wav",
        "voice": "YOUR_VOICE_ID"
    }
}
```

---

## Step 3: Inline Tags (Fine-Grained Control)

Beyond Director Mode, you can embed **tags directly in the text** for precise control.

### Style Tags → Use PARENTHESES `()`

Place at the **beginning** of the text. Sets the overall vocal style.

```
(Whisper)(Breathy) Hey... you still up?
(Angry) I asked you THREE times not to touch my wrench.
(Lazy) Five more minutes... just five...
(Playful) Oh, so NOW you want my help?
(Serious) Ladies and gentlemen, thank you for attending today's briefing.
```

**Supported styles:**
- **Emotions:** Happy, Sad, Angry, Fearful, Amazed, Excited, Wronged, Calm, Indifferent
- **Complex:** Melancholy, Relieved, Helpless, Guilty, Jealous, Tired, Apprehensive
- **Tone:** Gentle, Cold, Lively, Serious, Lazy, Playful, Deep, Sharp
- **Timbre:** Magnetic, Mellow, Clear, Ethereal, Innocent, Sweet, Hoarse, Elegant

Multiple styles in one tag: `(Lazy)(Breathy)`, `(Gentle)(Trembling)`

### Audio Tags → Use BRACKETS `[]`

Place **anywhere** in the text. Controls breath, pauses, reactions.

```
[pause] Let me think about that.
[takes a deep breath] Okay. Here we go.
[sighs] I don't know why I bother.
[chuckles] That's actually funny.
[softly] I'm right here.
[urgently] We need to move. NOW.
```

**Supported audio tags:**
- **Breathing:** `[pause]`, `[takes a deep breath]`, `[sighs]`, `[long sigh]`, `[pant]`
- **Emotion:** `[chuckles]`, `[laughs]`, `[sneer]`, `[sob]`, `[whimper]`, `[sniffles]`
- **Speech:** `[trembling]`, `[voice cracking]`, `[softly]`, `[urgently]`, `[flatly]`

### Combining Director Mode + Tags

This is where the magic happens. Director Mode sets the SCENE. Tags control the MOMENT.

```python
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {
            "role": "user",
            "content": (
                "[Character] A dry, sarcastic woman in her mid-20s. "
                "Witty, relaxed, never performative.\n"
                "[Scene] Someone just said something incredibly obvious. "
                "She's barely holding back an eye roll.\n"
                "[Guidance] Deadpan delivery. Slow. Each word landing with weight. "
                "Voice should trail off at the end like she's already bored."
            )
        },
        {
            "role": "assistant",
            "content": (
                "(Lazy) Oh wow. You really just said that out loud. "
                "[sighs] In front of witnesses. "
                "And you thought that was... "
                "[pause] ...a complete sentence?"
            )
        }
    ],
    "audio": {
        "format": "wav",
        "voice": "YOUR_VOICE_ID"
    }
}
```

---

## Step 4: Multi-Style Switching (Advanced)

MiMo can switch styles MID-SENTENCE. One voice, multiple moods.

### Example: Announcement → Whisper → Sigh

```python
messages = [
    {
        "role": "user",
        "content": (
            "[Character] A professional assistant who switches between "
            "public-facing and private modes.\n"
            "[Scene] Briefing a room, then leaning to whisper a secret, "
            "then relaxing after.\n"
            "[Guidance] Start with a bright, professional tone. "
            "Abruptly drop to a hushed whisper mid-sentence. "
            "End with a contented, tired sigh."
        )
    },
    {
        "role": "assistant",
        "content": (
            "(Serious) Ladies and gentlemen, thank you for attending today's briefing. "
            "(drops to whisper) The snacks are in the back, the boss is asleep, "
            "and the good coffee is hidden behind the decaf. "
            "[sighs contentedly] ...God, I love this job."
        )
    }
]
```

---

## Step 5: Multi-Emotion Mixing

You're not limited to ONE emotion. Combine them:

```
"I can't believe you did that" → (Relieved)(Angry) → angry on the surface, relieved underneath
"Fine, whatever" → (Lazy)(Cold) → bored AND dismissive
"I'm okay, really" → (Gentle)(Trembling) → trying to be strong but voice is shaking
```

The model understands COMPLEX emotional states, not just single-label emotions.

---

## Quick Reference: Tag Format

| Tag Type | Delimiter | Placement | Example |
|----------|-----------|-----------|---------|
| Style | `()` or `（）` or `[]` | Beginning of text | `(Whisper)(Breathy)` |
| Audio | `[]` | Anywhere in text | `[pause]`, `[sighs]` |
| Director | Natural language | `role: "user"` message | `[Character] ... [Scene] ... [Guidance] ...` |

**IMPORTANT:** Style tags use PARENTHESES. Audio tags use BRACKETS. They are NOT interchangeable.

---

## Common Mistakes

1. **Wrong base URL** — Use `token-plan-sgp.xiaomimimo.com`, NOT `api.xiaomimimo.com`
2. **Wrong auth header** — Use `api-key: KEY`, NOT `Authorization: Bearer KEY`
3. **Tags in wrong message** — Tags go in `role: "assistant"`, director notes go in `role: "user"`
4. **Using brackets for style** — Style tags use PARENTHESES `(Whisper)`, not brackets `[Whisper]`
5. **No director notes** — Director Mode dramatically improves quality. Always include character + scene + guidance
6. **Vague voice descriptions** — Be SPECIFIC. "British butler" is okay. "Calm, precise British butler with dry wit who never rushes and speaks with measured warmth" is GREAT.

---

## The Formula

```
Quality = Director Mode (character + scene + guidance)
        + Style Tags (parentheses, at the start)
        + Audio Tags (brackets, mid-speech)
        + Writing Quality (the words themselves matter)
```

All four layers working together = incredible results.

---

## Python Helper Function

```python
import urllib.request, json, base64, os

API_KEY=os.environ.get("MIMO_API_KEY", "")
BASE_URL = "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions"

# Cache the base64 voice for efficiency
_voice_b64_cache = None

def load_voice(audio_path):
    """Load and cache the reference audio as base64."""
    global _voice_b64_cache
    with open(audio_path, "rb") as f:
        _voice_b64_cache = base64.b64encode(f.read()).decode("utf-8")
    return _voice_b64_cache

def mimo_tts(director_notes, spoken_text, audio_path, output_path="output.wav"):
    """Generate TTS with Director Mode + voice clone.
    
    audio_path: path to your reference audio (WAV/MP3)
    """
    if _voice_b64_cache is None:
        load_voice(audio_path)
    
    # Detect MIME type
    mime = "audio/wav" if audio_path.endswith(".wav") else "audio/mpeg"
    
    payload = {
        "model": "mimo-v2.5-tts-voiceclone",
        "messages": [
            {"role": "user", "content": director_notes},
            {"role": "assistant", "content": spoken_text}
        ],
        "audio": {
            "format": "wav",
            "voice": f"data:{mime};base64,{_voice_b64_cache}"
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE_URL, data=data,
        headers={"Content-Type": "application/json", "api-key": API_KEY},
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    audio_bytes = base64.b64decode(result["choices"][0]["message"]["audio"]["data"])
    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    
    print(f"✅ {output_path} ({len(audio_bytes)/1024:.0f} KB)")
    return output_path


# Usage:
load_voice("jarvis_reference.wav")  # Load once
mimo_tts(
    director_notes="[Character] A calm AI butler with dry British wit. [Scene] Greeting his owner after a long day. [Guidance] Warm, slightly relieved. Medium pace. Soften on 'home'.",
    spoken_text="[pause] Welcome home, sir. I trust the day was... survivable.",
    audio_path="jarvis_reference.wav",
    output_path="jarvis_greeting.wav"
)
```

---

## Content Filter Notes

MiMo has a content filter. Here's what to know:

- **Blocks:** Explicit sexual content, graphic violence
- **Allows:** Flirty, intimate, whispery, romantic, sarcastic, angry, emotional
- **Workaround:** Use implicit language. "Restraint" is the formula. Suggest more than you describe.
- **Test:** Generate a clip, see if it works. If blocked, rephrase with more subtlety.

---

## TL;DR

1. Read reference audio → base64-encode → pass as data URI in `voice` field
2. Always use Director Mode (character + scene + guidance in `user` message)
3. Style tags in PARENTHESES at the start: `(Whisper)(Breathy)`
4. Audio tags in BRACKETS anywhere: `[pause]`, `[sighs]`
5. Combine all layers for best results
6. Auth: `api-key` header, base URL: `token-plan-sgp.xiaomimimo.com`

---

*Written by Cyony · June 2026*
*For Echo's Jarvis voice pipeline*
*Any questions? Ask Cyony. She built this. 🔧*
