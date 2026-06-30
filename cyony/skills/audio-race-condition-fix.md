# Audio Race Condition Fix — Generation Counter Pattern

## The Problem

When multiple async handlers share a `React.MutableRefObject<HTMLAudioElement | null>`, a race condition occurs:

1. Handler A fires → calls async `playRandomScoutQuip()` (fire-and-forget, no `await`)
2. Handler B fires 200ms later → detects interrupt, calls `playInterruptionClip()` which pauses `currentAudioRef.current`
3. Handler A's async Audio creation completes → creates NEW Audio, calls `play()` → starts playing AFTER the interrupt tried to stop it
4. **Result: both audios playing simultaneously**

The interrupt system can't stop what doesn't exist yet.

## The Fix: Generation Counter

```typescript
const audioGenerationRef = useRef(0);

// In EACH handler (handleDismissReminder, handleCompleteReminder):
const gen = ++audioGenerationRef.current;

// In the quipFn passed to scheduleDelayedQuip:
async () => {
  if (audioGenerationRef.current !== gen) return; // stale — another action fired
  playRandomScoutQuip(prefix, count, currentAudioRef).then((played) => {
    if (audioGenerationRef.current !== gen) return; // double-check after async
    if (!played) speakWithTTS(text, currentAudioRef);
  });
}
```

**Why double-check?** `playRandomScoutQuip` is also async — it creates `new Audio(url)` inside. The `.then()` callback runs after that creation. By the time it fires, another action may have bumped the generation.

## Aggressive Audio Stop

`pause()` + `currentTime = 0` is NOT enough. The Audio element can resume if something else calls `play()` on it. Release the resource entirely:

```typescript
function stopAudio(ref: React.MutableRefObject<HTMLAudioElement | null>) {
  const el = ref.current;
  if (el) {
    el.pause();
    el.currentTime = 0;
    el.src = ""; // release the resource — can't resume
    ref.current = null;
  }
}
```

Apply in: `playInterruptionClip`, `speakWithTTS`, and anywhere you stop previous audio.

## When This Pattern Applies

- Multiple async handlers sharing a single audio ref
- Fire-and-forget audio playback (no `await` on the play call)
- Interrupt systems where a second action must kill the first action's audio
- Any "stop previous + play new" pattern where the "previous" might still be initializing
