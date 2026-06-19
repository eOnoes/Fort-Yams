# SQHQ Integration — scout-audio.ts Pattern

## Architecture

```
public/audio/scout/
├── manifest.json          # {key: {file, ogg, text, exaggeration, duration}}
├── snooze_warn_1.wav      # Archive
├── snooze_warn_1.ogg      # Web delivery (opus 64k)
├── ...
scripts/batch-scout-audio.py  # Generation script (crash-safe resume)
src/lib/scout-audio.ts        # Runtime lookup utility
```

## scout-audio.ts (copy-paste ready)

```typescript
type ScoutAudioManifest = Record<string, {
  file: string; ogg: string; text: string; exaggeration: number; duration: number;
}>;

let manifestCache: ScoutAudioManifest | null = null;

async function loadManifest(): Promise<ScoutAudioManifest> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/audio/scout/manifest.json');
    if (res.ok) { manifestCache = await res.json(); return manifestCache!; }
  } catch {}
  return {};
}

export async function getScoutAudio(key: string): Promise<string | null> {
  const manifest = await loadManifest();
  const entry = manifest[key];
  return entry ? `/audio/scout/${entry.ogg}` : null;
}

export async function playScoutAudio(key: string): Promise<boolean> {
  const url = await getScoutAudio(key);
  if (!url) return false;
  try { const audio = new Audio(url); await audio.play(); return true; }
  catch { return false; }
}

export async function playRandomScoutQuip(prefix: string, count: number): Promise<string | null> {
  const idx = Math.floor(Math.random() * count) + 1;
  const key = `${prefix}_${idx}`;
  const played = await playScoutAudio(key);
  return played ? key : null;
}

// Pre-warm manifest on load
if (typeof window !== 'undefined') { loadManifest(); }
```

## Usage in Components

```typescript
import { playRandomScoutQuip } from '@/lib/scout-audio';

// On snooze action:
await playRandomScoutQuip('snooze_warn', 6);  // picks snooze_warn_1..6

// On complete:
await playRandomScoutQuip('complete', 5);
```

## Key Naming Convention

- `snooze_warn_N` — tier 1 snooze (gentle sass)
- `snooze_scold_N` — tier 2 snooze (annoyed)
- `snooze_give_up_N` — tier 3 snooze (defeated)
- `complete_N` — reminder completed (proud)
- `dismiss_N` — card dismissed (muttering)
- `greeting_MOOD_N` — mood-based greetings
