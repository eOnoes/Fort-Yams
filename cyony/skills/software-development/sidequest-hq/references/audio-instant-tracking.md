# Audio Instant Tracking Pattern (June 2026)

## The Bug

Both `playScoutAudio` and `speakWithTTS` created the Audio element **after** async work (manifest fetch / TTS API call). During the async gap, the interrupt system had no Audio element to stop. Result: both snooze and complete clips playing simultaneously.

## Timeline of the Bug

```
t=0   User swipes snooze → scheduleDelayedQuip fires
t=1   quipFn starts → playRandomScoutQuip → playScoutAudio
t=2   playScoutAudio starts fetch("/audio/scout/manifest.json") — ASYNC
t=3   User swipes complete → scheduleDelayedQuip fires again
t=4   isInterrupt=true → playInterruptionClip fires
t=5   playInterruptionClip reads currentAudioRef.current → NULL (manifest still loading)
t=6   Interrupt skips stopping — no Audio element exists yet
t=7   Manifest fetch completes → Audio element created → snooze clip plays
t=8   Complete quip fires → complete clip plays
RESULT: Both play at once
```

## The Fix

Create the Audio element **immediately** (synchronously), store it on the ref, THEN do async work. After the async work completes, check if the ref still points to this Audio — if interrupt cleared it, bail.

### `playScoutAudio` — Before (broken)

```typescript
export async function playScoutAudio(key, currentAudioRef) {
  const url = await getScoutAudio(key); // ASYNC — nothing on ref during this
  if (!url) return false;
  try {
    if (currentAudioRef?.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    const audio = new Audio(url); // created AFTER async work
    if (currentAudioRef) currentAudioRef.current = audio;
    await audio.play();
    return true;
  } catch { return false; }
}
```

### `playScoutAudio` — After (fixed)

```typescript
export async function playScoutAudio(key, currentAudioRef) {
  // === CREATE IMMEDIATELY ===
  const audio = new Audio(); // synchronous — no async gap
  if (currentAudioRef) {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    currentAudioRef.current = audio; // TRACKED BEFORE any async work
  }

  const url = await getScoutAudio(key); // async — but ref is already set
  if (!url) {
    if (currentAudioRef?.current === audio) currentAudioRef.current = null;
    return false;
  }

  // === CHECK: was this audio interrupted while we were fetching? ===
  if (currentAudioRef?.current !== audio) return false; // abandoned, bail

  try {
    audio.src = url; // set src AFTER checking (not in constructor)
    await audio.play();
    return true;
  } catch {
    if (currentAudioRef?.current === audio) currentAudioRef.current = null;
    return false;
  }
}
```

### `speakWithTTS` — Before (broken)

```typescript
async function speakWithTTS(text, currentAudioRef) {
  const el = currentAudioRef.current;
  if (el) { el.pause(); el.currentTime = 0; el.src = ""; currentAudioRef.current = null; }
  try {
    const res = await fetch("/api/voice", {...}); // ASYNC — nothing on ref
    if (!res.ok) return;
    const data = await res.json();
    if (data.audio) {
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`); // after async
      currentAudioRef.current = audio;
      await audio.play().catch(() => {});
    }
  } catch {}
}
```

### `speakWithTTS` — After (fixed)

```typescript
async function speakWithTTS(text, currentAudioRef) {
  // === CREATE IMMEDIATELY ===
  const audio = new Audio(); // synchronous
  if (currentAudioRef.current) {
    currentAudioRef.current.pause();
    currentAudioRef.current.currentTime = 0;
    currentAudioRef.current.src = "";
  }
  currentAudioRef.current = audio; // TRACKED BEFORE fetch

  try {
    const res = await fetch("/api/voice", {...}); // async — but ref is set
    if (!res.ok) { currentAudioRef.current = null; return; }
    const data = await res.json();
    if (data.audio) {
      // === CHECK: interrupted while fetching? ===
      if (currentAudioRef.current !== audio) return; // abandoned
      audio.src = `data:audio/wav;base64,${data.audio}`;
      await audio.play().catch(() => {});
    }
  } catch {
    if (currentAudioRef.current === audio) currentAudioRef.current = null;
  }
}
```

## The Pattern (Generalized)

For any function that creates an asynchronous resource that an interrupt/abort mechanism must be able to stop:

1. **Create the resource handle synchronously** (Audio element, AbortController, etc.)
2. **Store it on the tracking ref immediately** — before any `await`
3. **Do the async work** (fetch, API call, manifest load)
4. **Check if the ref still points to your resource** — if not, an interrupt fired and you should bail
5. **If still active, configure and use the resource**

## Distinction from Generation Counter Pattern

- **Generation counter** (`audioGenerationRef`): prevents TWO action handlers from racing each other. Each action bumps the counter; stale async callbacks check and abort.
- **Instant tracking** (this pattern): prevents the interrupt system from having a "blind spot" during async setup. Even within a SINGLE action, there's a gap between the function call and the Audio element existing — unless you create it synchronously.

Both patterns are needed. Generation counter alone isn't enough — the interrupt fires `playInterruptionClip` which reads `currentAudioRef.current`. If that's null (because the Audio hasn't been created yet), it can't stop anything.

## Affected Files

- `src/lib/scout-audio.ts` — `playScoutAudio()` 
- `src/app/components/HomeFeed.tsx` — `speakWithTTS()`

## Verification

- Swipe snooze → immediately swipe complete → only complete clip plays (snooze is killed during manifest fetch)
- Swipe complete → immediately swipe snooze → only snooze clip plays (complete is killed during API call)
- Rapid 3-way: snooze → complete → snooze within 2s → only last snooze clip plays
