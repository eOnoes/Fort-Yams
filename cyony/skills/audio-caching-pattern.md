# Audio Caching Pattern — Pre-generated Chatterbox in Next.js

## Architecture

Pre-generate static Scout quips with Chatterbox → cache as audio files → play instantly in the app.

```
SQHQ App
├── public/audio/scout/
│   ├── manifest.json          ← quip metadata + file mapping
│   ├── snooze_warn_1.ogg      ← cached Chatterbox clips
│   ├── snooze_warn_2.ogg
│   ├── complete_1.ogg
│   └── ...
├── src/lib/scout-audio.ts     ← audio lookup utility
└── src/app/components/
    └── HomeFeed.tsx            ← calls playRandomScoutQuip()
```

## Manifest Format

```json
{
  "snooze_warn_1": {
    "file": "snooze_warn_1.wav",
    "ogg": "snooze_warn_1.ogg",
    "text": "Should I get you coffee since you're so lazy right now?",
    "exaggeration": 0.4,
    "duration": 3.2
  }
}
```

## Lookup Utility (scout-audio.ts)

```typescript
export async function playRandomScoutQuip(prefix: string, count: number): Promise<string | null> {
  const idx = Math.floor(Math.random() * count) + 1;
  const key = `${prefix}_${idx}`;
  const manifest = await loadManifest();
  const entry = manifest[key];
  if (!entry) return null;
  try {
    const audio = new Audio(`/audio/scout/${entry.ogg}`);
    await audio.play();
    return key;
  } catch { return null; }
}
```

## Usage in Components

```typescript
import { playRandomScoutQuip } from "@/lib/scout-audio";

// Fire and forget — don't block UI
playRandomScoutQuip("snooze_warn", 6);  // plays snooze_warn_N.ogg
playRandomScoutQuip("complete", 5);      // plays complete_N.ogg
```

## Batch Generation Script Pattern

```python
QUIPS = {
    "snooze_warn_1": (0.4, "Should I get you coffee..."),
    "snooze_scold_1": (0.7, "Oh, again? Cool cool cool."),
    # ... keyed by tier + index
}

for key, (exag, text) in QUIPS.items():
    wav = model.generate(text=text, audio_prompt_path=REF, exaggeration=exag, temperature=0.8)
    torchaudio.save(f"{OUT_DIR}/{key}.wav", wav, model.sr)
    manifest[key] = {"file": f"{key}.wav", "ogg": f"{key}.ogg", "text": text, "exaggeration": exag}
    # Save manifest after each clip (crash-safe)
    MANIFEST.write_text(json.dumps(manifest, indent=2))
```

## WAV → OGG Conversion

```bash
cd public/audio/scout && for f in *.wav; do
  ffmpeg -y -i "$f" -c:a libopus -b:a 64k "${f%.wav}.ogg"
done
```

## Quip Naming Convention

```
{category}_{tier}_{index}
```

Categories: `snooze`, `complete`, `dismiss`, `greet`
Tiers (snooze only): `warn`, `scold`, `give-up`
Index: 1-based integer

## Integration Checklist

1. Generate quips with Chatterbox (background process, ~4 min/clip on CPU)
2. Convert WAV → OGG for smaller file size
3. Commit manifest.json to public dir
4. Import `playRandomScoutQuip` in component
5. Call with fire-and-forget (don't await, don't block UI)
6. Falls back gracefully if audio not cached yet
