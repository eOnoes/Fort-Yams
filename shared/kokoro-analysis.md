# Kokoro-82M TTS - Chloe Voice Analysis

## TL;DR
✅ **Kokoro-82M is a PERFECT replacement for MiMo TTS for Chloe.**

## Key Findings

### Performance
- **Model size:** 89MB (quantized q8)
- **Load time:** 620ms (sub-second!)
- **Generation time:** ~1.6-2.0 seconds per sentence
- **Quality:** A- grade (af_bella voice)

### Voices Tested
| Voice | Grade | Trait | Notes |
|-------|-------|-------|-------|
| **af_bella** | A- | 🔥 | **Best for Chloe** - sassy, high-quality |
| af_heart | A | ❤️ | Default, warm |
| af_nicole | B- | 🎧 | Good, slightly lower quality |
| af_sky | C+ | - | Decent, less personality |

### Why This is HUGE for SQHQ

**vs MiMo TTS:**
- MiMo: API key required, costs money, network latency, ~2.3s per clip
- Kokoro: **Free, local, offline, ~1.8s per clip, no API dependency**

**Technical Benefits:**
- ✅ Runs 100% locally (no API calls)
- ✅ Works offline (perfect for SQHQ PWA)
- ✅ Apache 2.0 license (fully open source)
- ✅ Works in browser (kokoro-js) AND Node.js
- ✅ No API key needed
- ✅ Faster than MiMo (1.8s vs 2.3s)

### Implementation Options

**Option A: Client-Side (Browser)**
- Use kokoro-js in the browser
- Model downloads once (~89MB), cached
- Works offline after first load
- Zero network latency for TTS

**Option B: Server-Side (Node.js)**
- Pre-generate audio files
- Serve static WAV files
- No client-side processing
- Good for Spite mutter clips

**Option C: Hybrid (Recommended)**
- Real-time TTS in browser for voice agent
- Pre-generate Spite mutter clips server-side
- Best of both worlds

### Voice: af_bella for Chloe
- **Grade:** A- (highest quality tier)
- **Trait:** 🔥 (sassy, expressive)
- **Nationality:** American Female
- **Perfect for:** Chloe's sarcastic, witty personality

### Sample Code (Node.js)
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

### Sample Code (Browser)
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

## Next Steps
1. Test af_bella voice sample with Eddie
2. Replace MiMo TTS with Kokoro in Voice API route
3. Pre-generate Spite mutter clips (30 variants)
4. Implement client-side TTS for voice agent
5. Update SQHQ skill with Kokoro integration

## Files Generated
- `/tmp/kokoro-test/chloe-test.wav` - Initial test
- `/tmp/kokoro-test/af_bella.wav` - Chloe voice sample
- `/tmp/kokoro-test/af_heart.wav` - Alternative voice
- `/tmp/kokoro-test/af_nicole.wav` - Alternative voice
- `/tmp/kokoro-test/af_sky.wav` - Alternative voice
