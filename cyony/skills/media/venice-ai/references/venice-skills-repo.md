# Venice API Skills Repository

## Setup (June 27 2026)

Venice publishes official API skills at `https://github.com/veniceai/skills`.
These are SKILL.md files covering every API surface — useful for reference
when writing code against Venice endpoints.

### Installation
```bash
# Clone
cd /opt/data && git clone https://github.com/veniceai/skills.git venice-skills

# Symlink into Hermes skills
mkdir -p ~/.hermes/skills/venice
ln -sf /opt/data/venice-skills/skills/* ~/.hermes/skills/venice/
```

### Available skills (19 total)
| Skill | Covers |
|-------|--------|
| venice-api-overview | Base URL, auth, pricing, versioning |
| venice-auth | Bearer keys + SIWE/x402 wallet auth |
| venice-chat | Chat completions, venice_parameters, multimodal, tools |
| venice-responses | Responses API (Alpha) |
| venice-embeddings | Embedding models, encoding formats |
| venice-image-generate | /image/generate, /images/generations, style presets |
| venice-image-edit | /image/edit, multi-edit, upscale, background-remove |
| venice-audio-speech | TTS: Kokoro, Qwen 3, xAI, Orpheus, ElevenLabs, MiniMax, Gemini |
| venice-audio-music | Async music generation lifecycle |
| venice-audio-transcription | Whisper, Parakeet, Scribe, xAI STT |
| venice-video | Video generation + transcription |
| venice-models | Model discovery, traits, pricing |
| venice-characters | Published personas |
| venice-api-keys | CRUD API keys, rate limits |
| venice-billing | Balance, usage, analytics |
| venice-x402 | Wallet credits, USDC on Base |
| venice-crypto-rpc | JSON-RPC proxy |
| venice-augment | Scrape, search, text-parser |
| venice-errors | Error shapes, retry strategy |

### Sync with API
```bash
python3 /opt/data/venice-skills/scripts/sync_from_swagger.py \
  --spec https://api.venice.ai/api/v1/swagger.yaml
```
Checks for drift between skills and the live API spec.
