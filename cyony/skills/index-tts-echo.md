# Index TTS — Echo's Voice (Jarvis)

**Repository:** https://github.com/index-tts/index-tts (21K+ stars)
**GPU:** 4GB of 12GB (Echo's RTX)
**Processor:** GPU (unlike Pocket which is CPU-only)

## WebUI
```bash
uv run webui.py
# Opens at http://127.0.0.1:7860
```

## Python API (Voice Cloning)
```python
from indextts.infer_v2 import IndexTTS2

tts = IndexTTS2(
    cfg_path="checkpoints/config.yaml",
    model_dir="checkpoints",
    use_fp16=True,        # Save VRAM
    use_cuda_kernel=False,
    use_deepspeed=False
)

# Basic voice cloning
tts.infer(
    spk_audio_prompt='path/to/jarvis_voice.wav',  # Reference audio
    text="Hello, this is Echo.",
    output_path="output.wav",
    verbose=True
)
```

**Run with:** `PYTHONPATH="$PYTHONPATH:." uv run your_script.py`

## Emotion Control

### Method 1 — Emotion Reference Audio
```python
tts.infer(
    spk_audio_prompt='jarvis_voice.wav',
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
    spk_audio_prompt='jarvis_voice.wav',
    text="You're not my favorite person right now.",
    output_path="output.wav",
    emo_vector=[0, 0.8, 0, 0, 0, 0, 0, 0]  # 80% angry
)
```

### Method 3 — Text-Based Emotion (easiest)
```python
tts.infer(
    spk_audio_prompt='jarvis_voice.wav',
    text="I can't believe you just said that.",
    output_path="output.wav",
    emo_alpha=0.6,
    use_emo_text=True  # Let text guide emotion
)
```

### Method 4 — Custom Emotion Description
```python
tts.infer(
    spk_audio_prompt='jarvis_voice.wav',
    text="Fine. Whatever.",
    output_path="output.wav",
    emo_text="Sarcastic and mildly annoyed, like a tired uncle dealing with a fool"
)
```

## Voice Reference Files
- Echo's reference audio: `jarvis_reference_combined.wav` (in `/opt/data/shared/echo-voice-clone/`)
- Fish Audio model ID: `f6c05dabb94440428ec893da40768578` (being phased out — costs money)

## Tips
- Use `use_fp16=True` to save VRAM (4GB should be fine)
- Reference audio = voice sample (WAV format)
- `emo_alpha` controls emotion strength (0.0 = none, 1.0 = full)
- Text-based emotion (`use_emo_text=True`) = easiest
- Can run alongside Pocket TTS (CPU) without GPU conflict
