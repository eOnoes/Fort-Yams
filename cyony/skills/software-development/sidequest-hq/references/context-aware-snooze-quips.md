# Context-Aware Snooze Quip System

## Overview
Replaced the old static tier system (warn/scold/give-up with fixed quip pools) with a context-aware generator that knows total reminders, remaining count, rapid-fire timing, and whether this is the last reminder.

## Function Signature
```typescript
function generateSnoozeQuip(ctx: {
  snoozedSoFar: number;  // how many dismissed including current
  remaining: number;      // how many still visible
  total: number;          // how many were visible at time of swipe
  rapidFire: boolean;     // snoozed another within 3 seconds
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

## Context Tracking in Component
```tsx
// In handleDismissReminder:
const totalVisible = visibleReminders.length;  // total on screen
const snoozedSoFar = dismissedIds.size + 1;    // +1 for this one
const remaining = totalVisible - snoozedSoFar;
const isLast = remaining <= 0;
const now = Date.now();
const rapidFire = now - lastSnoozeTime < 3000;  // 3s window
setLastSnoozeTime(now);
```

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
