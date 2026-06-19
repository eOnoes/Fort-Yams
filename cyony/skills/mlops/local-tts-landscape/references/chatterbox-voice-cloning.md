# Chatterbox Voice Cloning Pipeline

## The MiMo → Chatterbox Pipeline

The proven workflow for cloning a specific TTS voice into Chatterbox:

1. **Generate reference audio** with the source TTS (e.g. MiMo TTS)
2. **Convert to WAV** — Chatterbox needs WAV input, not OGG/MP3
3. **Feed as `audio_prompt_path`** to Chatterbox's `generate()` method

```bash
# Step 1: Generate with MiMo (via Hermes text_to_speech tool)
# Outputs OGG format

# Step 2: Convert OGG to WAV (24kHz mono)
ffmpeg -y -i reference.ogg -ar 24000 -ac 1 reference.wav
```

## Python API

```python
import os
os.environ["HF_HOME"] = "/opt/data/.cache/huggingface"

# CRITICAL: Patch perth watermarker before importing chatterbox
import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker

import torch
import torchaudio
from chatterbox.tts import ChatterboxTTS

device = "cpu"  # or "cuda" for GPU
model = ChatterboxTTS.from_pretrained(device)

# Generate with voice cloning
wav = model.generate(
    text="Hello Eddie, let's review the ledger.",
    audio_prompt_path="/path/to/reference.wav",  # the voice to clone
    exaggeration=0.7,    # emotion intensity: 0.0=flat, 0.5=natural, 0.9=MAX
    temperature=0.8,     # sampling temperature
    cfg_weight=0.5,      # classifier-free guidance weight
    repetition_penalty=1.2,
    min_p=0.05,
    top_p=1.0,
)

# Save output
torchaudio.save("output.wav", wav, model.sr)  # model.sr = sample rate
```

## Key Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| `exaggeration` | 0.0 - 1.0 | **The emotion knob.** 0.0 = robotic/flat, 0.3 = calm, 0.5 = natural, 0.7 = sassy/expressive, 0.9 = passionate/angry |
| `temperature` | 0.1 - 1.5 | Higher = more varied/creative speech patterns. 0.8 is a good default. |
| `cfg_weight` | 0.0 - 1.0 | Classifier-free guidance. Higher = more closely follows text. 0.5 default. |
| `audio_prompt_path` | file path | Reference audio for voice cloning. Use consistent reference for consistent voice identity. |

## Emotion Tuning (Tested by Eddie)

- **Calm/informative:** exaggeration=0.3
- **Natural conversation:** exaggeration=0.5
- **Sassy/playful:** exaggeration=0.7
- **Annoyed/frustrated:** exaggeration=0.8
- **Passionate/angry:** exaggeration=0.9
- **Defeated/sad:** exaggeration=0.4 (lower = more deflated)

## Gotchas

### 1. Text emotion tags DO NOT WORK
`[laugh]`, `[sigh]`, `[gasp]` are read LITERALLY as spoken words. Chatterbox says "laugh" out loud. This is a common misconception from Bark/XTTS which DO support text tags. Use `exaggeration` instead.

### 2. Perth watermarker is broken on Python 3.13
`setuptools` v82+ removed `pkg_resources`, which `perth.PerthImplicitWatermarker` depends on. Import fails with `ModuleNotFoundError: No module named 'pkg_resources'`. Fix: monkey-patch before importing chatterbox:
```python
import perth
perth.PerthImplicitWatermarker = perth.DummyWatermarker
```
The watermarker is just for AI detection marks — Dummy is fine for non-production use.

### 3. Reference audio consistency is CRITICAL
Different reference samples produce noticeably different voices. If you want consistent voice identity across clips, use ONE reference audio file for all generations. Switching references mid-session = different voice characteristics.

### 4. CPU speed: ~0.09x realtime
On a VPS with no GPU, generating 5 seconds of audio takes ~55 seconds. This is NOT viable for live conversation. Use for:
- Pre-generating template clips
- Cached responses for common phrases
- Offline batch generation

For realtime, need GPU (1.5-3x realtime) or cloud API (Replicate/RunPod).

### 5. Model download is ~2GB
First run downloads from `ResembleAI/chatterbox` on HuggingFace. Models cached in `HF_HOME`. Set `HF_HOME` env var to control cache location.

## Recommended TTS Stack for SQHQ

| Use Case | TTS Engine | Why |
|----------|-----------|-----|
| Live conversation (Chloe) | MiMo TTS | Fast, reliable, Chloe's voice |
| Expressive templates (Spite) | Chatterbox | Emotion control via exaggeration |
| Fast fallback | Kokoro-82M | Lightweight, no GPU needed |

## Cloud Options for Realtime Chatterbox

- **Replicate** — One-click API, pass text + reference audio, pay per second
- **RunPod** — Spin up GPU pod, install chatterbox-tts, instant realtime
- **Lambda Labs** — GPU instances, good for batch processing
