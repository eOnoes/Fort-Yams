# Ollama Model Matrix

Models running on Ollama instances in the fleet.

## Local Instances

### Eddie's PC — 172.16.1.1:11434
| Model | Size | Uncensored | Speed | Notes |
|-------|------|-----------|-------|-------|
| `gemma4-uncensored` | ~?GB | ✅ Yes | ~93 tok/s (after warm load) | Creative/fantasy/NSFW content. First call includes ~3.8s model load. Subsequent calls: ~1.9s for ~180 tokens. |

### VPS — localhost:11434
(Add models as they're pulled locally)

## API Patterns

**Generate (non-streaming):**
```bash
curl -s -X POST http://<host>:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"<name>","prompt":"text","stream":false}'
```

**List installed models:**
```bash
curl -s http://<host>:11434/api/tags | jq '.models[].name'
```

**Pitfall:** `total_duration` and `load_duration` are in nanoseconds. Divide by 1,000,000,000 for seconds.
**Pitfall:** First call to a model includes model load time (~3-4s). Warm calls are significantly faster.
