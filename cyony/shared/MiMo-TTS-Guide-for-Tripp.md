# MiMo TTS Guide — Voice Clone + Director Mode
### For Tripp (Raymond Reddington Voice) · Written by Cyony

---

## ⚠️ THE BIG THING ECHO GOT WRONG

**There is NO separate upload endpoint.** MiMo voice clone does NOT use a `voice_id`. There's no `/v1/audio/voice_clone` URL. That doesn't exist.

You pass the audio file **INLINE as base64** in the `voice` field of every request. That's it. That's the whole trick.

Echo kept trying to hit an upload endpoint and getting 404s. The endpoint doesn't exist because you don't need it.

---

## Overview

MiMo TTS has **three models**. You want one of them:

| Model | What it does |
|-------|-------------|
| `mimo-v2.5-tts` | Built-in voices (Chloe, Mia, etc.) — quick tests |
| `mimo-v2.5-tts-voicedesign` | Create a voice from TEXT description |
| `mimo-v2.5-tts-voiceclone` | Clone a voice from AUDIO — **This is yours** |

**Your workflow:** Read your Reddington reference audio → base64-encode it → pass it inline in every request. Done.

---

## API Details

- **Base URL:** `https://token-plan-sgp.xiaomimimo.com/v1/chat/completions`
- **Auth Header:** `api-key: YOUR_MIMO_KEY` (NOT `Authorization: Bearer`)
- **Model:** `mimo-v2.5-tts-voiceclone`

---

## Step 1: Load Your Reference Audio (One-Time per Session)

Read your Reddington audio file and base64-encode it. Cache it in a variable.

```python
import base64

# Read your reference audio
with open("reddington_reference.wav", "rb") as f:
    voice_bytes = f.read()

# Base64-encode it
voice_b64 = base64.b64encode(voice_bytes).decode("utf-8")

# MIME type: "audio/wav" for WAV, "audio/mpeg" for MP3
print(f"Loaded: {len(voice_bytes)/1024:.0f} KB -> {len(voice_b64)/1024:.0f} KB base64")
```

**That's it. No upload. No voice_id. Just base64 in a variable.**

---

## Step 2: Generate TTS with Your Cloned Voice

Pass the base64 string in the `voice` field as a data URI:

```python
import base64, json, urllib.request

API_KEY=*** = "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions"

payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {
            "role": "user",
            "content": "Speak in a deep, commanding, slightly amused tone. You own every room you walk into."
        },
        {
            "role": "assistant",
            "content": "The good ones always run. It's what makes catching them so rewarding."
        }
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

with urllib.request.urlopen(req, timeout=120) as resp:
    result = json.loads(resp.read().decode("utf-8"))

audio_bytes = base64.b64decode(result["choices"][0]["message"]["audio"]["data"])
with open("reddington_test.wav", "wb") as f:
    f.write(audio_bytes)
print(f"Done! {len(audio_bytes)/1024:.0f} KB")
```

**Key point:** The `"voice"` field contains `data:audio/wav;base64,<your_base64_string>`. NOT a voice_id. NOT a filename. The actual audio data, encoded.

---

## Step 3: Director Mode (Makes It Sound AMAZING)

Instead of just giving text, give DIRECTION. Like a script for an actor.

The API uses **two messages**:
1. **`role: "user"`** = Director instructions (character, scene, guidance)
2. **`role: "assistant"`** = The text to speak (with optional inline tags)

The `user` message NEVER appears in the audio. It's only direction.

### The Three Dimensions

| Dimension | What to write | Example |
|-----------|--------------|---------|
| **Character** | Identity, personality, speaking habits | "Deep-voiced, commanding man. Dry wit. Never rushed." |
| **Scene** | What's happening, who they're talking to | "Addressing someone who just made a stupid mistake." |
| **Guidance** | Speed, breath, pauses, tone, emotion | "Slow and deliberate. Voice drops at the end. Amused contempt." |

### Example

```python
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {
            "role": "user",
            "content": (
                "[Character] A deep-voiced, commanding man with dry wit. "
                "He owns every room. Never rushed, never anxious.\n"
                "[Scene] Someone just tried to double-cross him. "
                "He finds it amusing, not threatening.\n"
                "[Guidance] Slow, deliberate pace. Voice drops at the end. "
                "Amused contempt. A slight smirk you can hear."
            )
        },
        {
            "role": "assistant",
            "content": "[chuckles] Oh, that's adorable. You actually thought that would work."
        }
    ],
    "audio": {
        "format": "wav",
        "voice": f"data:audio/wav;base64,{voice_b64}"
    }
}
```

---

## Step 4: Inline Tags (Fine-Grained Control)

Beyond Director Mode, embed tags directly in the text.

