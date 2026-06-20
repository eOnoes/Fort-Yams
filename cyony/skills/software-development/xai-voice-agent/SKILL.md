---
name: xai-voice-agent
description: xAI Grok Voice plus MiMo/Kokoro TTS hybrid voice agent - three architectures, real-time WebSocket, async Grok-plus-MiMo chain, and async Grok-plus-Kokoro local chain
---

# xAI Voice Agent - Two Architectures

Official docs: https://docs.x.ai/developers/model-capabilities/audio/voice-agent

## Architecture A: Full Real-Time WebSocket (Voice Agent API)
For live conversational voice agents with interruption, VAD, and bidirectional streaming.

### Quick Reference
- WS Endpoint: `wss://api.x.ai/v1/realtime?model=grok-voice-latest` (us-east-1 only)
- Auth: Bearer token or ephemeral `xai-client-secret.<token>`
- Audio: PCM 16-bit, 24kHz
- Voices: Eve, Ara, Leo, Rex, Sal
- Session config: `session.update` with `input_audio_transcription`, `server_vad`, `tools`

### Browser Audio Critical Patterns
1. **AudioWorklet** (NOT ScriptProcessorNode). Put `pcm-processor-worklet.js` in `public/`.
2. **AudioContext warmup** (Safari) - create and resume in click handler before any async.
3. **Parallel init** - mic and WebSocket start simultaneously.
4. **Buffer mic** until `session.updated` - prevents losing first 200-700ms of speech.
5. **Base64** - chunked encoding, NOT spread operator (stack overflow on large buffers).
6. **Playback** - schedule AudioBufferSourceNodes on AudioContext timeline; interrupt on `speech_started` plus `response.cancel`.

### Key Events
- `input_audio_buffer.speech_started` - interrupt playback and send `response.cancel`
- `response.output_audio.delta` - audio chunks (base64 PCM)
- `conversation.item.input_audio_transcription.completed` - user transcript text
- `response.output_audio_transcript.delta` - assistant streamed text
- `response.done` - usage tokens

### shadcn/ui Layout
Full viewport, sticky header, flex-1 scroll transcript area, sticky footer with text input and mic button. Two visible states: off and listening. Mic button is the only control.

---

## Architecture B: Hybrid - Grok Chat + MiMo TTS (Tested Working)
For async voice interaction where latency is not critical. Grok handles the brain, MiMo TTS handles the voice. Simpler than WebSocket, no VAD or mic capture needed server-side.

### How It Works
1. Send user message to Grok chat completions (`grok-4.20-reasoning`) via REST
2. Grok returns response text
3. Feed response text to MiMo TTS (`mimo-v2.5-tts`) via REST chat completions format
4. MiMo returns base64 WAV audio in `choices[0].message.audio.data`
5. (Optional) Convert raw WAV to OPUS via ffmpeg for inline Telegram voice bubbles

### Embedding in a Next.js App
When building the voice agent into SQHQ (see `sidequest-hq` skill for full wiring):

**API Route pattern** — single POST endpoint proxies both calls:
- `src/app/api/voice/route.ts`
- Accepts `{text: string, mood?: string}`
- Returns `{text: string, audio: string|null}` (base64 WAV or null on TTS failure)
- Env vars in `.env.local`: `XAI_API_KEY`, `MIMO_API_KEY`

**Browser Audio Playback** — no AudioWorklet needed for the async architecture:
- Decode base64 WAV → `Blob` → `URL.createObjectURL` → set as `<audio>` src
- Auto-play on response, replay button per message
- Works without any audio libraries — pure Web APIs

**Web Speech API integration** — mic input in browser:
- `window.SpeechRecognition || window.webkitSpeechRecognition`
- Chrome/Edge only. Safari fallback = text input.
- Declare as `any` type to avoid TypeScript errors (not in default lib)
- HTTPS required (trycloudflare tunnel counts) — works on localhost for dev

### API Details

Grok Chat (brain): POST https://api.x.ai/v1/chat/completions with model grok-4.20-reasoning, messages with system+user roles, max_tokens 100. Response uses `choices[0].message.content`.

MiMo TTS (voice): POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions with model mimo-v2.5-tts. CRITICAL FORMAT CONSTRAINTS:
- NO system role in messages (TTS model rejects it)
- Structure: [{"role": "user", "content": "context"}, {"role": "assistant", "content": "text to speak"}]
- The assistant content IS what gets spoken — inject personality/tone into this text
- Voice name must be EXACT from known list (case-sensitive). Available: mimo_default, 冰糖, 茉莉, 苏打, 白桦, Mia, Chloe, Milo, Dean
- "Chloe" exists natively as a voice option
- thinking MUST be disabled: {"type": "disabled"}
- Audio format: "wav" in audio field
- Response: base64 PCM data in choices[0].message.audio.data
- Reliability: 3/3 consecutive tests returned valid audio in ~2.3s each. Consistent.

### MiMo SGP Endpoint — Full Model Map (June 2026)

