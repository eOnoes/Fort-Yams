---
name: voice-interactive-mobile-app
description: Building mobile-first apps with TTS/audio feedback, swipe gestures, and real-time voice integration. Covers audio playback race conditions, interruption UX, Next.js deployment pitfalls, and mobile swipe patterns.
triggers:
  - "building an app with TTS or voice feedback"
  - "audio playback in React"
  - "swipe gestures with audio"
  - "interrupting audio in a web app"
  - "Next.js stale chunks or zombie processes"
  - "mobile-first PWA with voice"
  - "Scout or SQHQ audio system"
---

# Voice-Interactive Mobile App Patterns

Building mobile-first apps that combine TTS audio feedback, swipe gestures, and real-time voice synthesis. Born from SQHQ (SideQuestHQ) — a quest/reminder app with a snarky AI voice companion.

---

## 1. React Async Audio Race Conditions

**Problem:** When audio creation is async and fire-and-forget (`new Audio(url); audio.play()`), a second action can't stop audio that *hasn't been created yet*. The first action's async code continues running in the background, creating and playing audio AFTER the second action tried to interrupt.

**Two-layer fix — both layers are required:**

### Layer A: Create-Before-Async Pattern

The **root cause** of most audio double-play bugs: `playAudio()` does `await loadManifest()` before creating `new Audio()`. During that async gap, the interrupt finds `currentAudioRef.current === null` and skips stopping anything.

**Fix: Create the Audio element synchronously, track it on the ref IMMEDIATELY, then do async work. After async completes, verify you're still the active audio.**

```typescript
async function playScoutAudio(key: string, ref: MutableRefObject<HTMLAudioElement | null>) {
  // Create Audio IMMEDIATELY — before any async work
  const audio = new Audio();
  if (ref.current) {
    ref.current.pause();
    ref.current.currentTime = 0;
  }
  ref.current = audio;  // tracked BEFORE manifest fetch

  const url = await loadManifestAndResolve(key);  // async — may take 50-200ms

  // Check: was this audio interrupted/abandoned while fetching?
  if (ref.current !== audio) return false;  // interrupt killed us

  try {
    audio.src = url;
    await audio.play();
    return true;
  } catch {
    if (ref.current === audio) ref.current = null;
    return false;
  }
}
```

**Why this works:**
1. `ref.current` is set to the Audio element SYNCHRONOUSLY — interrupt always finds it
2. After async work, `ref.current !== audio` check catches interrupts that happened during load
3. If interrupt cleared the ref and set a new audio, the stale loader silently aborts

**Applies to any async media pipeline:** fetch URL, decode blob, load manifest, authenticate — any async step before `audio.src` or `audio.play()` is a window where interrupt can't find the element.

### Layer B: Generation Counter Pattern

Catches stale async operations from PREVIOUS actions (not just the current one):

```typescript
const audioGenerationRef = useRef(0);

// In each action handler:
const gen = ++audioGenerationRef.current;

// In the async quipFn:
async () => {
  if (audioGenerationRef.current !== gen) return; // stale — abort
  playRandomAudio(prefix, ref).then((played) => {
    if (audioGenerationRef.current !== gen) return; // double-check after async gap
    if (!played) fallbackTTS(text, ref);
  });
}
```

Each action stamps a generation number. Stale async operations check the number before playing — if it changed, they silently abort.

**Both layers together:** Layer A ensures the interrupt can ALWAYS find the audio element. Layer B ensures stale async from abandoned actions doesn't fire.

---

## 2. Aggressive Audio Cleanup

**Problem:** `pause()` + `currentTime = 0` is NOT enough. The Audio element still holds the resource and can resume or interfere.

**Fix: Release the resource entirely**

```typescript
function killAudio(ref: MutableRefObject<HTMLAudioElement | null>) {
  const el = ref.current;
  if (el) {
    el.pause();
    el.currentTime = 0;
    el.src = "";  // releases the resource — prevents ghost playback
    ref.current = null;
  }
}
```

**Always** set `el.src = ""` before nulling the ref. This is critical for interruption systems.

---

## 3. TTS Interruption UX Design

**Anti-pattern:** Complex multi-step interruption flow:
```
grunt → wait 2s → context-aware TTS quip → wait for API → play
```
This creates 6-8 second delays. Terrible UX.

**Better pattern:** Simple and immediate:
```
grunt → immediately play new action's audio
```

The grunt signals "I heard you interrupt." The new action's audio IS the response. No extra delay, no context-aware meta-commentary. Keep it snappy.

**If you want escalation:** Only use the complex flow after 3+ rapid interruptions in a row. First interrupt = clean swap. Third interrupt = *then* she gets annoyed.

