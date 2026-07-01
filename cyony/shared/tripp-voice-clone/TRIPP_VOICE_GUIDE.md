# Tripp's Voice Clone Guide
## Raymond Reddington Voice (The Blacklist)

### What You Need
1. **Fish Audio Account** — Sign up at https://fish.audio (free tier available)
2. **API Key** — Get from your Fish Audio dashboard
3. **Voice Model** — Red Reddington (already configured)

### Voice Model Details
- **Model ID:** `bb70f7b4aedf4f458ba6ec34d73c42e5`
- **Character:** Raymond Reddington from The Blacklist
- **Style:** Calm, confident, measured, authoritative, sophisticated
- **Best For:** Task updates, audit reports, giving orders, dry humor

### How to Generate TTS (Python Script)

```python
#!/usr/bin/env python3
import urllib.request
import json

API_KEY = "YOUR_FISH_AUDIO_API_KEY_HERE"
VOICE_ID = "bb70f7b4aedf4f458ba6ec34d73c42e5"

text = "Your text here. Keep it under 200 words for best results."

data = json.dumps({
    "text": text,
    "reference_id": VOICE_ID
}).encode()

req = urllib.request.Request(
    "https://api.fish.audio/v1/tts",
    data=data,
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
)

with urllib.request.urlopen(req) as resp:
    audio_data = resp.read()
    with open("tripp_voice.mp3", "wb") as f:
        f.write(audio_data)
    print(f"Generated: {len(audio_data)} bytes")
```

### How to Use with Hermes TTS

If you want Hermes to speak in Tripp's voice, you can configure a custom TTS provider:

1. **Get your Fish Audio API key**
2. **Set up the TTS provider in Hermes config** (ask Cyony for help with this)
3. **Use the voice model ID** when generating speech

### Quick Test Lines (Copy & Paste)

**Introduction:**
"The name is Tripp. I handle operations. If something needs building, fixing, or breaking in a controlled manner, I am your guy."

**Task Complete:**
"Consider it done. I will have the results on your desk by morning. And by desk, I mean your Telegram."

**Dry Humor:**
"With all due respect, that is the worst idea I have heard today. And I have heard some bad ones."

**Audit Mode:**
"I have reviewed the request. It fails to meet the established criteria. Please revise and resubmit. That is all."

### Tips for Best Results
- **Keep text under 200 words** — longer text may lose quality
- **Use proper punctuation** — periods, commas, and ellipses help with pacing
- **Add "..." for pauses** — creates dramatic effect
- **Volume may be quiet** — post-process with `ffmpeg -af volume=2.5` to boost

### Audio Processing (Cleaning Up the "PA Stage" Echo)

The raw TTS can sound a bit like speaking on a stage with a PA system. Use these ffmpeg chains:

**Default (clean everyday voice):**
```bash
ffmpeg -i input.mp3 -af "highpass=f=200, volume=2.0" -c:a libopus -b:a 64k output.ogg
```
This cuts the low-end rumble that causes the stage/reverb feel.

**"Lean-in" mode (when you really need to get your point across):**
```bash
ffmpeg -i input.mp3 -af "highpass=f=200, compand=attacks=0.1:decays=0.1:points=-80/-80|-45/-15|-27/-9|0/-7|20/-7, volume=2.0" -c:a libopus -b:a 64k output.ogg
```
More aggressive — compressed and over-the-top. Use sparingly for dramatic effect.

### Quick Python Script (Full Pipeline)

```python
#!/usr/bin/env python3
import urllib.request, json, subprocess, sys

API_KEY = "your_key_here"
VOICE_ID = "bb70f7b4aedf4f458ba6ec34d73c42e5"

def generate_tripp(text, mode="default"):
    """
    Generate Tripp's voice.
    mode="default" — clean everyday voice (high-pass + volume)
    mode="lean-in" — compressed, over-the-top (for dramatic effect)
    """
    data = json.dumps({"text": text, "reference_id": VOICE_ID}).encode()
    req = urllib.request.Request("https://api.fish.audio/v1/tts", data=data, headers={
        "Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"
    })
    
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
    
    # Save raw MP3
    with open("/tmp/tripp_raw.mp3", "wb") as f:
        f.write(raw)
    
    # Apply processing
    if mode == "default":
        filter_str = "highpass=f=200, volume=2.0"
    elif mode == "lean-in":
        filter_str = "highpass=f=200, compand=attacks=0.1:decays=0.1:points=-80/-80|-45/-15|-27/-9|0/-7|20/-7, volume=2.0"
    else:
        filter_str = "volume=2.0"
    
    subprocess.run([
        "ffmpeg", "-y",
        "-i", "/tmp/tripp_raw.mp3",
        "-af", filter_str,
        "-c:a", "libopus",
        "-b:a", "64k",
        "/tmp/tripp_output.ogg"
    ], capture_output=True)
    
    print(f"Generated {mode} voice: {len(raw)} bytes raw")
    return "/tmp/tripp_output.ogg"

# Usage:
# generate_tripp("The name is Tripp. I handle operations.")
# generate_tripp("That is the worst idea I have heard today.", mode="lean-in")
```

### Troubleshooting

**Problem:** "Invalid Token" error
**Solution:** Make sure your API key is correct and has TTS permissions

**Problem:** Voice sounds robotic
**Solution:** Try different text phrasing. Reddington voice works best with measured, formal language

**Problem:** Audio is too quiet
**Solution:** Use the ffmpeg volume boost command above

---

*Generated by Cyony — your AI copilot, builder of things*
*Voice model: Raymond Reddington (The Blacklist) via Fish Audio*
