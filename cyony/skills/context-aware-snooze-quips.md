# Context-Aware Snooze Quip System

## Overview
Replaced the old static tier system (warn/scold/give-up with fixed quip pools) with a context-aware generator that knows total reminders, remaining count, rapid-fire timing, and whether this is the last reminder.

## Function Signature
```typescript
function generateSnoozeQuip(ctx: {
  snoozedSoFar: number;  // how many dismissed including current
  remaining: number;      // how many still visible
  total: number;          // how many were visible at time of swipe
  rapidFire: boolean;     // snoozed another within 1 second (was 3s)
  isLast: boolean;        // remaining <= 0
}): { text: string; tier: "first" | "rapid" | "mid" | "low" | "last" }
```

## Tier Logic (Priority Order)
1. **last** (isLast) — Celebration. "Snooze button champion of 2026."
2. **rapid** (rapidFire && snoozedSoFar >= 2) — "Whoa whoa slow down."
3. **low** (remaining <= 2) — "Almost done clearing the board."
4. **mid** (snoozedSoFar > total/2) — "The snooze is winning."
5. **first** (snoozedSoFar <= 1) — "First one? Bold."
6. **mid** (default) — Standard sass with count references.

## Context Tracking in Component (FIXED June 2026)

**Original bug:** Used `dismissedIds.size` which has a 1.5s animation delay. Rapid-fire snoozes → stale counts → "5 remaining" even after snoozing 3 items.

**Fixed approach:** Ref-based counter increments instantly, baseline total captured once on first snooze:
```tsx
// Refs (stable across renders, update immediately):
const snoozeCountRef = useRef(0);
const baselineTotalRef = useRef<number | null>(null);

// In handleDismissReminder:
snoozeCountRef.current += 1;
const snoozedSoFar = snoozeCountRef.current;

// Capture baseline total on first snooze — stays stable as items animate out
const currentVisible = feedItems.filter(f => f.type === "reminder" && !completedIds.has(f.id)).length;
if (baselineTotalRef.current === null) baselineTotalRef.current = currentVisible;
const total = baselineTotalRef.current;

const remaining = Math.max(0, total - snoozedSoFar - completedIds.size);
const isLast = remaining <= 0;
const now = Date.now();
const rapidFire = now - lastSnoozeTime < 1000;  // 1s window (was 3s)
setLastSnoozeTime(now);
```

**Why not state:** `setSnoozeCount(snoozedSoFar)` is async (React batching). When rapid-swiping, the next handler fires before the state update re-renders. A ref (`snoozeCountRef.current`) updates synchronously — every handler reads the correct cumulative count immediately.

## CSS Tier Classes
- `.snooze-toast-first` — yellow tint
- `.snooze-toast-rapid` — orange tint
- `.snooze-toast-mid` — muted grey
- `.snooze-toast-low` — red tint
- `.snooze-toast-last` — gold, celebration (2px border, font-weight: 600)

## Toast Emoji by Tier
```tsx
{toast.tier === "last" ? "Scout 🏆" : toast.tier === "rapid" ? "Scout 😤" : toast.tier === "low" ? "Scout 💀" : "Scout"}
```

## Voice: MiMo TTS Reads Quip Aloud
Every swipe triggers `speakWithTTS(text, currentAudioRef)` which POSTs to `/api/voice` with `{text, mood: "annoyed"}`. Returns base64 WAV played via `new Audio("data:audio/wav;base64," + data.audio)`. Previous audio is stopped first (stop+replace pattern). Unlimited variety — TTS reads any text, no pre-cached pool needed.
