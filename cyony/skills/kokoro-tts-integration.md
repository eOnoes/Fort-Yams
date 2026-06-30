# Kokoro-82M TTS - Integration Guide for SQHQ

## Overview
Kokoro-82M is a frontier TTS model (82M parameters) that runs 100% locally. Tested 2026-06-18 as a replacement for MiMo TTS in SQHQ's voice agent.

## Key Metrics
- **Model size:** 89MB (quantized q8)
- **Load time:** 620ms (sub-second)
- **Generation time:** ~1.6-2.0 seconds per sentence
- **Quality:** A- grade (af_bella voice)
- **License:** Apache 2.0 (fully open source)
- **No API key needed** - runs locally

## Voice Selection for Chloe

### Recommended: af_bella
- **Grade:** A- (highest quality tier)
- **Trait:** 🔥 (sassy, expressive)
- **Nationality:** American Female
- **Perfect for:** Chloe's sarcastic, witty personality

### Alternative Voices
| Voice | Grade | Trait | Notes |
|-------|-------|-------|-------|
| **af_bella** | A- | 🔥 | **Best for Chloe** - sassy, high-quality |
| af_heart | A | ❤️ | Default, warm |
| af_nicole | B- | 🎧 | Good, slightly lower quality |
| af_sky | C+ | - | Decent, less personality |

## Implementation Options

### Option A: Client-Side (Browser) - Recommended for Voice Agent
Use kokoro-js in the browser for real-time TTS.

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

**Benefits:**
- Works offline after first load
- Zero network latency for TTS
- Model cached in browser (~89MB)

### Option B: Server-Side (Node.js) - Recommended for Spite Mutter Clips
Pre-generate audio files for the 30 Spite mutter variants.

```javascript
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
});

const audio = await tts.generate("Hey Eddie, it's Chloe.", {
  voice: "af_bella",
});

await audio.save("chloe-voice.wav");
```

**Benefits:**
- Pre-generate all 30 Spite mutter clips
- Serve static WAV files
- No client-side processing

### Option C: Hybrid (Recommended for SQHQ)
- Real-time TTS in browser for voice agent
- Pre-generate Spite mutter clips server-side
- Best of both worlds

## Performance Benchmarks (2026-06-18)

```
Model load time: 620ms
"Hey Eddie, it's Chloe." - 1870ms
"I've been thinking about what you said." - 2010ms
"You might have a point there." - 1633ms
"Let me know if you need anything." - 1786ms
```

## Comparison to MiMo TTS

| Metric | MiMo TTS | Kokoro-82M |
|--------|----------|------------|
| **API Key** | Required | None |
| **Cost** | $169/yr subscription | Free |
| **Latency** | ~2.3s (network) | ~1.8s (local) |
| **Offline** | No | Yes |
| **Model Size** | N/A (API) | 89MB |
| **Quality** | Good | A- grade |

## Integration Path for SQHQ

### Step 1: Install kokoro-js
```bash
cd /opt/data/SideQuestHQ
npm install kokoro-js
```

### Step 2: Update Voice API Route
Replace MiMo TTS call in `src/app/api/voice/route.ts`:

```typescript
// OLD: MiMo TTS
const mimoResponse = await fetch('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions', { ... });

// NEW: Kokoro TTS (server-side)
import { KokoroTTS } from "kokoro-js";
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8" });
const audio = await tts.generate(chloeText, { voice: "af_bella" });
```

### Step 3: Update Client-Side (Optional)
For offline voice agent, use kokoro-js in the browser:

```typescript
// In VoiceAgent.tsx
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8" });

async function speakAsChloe(text) {
  const audio = await tts.generate(text, { voice: "af_bella" });
  // Play audio
}
```

### Step 4: Pre-generate Spite Mutter Clips
Generate all 30 Spite mutter variants and save to `/public/audio/spite/`:

```bash
node scripts/generate-spite-clips.mjs
```

## Pitfalls

### Model Download Size
- First load downloads ~89MB model
- Cached in browser (localStorage/IndexedDB)
- Warn users about initial download

### Browser Compatibility
- WebGPU acceleration (Chrome/Edge)
- WASM fallback (other browsers)
- Test on target browsers

### Audio Format
- Output: 24kHz WAV
- May need conversion for specific use cases
- ffmpeg for OPUS conversion: `ffmpeg -y -i input.wav -c:a libopus -b:a 24k -ar 24000 -ac 1 -vn output.ogg`

## Voice Customization (2026-06-19)

Kokoro has 50+ preset voices baked into the model. No built-in voice cloning. Paths to custom Scout voice:

1. **KVoiceWalk** (⭐256) — RECOMMENDED. Random walk algorithm evolves voice tensors toward target audio. Achieves 90-93% speaker similarity. Needs GPU + ~30-60 min. Output: `.pt` file compatible with Kokoro inference. Repo: github.com/RobViren/kvoicewalk. See `chatterbox-voice-clone` skill `references/kokoro-voice-walk.md` for details.
2. **Voice blending** — mix two presets via `voice-blend.mjs` (tested, imprecise). Quick hack, not exact.
3. **Fine-tuning** — train on Scout audio samples for new voice embedding (needs GPU compute, open weights Apache 2.0). Community forks: semidark/kokoro-deutsch, gushilabs/train-kokoro-encoder-styletts2.

**Quality assessment (tested 2026-06-19):** af_bella is NOT Scout. Eddie: "NO v3." It's pleasant but lacks the emotional impact of the real voice. af_bella = ~85% match, good for fast fallback only. Use MiMo VoiceClone for primary live voice (exact match, ~4s). Use Chatterbox for premium cached clips (exact match, ~38s).

**Endgame:** KVoiceWalk on Kokoro = exact voice + ~2s speed + free forever.

## Files Generated (2026-06-18)
- `/tmp/kokoro-test/chloe-test.wav` - Initial test
- `/tmp/kokoro-test/af_bella.wav` - Chloe voice sample
- `/tmp/kokoro-test/af_heart.wav` - Alternative voice
- `/tmp/kokoro-test/af_nicole.wav` - Alternative voice
- `/tmp/kokoro-test/af_sky.wav` - Alternative voice
- `/tmp/kokoro-test/benchmark.mjs` - Performance benchmark script
- `/tmp/kokoro-test/compare-voices.mjs` - Voice comparison script

## References
- HuggingFace: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- NPM: https://www.npmjs.com/package/kokoro-js
- GitHub: https://github.com/hexgrad/kokoro
- StreamingKokoroJS: https://github.com/rhulha/StreamingKokoroJS (browser demo)
