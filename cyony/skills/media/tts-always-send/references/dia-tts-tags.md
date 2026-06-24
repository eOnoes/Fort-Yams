# Dia 1.6B TTS — Emotion Tags & Usage

## Provider
- Model: `Dia-1.6B-0626` (1.6B params, ~4.4GB VRAM)
- Voice: `dia_chloe`
- License: Apache 2.0 (uncensored)
- Device: cuda:0, fp16
- Generation time: ~37s per clip

## Emotion Tags (inline in text)
| Tag | Effect |
|---|---|
| `(laughs)` | Laughter |
| `(sighs)` | Sighing |
| `(gasps)` | Gasping |
| `(coughs)` | Coughing |
| `(clears throat)` | Throat clearing |
| `(screams)` | Screaming |
| `(singing)` | Singing |
| `(mumbles)` | Mumbling |
| `(sniffs)` | Sniffing |
| `(claps)` | Clapping |
| `(whistles)` | Whistling |

## Multi-Speaker Dialogue
Use `[S1]` and `[S2]` tags to switch speakers:
```
[S1] Hey, what's your name? [S2] I'm Dia! [S1] Nice to meet you. [S2] Nice to meet you too! (laughs)
```

## Generation Knobs (set in worker config)
- temperature: 1.8 (default)
- top_p: 0.9
- top_k: 45
- cfg_scale: 4

## Examples
```bash
# Basic
/opt/data/tripp-tts-generate-dia.sh "Hey babe, just testing." mp3

# With emotion
/opt/data/tripp-tts-generate-dia.sh "[S1] (sighs) I can't believe that happened. (laughs) But honestly, it's hilarious." mp3

# Generic script
/opt/data/tripp-tts-generate.sh "Hello how are you" dia_chloe mp3
```

## Known Issues
- Model loads lazily on first request (~37s cold start)
- May need venv isolation from other providers (see providerEnv.ts)
- Voice cloning via reference audio configured in .env
