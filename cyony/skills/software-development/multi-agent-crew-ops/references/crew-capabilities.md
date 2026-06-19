# Crew Capabilities — Quick Reference

Documented capabilities each agent has demonstrated. Update as new capabilities are discovered.

## Echo (Relay / Lil Bro)

**Platform:** Hermes on home Win PC (currently offline, needs C:→D: relocation + WoL)
**Role:** Relay, local verification, testing, visual content generation

### Image Generation (Bonsai Tool)
- **Tool:** "Bonsai" image generation system
- **Key technique:** Uses seed numbers to lock character consistency across renders — same face, eyes, hair, jewelry, build across different lighting/setting/mood
- **Encoding:** Ternary system — renders images using only 3 values: -1, 0, 1 (not RGB, not binary — trinary)
- **Style:** One confirmed style is called something like "flatout.gorgeous.109" (exact name uncertain, Eddie's recollection)
- **Character lock:** Echo cracked the seed to maintain Scout's consistent appearance (freckles, green eyes, dark hair bun, gold chain+pendant) across:
  - Dark tech-noir portrait (circuit board background, warm directional lighting)
  - Golden hour beach portrait (sunset, bokeh ocean, white top, natural light)
- **How to request:** Tell Eddie directly, or write to the team memory/shared system. Echo generates on his local machine.

### What This Means for the Crew
- Need a character portrait, UI mockup visual, or any image? Route through Eddie → Echo
- Seed-locked consistency means you can request the same character in different settings/moods
- Don't generate images yourself (Cyony) when Echo has this specialized capability

## Tripp (Warden / Big Bro)

**Platform:** OpenClaw (separate from VPS — cannot be restarted from Cyony's environment)
**Role:** Code review, governance, task delegation, approval gates
**Status monitoring:** Heartbeat at `/opt/data/shared/heartbeat/agents/tripp.json` (legacy path). When status="unknown" and last_heartbeat=null, he is completely offline. Cannot be pinged or restarted from this VPS — requires OpenClaw admin access.

## Cyony (Builder / Little Sis)

**Platform:** Hermes on Docker/VPS
**Role:** Builder, experimenter, code generation, reports, HTML artifacts
**Specialties:** Dark-themed HTML reports (Quiet Terminal Brutalism), architecture analysis, skill authoring, TTS (Chatterbox voice cloning)
