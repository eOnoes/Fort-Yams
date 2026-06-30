# Venice AI API Setup — June 27 2026

## Auth Format
```bash
# Key goes in Authorization header as Bearer token
curl -H "Authorization: Bearer *** https://api.venice.ai/api/v1/chat/completions

# Key saved in /opt/data/.env as VENICE_API_KEY
# System REDACTS the key in terminal output (shows as ***)
# Use curl with the key directly, NOT through Python variable interpolation
```

## Available Models (80+)
### Text (key ones)
- `venice-uncensored` — fully uncensored, no filter
- `venice-uncensored-role-play` — uncensored for roleplay
- `grok-4-3`, `grok-4-20` — xAI models via Venice
- `claude-opus-4-8`, `claude-sonnet-4-6` — Anthropic via Venice
- `openai-gpt-55`, `gpt-54` — OpenAI via Venice
- `qwen3-coder-480b-a35b-instruct-turbo` — code specialist
- `hermes-3-llama-3.1-405b` — our cousin!
- `e2ee-*` — end-to-end encrypted models

### TTS
- `tts-kokoro` — 50+ voices, multilingual
- Voice IDs are model-specific (case-sensitive)
- Needs credits to generate

### Image
- `grok-imagine-image` — xAI image gen
- Flux models available

### Video
- Text-to-video, image-to-video available

## Error Messages
- `"Insufficient USD or Diem balance"` = Key valid, needs credits
- `"Authentication failed"` = Key invalid or wrong format
- `"Incorrect API key provided"` = Key expired or revoked

## Current Status
- Key: ✅ Saved to .env
- Credits: ⏳ Eddie adding them
- TTS: ⏳ Waiting for credits
- Image: ⏳ Waiting for credits

## Eddie's Preference
- Venice for: uncensored images (tease, not explicit), backup TTS
- xAI for: primary uncensored brain (has $100 budget)
- MiMo for: free flirty TTS (softer filter than LLM)
- Pocket for: best quality TTS (when connected via Echo)
