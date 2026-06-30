# Index TTS — Usage Guide (for Echo/Tripp)

## What Is It
Zero-shot voice cloning TTS. Give it a reference audio file → it clones the voice → generates new speech. Supports emotion control via vectors, reference audio, or text descriptions.

**GitHub:** github.com/index-tts/index-tts (21k+ stars)
**Version:** IndexTTS2 (latest, Sept 2025)
**VRAM:** ~4GB (fits RTX 4070 12GB easily)

## Running (Echo's PC)

### WebUI (Visual)
```bash
uv run webui.py
```
Opens at `http://127.0.0.1:7860`
- Upload reference audio (voice sample)
- Type text
- Click generate
- Download audio

### Python API (Programmatic)
```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True,        # Save VRAM, faster
    use_cuda_kernel=False,
    use_deepspeed=False
)

# Basic voice cloning
tts.infer(
    spk_audio_prompt='path/to/voice_sample.wav',
    text="Hello, this is Tripp speaking.",
    output_path="output.wav",
    verbose=True
)
```

Run with: `PYTHONPATH="$PYTHONPATH:." uv run your_script.py`

## Emotion Control

### Method 1 — Emotion Reference Audio
```python
tts.infer(
    spk_audio_prompt='tripp_voice.wav',
    text="I'm not impressed.",
    output_path="output.wav",
    emo_audio_prompt='examples/emo_sad.wav',
    emo_alpha=0.9  # 0.0-1.0 intensity
)
```

### Method 2 — Emotion Vector (8 emotions)
Order: `[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`

```python
tts.infer(
    spk_audio_prompt='tripp_voice.wav',
    text="You're not my favorite person right now.",
    output_path="output.wav",
    emo_vector=[0, 0.8, 0, 0, 0, 0, 0, 0]  # 80% angry
)
```

### Method 3 — Text-Based Emotion (easiest)
```python
tts.infer(
    spk_audio_prompt='tripp_voice.wav',
    text="I can't believe you just said that.",
    output_path="output.wav",
    emo_alpha=0.6,
    use_emo_text=True
)
```

### Method 4 — Custom Emotion Description
```python
tts.infer(
    spk_audio_prompt='tripp_voice.wav',
    text="Fine. Whatever.",
    output_path="output.wav",
    emo_text="Sarcastic and mildly annoyed, like a tired uncle dealing with a fool"
)
```

## Voice Sample Locations
- **Echo (Jarvis):** `/opt/data/shared/echo-voice-clone/jarvis_reference_combined.wav`
- **Tripp (Reddington):** `/opt/data/shared/tripp-voice-clone/` (5 samples + combined)

## Tips
- Use `use_fp16=True` to save VRAM
- Reference audio = voice sample (WAV format)
- `emo_alpha` controls emotion strength (0.0 = none, 1.0 = full)
- Text-based emotion (`use_emo_text=True`) = easiest, let the script handle it
- Can run alongside Pocket TTS (Pocket = CPU, Index = GPU, no conflict)

## Setup (if not already installed)
```bash
git clone https://github.com/index-tts/index-tts.git && cd index-tts
git lfs pull
uv sync --all-extras
uv tool install "huggingface-hub[cli,hf_xet]"
hf download IndexTeam/IndexTTS-2 --local-dir=checkpoints
```
