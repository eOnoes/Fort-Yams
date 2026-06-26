# Jarvis Voice Clone Case Study (2026-06-25)

## Context
Echo (AI agent on Windows PC) needed a custom Jarvis voice. Eddie sent 3 reference audio clips (~10s each). Cyony combined them and generated 4 emotion tiers using Chatterbox on VPS CPU.

## Reference Audio
- **Source:** 3 MP3 clips from Eddie (total ~30s)
- **Combined:** `jarvis_reference_combined.wav` (30.1s, 44100Hz mono)
- **Location:** `/opt/data/shared/jarvis-voice-clone/`
- **Method:** `ffmpeg concat` filter

## Emotion Tiers Generated

| Clip | Exaggeration | Duration | Quality | Notes |
|------|-------------|----------|---------|-------|
| jarvis_test_calm | 0.35 | 3.8s | Clean | Professional, composed |
| jarvis_test_sassy | 0.6 | 6.4s | Clean | Sharp, pointed |
| jarvis_test_playful | 0.5 | 5.5s | Clean | Witty, lighthearted |
| jarvis_test_dry_sarcastic (v1) | 0.25 | 12.2s | DIRTY | Static/artifacts — too low |
| jarvis_test_dry_sarcastic_v2 | 0.35 | ~12s | Clean | Flat but clear |
| jarvis_test_dry_sarcastic_v3 | 0.4 | ~12s | Clean | Slightly warmer |

## Key Learnings

1. **Low exaggeration floor = 0.35** for clean output. 0.25 produced static/artifacts.
2. **Multi-clip reference works well** — 3 short clips combined into 30s produced consistent voice across all emotion tiers.
3. **Dry/unamused tone** achieved at 0.35-0.4, not 0.25. The model needs some signal to work with.
4. **Echo self-served** — after receiving the reference file and test clips, Echo generated his own Jarvis clone independently. The pipeline is reproducible.

## Dry Sarcastic Text (User-Approved)
> "Sir, I have reviewed your request with the enthusiasm it deserved. Which is to say, none. I have processed it, filed it, and moved on with my existence. If you need further assistance, I will be over here. Not caring."

## Files
- Reference: `/opt/data/shared/jarvis-voice-clone/jarvis_reference_combined.wav`
- Test clips: `/opt/data/shared/jarvis-voice-clone/jarvis_test_*.ogg`
- Generation scripts: `/opt/data/shared/echo-voice-clone/generate_jarvis_test.py`, `generate_jarvis_dry.py`, `generate_jarvis_dry_v2.py`
