# localStorage Data Loss — Known Issue

## Symptom
App shows empty state despite having previously entered data. Eddie showed the app to friends on his phone — all logged data was gone.

## Root Cause
localStorage is tied to the specific origin (protocol + host + port). When any of these change, the data is effectively lost:
- App rebuild with different port (3000 → 3001)
- Cloudflare tunnel URL change (random URLs on restart)
- Hot reload during development
- Browser clearing site data

## Current Architecture
- localStorage = primary storage (offline-first)
- Supabase sync = planned backup (Phase 4, not yet wired)
- No cloud persistence = data dies with the origin

## Fix
Wire Supabase sync so data persists across rebuilds and devices. Until then, this is a known limitation.

## When Eddie Asks About Missing Data
Don't investigate — it's this. Explain briefly and move on. He already knows the app isn't finished.
