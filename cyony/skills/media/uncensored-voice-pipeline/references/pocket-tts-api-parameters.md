# Pocket TTS API Parameters — Hidden Capabilities

## Discovered 2026-06-21

Pocket TTS has several parameters that are NOT exposed through the Trippcore worker API but ARE available in the Python library. These control expressiveness, quality, and delivery characteristics.

## Python API Parameters

### `load_model()` Parameters
```python
model = TTSModel.load_model(
    language="english",        # Language model (default: "english" = "english_2026-04")
    temp=0.7,                  # Sampling temperature — HIGHER = more expressive/varied
    lsd_decode_steps=1,        # Generation steps — MORE = higher quality, slower
    noise_clamp=None,          # Max noise sampling value
    eos_threshold=-4.0,        # End-of-sequence detection threshold
    quantize=False,            # int8 quantization (reduces memory, minimal quality loss)
)
```

### `generate_audio()` Parameters
```python
audio = model.generate_audio(
    voice_state,               # From get_state_for_audio_prompt()
    "Text to speak",
    frames_after_eos=None,     # Trailing audio after speech ends (breath, trailing off)
    copy_state=True,           # Whether to copy state (set False for sequential generation)
)
```

## Emotion Control via Temperature

The `temp` parameter is the CLOSEST thing to mood control Pocket TTS has:

| Temperature | Effect | Use Case |
|-------------|--------|----------|
| 0.3-0.4 | Stable, monotone, calm | Soothing, bedtime, reminders |
| 0.5-0.6 | Balanced, natural | Normal conversation |
| 0.7 (default) | Standard expressiveness | General use |
| 0.8-1.0 | More varied, expressive | Emotional scenes, excitement |
| 1.0-1.2 | Highly expressive, unpredictable | Passionate, intense moments |

**Key insight:** Higher temperature doesn't change the VOICE — it changes the DELIVERY. The voice identity stays locked, but pacing, pitch variation, and emotional intensity increase. This is the Pocket TTS equivalent of Qwen3's `instruct` parameter, just less precise.

## Quality via `lsd_decode_steps`

| Steps | Quality | Speed | Use Case |
|-------|---------|-------|----------|
| 1 (default) | Good | Fast (~5s) | Quick replies, casual |
| 2-3 | Better | Moderate (~10-15s) | Important clips, story time |
| 5+ | Best | Slower (~20-30s) | Premium moments, key scenes |

## `frames_after_eos` for Trailing Breath

Setting `frames_after_eos` to a non-zero value adds natural trailing audio after speech ends — breath sounds, trailing off, soft exhale. This creates a more intimate, present delivery.

- `None` (default) — clean cutoff
- `2-5` — subtle trailing breath
- `10+` — noticeable pause with breath at end

## Voice State Export for Fast Loading

Processing reference audio is slow (~2-3s). Export to safetensors for instant loading:
```python
model_state = model.get_state_for_audio_prompt("scout-reference.wav")
export_model_state(model_state, "./scout-voice.safetensors")
# Later: instant load
voice_state = model.get_state_for_audio_prompt("./scout-voice.safetensors")
```

## Multi-Voice Reference Library (Planned)

Pocket clones whatever voice you give it INCLUDING emotional tone. Build a library of reference clips with different moods:

| Reference | Mood | Temperature |
|-----------|------|-------------|
| scout-default.wav | Neutral Scout | 0.7 |
| scout-whisper.wav | Soft, intimate | 0.4 |
| scout-excited.wav | Energetic, happy | 0.9 |
| scout-annoyed.wav | Clipped, sharp | 0.6 |
| scout-sultry.wav | Low, deliberate | 0.5 |

**How to create:** Record Scout (Pocket TTS) reading the same text at different emotional intensities. Use the output as reference for the next generation. The voice identity is preserved because it's the same voice — just different emotional states.

## Text Chunking for Dramatic Pauses

Pocket handles infinitely long text but has NO native pause support (open issue #6). Workaround: break text into segments with silence between them:

```python
import numpy as np

# Generate each segment separately
chunks = [
    "My hands are on your chest.",
    "Slow circles.",
    "Every inch of you I touch, I feel you react.",
]
silence = np.zeros(24000 // 2)  # 0.5s silence at 24kHz

all_audio = []
for chunk in chunks:
    audio = model.generate_audio(voice_state, chunk)
    all_audio.append(audio.numpy())
    all_audio.append(silence)

final = np.concatenate(all_audio)
```

## Two-Step Pipeline (VoiceDesign → Base Clone)

If single-step clone+instruct isn't preserving identity well enough:

1. Use VoiceDesign model to generate emotion reference audio (prosody guide)
2. Use Base model with Scout's reference for voice identity + emotion reference for prosody

**Status:** Experimental. Qwen3 has this issue; Pocket may not need it if temperature + reference library works.

## Worker Integration

The Trippcore worker at `127.0.0.1:8788` exposes Pocket TTS via `/v1/tts` with `voice: "chloe"`.

**CONFIRMED 2026-06-23:** The worker DOES accept and forward `temp` and `lsd_decode_steps` in the JSON body. No need to run Python directly on Windows. These parameters are passed through to the Pocket TTS model.

```bash
curl -s -X POST http://127.0.0.1:8788/v1/tts \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{"text":"Your text","voice":"chloe","return_format":"wav","temp":0.3,"lsd_decode_steps":3}'
```

Eddie confirmed `temp=0.3` produces actual whisper/intimate delivery. `temp=0.9` produces excited/energetic. This is the ONLY engine with real dynamic volume control — MiMo voiceclone and Dia both output at one fixed volume regardless of text craft or emotion tags.

**Shell script:** `/opt/data/tripp-tts-generate.sh "text"` — basic Pocket TTS generation via worker.
**Python pattern:** See SKILL.md "Pocket TTS Direct API" section for reliable generation with retry.
