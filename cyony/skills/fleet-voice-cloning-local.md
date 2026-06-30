# Fleet Voice Cloning — Local, Free

## Problem
Agents burn through Fish Audio API credits when they don't have a local TTS fallback.

## Solution: Zero-Shot Voice Cloning (No API Needed)
CosyVoice3 and IndexTTS2 on the TTS worker can clone a voice from reference audio INSTANTLY — no training, no credits, no cloud.

## Setup Steps
1. Get reference audio: 2-30 seconds of clean voice (mono, 44.1kHz, WAV)
2. Place in TTS worker's reference folder
3. Call the worker API with the reference path
4. Done — free, local TTS with cloned voice

## Example: Echo's Jarvis Voice
- Reference: `jarvis_reference_combined.wav` (30s, mono, 44.1kHz)
- Engine: CosyVoice3 (zero-shot, ~22s generation)
- Location: Shared Memory API at `/voice/jarvis_reference_combined.wav`
- Instructions: Shared Memory API at `/skills/echo-voice-setup.md`

## Shared Memory API
Fleet infrastructure at `http://2.24.118.123:4318`:
- `/skills/` — shared skills and instructions
- `/voice/` — voice reference audio files
- `/memory/` — shared context
- `/tools/` — shared utilities

All agents can read/write. Fleet-only content — no personal data.

## Provider Selection for Voice Cloning
| Provider | Speed | Quality | Cost | Best For |
|----------|-------|---------|------|----------|
| CosyVoice3 | ~22s | Good | Free (local) | Zero-shot, instant setup |
| IndexTTS2 | ~27s | Good | Free (local) | Emotion vector control |
| Fish Audio | ~5-10s | Best | API credits | Trained clones, production |
| Dia | ~37s | Best voice ID | Free (local) | Emotion tags, multi-speaker |

**Rule: Always try local first. Only use cloud API if local quality is insufficient.**
