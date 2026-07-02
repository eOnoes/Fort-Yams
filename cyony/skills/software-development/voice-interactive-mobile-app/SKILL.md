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
  - "Cyony or SQHQ audio system"
---

# Voice-Interactive Mobile App Patterns

Building mobile-first apps that combine TTS audio feedback, swipe gestures, and real-time voice synthesis. Born from SQHQ (SideQuestHQ) — a quest/reminder app with a snarky AI voice companion (Cyony).

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

- **Don't generate audio clips without syncing to the code array.** When building rejection sequences, voice lines, or tiered audio, the text used to generate each clip MUST exactly match the text in the code array that triggers it. Eddie discovered mismatched rejection clips (audio said one thing, code displayed another) after regenerating clips without checking the current array. Workflow: (1) read current code array, (2) generate clips with identical text, (3) verify filenames align with array indices, (4) test all taps/actions end-to-end.
- **Don't fire-and-forget async audio** without BOTH create-before-async AND generation counter. Either alone has gaps.
- **Don't use `pause()` alone** for audio cleanup. Always set `src = ""`.
- **Don't build complex interruption flows** with delays + API calls. The user perceives any gap >1s as broken.
- **Don't show visual text after swipe** if audio is playing. It's redundant and feels like ghost UI. Audio-only feedback is the preferred pattern.
- **Don't assume `next build` fixes stale chunks.** Kill the old process FIRST.
- **Don't use `pkill -f` patterns** that match your own terminal process tree.
- **Don't give verbose technical breakdowns on Telegram.** Eddie prefers concise answers — 2-3 lines max for status updates, save the engineering diagrams for when he explicitly asks.
- **Don't rely on `lsof` or `fuser` in containers.** They're often not installed. Use `ps aux | grep <process> | grep -v grep` + `kill -9 <PID>` instead.
- **Don't let buttons near input fields steal focus on mobile.** When a button is tapped on mobile, the browser removes focus from the active input field, which dismisses the keyboard. This is annoying when toggles (text/voice, mood pickers, gear icons) sit above a chat input. **Fix:** Add `onMouseDown={e => e.preventDefault()}` to every button that should NOT dismiss the keyboard. This prevents the default focus-shift behavior while still firing the `onClick` handler. Apply to: mode toggle buttons, gear/settings icons, mood picker buttons, any button in a header bar above an input field. The `onMouseDown` handler runs before `onClick` and blocks the focus change. Pattern: `<button onMouseDown={e => e.preventDefault()} onClick={handler}>`.
- **Don't assume `position: sticky` or `position: fixed` works in nested overflow containers with backdrop-filter.** Both break when any ancestor has `backdrop-filter: blur()` — it creates a new containing block that re-parents the element. The SQHQ app shell has `overflow: hidden` on `.app-shell` AND `backdrop-filter: blur(3px)` on `.workspace`, which kills both sticky and fixed. **Fix: flex column layout with header OUTSIDE the scroll area.** See the "CRITICAL: Sticky AND Fixed Both Fail" section for the correct pattern. Do NOT use position:fixed + padding hacks — they fail under backdrop-filter too.
- **Don't put expansion panels inline with sticky button rows.** When a button row must stay fixed (sticky), expansion content must be a SIBLING element outside the row's flex/grid container — not inside it. Inline expansion pushes other buttons down.
- **Don't include stage directions in TTS input.** Text like "smirk", "tilts head", "(sighs)" will be read literally by Pocket TTS. Strip all stage directions before sending to TTS. Use punctuation for emotional cues: ellipses for pauses, periods for emphasis, commas for pacing. Dia voice supports `(sighs)` format, but Pocket does NOT — always strip for Pocket.
- **Don't assume YouTube Music links are inaccessible.** Use the oEmbed API to identify songs: `curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title',''))"` — works without API keys or web extraction tools.

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
For workspace/detail views, use the **flex column layout** (see CRITICAL section above) instead of sticky stacking:
1. Navigation bar (back button + title) — flex child with `flex-shrink: 0`
2. Scoreboard (key numbers + colored dots) — second flex child with `flex-shrink: 0`
3. Content area — `flex: 1; overflow-y: auto` — ONLY this scrolls

Content scrolls UNDERNEATH both layers. The scoreboard replaces inline stat rows and separate summary banners — consolidates all key metrics into one floating panel. Use `scoreboard-label` (10px, uppercase, muted) + `scoreboard-value` (20px, bold, color-coded) for the main number, and `scoreboard-stat` with colored dots for secondary stats. See `sidequest-hq` skill for full implementation.

### ⚠️ CRITICAL: Sticky AND Fixed Both Fail in Nested Overflow + Backdrop-Filter (SQHQ Patch 004 fix)

**`position: sticky` AND `position: fixed` both fail when ancestors have `backdrop-filter: blur()`.** The backdrop-filter creates a new containing block that re-parents fixed/sticky elements to that ancestor instead of the viewport or scroll container.

**Failing chain in SQHQ:**
```
.app-shell (overflow: hidden) → .workspace (overflow-y: auto, backdrop-filter: blur(3px))
  → .workspace-header (position: sticky — BROKEN, rides outer scroll)
```

Even switching to `position: fixed` fails because `.workspace` has `backdrop-filter: blur(3px)` which creates a new containing block — the header gets fixed to `.workspace` instead of the viewport, and scrolls off screen when `.workspace` overflows.

**CORRECT FIX: Flex column layout — headers sit OUTSIDE the scroll area entirely.**

No position:fixed or sticky needed. The headers are structurally immovable because they're not in the scroll container:

```css
.workspace-page {
  display: flex;
  flex-direction: column;
  height: 100%;       /* NOT 100vh — fills parent's available space */
  max-width: 420px;
  margin: 0 auto;
  overflow: hidden;   /* page itself never scrolls */
}

/* Header — flex child, never scrolls */
.workspace-header {
  flex-shrink: 0;
  z-index: 50;
  background: rgba(8, 8, 8, 0.75);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 12px 10px;
}

/* Summary bar (Ledger, Paper Trail) — also outside scroll */
.workspace-summary-bar {
  flex-shrink: 0;
  z-index: 49;
  background: rgba(8, 8, 8, 0.75);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px 12px;
}

/* ONLY this area scrolls — cards, forms, content */
.workspace-scroll {
  flex: 1;
  min-height: 0;      /* critical for flex overflow */
  overflow-y: auto;
  padding: 12px 6px 40px;
}
```

**JSX pattern:**
```tsx
<div className="workspace-page">
  <div className="workspace-header">...back, title, +Add...</div>
  {/* optional summary bar */}
  <div className="workspace-scroll">
    {/* forms, cards, lists — ONLY this scrolls */}
  </div>
</div>
```

**Why this works:** The header is a flex child with `flex-shrink: 0` — it stays at the top by default. Only `.workspace-scroll` has `overflow-y: auto`. The header physically cannot scroll because it's outside the scroll container.

**Pitfall:** `.workspace-page` must use `height: 100%` (not `100vh`). Using `100vh` inside a parent that also has `100vh` plus padding causes the page to overflow the parent, and the parent starts scrolling — dragging the header with it.

**Test pattern:** After implementing, scroll on real mobile device. If the header moves AT ALL, check: (1) is `height: 100%` not `100vh`? (2) is the header a direct flex child of the page, not inside the scroll div? (3) does the scroll div have `overflow-y: auto`?
