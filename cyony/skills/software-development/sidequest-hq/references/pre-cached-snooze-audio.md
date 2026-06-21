# Pre-Cached Snooze Audio — Tier Architecture

## Overview
51 MiMo TTS voice clips pre-generated as OGG Opus files. App plays cached audio instantly on snooze/complete, falls back to live MiMo TTS only if clip missing. Eliminates the ~4s API delay for common actions.

## Tier Mapping (App-Side Logic)

| Context | Prefix | Pool Size | Trigger |
|---------|--------|-----------|---------|
| 1st snooze | `s0` | 5 | `snoozedSoFar === 1` |
| 2nd snooze | `s1` | 5 | `snoozedSoFar === 2` |
| 3rd snooze | `s2` | 5 | `snoozedSoFar === 3` |
| 4th snooze | `s3` | 5 | `snoozedSoFar === 4` |
| 5th+ snooze | `s4` | 5 | `snoozedSoFar >= 5` |
| Last reminder | `s5` | 5 | `remaining <= 0` (overrides all) |
| Rapid-fire | `sr` | 5 | `rapidFire && snoozedSoFar >= 3` |
| Repeat reminder | `srp` | 5 | Same reminder snoozed before (not yet wired) |
| Complete | `c` | 5 | Marking reminder done |
| Agent filler | `af` | 6 | User sends message in Agent tab |

Priority: `isLast` > `rapidFire` > `snoozedSoFar` tier escalation.

## Quip Text Samples

### s0 (Casual)
- "I guess we're just ignoring that one. Cool."
- "Snoozed. No judgment. Okay, a little judgment."
- "First one? Bold move. I'll allow it."

### s2 (Medium)
- "Zero responsibilities. Got it."
- "Third snooze. That's a pattern now."
- "I'm starting to take this personally."

### s4 (Nuclear)
- "Five snoozes. I'm not even mad, I'm impressed."
- "This is a snooze championship and you're in first place."
- "I need therapy after this. Robot therapy. You've broken me."

### s5 (Last)
- "And that's the last one. Every single reminder snoozed. You absolute menace."
- "Zero remaining. You did it. I'm nominating you for an award."

### sr (Rapid-Fire)
- "Whoa whoa slow down! You're just mowing through these!"
- "Speed snoozer over here! Pace yourself!"

### af (Agent Filler)
- "Interesting. Give me a second."
- "Hmm. Let me look into that."
- "Okay. Working on it."

## Generation

### Script
`scripts/generate-scout-audio.py` — reads `scripts/quip-manifest.json`, calls MiMo TTS API for each quip, converts WAV→OGG via ffmpeg, writes manifest.

### API Key
Uses `MIMO_API_KEY` from `.env.local` (NOT `XAI_API_KEY` — that's for Grok). 401 error = wrong key.

### Output
- `public/audio/scout/*.ogg` — 51 files, ~2MB total
- `public/audio/scout/manifest.json` — `{key: {ogg, text, category}}` mapping

### Re-generation
Delete OGG files + manifest, re-run script. Script skips existing files (idempotent).

## App-Side Integration

### scout-audio.ts (Library)
```typescript
// Try cached first, return URL or null
export async function getScoutAudio(key: string): Promise<string | null>

// Play with stop-previous support
export async function playScoutAudio(key: string, currentAudioRef?): Promise<boolean>

// Random from numbered pool
export async function playRandomScoutQuip(prefix: string, count: number, currentAudioRef?): Promise<string | null>
```

### HomeFeed.tsx (Snooze Handler)
```typescript
// Tier selection
let audioPrefix = "s0";
if (isLast) audioPrefix = "s5";
else if (rapidFire && snoozedSoFar >= 3) audioPrefix = "sr";
else if (snoozedSoFar >= 5) audioPrefix = "s4";
// ... etc

// Cached first, live TTS fallback
playRandomScoutQuip(audioPrefix, 5, currentAudioRef).then((played) => {
  if (!played) speakWithTTS(text, currentAudioRef);
});
```

### VoiceAgent.tsx (Agent Filler)
```typescript
// Right after setLoading(true):
playRandomScoutQuip('af', 6, audioRef)
```

## File Sizes (OGG Opus 64k)
- Short clip (~10 chars): ~14-20KB
- Medium clip (~40 chars): ~25-40KB
- Long clip (~80 chars): ~50-75KB
- 51 clips total: ~1.9MB