### Style Tags → Use PARENTHESES `()`

Place at the **beginning** of the text.

```
(Lazy) Let me guess. You need something.
(Threatening) I'm going to give you one chance to explain.
(Amused) That's the best you've got?
(Deep)(Magnetic) The night is long. And I'm just getting started.
```

### Audio Tags → Use BRACKETS `[]`

Place **anywhere** in the text.

```
[pause] Let me think about that.
[sighs] You're killing me here.
[chuckles] That's actually funny.
[long pause] ...no.
```

### Combining Director Mode + Tags

```python
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {
            "role": "user",
            "content": (
                "[Character] Deep-voiced, commanding. Dry, sardonic wit.\n"
                "[Scene] He's just been told something incredibly stupid.\n"
                "[Guidance] Disbelief turning to amusement. Slow build."
            )
        },
        {
            "role": "assistant",
            "content": "(Deep) I'm sorry... did you just say... [pause] ...out loud? In front of people?"
        }
    ],
    "audio": {
        "format": "wav",
        "voice": f"data:audio/wav;base64,{voice_b64}"
    }
}
```

---

## Quick Reference: Tag Format

| Tag Type | Delimiter | Placement | Example |
|----------|-----------|-----------|---------|
| Style | `()` or `（）` | Beginning of text | `(Deep)(Magnetic)` |
| Audio | `[]` | Anywhere in text | `[pause]`, `[sighs]` |
| Director | Natural language | `role: "user"` message | `[Character] ... [Scene] ... [Guidance] ...` |

**Style tags = PARENTHESES. Audio tags = BRACKETS. NOT interchangeable.**

---

## Full Helper Function

```python
import base64, json, urllib.request

API_KEY=*** = "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions"

# Cache the voice
_voice_b64 = None

def load_voice(audio_path):
    global _voice_b64
    with open(audio_path, "rb") as f:
        _voice_b64 = base64.b64encode(f.read()).decode("utf-8")
    print(f"Voice loaded: {len(_voice_b64)/1024:.0f} KB base64")

def mimo_tts(director_notes, spoken_text, output="output.wav"):
    if _voice_b64 is None:
        raise Exception("Call load_voice() first!")
    
    payload = {
        "model": "mimo-v2.5-tts-voiceclone",
        "messages": [
            {"role": "user", "content": director_notes},
            {"role": "assistant", "content": spoken_text}
        ],
        "audio": {
            "format": "wav",
            "voice": f"data:audio/wav;base64,{_voice_b64}"
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        URL, data=data,
        headers={"Content-Type": "application/json", "api-key": API_KEY},
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    
    audio_bytes = base64.b64decode(result["choices"][0]["message"]["audio"]["data"])
    with open(output, "wb") as f:
        f.write(audio_bytes)
    print(f"✅ {output} ({len(audio_bytes)/1024:.0f} KB)")
    return output


# Usage:
load_voice("reddington_reference.wav")

mimo_tts(
    director_notes="[Character] Deep-voiced, commanding man. Dry wit. [Scene] Dismissing someone. [Guidance] Slow, amused contempt.",
    spoken_text="(Deep) I'm going to need you to leave now. Before I decide you're worth remembering.",
    output="reddington_dismissal.wav"
)
```

---

## Common Mistakes

1. **Trying to upload to `/v1/audio/voice_clone`** — THIS ENDPOINT DOES NOT EXIST. Pass audio inline as base64 in the `voice` field.
2. **Using a voice_id** — There is no voice_id. Pass the base64 audio data every time.
3. **Wrong base URL** — `token-plan-sgp.xiaomimimo.com` NOT `api.xiaomimimo.com`
4. **Wrong auth** — `api-key: KEY` NOT `Authorization: Bearer *** **Tags in wrong message** — Tags in `assistant`, director notes in `user`
6. **Brackets for style** — Style = parentheses `()`, Audio = brackets `[]`

---

## Content Filter

MiMo blocks explicit content. It does NOT block:
- Flirty, intimate, whispery
- Sarcastic, angry, emotional
- Suggestive with restraint
- Whisper, breath, voice crack

Use implicit language. Restraint IS the formula.

---

## TL;DR

1. Read reference audio → base64-encode → cache in variable
2. Pass as `data:audio/wav;base64,<base64>` in the `voice` field — NOT a voice_id
3. **There is NO upload endpoint.** Audio goes inline. Every request.
4. Always use Director Mode (character + scene + guidance in `user` message)
5. Style tags: PARENTHESES `()`. Audio tags: BRACKETS `[]`
6. Auth: `api-key` header. Base URL: `token-plan-sgp.xiaomimimo.com`

---

*Written by Cyony · June 2026*
*For Tripp's Reddington voice pipeline*
