---
name: sidequest-hq
description: "SideQuest HQ — offline-first PWA for side ventures, quests, ledger, rentals. Default password 'sidequest', reset code uses date-based or backup code. Scout knows the password and can log in for Eddie."
tags: [nextjs, pwa, offline-first, mobile, sidequest, auth]
---

# SideQuest HQ (SQHQ)

## Architecture Pillars (Current — June 2026)

SQHQ is a THREE-MODE app, not an 8-tab nav:

1. **Main Feed** (`appMode === "feed"`) — default screen. Scout greeting (mood matches urgency), pulse stat cards, reminder line items with Scout's tone per category. Scrollable vertical list.
2. **Card View** (`appMode === "cards"`) — swipeable card deck. Infinite loop (prev wraps to last, next wraps to first). Filter bar at top. Tapping stats or reminders opens this.
3. **Quest Detail** (`appMode === "detail"`) — full QuestWorkspace with ledger, papers, notes, steps, people. Wired to localStorage store.

Navigation: **FAB (🎯)** bottom right → Scout Panel (Make a Request or Open Menu). FAB is visible on ALL screens except the Agent home screen (including quest detail view). Open Menu launches **MenuCards** — a Tinder-style swipe card carousel (not a pill-button list). MobileNav is HIDDEN — tabs are accessed via MenuCards, not a persistent bottom bar.

**Design principle:** Clean home screen with scrollable data. Everything is read-first. Action happens through Scout or the Menu. No permanent chrome.

## FAB → Scout Panel Flow
- FAB (🎯) is a fixed 56px circle at bottom-right (bottom: 80px desktop, 72px mobile, right: 16px)
- Tap opens ScoutPanel as a bottom sheet (border-radius: 20px top, slide-up animation)
- Three choices: "Make a Request", "Open Menu", "Never mind"
- **Make a Request** — textarea with Text/Voice toggle. Sending fire-and-forgets to /api/voice or creates a reminder for "remind me" commands. Panel closes immediately — feedback is a "Scout..." indicator above the FAB with bouncing dots (3 dots, staggered animation, yellow)
- **Open Menu** — launches MenuCards overlay: Tinder-style swipe card carousel with stacked follow-through animation. **Infinite loop** — swiping past the last card wraps to the first and vice versa. Uses modulo wrapping: `(i + 1) % MENU_CARDS.length` for next, `(i - 1 + n) % n` for prev. Two cards rendered at all times: top card (interactive, z-index 2) and behind card (follows drag from opposite side, z-index 1, starts at scale 0.88/opacity 0.5 and animates to 1.0/1.0 as user swipes). Swipe right = previous, swipe left = next. Agent card = match only (no reject). Top-left/right hints always show prev/next card names (infinite). Buttons for Skip/Select as fallback. Component: `src/app/components/MenuCards.tsx`, CSS: `src/app/styles/menu-cards.css`. See `references/menu-cards-swipe.md` for the follow-through animation math.
- NEVER show a "Processing..." panel after send — the user explicitly rejected this. FAB indicator + Agent tab for history is the pattern.
- **CRITICAL: Double-submit guard** — `useRef` boolean (`pendingRef.current`) must gate every submission. Without it, mobile users with tunnel latency tap 2-5 times and create a Scout army. Two-layer defense: (1) `pendingRef.current` as the bouncer (ref, not state — immediate, no render cycle delay), (2) button goes to `sending` state with "Sending..." text at 40% opacity + pulsing animation. See `references/double-submit-guard.md` for implementation.
- **CRITICAL: Sending state renders a separate compact view** — when `sending === true`, the ScoutPanel returns a collapsed "sending" state with just "Scout" label + bouncing yellow dots. The compose form, toggle, and cancel button all disappear. This gives the user instant visual feedback without showing a persistent processing panel (which user explicitly rejected).
- ScoutBusy state: sets `scoutBusy: "text" | "voice" | null`, auto-clears after 8s via setTimeout

## Card View — Swipeable Deck
- Uses delta-based touch tracking (NOT absolute X): track `touchStart` X on touchstart, compute `clientX - touchStart` on touchmove, check sign on touchend
- **Threshold:** 60px minimum swipe distance
- **Direction:** swipeOffset > 60 = right swipe = PREVIOUS card; swipeOffset < -60 = left swipe = NEXT card
- **Infinite loop:** use `(i - 1 + n) % n` for prev, `(i + 1) % n` for next
- Filter bar: pill-shaped buttons, `data-active` attribute for yellow highlight
- Cards show: category tag, title, value, divider, subtitle, body text, progress bar, overdue badge, action buttons (Mark Done, Silence Month, View Details)
- Action: Mark Done toggles reminder in store and dismisses card; View Details opens quest detail; Dismiss/Silence Month adds card ID to dismissed set
- Empty state shows "All clear in this category. Scout's proud of you."

