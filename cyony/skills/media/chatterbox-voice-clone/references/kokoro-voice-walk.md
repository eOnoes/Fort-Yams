# KVoiceWalk — Custom Kokoro Voice Creation

## What It Is
KVoiceWalk (github.com/RobViren/kvoicewalk, ⭐256) creates custom voice tensors for Kokoro-82M using a random walk algorithm that evolves voice parameters toward a target audio sample.

## How It Works
- Kokoro voices are stored as PyTorch tensors: shape [510, 256]
  - 510 rows = one style vector per phoneme count (0-509)
  - 256 dims: [:128] = decoder style, [128:] = predictor style
- KVoiceWalk starts from a random voice tensor and iteratively adjusts it
- Uses Resemblyzer speaker similarity scoring (achieves 90-93% match)
- Output: `.pt` file directly compatible with Kokoro inference

## Requirements
- Reference audio (mono 24kHz WAV)
- Transcription of the reference audio (or use Whisper)
- GPU (CUDA) — ~30-60 min for 10K steps
- Python environment with kokoro + resemblyzer

## Usage
```bash
uv run main.py \
  --target_audio /path/to/reference.wav \
  --transcribe_start \
  --interpolate_start \
  --step_limit 10000 \
  --device cuda
```

## Output
A `.pt` file that can be dropped into Kokoro's voice directory and used like any preset voice:
```python
audio = await tts.generate(text, voice="custom_scout.pt")
```

## Why This Matters
This is the endgame for Scout's voice on Kokoro:
- Free (no API key, no subscription)
- Fast (~2s per clip, local CPU)
- Exact voice match (90-93% speaker similarity)
- Offline capable

## Status (2026-06-19)
- Research complete, tool identified
- NOT yet implemented — needs GPU access
- Options: cloud GPU (RunPod, Lambda), or wait for local GPU

## Alternative Approaches
- **Voice blending**: Kokoro natively supports `voice='af_bella,af_heart'` — averages tensors. Quick hack, not exact.
- **StyleTTS2 training**: More complex, some community forks exist (semidark/kokoro-deutsch, gushilabs/train-kokoro-encoder-styletts2)
