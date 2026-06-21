# Pre-Cached Audio Architecture for Web Apps

Pattern for instant TTS playback in web apps — zero latency on common phrases, live TTS fallback for dynamic content.

## Architecture

```
User action → Check cache → Hit? Play OGG instantly
                          → Miss? Call /api/voice (live TTS) → Play WAV
```

## File Structure

```
public/audio/scout/
├── manifest.json      # key → {ogg, text, category}
├── s0_1.ogg           # tier 0, clip 1
├── s0_2.ogg           # tier 0, clip 2
├── ...
├── af_1.ogg           # agent filler, clip 1
└── c_1.ogg            # complete, clip 1
```

## Manifest Format

```json
{
  "s0_1": { "ogg": "s0_1.ogg", "text": "I guess we're just ignoring that one.", "category": "snooze" },
  "af_1": { "ogg": "af_1.ogg", "text": "Interesting. Give me a second.", "category": "agent_filler" }
}
```

## Client Library (scout-audio.ts)

Key exports:
- `getScoutAudio(key)` → OGG URL or null
- `playScoutAudio(key, audioRef)` → boolean (stops previous audio)
- `playRandomScoutQuip(prefix, count, audioRef)` → key or null (picks random from pool)
- `playRandomFromKeys(keys, audioRef)` → key or null (tries shuffled keys)

**Critical:** Pass `audioRef` to stop previous audio before playing new clip. Without it, rapid-fire actions create audio overlap.

## Batch Generation Script Pattern

```python
# For each quip:
payload = {
    "model": "mimo-v2.5-tts-voiceclone",
    "messages": [
        {"role": "user", "content": ""},
        {"role": "assistant", "content": text}
    ],
    "audio": {"voice": data_url_with_reference_audio, "format": "wav"},
    "stream": False,
    "thinking": {"type": "disabled"}
}
# Call API → get WAV → convert to OGG with ffmpeg → write manifest
```

**Rate limit:** 0.5s sleep between calls. 51 clips ≈ 30 seconds.

## Audio Batching for Rapid-Fire UI Actions

When user triggers multiple actions in quick succession (swiping cards, rapid clicks):

```
Action 1 (gap > 1s): Play audio immediately
Action 2, 3, 4 (within 1s): Silent — just animate UI
After 1s of quiet: Play ONE summary clip at escalated tier
```

Implementation:
- `pendingBatchCount` ref tracks queued count
- `snoozeBatchTimer` ref holds the debounce timeout
- First action plays immediately, subsequent actions increment count
- Timer resets on each action, fires after 1s of quiet

Result: 2 audio clips max instead of N. User hears first reaction + batch summary.

## Agent Tab Filler Audio

Pre-cached "thinking" phrases that play IMMEDIATELY when user sends a message, before the LLM response arrives:

- "Interesting. Give me a second."
- "Hmm. Let me look into that."
- "Okay. Working on it."
- "Got it. One moment."

These fill 3-5 seconds of dead space while the brain + TTS generates the real response. Play synchronously right after `setLoading(true)`.

## SwipeableCard Timing Pitfall

Fire the action callback IMMEDIATELY on swipe threshold crossing, NOT after the animation completes. The original SideQuest card had a 2500ms delay (400ms shrink + 2500ms tuck) before firing `onSwipeLeft`. This made audio feel sluggish.

**Correct timing:**
- Swipe crosses threshold → fire callback → audio plays
- Animation continues independently (shrink 400ms → tuck 800ms → fade)

## Voice Route for Live Fallback

When cache misses, the `/api/voice` route should use voiceclone too (not standard TTS) for voice consistency:

```typescript
const ttsPayload = {
  model: 'mimo-v2.5-tts-voiceclone',
  messages: [
    { role: 'user', content: '' },
    { role: 'assistant', content: textToSpeak }
  ],
  audio: { voice: referenceAudioDataUrl, format: 'wav' },
}
```

Load reference audio once at module level (Next.js API route) to avoid re-reading the file on every request.
