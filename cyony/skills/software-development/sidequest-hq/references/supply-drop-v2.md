# Supply Drop v2 — Weekly Rotation with Retooling

## Overview
The Supply Drop system manages a pool of rejection clips for the Match button. Clips rotate weekly with retooling (different inflection each return) and graduation (retirement after 3 rotations).

## Architecture

### Pool: `/src/lib/supply-drop.json`
- 40 clips total (as of 2026-06-28, expanded from 28)
- Each clip has: `id`, `msg`, `expression`, `audio`, `rotationsUsed`, `maxRotations`, `inflections[]`
- `inflections` = array of delivery styles (e.g., ["bored", "angry", "laughing"])
- `inflectionIndex` = `rotationsUsed % inflections.length` — cycles through inflections
- **v2 clips (r29-r40)**: Short 2-sentence rejections with voicedesign voice, added 2026-06-28

### Engine: `/src/lib/supply-drop.ts`
- **Weekly rotation**: picks new set every Monday (ISO week check)
- **Prioritization**: rested clips (not in last set) get picked first
- **Graduation**: after `maxRotations` (3), clip retires from pool
- **State**: stored in localStorage as `sqhq-supply-drop-v2`

### Key Functions
```typescript
getActiveRejections(): RejectionEntry[]  // Get this week's set (rotates if needed)
forceRotation(): RejectionEntry[]        // Manual re-roll for testing
getPoolStats()                           // { activeCount, graduatedCount, needsAudioCount }
getInflection(clip): string              // Current inflection name for a clip
```

## How Rotation Works

1. **Monday morning** → `getWeek()` returns new week string
2. `lastRotationDate` doesn't match → triggers `performRotation()`
3. Active pool = clips where `rotationsUsed < maxRotations`
4. Rested clips (not in last set) get priority
5. Shuffle rested, shuffle active, fill 12 slots
6. Advance `rotationsUsed` for selected clips
7. Save to localStorage

## Retooling (Inflection Cycling)

When a clip rotates back in, its inflection index advances:
- Rotation 1: inflection[0] (e.g., "bored")
- Rotation 2: inflection[1] (e.g., "angry")  
- Rotation 3: inflection[2] (e.g., "laughing")
- After 3: clip graduates

**Audio regeneration**: When a clip returns with a new inflection, the audio SHOULD be regenerated with different delivery. Currently, the same audio file plays — true retooling requires regenerating TTS on return.

## Graduation

After `maxRotations` (default 3), a clip is retired:
- Removed from active pool
- Stats tracked in `getPoolStats()`
- New clips can be added to pool to replace graduated ones

## Adding New Clips

1. Add entry to `supply-drop.json` pool array
2. Set `audio: null` initially
3. Generate TTS via `text_to_speech` tool
4. Copy to `/public/audio/reject-{id}.ogg`
5. Update `audio` field in JSON

## Integration with MenuCards.tsx

```typescript
import { getActiveRejections, type RejectionEntry } from "@/lib/supply-drop";

// In component:
const [matchRejections, setMatchRejections] = useState<RejectionEntry[]>([]);
useEffect(() => {
  setMatchRejections(getActiveRejections());
}, []);

// Audio playback:
if (rejection.audio) {
  const audio = new Audio(`/audio/${rejection.audio}`);
  audio.play().catch(() => {});
}
```

## Pitfalls

- **Stale localStorage**: If user has old `sqhq-supply-drop` key (v1), it won't conflict — v2 uses `sqhq-supply-drop-v2`
- **Audio null clips**: New clips may have `null` audio — always check before playing
- **Weekly vs daily**: v1 was daily rotation, v2 is weekly. Don't confuse the storage keys
- **Pool size**: 40 clips, 12 active per week = ~30% utilization. Good balance of variety vs repetition

## File Locations
- Pool config: `/src/lib/supply-drop.json`
- Engine: `/src/lib/supply-drop.ts`
- Audio clips: `/public/audio/reject-*.ogg`
- Component: `/src/app/components/MenuCards.tsx`
