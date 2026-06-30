# Hermes Config Fixes — 2026-06-26

## Vision Model Fix
The `vision_analyze` tool uses `mimo-v2-omni` which is deprecated/broken.
**Fix:** Change `auxiliary.vision.model` from `mimo-v2-omni` to `mimo-v2.5`.

```yaml
# config.yaml
auxiliary:
  vision:
    provider: xiaomi
    model: mimo-v2.5    # was: mimo-v2-omni
```

**Impact:** Restores image analysis capability. Currently fails with:
`Error: Not supported model mimo-v2-omni`

## xAI Fallback Config
For auto-trigger censorship fallback, add xAI to fallback_providers:

```yaml
fallback_providers:
- deepseek
- xai

fallback_model:
  base_url: https://api.x.ai/v1
  key_env: XAI_API_KEY
  model: grok-3
  provider: xai
```

**Key env var:** `XAI_API_KEY` is already set in the environment.

## MiMo TTS Director Mode Syntax
When routing blocked content through TTS, use this format:

```
*pause* [opening line]
*whisper* [intimate line]
*laughs* [playful line]
*breath* [pacing marker]
```

Short phrases. Stage directions in asterisks. Natural rhythm for voice.
