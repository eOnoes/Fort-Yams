# Kokoro-82M TTS - Quick Reference

## Model Details
- **Model:** `onnx-community/Kokoro-82M-v1.0-ONNX`
- **Size:** 89MB (quantized q8)
- **License:** Apache 2.0 (fully open source)
- **Quality:** A- grade (af_bella voice)

## Voice Selection for Chloe
**Primary: af_bella**
- Grade: A- (highest quality tier)
- Trait: 🔥 (sassy, expressive)
- Nationality: American Female
- Perfect for: Chloe's sarcastic, witty personality

**Alternatives:**
- af_heart (A grade, ❤️ trait, warm)
- af_nicole (B- grade, 🎧 trait, good)
- af_sky (C+ grade, decent, less personality)

## Performance (2026-06-18)
- Model load: 620ms
- Generation: ~1.6-2.0s per sentence
- Output: 24kHz WAV

## Code Samples

### Node.js (Server-Side)
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

### Browser (Client-Side)
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

## Comparison to MiMo TTS
| Metric | MiMo TTS | Kokoro-82M |
|--------|----------|------------|
| API Key | Required | None |
| Cost | $169/yr | Free |
| Latency | ~2.3s (network) | ~1.8s (local) |
| Offline | No | Yes |
| Model Size | N/A (API) | 89MB |
| Quality | Good | A- grade |

## Integration Path
1. Install: `npm install kokoro-js`
2. Update API route to use Kokoro instead of MiMo
3. Remove `MIMO_API_KEY` from `.env.local`
4. Pre-generate Spite mutter clips server-side
5. (Optional) Add client-side TTS for offline voice agent

## References
- HuggingFace: https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- NPM: https://www.npmjs.com/package/kokoro-js
- GitHub: https://github.com/hexgrad/kokoro
- Browser Demo: https://github.com/rhulha/StreamingKokoroJS
