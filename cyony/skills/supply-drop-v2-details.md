# Supply Drop v2 — Weekly Rotation with Retooling

## Pool Architecture

- **Pool size:** 20+ clips (grows over time)
- **Active per week:** 12 clips
- **Rotation:** Every Monday (weekly refresh)
- **Retooling:** When a clip returns after resting, inflection index advances (bored → angry → laughing → tired)
- **Graduation:** After 3 rotations on a clip, it retires. New clip written to replace it in pool.
- **Audio:** Auto-regenerated via TTS on first use if no cached audio exists.

## Weekly Refresh Logic

1. Check which clips were active last week → they go to rest
2. Prioritize rested clips (16 rested → pick 12)
3. Remaining 8 stay in pool
4. Advance inflection index for returning clips
5. Generate audio for any clips missing cached audio

## Data Files

- `src/lib/supply-drop.json` — pool config with `{msg, expression, audio, version}`
- `src/lib/supply-drop.ts` — rotation logic, graduation, audio lookup

## Integration with VoiceAgent.tsx

- Supply Drop clips loaded on component mount
- Clip selection happens daily (or on weekly refresh)
- localStorage key: `sqhq-supply-drop` for active clip selection
- localStorage key: `sqhq-supply-drop-history` for rotation tracking

## Eddie's Approval

"I say yes, that sounds like a pretty solid plan. I like that and make sure that we get a little use and play out of them and then they swap." — June 27, 2026
