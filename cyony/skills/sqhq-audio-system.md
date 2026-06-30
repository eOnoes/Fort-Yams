# SQHQ Audio System Architecture

Reference implementation for the voice-interactive mobile app patterns.

## File Structure

```
src/
├── app/components/
│   ├── HomeFeed.tsx          # Main feed with swipe-to-snooze/complete
│   └── SwipeableCard.tsx     # Swipe gesture component
├── lib/
│   └── scout-audio.ts        # Audio cache + playback utilities
└── public/audio/scout/
    ├── manifest.json          # Clip manifest (key → ogg mapping)
    └── *.ogg                  # Pre-generated TTS clips
```

## Key Refs in HomeFeed.tsx

```typescript
const currentAudioRef = useRef<HTMLAudioElement | null>(null);  // Currently playing Audio element
const audioGenerationRef = useRef(0);  // Race condition guard
const pendingQuipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);  // Interrupt marker
const pendingQuipFn = useRef<(() => Promise<void>) | null>(null);  // Stored quip for interrupt
const interruptionCount = useRef(0);  // Tracks interruption depth
const snoozeCountRef = useRef(0);  // Instant snooze count (not React state)
const completedCountRef = useRef(0);  // Instant complete count
```

## Flow: Snooze Swipe

1. User swipes left → `handleDismissReminder` fires
2. `snoozeCountRef.current += 1` (instant, no animation delay)
3. Tier selected based on count (s0→s1→s2→s3→s4→s5, sr for rapid-fire)
4. `scheduleDelayedQuip` called with generation-guarded quipFn
5. If first action: plays immediately, sets 2s marker
6. If interrupt: kills old audio, plays grunt, immediately plays new quip
7. Card collapses via `swipeable-card-outer-collapse` CSS class (1.5s animation)

## Flow: Complete Swipe

1. User swipes right → `handleCompleteReminder` fires
2. `completedCountRef.current += 1`
3. `toggleReminder(idx)` updates store
4. Same `scheduleDelayedQuip` flow as snooze

## scheduleDelayedQuip Signature

```typescript
function scheduleDelayedQuip(
  quipFn: () => Promise<void>,           // The audio to play
  pendingTimer: MutableRefObject<...>,    // Interrupt detection timer
  pendingFn: MutableRefObject<...>,       // Stored quip for re-fire
  interruptionCount: MutableRefObject<number>,
  currentAudioRef: MutableRefObject<HTMLAudioElement | null>,
  isSnooze: boolean,
  snoozedSoFar: number,
  completedSoFar: number,
  remaining: number,
): void
```

## Clip Manifest Format

```json
{
  "s0_1": { "ogg": "s0_1.ogg", "text": "I guess we're just ignoring that one.", "category": "snooze" },
  "c_1": { "ogg": "c_1.ogg", "text": "Well look at you being productive.", "category": "complete" },
  "int_1": { "ogg": "int_1.ogg", "text": "hmph", "category": "interrupt" }
}
```

## Tier Mapping (Snooze Count → Clip Prefix)

| Count | Prefix | Pool Size | Vibe |
|-------|--------|-----------|------|
| 1     | s0     | 5         | Casual |
| 2     | s1     | 5         | Mild |
| 3     | s2     | 5         | Medium |
| 4     | s3     | 5         | Hot |
| 5+    | s4     | 5         | Nuclear |
| last  | s5     | 5         | Special |
| rapid | sr     | 5         | Rapid-fire |

## Known Issues Fixed

- **Create-before-async race (2026-06-24):** `playScoutAudio` did `await getScoutAudio(key)` (async manifest fetch) BEFORE creating `new Audio()`. During that async gap, interrupt checked `currentAudioRef.current` → found NULL → skipped stopping → both clips played simultaneously. Same bug in `speakWithTTS`. Fix: create Audio element synchronously, track on ref immediately, verify `ref.current === audio` after async completes. If ref was cleared/swapped by interrupt, abort silently.
- **Generation counter (original):** Async `new Audio()` in fire-and-forget quipFn created audio AFTER interrupt tried to stop it → generation counter stamps each action, stale ops check before playing.
- **Incomplete cleanup:** `pause()` + `currentTime = 0` didn't fully release → `src = ""`.
- **Long interruption delay:** 2s timer + TTS API latency = 6-8s gap → grunt + immediate new quip.
- **Ghost toasts:** Floating snooze text toasts looked like leftover card fragments → removed, audio-only.
- **Action quip text bubble (2026-06-24):** Chat bubble showing Scout's exact words after every swipe was redundant with audio. User explicitly requested removal — audio-only feedback.
- **Stale next-server zombies:** Old `next-server` process hogging port 3000 with cached chunk hashes → `ps aux | grep next-server` then `kill -9` specific PIDs. NOTE: `lsof` and `fuser` are often unavailable in Docker containers.
- **fab-bubble never dismissing:** `latestReply` state had no auto-dismiss → added `useEffect` with 5s timeout to clear it.

## Voice API Pipeline (api/voice/route.ts)

```
1. MiMo LLM (mimo-v2.5) → generates Scout/Chloe text response (15s timeout)
2. MiMo TTS (mimo-v2.5-tts-voiceclone) → converts to WAV audio (20s timeout)
   Uses eddie_chill_reference.wav from /opt/data/shared/chloe-voice-clone/
3. Returns { text, audio: base64WAV }
```

System prompt is ~500 tokens of Chloe Vance persona with 18 mood modes.
Max tokens: 200. Thinking: disabled.

**Bottleneck:** Two sequential cloud API calls to Singapore. Total 15-35s.
**Target:** Local Ollama + local TTS = 6-9s.

## Clip Rotation / Supply Drop System (Planned)

**Concept:** Keep 20 snooze + 20 complete + 10 greeting + 10 misc on phone (60 clips, ~9MB). Cloud stash has 200+ variants. Every 2 weeks, swap 50% of cached clips from stash. Cron job rewrites stale/repetitive clips using local LLM.

**Sync flow:**
1. Phone app opens → checks `/api/clip-sync?version=X`
2. Server responds with new clip URLs + which to drop
3. Phone downloads new, deletes retired
4. Updates local manifest

**Cron rewrite (weekly):**
1. Log which clips were played most (via `/api/clip-play-log`)
2. Take top 10 most-repeated
3. Use local LLM to rewrite same sentiment in 5-10 new ways
4. Generate TTS audio for each variation
5. Add to cloud stash, mark old as "retired"