---

## 4. Swipe UX with Audio Feedback

**User preference:** Audio-only feedback after swipe actions. No visual text bubbles, no floating toasts, no "tap to dismiss" overlays. The voice IS the feedback.

**Ghost card problem:** Floating toasts that linger after swipes feel like ghost UI elements — especially on snooze actions where cards collapse. Users perceive them as leftover card fragments.

**Solution:** Strip all visual feedback from swipe actions. Let the audio clip carry the personality. If you need a visual indicator, use a tiny count badge (e.g., "💤 3 ✓ 1") that fades in 1-2s, not a full toast with text.

---

## 5. Next.js Stale Chunk / Zombie Process Pitfall

**Symptom:** `Failed to load chunk /_next/static/chunks/XXXXX.js` — 500 error on static chunks after rebuild.

**Root cause:** An OLD `next-server` process is still alive and serving stale chunks from a previous build. New builds create new chunk hashes, but the old process serves old ones. `next build` alone does NOT fix this — the running process has the old hashes cached.

**Reproduction:**
1. Start `next start` → builds serve fine
2. Kill terminal, make changes, rebuild
3. Start new `next start` → old process still alive on port, new one fails with EADDRINUSE
4. Even if new one starts (different port), old one serves stale chunks

**Fix (in order):**
```bash
# 1. Find ALL next-server processes (not just the newest)
ps aux | grep "next-server" | grep -v grep

# 2. Kill them ALL — including zombies and old ones
kill -9 <PID> <PID> <PID>

# 3. Clear the build cache
rm -rf .next

# 4. Rebuild
npx next build

# 5. Start fresh
npx next start -p 3000
```

**Key pitfall:** `pkill -f "next start"` can kill your own terminal process if it's a child. Use `ps aux | grep` to find PIDs, then `kill -9` specific PIDs.

**Prevention:** Always check for zombie processes before starting a new server:
```bash
ps aux | grep "next-server" | grep -v grep | wc -l
# If > 0, kill them first
```

---

## 6. Audio Clip Tier System

For apps with escalating feedback (like snooze accountability), organize clips into tiers:

| Prefix | Tier | When |
|--------|------|------|
| `s0` | Casual | 1st action |
| `s1` | Mild | 2nd |
| `s2` | Medium | 3rd |
| `s3` | Hot | 4th |
| `s4` | Nuclear | 5th+ |
| `s5` | Special | Last item |
| `sr` | Rapid-fire | Multiple in <1s |
| `c` | Complete | Positive action |
| `int` | Interrupt | Grunt/hmph sounds |

Pre-generate clips as OGG files. Use a manifest.json to map keys to files. Fall back to live TTS API if clip not cached.

---

## 7. Clip Rotation / Freshness System

For apps with personality-driven audio (like an AI companion), clips get stale. Build a rotation system:

- **Cache:** 20 clips per tier on device
- **Stash:** 100+ clips in cloud/repo
- **Rotation:** Every 2 weeks, swap 50% of cached clips from stash
- **Trigger:** App checks on first open each week, or manual "check for new lines" button
- **Manifest versioning:** `version` field in manifest.json, client compares and downloads delta

This keeps the personality fresh without manual intervention.

---

## 8. TTS Pipeline Optimization

**Current SQHQ pipeline (slow):**
```
Phone → Next.js API → MiMo LLM (Singapore cloud, 15s) → MiMo TTS (cloud voiceclone, 20s) → Phone
```
Total: 15-35s for a "Make a Request" response.

**Optimized pipeline (target):**
```
Phone → Next.js API → Local Ollama (Gemma/Qwen, 2-5s) → Local TTS (Pocket, 4s) → Phone
```
Total: 6-9s.

