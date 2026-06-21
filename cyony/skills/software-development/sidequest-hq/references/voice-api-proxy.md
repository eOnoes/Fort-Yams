# Voice API Proxy Pattern

## Purpose
A single Next.js API route that calls MiMo twice (brain + TTS) so the browser never sees API keys. MiMo-only pipeline — no Grok dependency. The app is safe territory; censorship doesn't matter here.

## File: `src/app/api/voice/route.ts`

### Key patterns

**1. Chloe's system prompt is embedded in the route** — not in a separate file. 2-3 sentences max. Keep it compact to save prompt tokens per request.

**2. Error fallback chain:** If MiMo brain fails → return "Chloe's comms are down. Recalibrating... try again." with null audio. If MiMo TTS fails → return Chloe's text with null audio (text-only experience). Never throw a 500 error to the client — the browser VoiceAgent component catches fetch errors and shows its own fallback.

**3. Mood injection:** The system prompt already directs Chloe's tone. The optional `mood` parameter appends `"Respond in {mood} mood."` to the system prompt. Keep this simple — don't try to detect mood from context.

**4. AbortSignal.timeout()** — both API calls get timeout signals (15s for brain, 20s for TTS). TTS is slower.

**5. The `thinking` field is mandatory for MiMo models.** Without `thinking: {type: "disabled"}`, MiMo pro models waste output tokens on internal reasoning. This has been the source of multiple "MiMo is trash" incidents. **Both** the brain call and the TTS call need it.

**6. Single API key** — only `MIMO_API_KEY` in `.env.local`. Both calls use the same endpoint (`https://token-plan-sgp.xiaomimimo.com/v1/chat/completions`) and same key, just different `model` values:
- Brain: `mimo-v2.5-pro` (200 max_tokens)
- TTS: `mimo-v2.5-tts` (audio.voice: 'Chloe', audio.format: 'wav')

**7. Claude-style MiMo brain payload:**
```json
{
  "model": "mimo-v2.5-pro",
  "messages": [
    {"role": "system", "content": "<chloe system prompt>"},
    {"role": "user", "content": "<user text>"}
  ],
  "max_tokens": 200,
  "thinking": {"type": "disabled"}
}
```

## Browser consumption pattern

```typescript
// Decode base64 WAV from the API response and play it
function base64ToBlobUrl(b64: string, mime: string): string {
  const byteChars = atob(b64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  return URL.createObjectURL(blob)
}

// Usage
const blobUrl = base64ToBlobUrl(audioData, 'audio/wav')
audioRef.current.src = blobUrl
audioRef.current.play()
```

## Env vars

`MIMO_API_KEY` must be present in `.env.local` at project root. Read via `process.env.MIMO_API_KEY`. Verify the key is real (~84 chars) — placeholder keys cause silent 400 errors that surface as the fallback text.

## Testing without the browser

```bash
curl -s -X POST http://localhost:3000/api/voice \
  -H "Content-Type: application/json" \
  -d '{"text":"Hey Chloe, give me a status report.","mood":"chill"}'
```

Expected: JSON with `text` (string, ~2 sentences) and `audio` (base64 WAV string, ~800K chars, or null).

## Pitfalls

1. **Stale API keys** — `.env.local` once had a 13-char placeholder `XAI_API_KEY`. Always verify key length before debugging the route.
2. **Wrong model names** — `grok-4.20-reasoning` doesn't exist (was `grok-4.20-0309-non-reasoning`). Now moot since we switched to MiMo, but watch for model name drift if MiMo updates.
3. **Missing `thinking` field** — Without it, MiMo pro wastes tokens on reasoning and the response takes 3x longer.
4. **Mood appending vs system prompt** — Don't create a separate mood field. Just append to the system message string. Keeps the payload simple.
