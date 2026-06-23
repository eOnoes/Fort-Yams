# CosyVoice 3 — Local TTS with Voice Cloning + Emotion Control

## Discovery (2026-06-22)
Researched by Cyony via parallel delegate_task scouts. Three independent searches converged on the same answer.

## Model: Fun-CosyVoice 3 (0.5B)

| Attribute | Value |
|---|---|
| **HuggingFace** | `FunAudioLLM/Fun-CosyVoice3-0.5B-2512` |
| **GGUF (quantized)** | `Lourdle/Fun-CosyVoice3-0.5B-2512-GGUF` |
| **GitHub** | `FunAudioLLM/CosyVoice` (21.7k stars) |
| **License** | Apache 2.0 |
| **Size** | 0.5B params, ~4-6GB VRAM |
| **Languages** | 9 (zh, en, ja, ko, de, es, fr, it, ru) + 18 Chinese dialects |
| **Released** | 2025-12-11 |
| **Last updated** | 2026-06-22 (actively maintained) |

## Why It's the Top Candidate

### The Clone + Emotion Combo
CosyVoice 3 is the only open-source model that supports BOTH:
1. **Zero-shot voice cloning** from 3-10s reference audio
2. **Instruct mode** — natural language instructions for emotion, speed, volume, language

From the README: *"Supports various instructions such as languages, dialects, emotions, speed, volume, etc."*

### Benchmarks (beats everything open-source)
| Model | CER (%) ↓ | Speaker Similarity (%) ↑ |
|---|---|---|
| CosyVoice 2 | 1.45 | 75.7 |
| F5-TTS | 1.52 | 74.1 |
| **Fun-CosyVoice 3** | **1.21** | **78.0** |
| **CosyVoice 3 RL** | **0.81** | **77.4** |

## Content Filters — NONE
Unlike what the scouts initially assumed (Alibaba = filtered), the GitHub repo has **zero safety/moderation/filter code**. The model is fully open. No uncensored fork needed — there's nothing to censor.

## Hardware Fit (RTX 4070 12GB)
- 0.5B model uses ~4-6GB VRAM
- Fits comfortably alongside Pocket TTS
- GGUF quantized versions available (F16, Q4, Q5, Q8, Q6, F32)
- 150ms streaming latency

## Deployment Target
Echo's Windows PC. Install from GitHub, wrap in local API server (FastAPI or similar), expose POST /v1/tts endpoint.

## Test Protocol
1. Clone voice from Scout reference audio
2. Test 5 instructs: none, whisper, rage, excited, calm
3. Verify outputs are audibly different
4. Compare voice identity to Pocket TTS (`chloe`) and Qwen3 (`qwen_chloe`)

## Runner-ups (if CosyVoice 3 fails)

| Model | Clone | Emotion | VRAM | Note |
|---|---|---|---|---|
| GPT-SoVITS v4 | Excellent | Via style ref audio | 4-6GB | No text instruct — switch reference clips per emotion |
| F5-TTS | Excellent | None | 4-6GB | Same limitation as Pocket TTS |
| Fish Speech 1.5 | Good | Implicit only | 4-6GB | Fast but no explicit control |
| OpenVoice v2 | Good | Two-stage | 2-4GB | Generate emotion → convert voice identity |

## How to Search HuggingFace When Web Tools Are Down
```bash
# HF REST API is free, no auth needed for model listings
curl -sL "https://huggingface.co/api/models?search=cosyvoice&sort=likes&limit=20" | python3 -c '...'
```
Sort values: `likes`, `downloads`, `lastModified`, `createdAt`. No `trending` sort on the API.