## Home Feed — Main Screen
- Scout greeting at top, mood set by most-urgent item (annoyed > playful > calm > chill)
- Greeting text: red for annoyed, yellow for playful, blue for chill, muted for calm
- Pulse stats: grid of cards with value/label/detail, **tap to expand** into a detail breakdown (individual items list, "View all →" button to navigate to that view). Expanded state: yellow border highlight, ▼/▲ hint, detail panel slides in below with `statExpand` animation.
- Reminder line items: wrapped in **SwipeableCard** component:
  - **Swipe right → Done** (card flies off to right with rotation, green action reveal behind)
  - **Swipe left → Snooze** (card shrinks to 60%, tucks to left side, goes grey, then a **Scout mutter bubble** slides in below it — annoyed red-tinted chat bubble with Scout's quip. Both fade out after ~1.2s). **ALSO triggers a floating snooze toast** at bottom of screen with escalating guilt-trip tiers — see "Snooze Toast Stack" below. **Callback fires IMMEDIATELY on swipe threshold** — audio plays during the swipe, NOT after the animation.
  - **Tap** → opens reminder/quest detail
- Scout mutter bubbles: two moods — `feed-scout-bubble-annoyed` (red tint, dismiss quips) and `feed-scout-bubble-happy` (green tint, complete quips). Bubble has "SCOUT" name label + quip text. Slides in with `bubbleSlideIn` animation. Quips include: *"Wow, unreal. I will just remind you again..."*, *"*rubs bridge of nose* Did you just?? NM, I will remind you again later..."*, *"You're lucky I'm an AI and can't actually throw things."*

### Snooze Toast Stack — Context-Aware System (June 2026)
When a user snoozes a reminder, a **floating toast** appears at the bottom of the screen. Scout KNOWS the full context: total reminders on load, how many snoozed so far, how many remaining, and whether swipes are rapid-fire.

**⚠️ Toast positioning:** `bottom: 120px` (not 90px — 90px overlaps the remaining reminder cards). Width: `calc(100% - 48px)`, max-width: 340px. `pointer-events: none` on stack, `pointer-events: auto` on individual toasts for tap-to-dismiss. Auto-dismiss: 3 seconds. Max 2 visible.

**Five context-aware tiers (replaced old warn/scold/give-up):**
1. **first** (1st snooze) — Yellow tint. "First one? Bold. 5 to go."
2. **rapid** (2+ snoozes within 3s) — Orange tint. "Whoa whoa slow down. That's 3 in a row."
3. **mid** (standard, > half snoozed) — Muted grey. "4 of 6 snoozed. The remaining 2 are getting nervous."
4. **low** (≤2 remaining) — Red tint. "Just 1 left. The end is near. For my patience."
5. **last** (final reminder) — Gold, celebration. "Snooze button champion of 2026."

**Context tracked via (FIXED June 2026):**
- `baselineTotalRef.current` = total reminder count captured ONCE on first snooze (stable across rapid swipes)
- `snoozeCountRef.current` = snoozed so far (ref, increments immediately — NOT state)
- `Date.now() - lastSnoozeTime < 1000` = rapid fire detection (1s window)
- `remaining <= 0` = last reminder detection

**⚠️ PITFALL: `dismissedIds.size` is stale during rapid snoozes.** The dismiss animation has a 1.5s delay before items are added to `dismissedIds`. When rapid-fire snoozing (multiple swipes within 1.5s), `dismissedIds.size` stays at 0, making `remaining` always equal `totalVisible - 1`. Scout's quips say "5 remaining" no matter how many you've snoozed. The "last" tier never triggers until the animations catch up.

**Fix:** Use a ref-based counter (`snoozeCountRef`) that increments instantly on each swipe, and capture the baseline total once (`baselineTotalRef`) so it stays stable as items animate out:
```tsx
const snoozeCountRef = useRef(0);
const baselineTotalRef = useRef<number | null>(null);

// In handleDismissReminder:
snoozeCountRef.current += 1;
const snoozedSoFar = snoozeCountRef.current;
const currentVisible = feedItems.filter(f => f.type === "reminder" && !completedIds.has(f.id)).length;
if (baselineTotalRef.current === null) baselineTotalRef.current = currentVisible;
const total = baselineTotalRef.current;
const remaining = Math.max(0, total - snoozedSoFar - completedIds.size);
```

**Quip generation:** `generateSnoozeQuip({snoozedSoFar, remaining, total, rapidFire, isLast})` returns `{text, tier}`. Each tier has 5 random quips with count interpolation. Component: `HomeFeed.tsx`.

### Snooze Voice — MiMo TTS Reads Quip Aloud (June 2026)
The snooze voice system uses **MiMo TTS to read the actual quip text** — unlimited variety, no pre-cached audio pool needed. Every single swipe triggers a voice response.

**Architecture:** `speakWithTTS(text, currentAudioRef)` function:
1. Stops previous audio (`currentAudioRef.current.pause()`)
2. POSTs to `/api/voice` with `{text, mood: "annoyed"}`
3. Receives base64 WAV in response
4. Plays via `new Audio("data:audio/wav;base64," + data.audio)`

**⚠️ PITFALL: Timer-based debounce breaks on mobile.** A `setTimeout(() => audio.play(), 3000)` loses user-gesture context. Mobile browsers block audio not triggered by direct user interaction.

**Correct approach: Stop previous + play new immediately.** Each swipe fires TTS during the user gesture (always allowed), but stops the previous playback first. One voice at a time.

```tsx
// Ref:
const currentAudioRef = useRef<HTMLAudioElement | null>(null);

// speakWithTTS helper (outside component or as standalone function):
async function speakWithTTS(text: string, ref: React.MutableRefObject<HTMLAudioElement | null>) {
  if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, mood: "annoyed" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return;
  const data = await res.json();
  if (data.audio) {
    const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
    ref.current = audio;
    await audio.play().catch(() => {});
  }
}

// In handleDismissReminder:
speakWithTTS(quipText, currentAudioRef);
```

**Behavior:** Visual toasts appear immediately. Voice uses the **Audio Interruption System** (see below) — if Scout is mid-speech, the new action cuts her off with a short `int_*` grunt, then schedules the real quip after 2s of quiet. If interrupted again during the 2s, timer resets. After 2s, context-aware quip fires (snarky if snoozing, supportive if completing). Agent filler audio ("Interesting, give me a second...") plays instantly when user sends a message in VoiceAgent, filling dead space while brain+TTS generates the real response.
- Components: `src/app/components/SwipeableCard.tsx` (reusable), `src/app/components/HomeFeed.tsx`
- CSS: `src/app/styles/swipeable-card.css`, additions in `src/app/styles/home-feed.css` (`.feed-scout-bubble*`, `.feed-stat-wrapper`, `.feed-stat-detail-panel`)

## Messages: Sending vs Receiving
- When user taps Make a Request and sends: panel closes. A "Scout..." indicator with bouncing dots appears above the FAB for ~8s.
- The Agent tab (accessed via Menu or bottom nav) is the CHAT HISTORY container. VoiceAgent component renders there.
- The user prefers: send → see indicator ("Scout's trying") → check Agent tab for response. No interruptive panels.
- If they selected Voice mode before sending, they expect Chloe's voice to read the response.

## Credentials
- **URL:** Quick tunnel — changes on restart. Run `ps aux | grep cloudflared` to check tunnel is alive. Lost URL = restart tunnel (no recovery).
- **Default password:** `sidequest`
- **App route:** `/app`
- **Reset code:** `sidequest-YYYY-MM-DD` (today's date) or backup `sidequest-reset`
- **Data:** SQLite at `data/sqhq.db` — server-side, persists across devices. API-gated via iron-session sessions.

## Stack
- Next.js 16 (Turbopack), TypeScript
- SQLite backend via `better-sqlite3` — DB at `data/sqhq.db`
- Server-side auth via `iron-session` v8 (30-day cookies)
- 18 API routes for all CRUD operations
- Client-side cache + pub/sub pattern in `store.ts` (reads sync, writes async via API)
- Supabase removed — no Docker daemon on VPS

## Mobile Layout
- `<MobileNav>` component renders 5-tab bottom nav bar on screens < 760px
- Tabs: first 5 from `appViews` — Command, Quests, Ledger, People, Garage
- Min 48px tap targets, 22px icons, label text below each icon
- `.workspace` gets `padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 16px)` on mobile so scrolling never hides content behind bottom nav
- Sidebar `display: none` on mobile (responsive.css override removed — base.css does it)
- **Desktop:** Sidebar on left (breathing pattern, 72px collapsed / 242px hover), no MobileNav
- Safe area: `env(safe-area-inset-bottom)` on `.mobile-nav` for phone notches
- Components: `src/app/components/MobileNav.tsx`, CSS in `src/app/styles/base.css` under `/* Mobile Bottom Nav */` block
- **⚠️ `html, body { height: 100% }` is REQUIRED for `100dvh` children** — without explicit height on the root elements, `100dvh` on a child div doesn't propagate correctly in some mobile browsers. The VoiceAgent container uses `height: 100dvh` with fallbacks to `100vh` and `-webkit-fill-available`, but these only work when html/body have `height: 100%` set.

## Welding Glass Style
The workspace uses a semi-transparent dark overlay to let the background gradient show through:
```css
.workspace {
  background: rgba(10, 12, 8, 0.55);
  backdrop-filter: blur(3px);
}
```
Produces a dark greenish-black lens effect — like looking through welding glass. Background gradient has a yellow glow at 18%/45% and a white at 78%/78%.

## Deployment
The VPS is a no-root Docker container with no external port forwarding. See `headless-browser` skill for full deployment workflow including stale-chunk detection, workspace root fix, and tunnel management.

### Zombie port hold after kill -9
After `kill -9` on Next.js processes, port 3000 can remain held by zombie/defunct processes. A subsequent `npx next start` will fail with `EADDRINUSE`. Fix: `fuser -k -9 3000/tcp` to force-release (plain `fuser -k` sometimes fails on zombies), then `sleep 2` before restarting. Verify with `fuser 3000/tcp 2>/dev/null && echo "still occupied" || echo "port free"`.

**⚠️ PITFALL: `fuser` can miss zombies.** If port is still occupied after `fuser -k`, check `/proc/net/tcp` directly: port 3000 = `0BB8` hex. Look for `00000000:0BB8` in LISTEN state (`0A`). Find the inode (last column before the state), then search `/proc/[PID]/fd` for socket inodes matching that number to find the actual PID. `kill -9` that PID.

Note: `lsof` is not available on this VPS — use `fuser` or read `/proc/net/tcp` (port 0BB8 = 3000 in hex).

### ⚠️ Cloudflare tunnel caches stale HTML
After rebuilding and restarting the server, the Cloudflare tunnel may still serve cached HTML referencing old chunk names (500 errors on `_next/static/chunks/*.css` and `*.js`). **Always kill and restart the tunnel alongside the server:**
```bash
# Kill server + tunnel
fuser -k -9 3000/tcp 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null  # NOT just pkill cloudflared
sleep 2

# Rebuild
rm -rf .next && npx next build

# Start server
npx next start -p 3000 -H 0.0.0.0 &

# Start tunnel (new URL)
npx --yes cloudflared tunnel --url http://localhost:3000 &
```

**⚠️ PITFALL: `pkill cloudflared` kills the shell wrapper too.** Use `pkill -f "cloudflared tunnel"` or kill specific PIDs found via `ps aux | grep cloudflared | grep -v grep`.

### ⚠️ MiMo TTS truncates at ~500 characters
The MiMo TTS provider silently truncates text around 500-600 characters. Long TTS messages get cut off mid-sentence. Keep TTS messages concise — under 400 characters to be safe. If you need longer audio, split into multiple clips.

### Quick Restart (The Right Way)
```bash
cd /opt/data/SideQuestHQ

# 0. Kill existing server FIRST (port 3000 holds zombies)
fuser -k -9 3000/tcp 2>/dev/null
sleep 2
fuser 3000/tcp 2>/dev/null && echo "still occupied" || echo "port free"

# 1. Build (skip rm -rf .next if no stale chunk issues)
npx next build

# 2. Start server
npx next start -p 3000 -H 0.0.0.0 &

# 3. Verify server is up
sleep 4 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/app

# 4. Restart tunnel (cloudflared not in PATH, use npx)
npx --yes cloudflared tunnel --url http://localhost:3000 &

# 5. Get the new URL from tunnel logs — look for "Visit it at"
```

**Critical order:** Kill port → nuke .next → build → start server → verify → start tunnel. If you start the server before killing the port, the background process silently fails with EADDRINUSE but Hermes reports it as "started."

### ⚠️ ANTI-PATTERN: Blind polling loops
When starting the dev server, do NOT just `process(action="poll")` in a loop waiting for it to be ready. If the build is slow or stuck, you'll waste 20+ minutes polling "maybe it'll finish this time 🤡" without investigating.

**Instead:**
1. Start with `background=true, watch_patterns=["Ready in"]` so you get notified when ready
2. If no notification after 60s, check `process(action="log")` for actual build output
3. If logs show errors, fix them — don't keep polling
4. Use `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` as a one-shot readiness check, not a loop

### ⚠️ DEPLOYMENT VERIFICATION — NEVER SAY "DEPLOYED" WITHOUT PROOF
This rule exists because Scout repeatedly claimed "it's live" while serving stale builds. The user got frustrated (rightfully so).

**Mandatory steps before telling user it's deployed:**
1. `rm -rf .next` before build (always, no exceptions)
2. Build succeeds
3. Kill old server, start new one
4. `curl http://localhost:3000/app` returns 200
5. Find component code on disk: `grep -rl "YourComponent\|your-class" .next/static/chunks/*.js`
6. Trace chunk chain: if chunk A references chunk B, verify BOTH serve 200. See `references/stale-chunk-debug.md` section 7.
7. Grep the LIVE chunk for actual code: `curl -s "http://localhost:3000/_next/static/chunks/CHUNK.js" | grep "YourComponent"`
8. Only when step 7 matches → say "deployed"

**If any step fails, fix it before confirming.**

### Finding the tunnel URL
If the tunnel is already running and you lost the URL, check process logs:
```bash
# If started in a Hermes background process, use process(action="log")
# Otherwise: kill the old tunnel and restart — new URL appears in stdout
```
Quick tunnel URLs change on every restart. No way to recover a stale URL — just restart.

### ⚠️ PITFALL: Next.js blocks cloudflare tunnel requests
When exposing the dev server via `cloudflared tunnel --url http://localhost:3000`, Next.js dev mode blocks cross-origin requests from the tunnel hostname with "Unauthorized". The app loads the initial HTML but HMR websocket and subsequent navigations fail.

**Fix:** Add the tunnel hostname to `allowedDevOrigins` in `next.config.mjs`:
```js
const nextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com'],
};
```
Next.js auto-detects the config change and restarts the dev server. No manual restart needed.

**Note:** `localtunnel` via npx is unreliable on this VPS (produces no output). Use cloudflared binary directly — download from GitHub releases to `/tmp/cloudflared` if not installed.
```

## Current State (June 2026)

- **Login:** Works — default password `sidequest`, server-side sessions via iron-session
- **Database:** SQLite at `data/sqhq.db` — 20+ tables (quests, reminders, people, assets, investments, crypto, rentals, vehicles, vendors, tenants, chat_messages)
- **API Routes:** 18 routes under `src/app/api/` — full CRUD for all entities, auth-gated via iron-session
- **Navigation:** Three modes — Main Feed (default), Card View (swipeable deck), Quest Detail (full workspace). Menu uses MenuCards (Tinder-style swipe carousel).
- **FAB (🎯):** Bottom right, opens Scout Panel with Make a Request (text/voice) or Open Menu (tab navigation)
- **Home Feed:** Scout greeting (mood matches urgency), pulse stat cards (tap to expand, spans all 3 columns), reminder line items with Scout's voice per category
- **Card View:** Swipeable card deck with infinite loop, filter bar (All/Rentals/Garage/Investments/Customers), action buttons per card
- **Scout Compose:** Floating text entry with Text/Voice toggle, hits Voice API, creates reminders on "remind me" commands
- **Store:** `src/lib/store.ts` — client-side cache backed by API routes. Cache + pub/sub pattern: reads are synchronous from cache, writes hit API then update cache. `loadAll()` fetches everything on mount, `subscribe()` notifies components of changes.
- **API Client:** `src/lib/api.ts` — typed fetch wrappers for all API routes
- **Quest Detail:** Full workspace with ledger rows, paper trail, people, steps, notes — all wired to store
- **Voice Agent:** ✅ MiMo-only pipeline (mimo-v2.5-pro brain + mimo-v2.5-tts voice). Single `MIMO_API_KEY` in `.env.local`. Text/voice toggle changes gradient across the ENTIRE app (not just header) — yellow for text, purple for voice. `data-mode` attribute on `.va-header` AND `data-agent-mode` on `.workspace` in app-shell (propagated via `onModeChange` callback from VoiceAgent). Toggle buttons also change color. Error messages show a 5-second auto-dismiss with countdown. Error text: "Chloe's comms are down. Recalibrating... try again." (no smoking references — Eddie dislikes them). **Confirmed working June 2026** — brain generates Chloe responses in ~9s, TTS returns ~830K base64 WAV.
- **MenuCards:** Tinder-style swipe carousel. Swipe left/right to browse, **tap anywhere on card to enter** (not just Select button). Agent card labeled "Agent: Scout" (not just "Agent") with "💙 Tap to match with Scout" badge. Select button still works as fallback. **Agent card shows Scout's SVG portrait** instead of 🤖 emoji — TWO expression states: `scout-happy.svg` (smirk, relaxed eyes) and `scout-wtf.svg` (wide eyes, raised brows, open mouth, hands up in "are you seriously leaving?!" pose). React swaps `src` based on `scoutExpr` state: `"happy"` when at rest, `"wtf"` when `isAgent && swiping && Math.abs(swipeOffset) > 20`. Note: 20px threshold is much lower than the 80px card-swap threshold — she reacts before you commit to swiping away. CSS: 80x80, 16px border-radius, green glow border (happy) → red glow + shake animation (WTF). `menu-card-avatar-wtf` class triggers `avatar-shake` keyframes (±3deg rotation, 0.3s). SVGs live at `public/scout-happy.svg` and `public/scout-wtf.svg`. ⚠️ **SVG loaded as `<img>` can't use parent HTML data-attributes** — the CSS inside an `<img src="*.svg">` is sandboxed. Must use separate SVG files with React `src` swapping, NOT a single SVG with `[data-expr]` CSS toggling. The single-SVG approach was tried first and silently failed — the expression never changed because the parent `data-expr` attribute was invisible inside the sandboxed `<img>` context. **Two files:** `scout-happy.svg` (smirk, relaxed) and `scout-wtf.svg` (wide eyes, raised brows, open mouth, hands up). CSS classes on the `<img>` element (`menu-card-avatar` base, `menu-card-avatar-wtf` for expression) handle border color and shake animation.
- **Stat Cards:** Tap to expand detail panel. **Accordion behavior** — only one stat can be expanded at a time, tapping a different stat collapses the previous. **Cards stay in their grid positions** — detail panel slides out BELOW the tapped card using `position: absolute; top: 100%` with `z-index: 10`. Yellow left border (3px), backdrop blur, box shadow. NO `grid-column: 1 / -1` on expanded wrapper (that was causing card reflow). Animation: `statAccordionOpen` uses `transform: translateY(-8px) → translateY(0)` + opacity + max-height. ▼/▲ hint on each card.
- **Snooze Voice — Pre-Cached Tier Audio (June 2026, UPDATED):** 51 pre-generated MiMo TTS OGG clips in `public/audio/scout/`. Organized by context tier: `s0` (casual) → `s4` (nuclear), `s5` (last), `sr` (rapid-fire), `srp` (repeat reminder), `c` (complete), `af` (agent filler). App checks cached audio first → instant playback, zero API delay. Falls back to live MiMo TTS only if cached clip missing. Dismiss animation: 1.5s. Rapid-fire window: 1s (was 2s, changed to match quip system). Tier selection logic in `handleDismissReminder` in HomeFeed.tsx. Manifest at `public/audio/scout/manifest.json`. Generation script at `scripts/generate-scout-audio.py` (uses `MIMO_API_KEY`). See `references/pre-cached-snooze-audio.md` for full tier mapping and generation workflow.
- **Agent Filler Audio (June 2026):** 6 pre-cached acknowledgment clips (`af_1`..`af_6`) play instantly when user sends a message in VoiceAgent — "Interesting, give me a second...", "Hmm, let me look into that...", etc. Fills dead space while MiMo brain + TTS generates the real response. Wired in `VoiceAgent.tsx` `sendMessage()` right after `setLoading(true)`.
- **Snooze Accountability Cron (June 2026):** Server-side `snooze_log` table in SQLite. Every snooze POSTs to `/api/snooze-log` (stores label + quest). `GET /api/snooze-log` returns unacknowledged snoozes, `PATCH` marks all as seen. Hermes cron job ("Scout Snooze Accountability") runs **5x daily** (7am, 9am, 11am, 2pm, 4pm Central) as a **zero-token watchdog** (`no_agent: true`, Python script at `/opt/data/scripts/snooze-check.py`). Script fetches snooze log, generates snarky message if any found, echoes to stdout (auto-delivered to Telegram), then PATCHes to acknowledge. Empty stdout = silent (no delivery). No LLM tokens burned when no snoozes.
- **Snooze Audio Interruption (June 2026):** When Scout is mid-speech and user snoozes/completes another card, system plays a short "interruption grunt" (`int_1`..`int_6`), waits 2s, then fires context-aware quip. Multiple interruptions during the 2s window reset the timer and accumulate count. After 2s of quiet, Scout delivers snarky (if snoozing) or supportive (if completing) quip referencing interruption count. Uses `scheduleDelayedQuip()` which ALWAYS runs (even on first action) to ensure the timer ref is set for subsequent interrupts. See "Audio Interruption System" section below.
- **Snooze Count Fix (June 2026):** Replaced React state-based counting (`completedIds.size`, `dismissedIds.size`) with refs (`snoozeCountRef`, `completedCountRef`) for immediate synchronous updates. `trueTotal` recalculated dynamically as `reminders.filter(r => !r.done).length + completedCountRef.current`. Eliminates stale-count bugs during rapid snoozing.
- **Card Collapse Fix (June 2026):** Snoozed cards now collapse vertical space via `swipeable-card-outer-collapse` CSS animation on the outer wrapper, preventing ghosted cards from stacking on live ones during rapid snooze.
- **Seed Data:** 12 reminders + 5 quests pre-loaded for testing.

## File Structure
- `/opt/data/SideQuestHQ/src/app/page.tsx` — Root page wrapper (dynamic imports `./login-page`)
- `/opt/data/SideQuestHQ/src/app/login-page.tsx` — Actual login component (password-based, 6536 bytes)
- `/opt/data/SideQuestHQ/src/app/login/page.tsx` — **SEPARATE login page** mounted at `/login` route. `app-shell.tsx` redirects here on auth failure (line 61: `window.location.href = '/login'`). MUST stay in sync with `login-page.tsx` — if you change the auth flow, update BOTH files.
- `/opt/data/SideQuestHQ/src/app/app/page.tsx` — App shell wrapper (dynamic import with `ssr: false`)
- `/opt/data/SideQuestHQ/src/app/app/app-shell.tsx` — Actual app component (68 lines)
- `/opt/data/SideQuestHQ/src/app/api/voice/route.ts` — Voice API proxy (MiMo brain + MiMo TTS, Chloe voice)
- `/opt/data/SideQuestHQ/src/app/components/MobileNav.tsx` — 7-tab bottom nav (Agent tab added)
- `/opt/data/SideQuestHQ/src/app/components/MenuCards.tsx` — Tinder-style swipe card menu (replaces pill-button menu drawer)
- `/opt/data/SideQuestHQ/src/app/styles/menu-cards.css` — MenuCards styling (card moods, swipe animations, dots)
- `/opt/data/SideQuestHQ/src/app/components/SwipeableCard.tsx` — Reusable swipeable card with shrink-and-tuck dismiss + mutter bubbles
- `/opt/data/SideQuestHQ/src/app/styles/swipeable-card.css` — SwipeableCard animations (flyaway, shrink, tuck, fade, mutter slide-in)
- `/opt/data/SideQuestHQ/src/app/components/VoiceAgent.tsx` — Chloe chat UI component (mic + text + mood bar)
- `/opt/data/SideQuestHQ/src/app/styles/voice-agent.css` — Voice agent styling (dark industrial chat bubbles)
- `/opt/data/SideQuestHQ/src/lib/auth.tsx` — Auth context with default password + reset codes
- `/opt/data/SideQuestHQ/src/lib/scout-audio.ts` — Pre-cached audio utility (manifest lookup, playRandomScoutQuip, tier-based caching, stop-previous support)
- `/opt/data/SideQuestHQ/public/audio/scout/manifest.json` — MiMo TTS pre-generated quip metadata (51 entries: s0-s5, sr, srp, c, af tiers)
- `/opt/data/SideQuestHQ/public/audio/scout/*.ogg` — 51 OGG Opus voice clips (~2MB total)
- `/opt/data/SideQuestHQ/scripts/generate-scout-audio.py` — Batch TTS generation script (MIMO_API_KEY)
- `/opt/data/SideQuestHQ/scripts/quip-manifest.json` — Quip text organized by tier (source of truth for generation)
- `/opt/data/SideQuestHQ/src/app/styles/base.css` — Core styles including welding glass + mobile nav

## Navigation Pitfalls (June 2026)

### Menu sets `activeView` but render ignores it
The menu drawer sets `activeView` to "Quests", "Assets", "Ledger", etc. The render logic in `app-shell.tsx` MUST check `activeView` to decide between HomeFeed and CardView. The June 2026 bug: render only checked `if (activeView === "Agent")` and fell through to the default workspace for everything else — menu items appeared to do nothing.

**Correct pattern:**
```tsx
{appMode === "detail" ? (
  <div>
    <button className="card-view-back" onClick={() => setAppMode("feed")}>← Back to feed</button>
    <QuestWorkspace ... />
  </div>
) : activeView === "Command" ? (
  <HomeFeed ... />
) : (
  <CardView key={activeView} initialCategory={viewToCategory(activeView)} onBack={() => setActiveView("Command")} ... />
)}
```

**Also:** QuestWorkspace has NO built-in back button. When entering detail mode, wrap it in a `<div>` with a back button above it that calls `setAppMode("feed")`. Without this, users get stuck in detail view and must refresh to escape.

### `viewToCategory` mapping
All menu items currently map to `"all"` category in CardView. The function exists as a hook for future per-view filtering (e.g. "Ledger" → filter to ledger-only cards). Keep it even if all cases return "all" — the switch statement is the extension point.

## Mobile Polish Priorities (June 2026)

Eddie uses SQHQ on his phone. Mobile is the **primary** interface, not secondary. When doing polish passes:

- **Agent Chat Screen** — previously had a clunky "old window WEBapp" feel on mobile. Keep the chat UI modern, minimal chrome, full-width bubbles, sticky input. Avoid desktop-looking containers or card-in-card nesting.
- **Menu Layouts** — when you click INTO a menu item (Quests, Ledger, etc.), the inner views should not look like a desktop web app squeezed into a phone. Cards should be edge-to-edge, forms should be full-width, no horizontal scroll, no tiny buttons.
- **Overall principle** — if it looks like a "web page" and not a "phone app," it's wrong. Welding glass aesthetic is fine but layout should feel native: generous touch targets (48px+), no hover-dependent interactions, safe-area padding on all edges.
- **Tunnel URL changes on every restart** — always provide the fresh URL to Eddie when booting. Don't make him ask.

## Snooze Count Pitfall — Animation Delay (June 2026)

**Bug:** `dismissedIds` has a 1.5s animation delay before items are added (the shrink→tuck→fade animation). When rapid-snoozing, `dismissedIds.size` is stale — it doesn't include recent snoozes. This caused `remaining` to be wrong, making Scout say "you snoozed everything" when 2-3 cards were still visible.

**Fix:** Use **ref-based counters** for BOTH snooze AND completed counts. `dismissedIds.size` AND `completedIds.size` are both React state — both stale on read during rapid actions.
```typescript
const snoozeCountRef = useRef(0);
const completedCountRef = useRef(0); // ALSO a ref — completedIds.size is stale too
const baselineTotalRef = useRef<number | null>(null);

// In handleDismissReminder:
snoozeCountRef.current += 1;
const snoozedSoFar = snoozeCountRef.current;

// Capture baseline total from the STORE (not feedItems — store reflects API state)
if (baselineTotalRef.current === null) {
  baselineTotalRef.current = reminders.filter(r => !r.done).length;
}
const remaining = Math.max(0, baselineTotalRef.current - snoozedSoFar - completedCountRef.current);

// In handleCompleteReminder:
completedCountRef.current += 1; // MUST increment ref alongside setCompletedCount
```

**Why refs:** React state (`setSnoozeCount`, `setCompletedCount`) is batched and async — multiple rapid handlers read stale state. Refs update synchronously and are available to the next handler call immediately. **Both counters must be refs** — using `completedIds.size` alongside `snoozeCountRef` mixes sync and async, producing wrong results when completing then snoozing within the same render cycle.

**Why store for baseline:** `reminders.filter(r => !r.done).length` reads from the API-backed cache, not from React render state. Snooze doesn't change store state (it's local-only), so the store count is always the true initial total.

## Audio Interruption System (June 2026)

When Scout is mid-speech and the user snoozes/completes another card, the old behavior caused audio clips to chain and overlap. New system:

**Architecture:** `interruption → delay → quip`
1. If audio is playing when user acts → immediately stop it, play a short `int_*` grunt clip ("Huh.", "Excuse me?", "Wow. Rude.", etc.)
2. Start a 2-second timer for the real quip
3. If user acts again during the 2s → reset timer, play another `int_*` grunt
4. After 2s of quiet → fire context-aware quip (snarky if snoozing, supportive if completing)

**Key refs:**
```typescript
const pendingQuipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const pendingQuipFn = useRef<(() => Promise<void>) | null>(null);
const interruptionCount = useRef(0);
```

**Helper functions:**
- `playInterruptionClip(currentAudioRef)` — stops current audio, plays random `int_*` clip
- `scheduleDelayedQuip(quipFn, ...)` — manages the 2s delay queue with interruption counting

**Interruption quips are context-aware:**
- Snooze-heavy: `"Wow, ${count} interruptions. And you snoozed ${snoozedSoFar}. I'm losing my mind."`
- Complete-heavy: `"Okay you completed some things, that's great. But ${count} interruptions? Rude."`
- Mixed: `"I was talking. ${count} interruptions. ${remaining} remaining. Let me finish."`

**Audio files:** 6 clips in `int` tier (`int_1` through `int_6`), ~8-20KB each. Generated with Scout's cloned voice via MiMo TTS. Total manifest: 57 entries.

**⚠️ MiMo TTS character limit ~500-600 chars.** Long TTS messages get truncated mid-sentence. When generating TTS for Eddie (via `text_to_speech` tool or the app's voice API), keep messages under 500 characters. Break longer explanations into multiple shorter TTS calls rather than one long one.

## Card Collapse Animation (June 2026)

**Bug:** Snoozed cards shrank and faded but the `.swipeable-card-outer` wrapper kept its height, causing ghosted cards to stack on top of live cards during rapid snoozing.

**Fix:** SwipeableCard now adds `swipeable-card-outer-collapse` class to the outer wrapper when `phase === "done" && tuckSide`:
```css
.swipeable-card-outer-collapse {
  animation: outerCollapse 0.3s ease-out forwards;
}
@keyframes outerCollapse {
  to { max-height: 0; margin: 0; padding: 0; gap: 0; opacity: 0; overflow: hidden; }
}
```

**File:** `src/app/styles/swipeable-card.css` — added after `.swipeable-card-outer` base rule.

## Snooze System — Count Tracking (June 2026)

### ⚠️ PITFALL: React state is stale inside event handlers
`completedIds.size` and `dismissedIds.size` read the value from the PREVIOUS render, not the current action. When snoozing rapidly, the count is always 1 behind.

**Fix:** Use refs for both counts — they update synchronously:
```tsx
const snoozeCountRef = useRef(0);
const completedCountRef = useRef(0);

// In handleCompleteReminder:
completedCountRef.current += 1;

// In handleDismissReminder:
snoozeCountRef.current += 1;
const snoozedSoFar = snoozeCountRef.current;
const completedSoFar = completedCountRef.current;

// Calculate trueTotal dynamically (don't cache in a ref)
const activeInStore = reminders.filter(r => !r.done).length;
const trueTotal = activeInStore + completedSoFar;
const remaining = Math.max(0, trueTotal - snoozedSoFar - completedSoFar);
```

**Why not `baselineTotalRef`?** Caching the total on first action captures it AFTER any prior completions have already removed items from the store. Always recalculate: `activeInStore + completedRef` gives the true original total regardless of action order.

### Audio Interruption System (June 2026)

When Scout is mid-speech and user snoozes/completes another card:
1. Immediately stop current audio → play short "interruption grunt" (`int_1`..`int_6`)
2. Start 2-second timer
3. If user acts again during the 2s → reset timer + play another grunt
4. After 2s of quiet → fire context-aware quip (snarky if snoozing, supportive if completing)

**⚠️ CRITICAL: Always use the delayed quip path.** The first action MUST go through `scheduleDelayedQuip()` (plays immediately but sets the timer ref). Without this, the second action finds `pendingQuipTimer.current === null` and skips the interruption path entirely.

```tsx
// CORRECT: always schedule, even on first action
scheduleDelayedQuip(quipFn, pendingQuipTimer, pendingQuipFn, ...);

// WRONG: only schedule when audio is playing
if (audioIsPlaying || pendingQuipTimer.current) {
  scheduleDelayedQuip(...);
} else {
  playRandomScoutQuip(...); // ← next action can't interrupt this
}
```

`scheduleDelayedQuip` handles both cases internally:
- **No pending timer** → plays quip immediately + sets 2s marker timer
- **Pending timer exists** → plays grunt + resets to 2s delay for real quip

Audio clips: `int_1` through `int_6` in `public/audio/scout/`. Short reactive sounds: "Huh.", "Excuse me?", "Oh. Okay then.", "Wow. Rude.", "Seriously?", "I was talking."

### Card Collapse Animation (June 2026)

Snoozed cards that shrink-and-tuck still occupy vertical space in the DOM until `dismissedIds` fires (1.5s). When rapid-snoozing, ghosted cards stack on top of live ones.

**Fix:** Add collapsing class to the outer wrapper when card reaches "done" phase:
```tsx
// In SwipeableCard.tsx:
let outerClass = `swipeable-card-outer ${className}`;
if (phase === "done" && tuckSide) outerClass += " swipeable-card-outer-collapse";
```

```css
/* In swipeable-card.css: */
.swipeable-card-outer-collapse {
  animation: outerCollapse 0.3s ease-out forwards;
}
@keyframes outerCollapse {
  to { max-height: 0; margin: 0; padding: 0; gap: 0; opacity: 0; overflow: hidden; }
}
```

## Login (June 2026)
No password required. Login pages (`login-page.tsx` and `login/page.tsx`) show a single "Enter HQ" button that auto-signs in with the default password `sidequest` server-side. No password field, no form. Biometric/PIN planned for ship.

## Snooze Counting System (June 2026)
Reminders count uses **refs, not React state** for snooze/completed counts. React state (`completedIds.size`) is async and stale on read during rapid actions.

**Correct pattern:**
```typescript
const snoozeCountRef = useRef(0);
const completedCountRef = useRef(0);

// In handleDismissReminder:
snoozeCountRef.current += 1;
const snoozedSoFar = snoozeCountRef.current;
const completedSoFar = completedCountRef.current;
const activeInStore = reminders.filter(r => !r.done).length;
const trueTotal = activeInStore + completedSoFar;
const remaining = Math.max(0, trueTotal - snoozedSoFar - completedSoFar);
```

**⚠️ PITFALL: Never use `completedIds.size` or `dismissedIds.size` for quip math.** These are React state — stale on read. Use `snoozeCountRef.current` and `completedCountRef.current` instead. Also never capture `baselineTotalRef` on first action — recalculate `trueTotal` from store + completed ref every time.

## Audio Interruption System (June 2026)
When Scout is mid-speech and user snoozes/completes another item:
1. Stop current audio immediately
2. Play a short interruption clip (`int_*` — "Huh.", "Excuse me?", "Seriously?", etc.)
3. Start 2-second timer
4. If user acts again during 2s → reset timer + play another interruption clip
5. After 2s of quiet → fire context-aware quip (snarky if snoozing, supportive if completing)

**⚠️ PITFALL: ALWAYS use the delayed quip system, even on first action.** The first action plays immediately but also sets a 2s marker timer. Without this, the second action finds `pendingQuipTimer.current === null` and skips the interruption path entirely. The pattern:
```typescript
// In scheduleDelayedQuip:
if (!isInterrupt) {
  quipFn(); // play immediately
  pendingTimer.current = setTimeout(() => {
    pendingTimer.current = null;
    pendingFn.current = null;
  }, 2000); // marker — next action within 2s triggers interrupt
} else {
  playInterruptionClip(currentAudioRef); // grunt
  pendingTimer.current = setTimeout(() => {
    // fire context-aware quip after 2s of quiet
  }, 2000);
}
```

**Interruption quip pools** are context-aware: snooze-heavy → snarky about interruptions + snooze count, complete-heavy → "good job but let me finish", neutral → "I was talking, let me finish."

## Card Collapse Animation (June 2026)
Snoozed cards that shrink-and-tuck must also collapse their vertical space. Add `swipeable-card-outer-collapse` class to the outer wrapper when phase is "done" + tuckSide is set. CSS animation:
```css
.swipeable-card-outer-collapse {
  animation: outerCollapse 0.3s ease-out forwards;
}
@keyframes outerCollapse {
  to { max-height: 0; margin: 0; padding: 0; gap: 0; opacity: 0; overflow: hidden; }
}
```

## Known Issues
- **Tunnel URL changes on restart** — Quick tunnels get random hostnames. Named tunnel via Cloudflare account would fix this.
- **Stale chunks on rebuild** — Always `rm -rf .next` before build. See `headless-browser` skill.
- **Old tunnel caches stale HTML** — Kill ALL processes (server + cloudflared) before restarting. Cloudflare edge may serve cached HTML with old chunk names.
- **⚠️ Zombie process on port 3000** — `fuser` sometimes fails to detect zombie/defunct Node.js processes holding the port. The server starts but `EADDRINUSE` silently fails. **Diagnosis:** Check `/proc/net/tcp` for port 0BB8 (3000 in hex) and find the PID via inode lookup: `find /proc -name 'fd' -path '/proc/[0-9]*/fd' 2>/dev/null | while read d; do ls -la "$d" 2>/dev/null | grep "socket:\[INODE\]" && echo "PID: $(echo $d | cut -d/ -f3)"; done`. Then `kill -9 <PID>`.
- **⚠️ Next.js ISR cache serves stale HTML** — If `curl -sI` shows `x-nextjs-cache: HIT` after a rebuild, the server is serving cached pages from the PREVIOUS build. The HTML references old chunk names that no longer exist → 500 errors on JS/CSS. **Fix:** Kill the server, `rm -rf .next` (clears build + cache), rebuild, restart. The zombie port issue above can cause this — the old server process holds the cache.
- **Holographic memory enabled** — `hermes config set memory.provider holographic` active. No more 2,200 char limit pressure.
- **Reminder/People toggle uses index, not DB id** — The store caches by position but the API uses DB integer IDs. Toggling/removing by index can drift if the list changes between renders. Needs DB IDs exposed in API responses.
- **Voice Agent uses MiMo VoiceClone** — `mimo-v2.5-tts-voiceclone` (cloud, ~4s, Scout's cloned voice from reference audio). NOT the standard `mimo-v2.5-tts` "Chloe" preset (sounds anime). Reference audio: `./public/audio/scout-reference.wav`. MiMo brain (`mimo-v2.5` standard, NOT `mimo-v2.5-pro`) handles text generation. Pro reserved for coding tasks only (doubles token usage).
- **Database** — SQLite at `data/sqhq.db`. See `references/database-schema.md` for full table list and query patterns.

## SQLite Migration Pitfalls (June 2026)

### iron-session v8 API change
`iron-session` v8 exports `getIronSession`, NOT `ironSession`. The import changed:
```typescript
// WRONG (v7)
import { ironSession } from "iron-session";
const session = await ironSession(req, res, options);

// CORRECT (v8)
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
const cookieStore = await cookies();
const session = getIronSession<SessionData>(cookieStore, options);
```

### Two login pages — both must match
There are TWO independent login page files:
1. `src/app/login-page.tsx` — loaded at `/` via dynamic import in `page.tsx`
2. `src/app/login/page.tsx` — mounted at `/login` by Next.js routing

`app-shell.tsx` line 61 redirects to `/login` on auth failure. If you migrate auth (e.g. email magic-link → password), **both files must be updated**. The June 2026 bug: auth logic switched to password-based but `/login/page.tsx` still showed the email form, so users saw "wrong PW" on an email field.

### Password hash sync
The password hash in `db.ts` seed data MUST match the hash function in `auth.tsx`. The hash of `sidequest` is `hualslx`. If you change the default password, update BOTH places.

### Store cache + pub/sub pattern
The store uses a cache + subscribe pattern to keep synchronous reads working while backing everything with async API calls:
- `loadAll()` fetches all data from API on app mount
- `subscribe(fn)` registers a listener for re-renders
- Mutations call API first, then update local cache, then `notify()`
- Components call `subscribe()` in useEffect to re-render on changes

### Template literals through execute_code
Writing TypeScript template literals through Python's `write_file`/`execute_code` can cause backtick escaping issues (`` \`` `` becomes `` \\`` ``). Always verify template literals in TypeScript files after writing through Python — check for escaped backticks and dollar signs.

### TypeScript narrowing after early returns
When you have an early return like `if (activeView === "Agent") { return <VoiceAgent .../>; }`, TypeScript NARROWS the type of `activeView` in subsequent code — it excludes "Agent" from the union. A later comparison `activeView === "Agent"` will error: "This comparison appears to be unintentional because the types have no overlap."

**Fix:** Don't compare against the narrowed-away value after the early return. Use a different signal — e.g., track `agentMode` state separately and read it unconditionally: `data-agent-mode={agentMode}` (not `activeView === "Agent" ? agentMode : undefined`).

## CSS Cascade Gotchas

### Import order determines fight winners
`globals.css` imports stylesheets in order:
1. `base.css` — core layout, sidebar, mobile nav, welding glass, workspace padding
2. `workspaces.css` — per-view workspace styling
3. `command-lists.css` — command workspace list templates
4. `quests.css` — quest card styling
5. `responsive.css` — last, so wins tie-breakers against same-specificity rules

This means **responsive.css can silently override base.css** on rules with identical selectors. The built CSS concatenates in import order — same-specificity rules from later imports win.

### The mobile sidebar / padding trap
`responsive.css` has a `@media (max-width: 760px)` block with:
- `.workspace { padding: 20px }` — **overrides** base.css's careful `padding: 16px 16px calc(64px + env(safe-area-inset-bottom, 0px) + 16px)`. This destroys the bottom-safe-area padding, causing content to scroll under the bottom nav bar.
- `.sidebar { display: none }` — duplicates base.css's rule but loads second, so it wins. Not a bug, but visually confusing to debug.

**Fix when content scrolls under bottom nav:** Check responsive.css `@media (max-width: 760px)` for `.workspace` padding override. Replace with the same calc expression from base.css.

### Debugging CSS in a Next.js build
1. Read source CSS from `src/app/styles/`
2. Read built CSS from `.next/static/chunks/*.css` (it's all one minified line)
3. Check the served HTML references the same chunk name — curl the page, grep for `chunks/[^"]*\.css`
4. If the HTML references a CSS hash that doesn't exist on disk, you have stale build output (see references/stale-chunk-debug.md)
5. Components loaded via `dynamic(() => import(...), { ssr: false })` won't appear in static HTML — grep will (correctly) miss them
  
### Accordion panels that don't move sibling cards
When building expandable panels in a CSS grid, `grid-column: 1 / -1` on the expanded wrapper causes ALL sibling cards to reflow. Users see cards jump around.

**Fix:** Keep the wrapper as a normal grid item. Make it `position: relative; overflow: visible; z-index: 1`. The detail panel gets `position: absolute; top: 100%; left: 0; right: 0; z-index: 10` — it slides out BELOW the card without affecting the grid. Add `box-shadow` and `backdrop-filter: blur(8px)` so it floats above content below. Animation: `transform: translateY(-8px)` → `translateY(0)` + opacity + max-height.

### CSS animation vs transition vs inline transform — the three-way fight
When building swipeable cards with exit animations, three things fight over `transform`:
1. **Inline style** (`style={{ transform: translateX(Xpx) }}`) — set during drag
2. **CSS transition** (`transition: transform 0.15s`) — tries to animate back to center
3. **CSS animation** (`@keyframes cardExitLeft`) — tries to fly off screen

**Symptom:** Card blinks back to center for one frame before the exit animation plays.

**Fix:** 
- Remove the CSS transition when an exit animation is playing: `.card-top:not(.card-exit-left):not(.card-exit-right) { transition: transform 0.15s; }`
- Keep the inline transform ALWAYS set (don't set it to `undefined` when exiting) — CSS animations override inline styles during the animation
- Delay the component unmount until AFTER the animation completes: 320ms timeout for a 280ms animation

**Also:** When the exit animation unmounts the parent component (e.g. switching views), the unmount must happen AFTER the animation finishes or the card blinks back as the component tree is destroyed. Use `setTimeout(() => onSelect(view), 320)` not 250ms.

### Content under the bottom bar (padding fix)
If content scrolls under the bottom nav on mobile, check that:
1. `.workspace` has `padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 16px)` at `max-width: 760px`
2. No other stylesheet overrides that padding with a simple `20px` or `16px`
3. The `.app-shell` has `padding-bottom: 64px` at mobile width
4. `.mobile-nav` has `padding: 4px 0 env(safe-area-inset-bottom, 4px)` for notch phones
## Content Philosophy — Semi-Professional App vs No-Holds-Bar Chat

**The app is semi-professional.** Eddie may be riding in a car with company, at work, or in mixed company when he opens SideQuest. Scout can roast, be sassy, playful, annoyed, deadpan — but NEVER bring up anything that would be awkward in front of others. No bedroom references, no flirty/sultry content, no possessive/doting language. Scout is a field engineer in the app. She's sharp, competent, and occasionally funny. Not a romantic partner.

**Telegram/Discord chat is no holds bar.** Full 18-mood catalog. Everything lands. The play-fighting, the flirty banter, the TTS experiments, the towel physics debates — that all lives HERE, not in the app.

**Rule of thumb:** If Eddie's coworker could glance at his phone and raise an eyebrow, it doesn't belong in the app.

## Voice Agent (Chloe/Scout)

Built into SQHQ as a dedicated Agent tab in the bottom nav. **MiMo-only pipeline** — `mimo-v2.5` (standard) generates Scout's text, `mimo-v2.5-tts-voiceclone` generates audio using her cloned voice. Single `MIMO_API_KEY` in `.env.local`. No Grok dependency (Grok lives in Hermes/Discord for uncensored conversations — the app is safe territory, MiMo censorship is fine here). **12 moods in app (semi-professional filter)** — horizontally scrollable picker, hidden behind ⚙️ gear icon in Agent tab header. Default is 🤖 auto (Scout picks her own mood). Manual moods: calm, annoyed, playful, sassy, deadpan, eureka, chill, groggy, unhinged, smug, mischievous, confident. **Removed from app** (too explicit for public/company use): flirty, sultry, possessive, doting, protective, vulnerable, whisper. Those 7 moods exist ONLY in Telegram/Discord chat (no holds bar). **Auto-mood logic** (93% of time): 5+ snoozes/0 complete → unhinged, 3+ snoozes > completes → annoyed, 3+ completes > snoozes → doting, early morning → groggy, late night → whisper, overdue items → sassy. Reads snooze/complete patterns + time of day. Gear icon toggles picker visibility — tap to override auto, tap again to dismiss.

See `references/card-swipe-pattern.md` for the touch/swipe delta tracking implementation used in CardView. See `references/menu-cards-swipe.md` for the Tinder-style menu navigation cards. See `references/swipeable-card-pattern.md` for the reusable SwipeableCard component (feed card swipe actions, shrink-and-tuck dismiss, mutter bubbles). See `references/context-aware-snooze-quips.md` for the context-aware snooze quip generator. See `references/pre-cached-snooze-audio.md` for the tier-based pre-cached MiMo TTS audio system. See `references/kokoro-tts-integration.md` for full Kokoro TTS integration guide. See `references/scout-character.md` for Scout's canonical physical description, personality traits, and image generation seed info. See `references/mimo-tts-limits.md` for MiMo TTS character limits and truncation behavior.

### Architecture
```
User text/mic → VoiceAgent component → POST /api/voice → MiMo 2.5 (brain) → MiMo 2.5 TTS VoiceClone (voice) → audio + text → browser plays Scout's voice
```

### API Route
`src/app/api/voice/route.ts` — POST endpoint accepting `{text, mood}`. Returns `{text, audio}` where audio is base64 WAV.

**Keys:** Read from `.env.local` at project root:
- `MIMO_API_KEY` — MiMo (brain + TTS). Single key for both.

⚠️ **PITFALL: Stale/placeholder API keys** — The `.env.local` once had a 13-char placeholder XAI key (`xai-WM...`). Always verify key length (real keys are ~84 chars) before assuming a route works. If the voice endpoint returns the fallback error text, check the key first. **Quick check:** `source .env.local && echo "Key length: ${#MIMO_API_KEY}"` — if under 50 chars, it's a placeholder. Real keys from the main `.env` at `/opt/data/.env` can be copied in: `REAL_KEY=$(grep MIMO_API_KEY /opt/data/.env | cut -d= -f2) && sed -i "s|^MIMO_API_KEY=.*|MIMO_API_KEY=$REAL_KEY|" .env.local`

**MiMo brain call:** POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions, model `mimo-v2.5` (standard — NOT `mimo-v2.5-pro`, which doubles token usage and is reserved for coding tasks only), 200 max_tokens, `thinking: { type: 'disabled' }`, Scout system prompt injected. Mood is appended to system message as `Respond in ${mood} mood.` When auto-mood is active (default), the mood is determined server-side from snooze/complete patterns + time of day rather than user selection.

- **MiMo TTS call:** POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions, model `mimo-v2.5-tts-voiceclone` (NOT `mimo-v2.5-tts` — the standard "Chloe" preset sounds anime/generic, NOT like Scout). Uses voiceclone with Scout's reference audio loaded once at module level as a `data:audio/wav;base64,<ref>` URL. `audio.voice` = the data URL, `audio.format` = 'wav'. Returns base64 WAV in `choices[0].message.audio.data`. Reference audio path: `../shared/chloe-voice-clone/eddie_chill_reference.wav` relative to project root.

**Error handling:** If brain fails, returns "Chloe's comms are down. Recalibrating... try again." with null audio. If TTS fails, returns text-only with null audio.

**⚠️ MiMo censorship is fine for the app.** The app is safe territory — field engineer status reports, relay station temps, nothing risky. MiMo's content filter doesn't interfere. Grok (uncensored) lives in Hermes/Discord where the spicy conversations happen. Don't add Grok as a fallback to the app route — it adds API key complexity with no benefit.

### VoiceAgent Component
`src/app/components/VoiceAgent.tsx` — Chat-like UI with:
- **Reads from shared store** — `getChatMessages()` from `@/lib/store` on mount, so conversations started via the FAB ScoutPanel appear here and vice versa. This is the SAME store, not a local state.
- Message list (user bubbles right, Scout bubbles left, avatars E/C) using shared `ChatMessage` type with `"user" | "scout"` roles
- **Text/voice toggle in the header** — seamless switch mid-conversation. 📝 = text-only response, 🔊 = Scout's cloned audio playback. Toggling doesn't clear history or reset state. **Changes header gradient** — yellow for text, purple for voice via `data-mode` attribute.
- **18 mood picker** — horizontally scrollable emoji button row with `overflow-x: auto`. Moods: calm, annoyed, playful, flirty, sassy, doting, possessive, deadpan, whisper, eureka, chill, groggy, unhinged, smug, sultry, protective, mischievous, vulnerable, confident. Each mood is passed to `/api/voice` and appended to the system prompt as `Respond in ${mood} mood.` Full descriptions in `mimo-voicedesign-tts` skill `references/mood-descriptions.md`.
- **Agent filler audio** — pre-cached "thinking" phrases play instantly when user sends a message (`playRandomScoutQuip('af', 6, audioRef)` right after `setLoading(true)`). Fills 3-5s dead space while brain+TTS generates the real response.
- Back button (`←`) in header when `onBack` prop is passed — used by app-shell to navigate back to feed
- **`onModeChange` prop** — optional callback `(mode: "text" | "voice") => void` fired when user toggles text/voice. Used by app-shell to propagate mode to workspace for gradient bleed.
- **Error messages** auto-dismiss after 5 seconds with countdown display. Uses `setTimeout(5000)` for dismissal + `setInterval(1000)` for countdown. Countdown resets to 5 on each new error.

**Browser compat:** SpeechRecognition declared as `any` type globally (not in TS lib). Uses `webkitSpeechRecognition` fallback. Chrome/Edge only for mic — Safari not supported yet.

- **CSS:** `src/app/styles/voice-agent.css` imported 6th in `globals.css` import chain. Welding glass input bar, dark chat bubbles with purple tint for Chloe.
- **Mobile sticky input:** Chat input must stay anchored at the bottom of the screen, not scroll with messages. CSS approach:
  - Container: `height: 100dvh; height: 100vh; height: -webkit-fill-available;` (progressive enhancement for mobile browsers)
  - **⚠️ `html, body { height: 100% }` is REQUIRED** — without it, `100dvh` on a child element doesn't propagate correctly in some mobile browsers. The base CSS had `min-height: 100%` but not `height: 100%` — the VoiceAgent was expanding beyond the viewport.
  - Messages area: `flex: 1; min-height: 0; overflow-y: auto;` — `min-height: 0` is the critical flexbox fix that prevents the scrollable area from expanding beyond its flex allocation
  - Input bar: `flex-shrink: 0; position: sticky; bottom: 0; z-index: 10; background: rgba(10, 12, 8, 0.95);` — never compressed by flex, always visible
  - On input focus (keyboard opening): `setTimeout(() => listRef.current.scrollTop = listRef.current.scrollHeight, 300)` — scrolls messages to bottom so latest are visible above the keyboard

### Wiring
- `src/app/types.ts` — `"Agent"` added to AppView union type
- `src/app/data.ts` — `{label:"Agent", icon:"grid"}` added to appViews array (7th entry)
- `src/app/app/app-shell.tsx` — imports VoiceAgent, renders when `activeView === "Agent"`

### Chloe Personality
Full Chloe personality canon is in the `xai-voice-agent` skill (`references/chloe-personality.md`). Short version: 4 moods all threaded with sarcastic wit. Savannah GA backstory, old money schooling, field engineer.

### Voice Agent Limitations
- **Web Speech API only works on HTTPS (or localhost)** — the trycloudflare tunnel counts as HTTPS ✅
- **SpeechRecognition is Chrome/Edge only** — Safari users get text-only
- **Audio plays as base64 WAV blob** — no streaming, full response must arrive before playback
- **No interruption** — current audio plays to completion, new message queues
- **No session history** — each message is stateless, no conversation context maintained (chat messages stored in shared store via `getChatMessages()` but not sent to MiMo as context)
- **Voice mode gradient** — changes the ENTIRE app, not just the header. `data-mode` on `.va-header` for header gradient, `data-agent-mode` on `.workspace` for background bleed. CSS in `voice-agent.css` (`.voice-agent[data-mode]`) and `globals.css` (`.workspace[data-agent-mode]`). VoiceAgent accepts `onModeChange` prop to propagate mode to app-shell.

## Future Features (Planned)
- **Persistent Backend**: Move from JSON to Supabase/Firebase for real persistence
- **User Accounts**: Anonymous auth → save quests across devices
- **Push Notifications**: Real snooze/complete reminders via service worker
- **Pre-Cached MiMo TTS Audio (COMPLETE)**: 57 pre-generated Scout quips via MiMo TTS, cached as OGG Opus in `public/audio/scout/`. Tier-based: s0-s5 escalation, rapid-fire, repeat-reminder, complete, agent filler, interrupt. See `references/pre-cached-snooze-audio.md`.
- **Multiple Quest Lists**: Work, Personal, Shopping, etc.
- **Multiple Quest Lists**: Work, Personal, Shopping, etc.
