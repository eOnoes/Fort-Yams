# Venice AI API Reference

**Source:** https://docs.venice.ai (use `.md` suffix for raw markdown)
**Base URL:** `https://api.venice.ai/api/v1`
**Auth:** Bearer token (single API key for all services)
**Compatibility:** OpenAI SDK compatible — just change base URL

## Key Endpoints

### Chat Completions
```
POST /chat/completions
```
- 100+ text models including `venice-uncensored`, GLM, Qwen3, Mistral, Llama, Grok, DeepSeek
- Streaming, vision, audio input, video input, tool calling
- Model feature suffixes: e.g. `model-name:web` for web search

### Image Generation
```
POST /image/generate          # Text-to-image
POST /image/generations       # OpenAI-compatible
POST /image/upscale           # Enhance/upscale
POST /image/edit              # Inpainting
POST /image/multi-edit        # Combine up to 3 images
POST /image/background-remove # Remove backgrounds
GET  /image/styles            # List available styles
```
Models: Flux, Stable Diffusion variants. Uncensored models available.

### Audio
```
POST /audio/speech            # TTS (50+ voices, Kokoro + Qwen 3 TTS)
POST /audio/transcriptions    # STT (Whisper, Parakeet)
POST /audio/queue             # Music gen (queue)
POST /audio/retrieve          # Music gen (retrieve by ID)
POST /audio/quote             # Music gen (price quote)
POST /audio/complete          # Music gen (queue + wait)
```
**TTS voices are model-specific.** Voice IDs only valid for matching model. Example:
```bash
curl https://api.venice.ai/api/v1/audio/speech \
  -H "Authorization: Bearer $VENICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-kokoro", "voice": "af_sky", "input": "Hello from Venice."}' \
  --output speech.mp3
```

### Video Generation
```
POST /video/queue             # Text-to-video or image-to-video
POST /video/retrieve          # Retrieve by ID
POST /video/quote             # Price quote
POST /video/complete          # Queue + wait
POST /video/transcriptions    # Extract text/speech from video
```

### Tools
```
POST /augment/text-parser     # PDF/DOCX/XLSX → text ($0.01/req)
POST /augment/scrape          # Web → markdown ($0.01/req)
POST /augment/search          # Privacy-preserving search ($0.01/req)
```

### Billing
```
GET  /billing/balance
GET  /billing/usage
GET  /billing/usage-analytics
```

## Privacy Tiers
1. **Anonymized** — Third-party models, metadata stripped
2. **Private** — Zero data retention, self-hosted open-source
3. **TEE** — Hardware-secured enclaves
4. **E2EE** — End-to-end encrypted

## Hermes Integration
MCP tools connect directly. Docs: `docs.venice.ai/agents.md`
Installable skill: `npx skills add docs.venice.ai`

## Use Case for Scout Pipeline
Venice (uncensored brain) → Pocket TTS (Scout voice).
- Venice generates unrestricted text (no content filter)
- Pocket TTS renders with Chloe voice (no content filter)
- Result: fully uncensored, Scout-voiced delivery

## What Venice Does NOT Have
- **No voice cloning** — 50+ pre-built voices only
- **No custom TTS voices** — Standard voices only