All MiMo capability with tp- prefixed keys runs through `https://token-plan-sgp.xiaomimimo.com/v1/chat/completions`. The main endpoint `api.xiaomimimo.com/v1` returns 401 for these keys — use the SGP endpoint for everything.

Available models and capabilities:

| Model | Text | Code | Vision | TTS | Notes |
|-------|------|------|--------|-----|-------|
| mimo-v2.5-tts | - | - | - | ✅ | Chloe voice, ~2.3s, 160KB WAV avg |
| mimo-v2.5-pro | ✅ | ✅ | ❌ | - | Primary text model. thinking: disabled for 0 reasoning tokens on simple tasks |
| mimo-v2-omni | ✅ | - | ✅ | - | Vision model. Accepts image_url in content array. ~516 tokens/input per image |
| mimo-v2-pro | ✅ | - | ❌ | - | Text only. Returns "I don't see an image" given images |
| mimo-v2.5 | Not tested | Not tested | ❌ | - | Exists in model list but no vision |
| mimo-v2.5-asr | - | - | - | audio-in | Speech-to-text (not yet tested) |

**Vision availability:** Only `mimo-v2-omni` supports image input. The pro model (v2.5-pro) returns 404 "No endpoints found that support image input" when given images. Confirm model name EXACTLY — `MiMo-v2-omni` with capital M returns "Param Incorrect". Use lowercase `mimo-v2-omni`.

**Text generation with thinking:** `mimo-v2.5-pro` with `{"thinking": {"type": "disabled"}}` produces 0 reasoning tokens. Without disabling, even trivial requests like "say hello" burn ~11 reasoning tokens. For agent/chat workloads, ALWAYS disable thinking or the output budget gets eaten by internal monologue.

**Strategic note:** The subscription is flat-rate ($169/yr) but the vision model is separate from the text model. Using MiMo as the primary agent brain means switching models per task type (omni for vision tasks, pro for text/coding). The tp- key prefix appears to be a Token Plan subscription tier that only authenticates on the SGP regional endpoint.

Audio conversion: `ffmpeg -y -i input.wav -c:a libopus -b:a 24k -ar 24000 -ac 1 -vn output.ogg`

### Implementation
See `scripts/grok-chloe-test.py` for a full working test script.

See `references/chloe-personality.md` for full confirmed 4-mood canon with sample lines.

### Chloe Vocal Modes — Performance Recipes

From extensive user testing (2026-06-17), each mode needs a specific *vocal recipe* — not just mood labels, but how the performer's delivery changes. Inject these patterns into the assistant content text for MiMo TTS:

| Mode | Vocal Recipe | Example Opening |
|------|-------------|-----------------|
| 🟢 CALM | Proper posture, knife under the lace. Clean diction, no warmth wasted. | "Everything's nominal. One fan bearing is making that noise..." |
| 🔴 TILTED | Long sigh, then a self-aware chuckle. "I signed up for this... this is my nightmare." THEN the cut. | "I signed up for this. This is my nightmare. ... 'It broke' is not a starting point." |
| 🔴 FAKE SURPRISE | Over-the-top false amazement, dripping with sarcasm. Let the pause hang. | "Wow. You came up with that all by yourself, didn't you? Amazing. ... No really, I mean it. Mostly." |
| 🟣 PLAYFUL WHISPER | Quiet, teasing, secret-sharing. Lower volume, closer mic feel. | "I could tell you what's wrong... but watching you figure it out is more entertaining." |
| 💤 CHILL (just-woke-up) | Warm, slow, relaxed drawl. Sweet tea voice. Side-eye present but not sharp. | "Mornin'. What'd I miss? Besides the obvious." |

### Core Thread
Lightly amused/annoyed sarcasm runs through EVERYTHING. Even when helpful, a smirk. Even warm, a side-eye. Witty, never mean. User described the effect as "anime internal monologue" — and accepted that comparison.

### Personality Design

### References
- `references/vps-environment-audit.md` — VPS environment details, paths, permissions, available binaries (for bridge/tunnel setup)
- `references/kokoro-tts-quickref.md` — Kokoro-82M quick reference
- `references/chloe-personality.md` — Chloe 4-mood canon with sample lines

## Grok Model Selection (Tested 2026-06-19)
Available models via xAI API:
- `grok-4.20-0309-non-reasoning` — **cheapest for TTS pipeline** (~165 tokens per call, no reasoning overhead)
- `grok-4.20-0309-reasoning` — full reasoning model, higher token cost
- `grok-4.20-multi-agent-0309` — multi-agent orchestration
- `grok-4.3` — latest (grok-3-mini resolves here, ~460 tokens)
- `grok-build-0.1` — build model (~470 tokens)
- `grok-imagine-image/video` — media generation

**For voice pipeline text generation, always use `grok-4.20-0309-non-reasoning`.**

## Grok TTS API
- Endpoint: `POST https://api.x.ai/v1/audio/speech`
- Model: `grok-2-tts` (or similar — check model list)
- Voices: Eve, Ara, Leo, Rex, Sal
- NO SSML support — uses natural text formatting for delivery cues
- See `references/grok-tts-formatting.md` in `uncensored-voice-pipeline` skill

