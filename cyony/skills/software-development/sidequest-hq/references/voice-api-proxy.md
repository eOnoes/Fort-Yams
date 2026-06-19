# Voice API Proxy Pattern

## Purpose
A single Next.js API route that proxies two external APIs (Grok + MiMo TTS) so the browser never sees API keys.

## File: `src/app/api/voice/route.ts`

### Key patterns

**1. Chloe's system prompt is embedded in the route** — not in a separate file. 2-3 sentences max. Keep it compact to save prompt tokens per request.

**2. Error fallback chain:** If Grok fails → return a Chloe-ish fallback text with null audio. If MiMo fails → return Chloe's text with null audio (text-only experience). Never throw a 500 error to the client — the browser VoiceAgent component catches fetch errors and shows its own Chloe-ish fallback.

**3. Mood injection:** The system prompt already directs Chloe's tone. The optional `mood` parameter appends `"Respond in {mood} mood."` to the system prompt. Keep this simple — don't try to detect mood from context.

**4. AbortSignal.timeout()** — both API calls get timeout signals (15s for Grok, 20s for MiMo TTS). TTS is slower.

**5. The `thinking` field is mandatory for MiMo TTS.** Without `thinking: {type: "disabled"}`, MiMo pro models waste output tokens on internal reasoning. This has been the source of multiple "MiMo is trash" incidents.

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

Both must be present in `.env.local` at project root. The API route reads them via `process.env.XAI_API_KEY` and `process.env.MIMO_API_KEY`.

## Testing without the browser

```bash
curl -s -X POST http://localhost:3000/api/voice \
  -H "Content-Type: application/json" \
  -d '{"text":"Hey Chloe","mood":"calm"}'
```

Expected: JSON with `text` (string) and `audio` (base64 string or null).