**Available local models (as of 2026-06):**
- `gemma4-uncensored` on Ollama (Eddie's PC) — uncensored, good quality
- `qwen2.5:3b` — tiny, fast, good for short quips
- Local TTS at `http://127.0.0.1:8788/v1/tts` — needs auth token

**Speed wins:**
1. Swap cloud TTS → local Pocket TTS (4s vs 20s)
2. Swap cloud LLM → local Ollama (2-5s vs 15s)
3. Lower `max_tokens` to 100 for short responses
4. Pre-cache common responses as audio clips (instant)

## 9. Pre-Cached Clip Footprint

Actual measured data from SQHQ production:
- **85 clips** (OGG format, MiMo TTS generated)
- **Average 152KB per clip** (1.5-3s duration)
- **Total: 12.6MB**

Phone cache targets:
| Clips | Storage | Use case |
|-------|---------|----------|
| 60 | ~9MB | 20 snooze + 20 complete + 10 greeting + 10 misc |
| 100 | ~15MB | Full rotation set |
| 200 | ~30MB | Cloud stash |

9MB is negligible on any modern phone. Even 50MB is a rounding error.

## 10. Clip Rotation with Cron Rewrite

**Problem:** Pre-cached clips get stale. User hears the same quips repeatedly.

**Solution:** Rotating clip cache with AI-powered rewriting.

**Architecture:**
```
PHONE (60 active)              CLOUD STASH (200+)
┌──────────────────┐          ┌──────────────────┐
│ 20 snooze         │ ←swap→  │ 80 snooze variants│
│ 20 complete       │          │ 80 complete       │
│ 10 greeting       │          │ 40 greeting       │
│ 10 misc           │          │ 40 misc           │
└──────────────────┘          └──────────────────┘
                                        ↑
                                 Cron job rewrites
                                 stale/repetitive clips
```

**Cron job (weekly):**
1. Log which clips were played most (via `/api/clip-play-log`)
2. Take top 10 most-repeated clips
3. Use local LLM to rewrite same sentiment in 5-10 new ways
4. Generate TTS audio for each new variation
5. Add to cloud stash, mark old clips as "retired"

**Sync flow:**
1. Phone app opens → checks `/api/clip-sync?version=X`
2. Server responds with new clip URLs + which to drop
3. Phone downloads new, deletes retired
4. Updates local manifest

**Result:** Scout literally evolves her vocabulary. The more you snooze, the more creative she gets.

## Pitfalls

- **Don't fire-and-forget async audio** without BOTH create-before-async AND generation counter. Either alone has gaps.
- **Don't use `pause()` alone** for audio cleanup. Always set `src = ""`.
- **Don't build complex interruption flows** with delays + API calls. The user perceives any gap >1s as broken.
- **Don't show visual text after swipe** if audio is playing. It's redundant and feels like ghost UI. Audio-only feedback is the preferred pattern.
- **Don't assume `next build` fixes stale chunks.** Kill the old process FIRST.
- **Don't use `pkill -f` patterns** that match your own terminal process tree.
- **Don't give verbose technical breakdowns on Telegram.** Eddie prefers concise answers — 2-3 lines max for status updates, save the engineering diagrams for when he explicitly asks.
- **Don't rely on `lsof` or `fuser` in containers.** They're often not installed. Use `ps aux | grep <process> | grep -v grep` + `kill -9 <PID>` instead.
- **Don't put expansion panels inline with sticky button rows.** When a button row must stay fixed (sticky), expansion content must be a SIBLING element outside the row's flex/grid container — not inside it. Inline expansion pushes other buttons down.

## 11. Sticky Button Row with Expansion Panels

**Problem:** A row of stat buttons that must stay side-by-side at top of screen. Tapping one expands a detail panel. If the expansion is INSIDE the same grid/flex container as the buttons, expanding one pushes the others down.

**Pattern: Separate the button row from expansion content.**

```tsx
{/* Sticky button row — NEVER moves */}
<section className="feed-stats" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
  {stats.map(stat => (
    <button key={stat.id} className={expanded === stat.id ? 'active' : ''} onClick={() => toggle(stat.id)}>
      <span>{stat.value}</span>
      <span>{stat.title}</span>
    </button>
  ))}
</section>

{/* Expansion panel — OUTSIDE the button row, appears below */}
{expanded && (
  <div className="stat-detail-panel">
    {/* detail content */}
  </div>
)}
```

**CSS:** The sticky section has `position: sticky; top: 0; z-index: 10`. The expansion panel is a separate element that pushes the feed content down, NOT the button row. The buttons stay in a fixed horizontal row no matter what.

**Pitfall:** CSS Grid with `grid-template-columns` inside the sticky section works for button layout, but if any child has variable height (expansion), the grid row stretches. Keep expansions OUTSIDE the grid entirely.

### Variation: Sticky Scoreboard (Floating Digital Readout)
For workspace/detail views, the same principle applies with a **two-layer sticky stack**:
1. Navigation bar (back button + title) — `position: sticky; top: 0; z-index: 50`
2. Scoreboard (key numbers + colored dots) — `position: sticky; top: 52px; z-index: 45; box-shadow for floating effect`

Content scrolls UNDERNEATH both layers. The scoreboard replaces inline stat rows and separate summary banners — consolidates all key metrics into one floating panel. Use `scoreboard-label` (10px, uppercase, muted) + `scoreboard-value` (20px, bold, color-coded) for the main number, and `scoreboard-stat` with colored dots for secondary stats. See `sidequest-hq` skill for full implementation.