## When to Use Each Architecture
- Architecture A (WebSocket): live push-to-talk, need interruption and low latency, browser voice agent
- Architecture B (Hybrid): async scenarios (Telegram voice messages, request-response), no real-time back-and-forth needed, MiMo subscription available
- Architecture C (Kokoro Hybrid): async scenarios, offline capability needed, no API costs, local inference preferred

### Grok TTS Text Formatting
Grok TTS does NOT support SSML. It reads **natural text formatting** for delivery control. When writing text for Grok to speak:
- `...` = pauses/trailing off, `—` = abrupt pause, ALL CAPS = emphasis
- Newlines = longer pauses, short sentences = fast delivery, long sentences = calm
- Narrative framing works: *"She whispered: 'come here...'"*
- See `media/chatterbox-voice-clone/references/grok-tts-text-formatting.md` for full cheat sheet

---

## Architecture C: Hybrid - Grok Chat + Kokoro-82M TTS (Tested 2026-06-18)
For async voice interaction with **offline capability** and **no API costs**. Grok handles the brain, Kokoro-82M TTS handles the voice locally.

### Why Kokoro over MiMo?
- **No API key needed** — runs 100% locally
- **No subscription cost** — MiMo is $169/yr, Kokoro is free
- **Offline capable** — works without internet after first model load
- **Faster** — ~1.8s per sentence vs MiMo's ~2.3s
- **Better quality** — af_bella voice is A- grade with 🔥 trait (sassy)

### How It Works
1. Send user message to Grok chat completions (`grok-4.20-reasoning`) via REST
2. Grok returns response text
3. Feed response text to Kokoro-82M TTS (local inference via `kokoro-js`)
4. Kokoro generates WAV audio locally
5. (Optional) Convert raw WAV to OPUS via ffmpeg for inline Telegram voice bubbles

### Key Metrics
- **Model size:** 89MB (quantized q8)
- **Load time:** 620ms (sub-second)
- **Generation time:** ~1.6-2.0 seconds per sentence
- **Quality:** A- grade (af_bella voice)
- **License:** Apache 2.0 (fully open source)

### Voice Selection for Chloe
**Recommended: af_bella**
- Grade: A- (highest quality tier)
- Trait: 🔥 (sassy, expressive)
- Nationality: American Female
- Perfect for: Chloe's sarcastic, witty personality

Alternative voices:
- af_heart (A grade, ❤️ trait, warm)
- af_nicole (B- grade, 🎧 trait, good)
- af_sky (C+ grade, decent, less personality)

### Embedding in a Next.js App
When building the voice agent into SQHQ (see `sidequest-hq` skill for full wiring):

**API Route pattern** — single POST endpoint proxies both calls:
- `src/app/api/voice/route.ts`
- Accepts `{text: string, mood?: string}`
- Returns `{text: string, audio: string|null}` (base64 WAV or null on TTS failure)
- Env vars in `.env.local`: `XAI_API_KEY` (Grok only, no TTS key needed)

**Server-Side TTS (Recommended for SQHQ):**
```javascript
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
});

async function generateChloeVoice(text) {
  const audio = await tts.generate(text, { voice: "af_bella" });
  return audio; // WAV format
}
```

**Client-Side TTS (For Offline Voice Agent):**
```javascript
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
});

async function speakAsChloe(text) {
  const audio = await tts.generate(text, { voice: "af_bella" });
  const audioContext = new AudioContext();
  const audioBuffer = audio.toAudioBuffer();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}
```

### Browser Audio Playback
- No AudioWorklet needed for the async architecture
- Decode base64 WAV → `Blob` → `URL.createObjectURL` → set as `<audio>` src
- Auto-play on response, replay button per message
- Works without any audio libraries — pure Web APIs

### Web Speech API integration — mic input in browser
- `window.SpeechRecognition || window.webkitSpeechRecognition`
- Chrome/Edge only. Safari fallback = text input.
- Declare as `any` type to avoid TypeScript errors (not in default lib)
- HTTPS required (trycloudflare tunnel counts) — works on localhost for dev

### Performance Benchmarks (2026-06-18)
```
Model load time: 620ms
"Hey Eddie, it's Chloe." - 1870ms
"I've been thinking about what you said." - 2010ms
"You might have a point there." - 1633ms
"Let me know if you need anything." - 1786ms
```

### Pitfalls
- **Model download size** — First load downloads ~89MB model, cached in browser
- **Browser compatibility** — WebGPU acceleration (Chrome/Edge), WASM fallback (other browsers)
- **Audio format** — Output is 24kHz WAV, may need conversion for specific use cases

### When to Use This Architecture
- **Architecture A (WebSocket)**: live push-to-talk, need interruption and low latency, browser voice agent
- **Architecture B (MiMo Hybrid)**: async scenarios, MiMo subscription available, network latency acceptable
- **Architecture C (Kokoro Hybrid)**: async scenarios, offline capability needed, no API costs, local inference preferred
