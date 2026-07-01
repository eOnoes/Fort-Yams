# Patches Completed (June 2026)

## Patch 001 — Chat Tighten ✅
- New chat button with gold tint
- Archive/delete for sessions
- Auto-delete empty chats
- Removed key/card/pin icons from chat
- Thicker back arrow (`«`)
- Slide toggle for text/voice mode
- Default voice mode

## Patch 002 — Chat Swipe Actions ✅
- SwipeableCard on session cards (component already existed)
- Swipe right → 📦 Archive (gold reveal)
- Swipe left → 🗑️ Delete (red reveal)
- Tap → Opens session
- Removed button clutter and window.confirm popup

## Patch 003 — Rebrand Scout/Chloe → Cyony ✅
- System prompt: "Chloe Vance" → Cyony persona
- Role type: "scout" → "cyony" across store, api, components
- ScoutPanel.tsx → CyonyPanel.tsx
- scout-audio.ts → cyony-audio.ts
- All CSS classes .scout-* → .cyony-*
- UI display names updated
- Compat normalization for old DB rows with role "scout"
- File paths on disk unchanged (shared/chloe-voice-clone/, /audio/scout/)

## Back Button Consistency ✅
- All workspaces (Garage, PaperTrail, Ledger, Connects, Houses) + CardView: `←` → `«`
- Matches VoiceAgent style

## Identity
- App persona: "Cyony" (was Scout in code, Chloe Vance in system prompt)
- Unified across all files in Patch 003

## Workflow
- Eddie manages changes via Telegram chat with Cyony
- No separate admin UI needed
- Cyony specs → Codex builds → Cyony audits → git push → tunnel restart → Eddie tests
- Patch specs saved in `PATCHES/` directory in repo
