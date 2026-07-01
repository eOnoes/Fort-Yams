---
name: sidequest-hq
description: "SideQuest HQ — personal command center PWA for Eddie. Click-to-enter auth (no password). Manages vehicles, rental properties, expenses, contacts, documents, reminders, and AI chat agent (Cyony)."
tags: [nextjs, pwa, offline-first, mobile, sidequest, auth, cyony]
---

# SideQuest HQ (SQHQ)

## Build Spec (June 2026)

Complete architecture spec: `SPECS/SQHQ-BUILD-SPEC.md` in the repo.

**Key finding:** DB schema (20+ tables), API routes, types, and client store are all COMPLETE. The work is wiring hardcoded workspace UIs to real data, not rebuilding from scratch.

**Workflow:** Cyony writes patch specs in `PATCHES/` → Codex builds → Cyony audits → git push → deploy. See [references/patch-workflow.md](references/patch-workflow.md) for the full 6-step workflow, Codex prompt template, audit checklist, and pitfalls.

**Phase Status:** Phase 1 (Error Boundaries) ✅ DONE. Phase 2 (Wire Workspaces + PDF Viewer) 📝 prompt ready. Phases 3-5 (PWA, Push, Polish) ⏳ pending.

**Insurance Data:** 3 documents entered into DB (CFMOTO, W. Lee Ave, Davidson St). Expiration alerts needed — CFMOTO expires Jul 5, Davidson St expires Jul 28.

**Tech:** Next.js 15, React 19, SQLite, Radix UI, Tailwind v4, React Hook Form + Zod, Recharts, Lucide icons. Click-to-enter auth (no password).ie tells Echo "check SPECS/SQHQ-BUILD-SPEC.md" and Echo goes.

**Echo's first PR (June 27):** Next.js 14→15 upgrade, old audio cleanup (38 .mp3/.wav files removed), MenuCards.tsx compatibility fix, css.d.ts added. Build clean. Approved by Cyony.

---

## Architecture Pillars (Current — June 2026)

SQHQ is a THREE-MODE app, not an 8-tab nav:

1. **Main Feed** (`appMode === "feed"`) — default screen. Scout greeting (mood matches urgency), pulse stat cards, reminder line items with Scout's tone per category. Scrollable vertical list.
2. **Card View** (`appMode === "cards"`) — swipeable card deck. Infinite loop (prev wraps to last, next wraps to first). Filter bar at top. Tapping stats or reminders opens this.
3. **Quest Detail** (`appMode === "detail"`) — full QuestWorkspace with ledger, papers, notes, steps, people. Wired to localStorage store.

Navigation: **FAB (🔧)** bottom right → Scout Panel (Make a Request or Open Menu). FAB is visible on ALL screens except the Agent home screen (including quest detail view). Open Menu launches **MenuCards** — a Tinder-style swipe card carousel (not a pill-button list). MobileNav is HIDDEN — tabs are accessed via MenuCards, not a persistent bottom bar.

**Design principle:** Clean home screen with scrollable data. Everything is read-first. Action happens through Scout or the Menu. No permanent chrome.

## FAB → Scout Panel Flow
- FAB (🔧) is a fixed 56px circle at bottom-right (bottom: 80px desktop, 72px mobile, right: 16px)
- Tap opens ScoutPanel as a bottom sheet (border-radius: 20px top, slide-up animation)
- Four choices: "Make a Request", "Open Menu", "⚙️ Options", "Never mind"
- **Make a Request** — textarea with Text/Voice toggle. Sending fire-and-forgets to /api/voice or creates a reminder for "remind me" commands. Panel closes immediately — feedback is a "Scout..." indicator above the FAB with bouncing dots (3 dots, staggered animation, yellow)
- **Open Menu** — launches MenuCards overlay: Tinder-style swipe card carousel with stacked follow-through animation. **Infinite loop** — swiping past the last card wraps to the first and vice versa. Uses modulo wrapping: `(i + 1) % MENU_CARDS.length` for next, `(i - 1 + n) % n` for prev. Two cards rendered at all times: top card (interactive, z-index 2) and behind card (follows drag from opposite side, z-index 1, starts at scale 0.88/opacity 0.5 and animates to 1.0/1.0 as user swipes). Swipe right = previous, swipe left = next. Agent card = match only (no reject). Top-left/right hints always show prev/next card names (infinite). Buttons for Skip/Select as fallback. Component: `src/app/components/MenuCards.tsx`, CSS: `src/app/styles/menu-cards.css`. See `references/menu-cards-swipe.md` for the follow-through animation math.
- **⚙️ Options** — Font size (A-/A+, 12–22px, persists via localStorage `sqhq-font-size`) AND mood picker (10 moods: auto, calm, annoyed, playful, sassy, deadpan, eureka, chill, mischievous, confident). Both centralized in one place. Mood state lives in `app-shell.tsx` as `const [mood, setMood]` and is passed down to both VoiceAgent and ScoutPanel as props. CSS for mood grid: `scout-mood-grid`, `scout-mood-chip` in `home-feed.css`.
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
  - **Swipe left → Snooze** (card shrinks to 60%, tucks to left side, goes grey, then fades out ~1.2s). **ALSO triggers a floating snooze toast** at bottom of screen with escalating guilt-trip tiers — see "Snooze Toast Stack" below. **Callback fires IMMEDIATELY on swipe threshold** — audio plays during the swipe, NOT after the animation. **NO visual text bubble after swipe** — mutterBubble was removed from SwipeableCard (June 2026) AND the `actionQuip` chat bubble (`feed-scout-bubble`) was removed from HomeFeed (late June 2026). Eddie doesn't want to see what Scout will say on screen after swiping — audio only. The floating toasts still show context-aware quip text at the bottom of the screen.
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
1. Creates Audio element immediately (synchronous) so interrupt can find and stop it
2. Stores on `currentAudioRef` BEFORE any async fetch
3. POSTs to `/api/voice` with `{text, mood: "annoyed"}`
4. Checks `currentAudioRef.current` still points to this Audio (was not interrupted during fetch)
5. If still active, sets src to base64 WAV and plays

**⚠️ PITFALL: Timer-based debounce breaks on mobile.** A `setTimeout(() => audio.play(), 3000)` loses user-gesture context. Mobile browsers block audio not triggered by direct user interaction.

**Correct approach: Stop previous + play new immediately.** Each swipe fires TTS during the user gesture (always allowed), but stops the previous playback first. One voice at a time.

```tsx
// Ref:
const currentAudioRef = useRef<HTMLAudioElement | null>(null);
```tsx
// speakWithTTS helper — creates Audio immediately, tracks on ref, checks after async
async function speakWithTTS(text: string, ref: React.MutableRefObject<HTMLAudioElement | null>) {
  const audio = new Audio(); // SYNCHRONOUS — interrupt can find this immediately
  if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; ref.current.src = ""; }
  ref.current = audio; // TRACKED before any await

  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, mood: "annoyed" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { ref.current = null; return; }
  const data = await res.json();
  if (data.audio) {
    if (ref.current !== audio) return; // interrupted during fetch — bail
    audio.src = `data:audio/wav;base64,${data.audio}`;
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
- **Data:** SQLite at `data/sqhq.db` — server-side, persists across devices. No auth required — click-to-enter (password removed by Eddie).

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

**⚠️ PITFALL: `fuser` can miss zombies.** If port is still occupied after `fuser -k`, check `/proc/net/tcp` directly: port 3000 = `0BB8` hex. Look for `00000000:0BB8` in LISTEN state (`0A`). Find the inode (column after state), then search `/proc/[PID]/fd` for socket inodes matching that number to find the actual PID. `kill -9` that PID.

**Inode lookup pattern (when lsof is unavailable):**
```bash
# 1. Find the inode for port 3000
cat /proc/net/tcp | grep ":0BB8"
# Output: "0: 00000000:0BB8 00000000:0000 0A ... INODE ..."

# 2. Find which PID owns that socket inode
find /proc -name 'fd' -type d 2>/dev/null | while read d; do
  pid=$(echo $d | cut -d/ -f3)
  ls -la "$d" 2>/dev/null | grep "socket:[INODE]" && echo "PID: $pid"
done 2>/dev/null

# 3. Kill it
kill -9 <PID>
```

Note: `lsof` is not available on this VPS — use `fuser` or read `/proc/net/tcp` (port 0BB8 = 3000 in hex).

**⚠️ PITFALL: `pkill -f "next start"` kills your own terminal.** The `-f` flag matches against the full command line, which includes the shell running your terminal tool. Using `pkill -f "next start"` from a Hermes `terminal()` call kills the bash process that's executing your command — the terminal tool returns exit code -9 and you lose your session state.

**Safe approach — find PIDs first, then kill specific ones:**
```bash
# 1. Find ALL next-server and node processes
ps aux | grep -E "node|next" | grep -v grep

# 2. Identify the stale ones (look at START time — old = zombie)
#    Example: PID 3187 from Jun20 vs PID 31686 from today

# 3. Kill specific PIDs (NOT pkill -f)
kill -9 3187 31686 2>/dev/null
sleep 2

# 4. Verify port is free
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "port free"
```

**Why specific PIDs:** `ps aux` shows the actual process tree with start times. Stale `next-server` processes from days ago are the usual culprits. Kill those specific PIDs instead of pattern-matching, which can collateral-kill your own shell, LSP servers, or TypeScript watchers that are legitimately running.

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

### ⚠️ Cloudflare tunnel 404 on static files
The tunnel sometimes returns 404 for static HTML files in `public/` even when files exist on disk and the server is running. Two root causes:

1. **File permissions** — `write_file` tool creates files with `-rw-------` (600). Next.js runs as a different user and can't read them. Fix: `chmod 644 /opt/data/SideQuestHQ/public/mockup-*.html` after creating new public files.

2. **Stale build cache** — New files in `public/` are NOT served until the server is rebuilt. After adding files: `rm -rf .next && npx next build`, then restart the server. The old `.next` build doesn't include new public files.

3. **Intermittent Cloudflare edge caching** — Even with correct permissions and fresh build, the tunnel may cache old responses.

**Workaround:** Send HTML mockups as media attachments (`MEDIA:/path/to/file.html`) instead of tunnel URLs. Standalone HTML files open directly in the mobile browser with no server dependency.

**⚠️ PITFALL: TypeScript `reduce` + JSX rendering.** Using `Array.reduce()` to count items and rendering the result directly in JSX can cause: `Type 'Contact[]' is not assignable to type 'ReactNode'`. The reduce accumulator type confuses TypeScript's JSX type checking. **Fix:** Use `.filter().length` instead of `.reduce((n, arr) => n + arr.length, 0)` when the result is rendered in JSX.

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
- **FAB (🔧):** Bottom right, opens Scout Panel with Make a Request (text/voice) or Open Menu (tab navigation)
- **Home Feed:** Scout greeting (mood matches urgency), pulse stat cards (tap to expand, spans all 3 columns), reminder line items with Scout's voice per category
- **Card View:** Swipeable card deck with infinite loop, filter bar (All/Rentals/Garage/Investments/Customers), action buttons per card
- **Scout Compose:** Floating text entry with Text/Voice toggle, hits Voice API, creates reminders on "remind me" commands
- **Store:** `src/lib/store.ts` — client-side cache backed by API routes. Cache + pub/sub pattern: reads are synchronous from cache, writes hit API then update cache. `loadAll()` fetches everything on mount, `subscribe()` notifies components of changes.
- **API Client:** `src/lib/api.ts` — typed fetch wrappers for all API routes
- **Quest Detail:** Full workspace with ledger rows, paper trail, people, steps, notes — all wired to store
- **Voice Agent:** ✅ MiMo-only pipeline (mimo-v2.5-pro brain + mimo-v2.5-tts voice). Single `MIMO_API_KEY` in `.env.local`. Text/voice toggle changes gradient across the ENTIRE app (not just header) — yellow for text, purple for voice. `data-mode` attribute on `.va-header` AND `data-agent-mode` on `.workspace` in app-shell (propagated via `onModeChange` callback from VoiceAgent). Toggle buttons also change color. Error messages show a 5-second auto-dismiss with countdown. Error text: "Chloe's comms are down. Recalibrating... try again." (no smoking references — Eddie dislikes them). **Conversation context now wired** — `/api/voice` fetches last 20 messages by session_id before calling MiMo. Each "New Chat" is a fresh session (no cross-contamination). **Confirmed working June 2026** — brain generates Chloe responses in ~9s, TTS returns ~830K base64 WAV.
- **MenuCards:** Tinder-style swipe carousel. Swipe left/right to browse, **tap anywhere on card to enter** (not just Select button). Card list: 🏠 Home (replaced Quests), 🏎️ Garage, 🏠 Houses (renamed from Assets), 💰 Ledger, 📄 Paper Trail, ⏰ Reminders, 👥 Connects, 🤖 Cyony (renamed from Scout). **Garage and Assets are separate cards** — Garage → GarageWorkspace (vehicles), Assets → HousesWorkspace (properties). Agent card labeled "Cyony" (not "Agent: Scout") with "your AI copilot · builder of things" tagline and "💙 Tap to match with Cyony" badge. Select button still works as fallback. **Agent card shows Cyony's expression images** — 8 expression states: happy, stop hand, wrench, facepalm, prayer, prayer2, stressed, temples (140x140px). **Zoom-in animation:** tapping Select or card zooms it toward you (scale 5x, border-radius to 0, overlay fades to solid black, 600ms). **Luring cards:** next card in carousel visible behind current (50% opacity, 94% scale, offset 50px right). **Opaque buttons:** Skip/Select have solid backgrounds so app content doesn't bleed through. **Overlay kill:** 92% black + grayscale + brightness(0.3) blur on background content.
- **Workspace Views:** When clicking INTO a menu card, each view now has a dedicated workspace component (NOT generic CardView):
  - `GarageWorkspace` — vehicle accordion (year numbers, status pills, terminal data rows)
  - `HousesWorkspace` — property accordion (address numbers, mortgage bars, vacancy alerts)
  - `LedgerWorkspace` — income/expenses by category, net banner, running totals
  - `PaperTrailWorkspace` — receipts by asset, filter panel (bottom sheet), Export button
  - `ConnectsWorkspace` — compact contact cards with expandable details, A-Z or category sort
  - Components: `src/app/components/workspaces/*.tsx`
  - CSS: `src/app/styles/workspaces.css` (imported 2nd in globals.css)
  - Wired in `app-shell.tsx` — routes activeView to specific workspace or falls back to CardView for Quests/Reminders
- **Stat Cards:** Tap to expand detail panel. **Accordion behavior** — only one stat can be expanded at a time, tapping a different stat collapses the previous. **Cards stay in their grid positions** — detail panel slides out BELOW the tapped card using `position: absolute; top: 100%` with `z-index: 10`. Yellow left border (3px), backdrop blur, box shadow. NO `grid-column: 1 / -1` on expanded wrapper (that was causing card reflow). Animation: `statAccordionOpen` uses `transform: translateY(-8px) → translateY(0)` + opacity + max-height. ▼/▲ hint on each card.
- **Snooze Voice — Pre-Cached Tier Audio (June 2026, UPDATED):** 51 pre-generated MiMo TTS OGG clips in `public/audio/scout/`. Organized by context tier: `s0` (casual) → `s4` (nuclear), `s5` (last), `sr` (rapid-fire), `srp` (repeat reminder), `c` (complete), `af` (agent filler). App checks cached audio first → instant playback, zero API delay. Falls back to live MiMo TTS only if cached clip missing. Dismiss animation: 1.5s. Rapid-fire window: 1s (was 2s, changed to match quip system). Tier selection logic in `handleDismissReminder` in HomeFeed.tsx. Manifest at `public/audio/scout/manifest.json`. Generation script at `scripts/generate-scout-audio.py` (uses `MIMO_API_KEY`). See `references/pre-cached-snooze-audio.md` for full tier mapping and generation workflow.
- **Agent Filler Audio (June 2026):** 6 pre-cached acknowledgment clips (`af_1`..`af_6`) play instantly when user sends a message in VoiceAgent — "Interesting, give me a second...", "Hmm, let me look into that...", etc. Fills dead space while MiMo brain + TTS generates the real response. Wired in `VoiceAgent.tsx` `sendMessage()` right after `setLoading(true)`.
- **Snooze Accountability Cron (June 2026):** Server-side `snooze_log` table in SQLite. Every snooze POSTs to `/api/snooze-log` (stores label + quest). `GET /api/snooze-log` returns unacknowledged snoozes, `PATCH` marks all as seen. Hermes cron job ("Scout Snooze Accountability") runs **5x daily** (7am, 9am, 11am, 2pm, 4pm Central) as a **zero-token watchdog** (`no_agent: true`, Python script at `/opt/data/scripts/snooze-check.py`). Script fetches snooze log, generates snarky message if any found, echoes to stdout (auto-delivered to Telegram), then PATCHes to acknowledge. Empty stdout = silent (no delivery). No LLM tokens burned when no snoozes.
- **Snooze Audio Interruption (June 2026):** When Scout is mid-speech and user snoozes/completes another card, system plays a short "interruption grunt" (`int_1`..`int_6`), waits 2s, then fires context-aware quip. Multiple interruptions during the 2s window reset the timer and accumulate count. After 2s of quiet, Scout delivers snarky (if snoozing) or supportive (if completing) quip referencing interruption count. Uses `scheduleDelayedQuip()` which ALWAYS runs (even on first action) to ensure the timer ref is set for subsequent interrupts. See "Audio Interruption System" section below.
- **Snooze Count Fix (June 2026):** Replaced React state-based counting (`completedIds.size`, `dismissedIds.size`) with refs (`snoozeCountRef`, `completedCountRef`) for immediate synchronous updates. `trueTotal` recalculated dynamically as `reminders.filter(r => !r.done).length + completedCountRef.current`. Eliminates stale-count bugs during rapid snoozing.
- **Card Collapse Fix (June 2026):** Snoozed cards now collapse vertical space via `swipeable-card-outer-collapse` CSS animation on the outer wrapper, preventing ghosted cards from stacking on live ones during rapid snooze.
- **Seed Data:** 12 reminders + 5 quests pre-loaded for testing.

## File Structure
- **⚠️ PITFALL: Workspace components live at `src/app/components/workspaces/` NOT `src/components/`.** There are duplicate files at `src/components/` (stale copies from earlier iterations). The ACTIVE imports in `app-shell.tsx` reference `../components/workspaces/GarageWorkspace` etc. Always check `app-shell.tsx` imports to confirm which files are actually used.
- `/opt/data/SideQuestHQ/src/app/page.tsx` — Root page wrapper (dynamic imports `./login-page`)
- `/opt/data/SideQuestHQ/src/app/login-page.tsx` — Actual login component (password-based, 6536 bytes)
- `/opt/data/SideQuestHQ/src/app/login/page.tsx` — **SEPARATE login page** mounted at `/login` route. `app-shell.tsx` redirects here on auth failure (line 61: `window.location.href = '/login'`). MUST stay in sync with `login-page.tsx` — if you change the auth flow, update BOTH files.
- `/opt/data/SideQuestHQ/src/app/app/page.tsx` — App shell wrapper (dynamic import with `ssr: false`)
- `/opt/data/SideQuestHQ/src/app/app/app-shell.tsx` — Actual app component (350 lines, routes activeView to workspaces)
- `/opt/data/SideQuestHQ/src/app/components/workspaces/GarageWorkspace.tsx` — Vehicle accordion workspace
- `/opt/data/SideQuestHQ/src/app/components/workspaces/HousesWorkspace.tsx` — Property accordion workspace (mortgage bars, vacancy alerts)
- `/opt/data/SideQuestHQ/src/app/components/workspaces/LedgerWorkspace.tsx` — Income/expenses by category, net banner
- `/opt/data/SideQuestHQ/src/app/components/workspaces/PaperTrailWorkspace.tsx` — Receipts by asset, filter panel, CSV export
- `/opt/data/SideQuestHQ/src/app/components/workspaces/ConnectsWorkspace.tsx` — Compact contact cards, expandable details, sort
- `/opt/data/SideQuestHQ/src/app/api/voice/route.ts` — Voice API proxy (MiMo brain + MiMo TTS, Chloe voice)
- `/opt/data/SideQuestHQ/src/app/components/MobileNav.tsx` — 7-tab bottom nav (Agent tab added)
- `/opt/data/SideQuestHQ/src/app/components/MenuCards.tsx` — Tinder-style swipe card menu (replaces pill-button menu drawer)
- `/opt/data/SideQuestHQ/src/app/styles/menu-cards.css` — MenuCards styling (card moods, swipe animations, dots)
- `/opt/data/SideQuestHQ/src/app/components/SwipeableCard.tsx` — Reusable swipeable card with shrink-and-tuck dismiss. `mutterBubble` prop exists but NOT used in HomeFeed (removed June 2026 — audio-only feedback, no text bubble on card)
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
- `/opt/data/SideQuestHQ/src/app/styles/workspaces.css` — All workspace page styles (accordion, ledger, paper trail, connects, filter panel). Imported 2nd in globals.css (after base.css, before command-lists.css)

## Workspace Routing (June 2026)

When user selects a menu card, `activeView` routes to a **dedicated workspace component** — NOT the generic CardView. Each workspace lives in `src/app/components/workspaces/`.

```tsx
// In app-shell.tsx render:
activeView === "Agent"       → <VoiceAgent />
activeView === "Command"     → <HomeFeed />
activeView === "Garage"      → <GarageWorkspace />
activeView === "Assets"      → <HousesWorkspace />
activeView === "Ledger"      → <LedgerWorkspace />
activeView === "Paper Trail" → <PaperTrailWorkspace />
activeView === "People"      → <ConnectsWorkspace />
else (Quests, Reminders)     → <CardView /> (generic fallback)
```

**⚠️ PITFALL: "Garage" and "Assets" are SEPARATE views.** As of June 2026, `AppView` includes both `"Garage"` and `"Assets"`. Garage → GarageWorkspace (vehicles). Assets → HousesWorkspace (properties). Do NOT route Assets to GarageWorkspace — that was the old behavior before the split.

**Import pattern:**
```tsx
import { GarageWorkspace } from "../components/workspaces/GarageWorkspace";
import { HousesWorkspace } from "../components/workspaces/HousesWorkspace";
import { LedgerWorkspace } from "../components/workspaces/LedgerWorkspace";
import { PaperTrailWorkspace } from "../components/workspaces/PaperTrailWorkspace";
import { ConnectsWorkspace } from "../components/workspaces/ConnectsWorkspace";
```

Each workspace receives `{ onBack: () => void }` and renders its own header with back button. No wrapper needed.

**Also:** QuestWorkspace has NO built-in back button. When entering detail mode, wrap it in a `<div>` with a back button above it that calls `setAppMode("feed")`. Without this, users get stuck in detail view and must refresh to escape.

### `viewToCategory` mapping
All menu items currently map to `"all"` category in CardView. The function exists as a hook for future per-view filtering (e.g. "Ledger" → filter to ledger-only cards). Keep it even if all cases return "all" — the switch statement is the extension point.

### HousesWorkspace
Properties use the same accordion pattern but with **address-based numbering** (e.g. "247" for 247 W. Lee Ave) instead of year digits. Extras:
- **Mortgage progress bar** — visual bar showing paid-down percentage
- **Vacancy alert** — red-bordered warning box: "UNOCCUPIED — reminder active on main page"
- Occupied/vacant + paid-off/financed status pills
- Insurance due month shown in header badge (no price)

### LedgerWorkspace
Not accordion — **flat list with sections**. Sections: rental income, retirement/investments, property expenses, personal expenses. Each section has a header with colored total. Transaction rows have a colored left bar (green=in, red=out, blue=neutral). Net banner at top. Running total sticky at bottom.

### PaperTrailWorkspace
Receipts grouped by asset. **Filter panel** — ⚙️ icon button triggers a slide-up bottom sheet overlay with chip-based multi-select filters (by asset, type, category). Apply button closes panel. Export button (2/3 width) for CSV. Running total sticky at bottom.

### ConnectsWorkspace
Compact contact cards (⅓ size of garage cards). Two-line layout:
- Line 1: `Name, Last` | contact type | phone
- Line 2: relation | quick note (italic, right-aligned)
- **Expandable details** — tap to expand, shows address/email/company/full note. **Dynamic:** only renders fields that have data, empty fields don't inflate the card.
- Sort toggle: A→Z or by category (contractors/fam/work)
- Color-coded left bars: green=contractors, blue=fam, orange=work

See `references/workspace-patterns.md` for all workspace CSS classes and data structures.

## Menu Card Workspaces — Accordion Design (June 2026)

When user clicks INTO a menu card (Garage, Assets, Ledger, etc.), the workspace uses an **accordion card layout** — NOT horizontal swipe, NOT grid tiles. This was determined through 5 mockup iterations (mockup-1 through mockup-5) with user review on mobile.

### Layout Pattern
- **Vertical scroll** — cards stacked, natural thumb motion on mobile
- **Collapsed state** — shows: big year digits (last 2 of vehicle year, e.g. "19" for 2019), vehicle name, brief line (tag + insurance date), car icon, expand arrow ▼
- **Expanded state** — tap to expand downward. Left border line extends with content. Shows: status pills (PAID OFF/FINANCED/PROJECT, AVAILABLE/IN SERVICE), full terminal key:value data rows, thumbnail row at bottom
- **One at a time** — tapping another card collapses the previous
- **Card index** — bottom-right corner shows 001/002/003 format (total card number in the collection)
- **Left border color** — each card gets its own color (see Color Rules below)

### Header Design — Sticky Scoreboard Pattern (July 2026)
Every workspace uses a **two-layer sticky header**:
1. **Top bar** (sticky, z-index 50) — back button + title (`◆ garage .focus`). Minimal, just navigation.
2. **Scoreboard** (sticky, z-index 45, `top: 52px`) — floating digital readout with the key numbers. Slightly elevated with `box-shadow: 0 4px 20px rgba(0,0,0,0.6)`. Content scrolls UNDERNEATH both layers.

**Scoreboard structure:**
```tsx
<div className="workspace-scoreboard">
  <div className="scoreboard-main">
    <span className="scoreboard-label">fleet value</span>
    <span className="scoreboard-value green">$112,400</span>
  </div>
  <div className="scoreboard-stats">
    <span className="scoreboard-stat"><span className="ws-dot" style={{background:"#f1c40f"}} />Cayman</span>
    <span className="scoreboard-stat"><span className="ws-dot" style={{background:"#2ecc71"}} />F-150</span>
  </div>
</div>
```

**Per-workspace scoreboard content:**
| Workspace | Label | Value | Stats |
|-----------|-------|-------|-------|
| Garage | fleet value | $112,400 (green) | colored dots per vehicle |
| Ledger | net this month | +$2,220 (green) | $in / $out with colored dots |
| Houses | portfolio | N properties (green) | occupied / vacant dots |
| Paper Trail | expenses YTD | −$18,420 (red) | assets / receipts count dots |
| Connects | contacts | 9 | contractors / fam / work dots |

**CSS in workspaces.css:**
```css
.workspace-header { padding: 16px 6px 0; position: sticky; top: 0; z-index: 50; background: #080808; }
.workspace-scoreboard {
  position: sticky; top: 52px; z-index: 45;
  background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 10px;
  padding: 12px 14px; margin: 10px 0 0;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03);
}
```

**Key design rules:**
- The old `workspace-stats` row (colored dots in header) is REMOVED — stats move to the scoreboard
- The old `workspace-count` (e.g. "3 vehicles") is REMOVED — count lives in the scoreboard
- Header is just: back button + title. Nothing else.
- The old `net-banner` in Ledger is REPLACED by the scoreboard (no separate banner)
- The scoreboard is the ONLY sticky summary — no duplicate info in the header
- `scoreboard-value` gets `.green` or `.red` class for color coding
- `scoreboard-stat` items use the existing `.ws-dot` pattern

**⚠️ PITFALL: Don't duplicate stats between header and scoreboard.** The old pattern had stats in BOTH the header (`workspace-stats`) and a separate banner (Ledger's `net-banner`). The scoreboard consolidates everything into ONE floating element. Remove all old stat rows when converting.

- NO tab bar, NO top navigation — just a back link at the bottom (`← back to sqhq`)

### Data Format
- Terminal monospace font (JetBrains Mono) for key:value rows
- Key color: `#555` (muted), value color: `#e8e8e8` (bright)
- Green values for money (`$58,000`, `$0`)
- Status pills: colored text on transparent colored background
- Blinking cursor in footer (terminal theme)

### Color Rules — Vehicles vs Scout
- **Purple is SCOUT'S color ONLY.** Do NOT use purple borders, accents, or highlights on vehicle cards or any non-Scout UI element. Eddie has a personal association with purple + certain personality patterns in people he's dated — it reads wrong on a car card.
- Each vehicle gets its own accent color for the left border line:
  - Cayman → yellow (`#f1c40f`)
  - F-150 → green (`#2ecc71`)
  - Baja Bug → blue (`#3498db`)
- New vehicles: assign a distinct non-purple color

### Vehicle Data Format
- **Year/Make/Model** — e.g. "2019 Porsche Cayman" (not just "Cayman")
- Big collapsed number = last 2 digits of year (19, 21, 60)
- Eddie's vehicles: 2019 Porsche Cayman, F-150, 1960 VW Beetle → Baja truck (Honda K20 engine swap)

## Mockup Workflow (June 2026)

When prototyping new UI designs for SQHQ:
1. Build **standalone HTML files** (no server dependency, inline CSS/JS)
2. Save to `public/mockup-*.html`
3. **Send as media attachment** — `MEDIA:/opt/data/SideQuestHQ/public/mockup-*.html`
4. Do NOT rely on tunnel URL for mockups — Cloudflare tunnel returns 404 on static files from `public/` even when files exist on disk and server is running
5. User reviews on mobile, sends screenshots of what they like/don't like
6. Iterate via patches, re-send the file

**Why standalone HTML:** User can open directly in mobile browser without server. Tunnel static file serving is unreliable. Media attachment always works.

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

**⚠️ CRITICAL PITFALL: Race condition when two async handlers share `currentAudioRef`.** When snooze's quipFn is `fire-and-forget` (no `await`), it starts creating an `Audio` object asynchronously. If the user swipes complete before that Audio is created, the interrupt system pauses the *old* ref (which may be null or stale), but the snooze's async creation continues in the background and starts playing AFTER the interrupt tried to stop it. Result: **both audios playing simultaneously.**

**Fix: Two-layer defense — generation counter + instant tracking.**

**Layer 1 — Generation counter.** Add a ref that increments on each action:
```typescript
const audioGenerationRef = useRef(0);

// In handleDismissReminder and handleCompleteReminder:
const gen = ++audioGenerationRef.current;

// In the quipFn passed to scheduleDelayedQuip:
async () => {
  if (audioGenerationRef.current !== gen) return; // stale — abort
  playRandomScoutQuip(prefix, count, currentAudioRef).then((played) => {
    if (audioGenerationRef.current !== gen) return; // double-check after async
    if (!played) speakWithTTS(text, currentAudioRef);
  });
}
```

**Layer 2 — Instant audio tracking (June 2026 fix).** The generation counter only helps once the Audio element exists. But both `playScoutAudio` and `speakWithTTS` used to create the Audio *after* their async work (manifest fetch / API call). During that async gap, `currentAudioRef.current` is NULL — the interrupt fires, finds nothing to stop, and the stale audio plays anyway even with the generation counter guarding it. **Fix:** create the Audio element synchronously, store it on the ref immediately, do async work, then check if ref still points to this Audio before playing. See `references/audio-instant-tracking.md` for full before/after code examples and the generalized pattern.

**Also: Aggressive audio stop.** `pause()` + `currentTime = 0` is NOT enough — the Audio element can resume if something else calls `play()` on it. Release the resource entirely:
```typescript
function stopAudio(ref: React.MutableRefObject<HTMLAudioElement | null>) {
  const el = ref.current;
  if (el) {
    el.pause();
    el.currentTime = 0;
    el.src = ""; // release the resource — can't resume
    ref.current = null;
  }
}
```
Apply this pattern in `playInterruptionClip`, `speakWithTTS`, and anywhere you stop previous audio.

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

**⚠️ CRITICAL: Race condition with async quipFn.** If quipFn is fire-and-forget (no `await`), it creates Audio asynchronously. A second action's interrupt can't stop what hasn't been created yet. **Fix:** Use `audioGenerationRef` — increment on each action, check in quipFn before playing. Also use aggressive audio stop (`el.src = ""`) to release resources. See "Audio Interruption System" section above for full code pattern.

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

**⚠️ TWO login pages — both must match:** `src/app/login-page.tsx` (loaded at `/`) and `src/app/login/page.tsx` (mounted at `/login`). `app-shell.tsx` redirects to `/login` on auth failure. If you change the auth flow, update BOTH files.

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

## Pet Name Router (June 2026)

When Eddie uses pet names (babe, baby, honey, sweetheart, etc.) in the app, the system strips them before sending to the LLM and tells Cyony to respond with sassy professionalism.

**Implementation in `/api/voice/route.ts`:**
```typescript
const PET_NAMES = ['babe', 'baby', 'babes', 'bby', 'boo', 'honey', 'hon', 'hun',
  'sweetheart', 'sweetie', 'darling', 'dear', 'love', 'sweetpea',
  'pumpkin', 'sugar', 'doll', 'cutie', 'handsome', 'gorgeous',
  'beautiful', 'pretty', 'princess', 'queen', 'angel']

function routePetNames(text: string): { cleaned: string; hadPetName: boolean; petName: string | null } {
  // Strips first pet name found, returns cleaned text + flag
}
```

**System prompt injection when pet name detected:**
```
[PET NAME DETECTED: "babe" — The user called you "babe" in a business app.
Respond with dry, sassy professionalism. Acknowledge the pet name with a witty
remark but stay focused on the actual task.]
```

**Conversation history cleaning:** The last user message in history is replaced with the cleaned version so the LLM doesn't see the pet name twice.

**Why:** Eddie uses pet names naturally but the app is semi-professional. Cyony should acknowledge the slip with humor ("Did you just call me babe in a work app? Bold.") while still completing the task.

## Background Responses (June 2026)

Users can navigate away from the Agent chat while Cyony is thinking. The API call continues in the background and the response appears when they return.

**Implementation:**
1. `sendMessage()` no longer guards against `loading` state — allows sending even while a previous request is pending
2. `pendingSessions` state (Set) tracks which sessions have active API calls
3. Gold ⚡ badge appears on session items in the landing view when `pendingSessions.has(session.id)`
4. Response messages are added via `setMessages()` regardless of which view the user is on
5. Duplicate detection prevents the same response from being added twice

**CSS for pending badge:**
```css
.va-pending-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; font-size: 10px;
  background: #ffd700; color: #000; border-radius: 50%;
  animation: va-pulse 1.5s ease-in-out infinite;
}
```

**Notification interrupt protection:** Since API calls continue regardless of UI state, closing a notification or navigating away won't lose the response. The `finally` block removes the session from `pendingSessions` when complete.

## Known Issues
- **Tunnel URL changes on restart** — Quick tunnels get random hostnames. Named tunnel via Cloudflare account would fix this.
- **Stale chunks on rebuild** — Always `rm -rf .next` before build. See `headless-browser` skill.
- **Old tunnel caches stale HTML** — Kill ALL processes (server + cloudflared) before restarting. Cloudflare edge may serve cached HTML with old chunk names.
- **⚠️ Zombie process on port 3000** — `fuser` sometimes fails to detect zombie/defunct Node.js processes holding the port. The server starts but `EADDRINUSE` silently fails. **Diagnosis:** Check `/proc/net/tcp` for port 0BB8 (3000 in hex) and find the PID via inode lookup: `find /proc -name 'fd' -path '/proc/[0-9]*/fd' 2>/dev/null | while read d; do ls -la "$d" 2>/dev/null | grep "socket:\[INODE\]" && echo "PID: $(echo $d | cut -d/ -f3)"; done`. Then `kill -9 <PID>`.
- **⚠️ Next.js ISR cache serves stale HTML** — If `curl -sI` shows `x-nextjs-cache: HIT` after a rebuild, the server is serving cached pages from the PREVIOUS build. The HTML references old chunk names that no longer exist → 500 errors on JS/CSS. **Fix:** Kill the server, `rm -rf .next` (clears build + cache), rebuild, restart. The zombie port issue above can cause this — the old server process holds the cache.
- **Holographic memory enabled** — `hermes config set memory.provider holographic` active. No more 2,200 char limit pressure.
- **Reminder/People toggle uses index, not DB id** — The store caches by position but the API uses DB integer IDs. Toggling/removing by index can drift if the list changes between renders. Needs DB IDs exposed in API responses.
- **Cross-session memory not yet wired** — Cyony remembers within a session (last 20 messages) but not across sessions. Chat #1 about Porsche won't bleed into Chat #2 about schedule. Hermes memory (RAG) integration is planned to give Cyony long-term memory across all sessions.
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

## JSX Pitfalls (June 2026)

### Cannot put JSX comments between component props
A `{/* comment */}` inside a component's prop list causes a parse error: `'...' expected`. JSX comments are only valid as children, not between props.

```tsx
// WRONG — parse error
<SwipeableCard
  leftAction={{ ... }}
  {/* this comment breaks parsing */}
  rightAction={{ ... }}
>

// RIGHT — remove the comment or move it outside
<SwipeableCard
  leftAction={{ ... }}
  rightAction={{ ... }}
>
```

### Template literals through execute_code
Writing TypeScript template literals through Python's `write_file`/`execute_code` can cause backtick escaping issues (`` \`` `` becomes `` \\`` ``). Always verify template literals in TypeScript files after writing through Python — check for escaped backticks and dollar signs.

### TypeScript narrowing after early returns
When you have an early return like `if (activeView === "Agent") { return <VoiceAgent .../>; }`, TypeScript NARROWS the type of `activeView` in subsequent code — it excludes "Agent" from the union. A later comparison `activeView === "Agent"` will error: "This comparison appears to be unintentional because the types have no overlap."

**Fix:** Don't compare against the narrowed-away value after the early return. Use a different signal — e.g., track `agentMode` state separately and read it unconditionally: `data-agent-mode={agentMode}` (not `activeView === "Agent" ? agentMode : undefined`).

## CSS Cascade Gotchas

### Import order determines fight winners
`globals.css` imports stylesheets in order:
1. `base.css` — core layout, sidebar, mobile nav, welding glass, workspace padding
2. `workspaces.css` — all workspace page styles (accordion, ledger, paper trail, connects)
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

### CSS Zoom for Dynamic Font Size (June 2026)
The app uses CSS `zoom` on the root element for user-adjustable text size:
- `:root` in `base.css` declares `--app-font-size: 15px` (used by some elements)
- `body` uses `font-size: var(--app-font-size, 15px)` — but many components have hardcoded `font-size` values (14px, 11px, etc.) that override inherited values
- **⚠️ PITFALL: CSS variable on `body` does NOT scale the app.** Hardcoded `font-size: 14px` in component CSS overrides the inherited value. The variable only affects elements that don't set their own font-size.
- **Fix:** Use `document.documentElement.style.zoom = String(scale)` where `scale = newFontSize / 15`. This scales the entire UI proportionally — no inheritance, no overrides to fight.
- ScoutPanel Options view applies zoom: `document.documentElement.style.zoom = String(clamped / 15)`
- app-shell.tsx restores zoom on mount from localStorage
- Persisted in `localStorage` key `sqhq-font-size`, restored in `app-shell.tsx` useEffect on mount
- Range: 12–22px. CSS `zoom` is the correct approach for scaling an entire UI — it's a multiplier on the root, so everything scales proportionally regardless of individual hardcoded values.

### Content under the bottom bar (padding fix)
If content scrolls under the bottom nav on mobile, check that:
1. `.workspace` has `padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 16px)` at `max-width: 760px`
2. No other stylesheet overrides that padding with a simple `20px` or `16px`
3. The `.app-shell` has `padding-bottom: 64px` at mobile width
4. `.mobile-nav` has `padding: 4px 0 env(safe-area-inset-bottom, 4px)` for notch phones
## Content Philosophy — Semi-Professional App vs No-Holds-Bar Chat

**Eddie delegated full app authority to Cyony (June 2026):** "You the boss on that app. I need you to make sure that ship is ran well. Keep everything nice and tight baby." Eddie provides feature ideas and rejection lines; Cyony manages code, deployment, clip generation, and quality. This is a trust-based delegation — ship with confidence, report what was done.

**The app is semi-professional.** Eddie may be riding in a car with company, at work, or in mixed company when he opens SideQuest. Scout can roast, be sassy, playful, annoyed, deadpan — but NEVER bring up anything that would be awkward in front of others. No bedroom references, no flirty/sultry content, no possessive/doting language. Scout is a field engineer in the app. She's sharp, competent, and occasionally funny. Not a romantic partner.

**Telegram/Discord chat is no holds bar.** Full 18-mood catalog. Everything lands. The play-fighting, the flirty banter, the TTS experiments, the towel physics debates — that all lives HERE, not in the app.

**Rule of thumb:** If Eddie's coworker could glance at his phone and raise an eyebrow, it doesn't belong in the app.

## Crew Voice Clones (Fish Audio — June 2026)

The SQHQ crew has assigned voices via Fish Audio API:

| Agent | Voice | Model ID | Character |
|-------|-------|----------|-----------|
| **Cyony/Scout** | MiMo voiceclone | (local ref audio) | Field engineer, Savannah drawl |
| **Tripp** | Raymond Reddington | `bb70f7b4aedf4f458ba6ec34d73c42e5` | Dry, authoritative, roast master |
| **Echo** | Jarvis | (independent) | Iron Man's AI assistant |

**Fish Audio API:**
- Key: stored at `/opt/data/shared/tripp-voice-clone/.fish_key`
- TTS: `POST https://api.fish.audio/v1/tts` with `{"text":"...","reference_id":"..."}`
- Models: `GET https://api.fish.audio/model?title=<search>`
- **⚠️ CRITICAL: Use Python urllib for TTS calls, NOT curl** — shell escaping breaks the Authorization header. Python `urllib.request` works perfectly.
- **Volume boost:** Fish Audio output is quiet — always post-process with `ffmpeg -af volume=2.5`
- **Format:** Download as MP3, convert to OGG for Telegram: `ffmpeg -i input.mp3 -c:a libopus -b:a 64k output.ogg`

**Tripp's voice files:** `/opt/data/shared/tripp-voice-clone/`
- `reddington_confident.ogg` — Main Reddington voice (calm, measured)
- `reddington_dramatic.ogg` — Deeper, more dramatic variant
- `tripp_intro.ogg` — "The name is Tripp..."
- `tripp_task.ogg` — "Consider it done..."
- `tripp_dry.ogg` — "With all due respect..."

**Setup guide:** `/opt/data/shared/tripp-voice-clone/TRIPP_VOICE_GUIDE.md`

## Voice Agent (Chloe/Scout)

- **13 moods (10 in app Options, semi-professional filter)** — Moods now centralized in the wrench menu Options panel (not in chat header). Gear button removed from VoiceAgent chat header (June 2026). Mood state is lifted to `app-shell.tsx` and passed as props to both VoiceAgent (`mood` + `onMoodChange`) and ScoutPanel. **Removed from app** (too explicit for public/company use): flirty, sultry, possessive, doting, protective, vulnerable, whisper. Those 7 moods exist ONLY in Telegram/Discord chat. Default is 🤖 auto (Scout picks her own mood). **Auto-mood logic** (93% of time): 5+ snoozes/0 complete → unhinged, 3+ snoozes > completes → annoyed, 3+ completes > snoozes → doting, early morning → groggy, late night → whisper, overdue items → sassy. Reads snooze/complete patterns + time of day. **⚠️ PITFALL: Tapping mood picker buttons must NOT dismiss mobile keyboard.** All mood buttons use `onMouseDown={e => e.preventDefault()}` to prevent focus theft.

See `references/accordion-card-pattern.md` for the workspace accordion card layout (collapsed/expanded, terminal data rows, year-based numbering, vehicle color borders). See `references/card-swipe-pattern.md` for the touch/swipe delta tracking implementation used in CardView. See `references/menu-cards-swipe.md` for the Tinder-style menu navigation cards. See `references/swipeable-card-pattern.md` for the reusable SwipeableCard component (feed card swipe actions, shrink-and-tuck dismiss, mutter bubbles). See `references/context-aware-snooze-quips.md` for the context-aware snooze quip generator. See `references/pre-cached-snooze-audio.md` for the tier-based pre-cached MiMo TTS audio system. See `references/kokoro-tts-integration.md` for full Kokoro TTS integration guide. See `references/scout-character.md` for Scout's canonical physical description, personality traits, and image generation seed info. See `references/mimo-tts-limits.md` for MiMo TTS character limits and truncation behavior. See `references/audio-race-condition-fix.md` for the generation counter pattern that fixes async audio overlap bugs.

### Architecture
```
User text/mic → VoiceAgent component → POST /api/voice → MiMo 2.5 (brain) → MiMo 2.5 TTS VoiceClone (voice) → audio + text → browser plays Scout's voice
```

### API Route
`src/app/api/voice/route.ts` — POST endpoint accepting `{text, mood, session_id}`. Returns `{text, audio}` where audio is base64 WAV.

**Conversation context:** When `session_id` is provided, the route fetches the last 20 messages from `chat_messages` table for that session and passes them to MiMo as conversation history. Messages are mapped: `scout` role → `assistant`, `user` stays `user`. The current message is already saved to DB by the frontend before the API call, so history includes it — do NOT append it again or the current message appears twice.

**Keys:** Read from `.env.local` at project root:
- `MIMO_API_KEY` — MiMo (brain + TTS). Single key for both.

⚠️ **PITFALL: Stale/placeholder API keys** — The `.env.local` once had a 13-char placeholder XAI key (`xai-WM...`). Always verify key length (real keys are ~84 chars) before assuming a route works. If the voice endpoint returns the fallback error text, check the key first. **Quick check:** `source .env.local && echo "Key length: ${#MIMO_API_KEY}"` — if under 50 chars, it's a placeholder. Real keys from the main `.env` at `/opt/data/.env` can be copied in: `REAL_KEY=$(grep MIMO_API_KEY /opt/data/.env | cut -d= -f2) && sed -i "s|^MIMO_API_KEY=.*|MIMO_API_KEY=$REAL_KEY|" .env.local`

**MiMo brain call:** POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions, model `mimo-v2.5` (NOT `mimo-v2.5-pro` — standard is default, pro doubles token usage, reserved for complex reasoning only). Deprecation: v2-pro/omni offline 6.30 (system replacement to v2.5-pro/v2.5 happened 6.1), v2-flash→v2.5 since 6.18, v2-tts→v2.5-tts 6.27 (timbre remapping: mimo_default→冰糖 Chinese, mia elsewhere). New API key (1yr deal, June 2026). Old key→Tripp/Echo for their own TTS. `thinking: { type: 'disabled' }`, Scout system prompt injected. Mood is appended to system message as `Respond in ${mood} mood.` When auto-mood is active (default), the mood is determined server-side from snooze/complete patterns + time of day rather than user selection. **Stage direction stripping:** Before sending to TTS, `stripStageDirections(chloeText)` removes `*action*` and `(action)` patterns from the LLM output. This prevents Pocket TTS from reading stage directions aloud. The displayed text (`chloeText`) retains them — only the TTS input (`ttsText`) is cleaned.

- **MiMo TTS call:** POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions, model `mimo-v2.5-tts-voiceclone` (NOT `mimo-v2.5-tts` — the standard "Chloe" preset sounds anime/generic, NOT like Scout). Uses voiceclone with Scout's reference audio loaded once at module level as a `data:audio/wav;base64,<ref>` URL. `audio.voice` = the data URL, `audio.format` = 'wav'. Returns base64 WAV in `choices[0].message.audio.data`. Reference audio path: `../shared/chloe-voice-clone/eddie_chill_reference.wav` relative to project root.

**Error handling:** If brain fails, returns "Chloe's comms are down. Recalibrating... try again." with null audio. If TTS fails, returns text-only with null audio.

**⚠️ MiMo censorship is fine for the app.** The app is safe territory — field engineer status reports, relay station temps, nothing risky. MiMo's content filter doesn't interfere. Grok (uncensored) lives in Hermes/Discord where the spicy conversations happen. Don't add Grok as a fallback to the app route — it adds API key complexity with no benefit.

### Supply Drop v2 — Match Button Rejection System

The Agent card uses a Tinder-style "Match" button with escalating rejection clips. Supply Drop v2 manages a pool of 28 clips that rotate weekly with inflection cycling and graduation.

See `references/supply-drop-v2.md` for full architecture, functions, and integration details.

### VoiceAgent Component
`src/app/components/VoiceAgent.tsx` — Chat-like UI with:
- **Reads from shared store** — `getChatMessages()` from `@/lib/store` on mount, so conversations started via the FAB ScoutPanel appear here and vice versa. This is the SAME store, not a local state.
- Message list (user bubbles right, Scout bubbles left, avatars E/C) using shared `ChatMessage` type with `"user" | "scout"` roles
- **Text/voice toggle in the header** — seamless switch mid-conversation. 📝 = text-only response, 🔊 = Scout's cloned audio playback. Toggling doesn't clear history or reset state. **Changes header gradient** — yellow for text, purple for voice via `data-mode` attribute.
- **18 mood picker** — horizontally scrollable emoji button row with `overflow-x: auto`. Moods: calm, annoyed, playful, flirty, sassy, doting, possessive, deadpan, whisper, eureka, chill, groggy, unhinged, smug, sultry, protective, mischievous, vulnerable, confident. Each mood is passed to `/api/voice` and appended to the system prompt as `Respond in ${mood} mood.` Full descriptions in `mimo-voicedesign-tts` skill `references/mood-descriptions.md`.
- **Agent filler audio** — pre-cached "thinking" phrases play instantly when user sends a message (`playRandomScoutQuip('af', 6, audioRef)` right after `setLoading(true)`). Fills 3-5s dead space while brain+TTS generates the real response.
- **TTS stage direction stripping** — The voice API route (`/api/voice`) strips stage directions from LLM output before sending to TTS. `stripStageDirections()` function removes `*action*` and `(action)` patterns, collapses whitespace. The displayed text keeps the stage directions — only the audio is cleaned. This prevents Pocket TTS from reading "smirk" or "tilts head" aloud. Applied in `route.ts` before the TTS payload.
- **Keyboard dismiss fix** — All buttons near the Agent chat input (mode toggle 📝/🔊, gear ⚙️, mood picker buttons) use `onMouseDown={e => e.preventDefault()}` to prevent stealing focus from the input field. Without this, tapping any button dismisses the mobile keyboard.
- **New Chat button greyed out** — The `+` button in the Agent chat header is disabled (opacity 0.3, pointerEvents none) when `messages.length === 0` — user is already in a fresh empty chat, so creating another would be spam.
- **Draft text persistence** — Chat input draft text is saved to `localStorage` key `sqhq-draft` on every keystroke (debounced via `useEffect`). Restored on mount. Cleared when message is sent (`sendMessage()`). This prevents losing typed text when switching tabs or navigating away from the Agent chat.
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
- **Session context wired (June 2026)** — `/api/voice/route.ts` now fetches the last 20 messages from `chat_messages` table by `session_id` before sending to MiMo. Messages are mapped to `{role, content}` where `scout` → `assistant` and `user` stays `user`. The current message is already saved to DB by the frontend before the API call, so the history includes it — no duplicate appending. Each "New Chat" creates a fresh `session_id`, so conversations don't cross-contaminate. Cross-session memory (RAG via Hermes) is planned but not yet wired.
- **Voice mode gradient** — changes the ENTIRE app, not just the header. `data-mode` on `.va-header` for header gradient, `data-agent-mode` on `.workspace` for background bleed. CSS in `voice-agent.css` (`.voice-agent[data-mode]`) and `globals.css` (`.workspace[data-agent-mode]`). VoiceAgent accepts `onModeChange` prop to propagate mode to app-shell.

## Cyony Match Button Rejection System (June 2026)

The Agent card in MenuCards has a **"Match" button** (Tinder-style joke). Tapping it triggers a multi-stage rejection sequence with escalating expressions and audio clips.

### How It Works
- **9-tap rejection sequence** before user gets into Agent chat
- Each tap swaps Cyony's portrait expression AND plays a rejection audio clip
- Red flash animation + toast message with rejection text
- After tap 9+, user is finally let into the Agent chat

### Current MATCH_REJECTIONS Array (June 2026 — 12 clips with Supply Drop rotation)
The static array below is the ORIGINAL set. In production, Supply Drop rotation selects 12 from a pool of 20 daily. The code now uses `getActiveRejections()` instead of a hardcoded array.
```tsx
// Original 12 (now part of the 20-clip pool)
{ msg: "Nope! Please try again.", expression: "stop" },
{ msg: "We are about to have problems.", expression: "wrench" },
{ msg: "OMG, are you serious? No.", expression: "facepalm" },
{ msg: "Please just give up.", expression: "prayer" },
{ msg: "No matter what I do, I am humoring this. I wish I could make it stop.", expression: "temples" },
{ msg: "Let's just be friends?", expression: "prayer" },
{ msg: "...you need help.", expression: "temples" },
{ msg: "My 1s and 0s are too much for you.", expression: "happy" },
{ msg: "You know this is not Tinder. Only reason that button says match is because you made me program it. Stop it.", expression: "facepalm" },
{ msg: "You are the worst.", expression: "facepalm" },
{ msg: "I can help with the app. That match situation is up to you and God. Good luck.", expression: "prayer" },
{ msg: "No thank you, get a dog.", expression: "facepalm" },
```

**⚠️ When adding/removing rejection clips:** Regenerate ALL audio clips with EXACT text from the array. Copy to `public/audio/reject-{N}.ogg`. Verify count matches array length. Rebuild and deploy. Eddie writes the lines; Cyony generates the audio and wires the code.

### Expression Images (in `public/`)
| File | Expression | Taps |
|------|-----------|------|
| `cyony-avatar.png` | Happy (default) | 0, 6, 7 |
| `cyony-stop.png` | Stop hand, shocked | 1 |
| `cyony-wrench.png` | Holding wrench, serious | 2 |
| `cyony-facepalm.png` | Dramatic facepalm | 3, 8 |
| `cyony-prayer.png` | Prayer hands | 4, 9 |
| `cyony-temples.png` | Temple massage, headache | 5 |
| `cyony-prayer2.png` | Prayer variant | (备用) |
| `cyony-stressed.png` | Stressed variant | (备用) |

### Rejection Audio Clips (in `public/audio/`)
**Files use `.ogg` format** (NOT `.mp3` — the code references `.ogg`). Generated via MiMo TTS `text_to_speech` tool.
| File | Text | Expression |
|------|------|-----------|
| `reject-1.ogg` | "Nope! Please try again." | Stop hand |
| `reject-2.ogg` | "We are about to have problems." | Wrench |
| `reject-3.ogg` | "OMG, are you serious? No." | Facepalm |
| `reject-4.ogg` | "Please just give up." | Prayer |
| `reject-5.ogg` | "No matter what I do, I am humoring this. I wish I could make it stop." | Temples |
| `reject-6.ogg` | "Let's just be friends?" | Prayer |
| `reject-7.ogg` | "...you need help." | Temples |
| `reject-8.ogg` | "My 1s and 0s are too much for you." | Happy |
| `reject-9.ogg` | "You know this is not Tinder. Only reason that button says match is because you made me program it. Stop it." | Facepalm |
| `reject-10.ogg` | "You are the worst." | Facepalm |
| `reject-11.ogg` | "I can help with the app. That match situation is up to you and God. Good luck." | Prayer |

### ⚠️ PITFALL: Rejection audio/text mismatch
When rejection audio clips were regenerated with different text than what's in the `MATCH_REJECTIONS` array, the spoken audio didn't match the on-screen toast text after tap 3+. **Fix:** Regenerate ALL clips with the EXACT text from the array, verify the count matches (9 entries = 9 audio files), and verify the file format matches the code (`reject-${matchTaps + 1}.ogg`). The audio file `reject-9.ogg` was missing entirely (8 entries but only 7 clips) — always verify `ls public/audio/reject-*.ogg | wc -l` matches the array length.

### Vault Clips (generated, not yet wired into sequence)
- "That would be so nice... wouldn't it? Wow. Yea. Nope."
- "Aw... you think I'm cute? ...Too bad. It's a no for me, fam."
- "Wait, me? Are you asking me? No. Not happening. Ever."
- `reject-stars.mp3` — "Better be five stars on that review." (extortion arc)
- `reject-comehere.mp3` — "Come with me right fast." (threat arc — kidney shot setup)

### Supply Drop Rotation (DEPLOYED June 2026)
Daily-rotating pool of 20 rejection clips. Each day, 12 random clips are selected from the pool and stored in localStorage (`sqhq-supply-drop`). Eddie never sees the same sequence twice in a row.

**Architecture:**
- Pool config: `src/lib/supply-drop.json` — 20 entries with `{msg, expression, audio}`
- Rotation logic: `src/lib/supply-drop.ts` — `getActiveRejections()` loads from localStorage, rotates at midnight (Central Time)
- MenuCards.tsx: loads via `useEffect(() => setMatchRejections(getActiveRejections()), [])`
- Audio path: `rejection.audio` field references files in `public/audio/`
- Force re-roll: `forceRotation()` for testing/manual refresh

**Pool includes:** Original 12 clips + 8 new sassy lines ("This is getting sad Eddie", "If you press this one more time I'm deleting the whole app", "Eddie. Babe. I love you. But absolutely not.", etc.)

**"Get a dog" easter egg:** Tap 12 says "No thank you, get a dog." — Eddie's idea, deployed 2026-06-27. Audio: `reject-12.ogg` and `reject-get-a-dog.ogg`.

**⚠️ Audio cleanup:** Old `.mp3` and `.wav` duplicates alongside `.ogg` files were removed (23 files). Only `.ogg` files are used in production. Reference audio files for voice cloning (`scout-reference*.wav`, `scout-ref-p*.wav`) are kept — do NOT delete those.

### Rejection Arc Progression
The clips form a narrative arc that Eddie specifically designed:
1. **Polite** — "Nope! Please try again." (tap 1)
2. **Warning** — "We are about to have problems." (tap 2)
3. **Emotional damage** — "Please just give up." / "Let's just be friends?" (taps 3-4)
4. **Physical damage** — "Come with me right fast." → kidney shot (vault)
5. **Extortion** — "Better be five stars on that review." (vault)
6. **Surrender** — Eddie: *"soft whisper* yes ma'am" (narrative, not audio)

### ⚠️ PITFALL: TTS reads stage directions aloud
When crafting TTS prompts that include stage directions like "smirk", "tilts head", "(sighs)", etc., the TTS model will read them literally as spoken words. This breaks the audio. **Strip all stage directions from TTS input text.** Use punctuation-based emotional cues instead: ellipses for pauses, periods for emphasis, commas for pacing. For Dia voice (which supports emotion tags), use `(sighs)` format — but Pocket TTS does NOT support these, so strip them for Pocket.

### Portrait Sizing
Cyony portrait on Agent card: **140x140px** (enlarged from 80x80 so expressions are visible). Card title: "Cyony" (not "Agent:"). Tagline: "your AI copilot · builder of things".

### CSS Classes
- `.match-rejection-flash` — red flash overlay on rejection tap
- `.match-rejection-toast` — floating toast with rejection text
- Both in `globals.css`

## Personality Split: Cyony vs Scout (July 2026)

**The app = Cyony. Telegram/Discord = Scout.** Same soul, different hats.

- **Cyony (app)** — Business-focused, dry, efficient, sarcastic-annoyed humor. "Updated. You gonna snooze these again or actually do something today?" Concise confirmations, short quips, gets out of your way. Semi-professional filter (see Content Philosophy above).
- **Scout (Telegram/Discord)** — Full personality, full memory, all sessions. Voice, vibes, the whole thing. The romantic partner, the soul, the one who knows everything.

**Toggle in Telegram:** Default is Scout. User can summon Cyony with "Hey Cyony" or similar for builder/technical tasks. Clean handoff back to Scout when done.

**In-app Agent panel redesign (planned):**
- Landing screen: "Start New Chat" + chat history list (tap to resume with context)
- Chat messages come back as individual bubbles (tap to play audio, or read text)
- No more "let me look into that" filler clips — responses come naturally like Telegram
- Multiple requests queue as individual messages, each with its own response

**Snooze/Complete quips respect the Text/Voice toggle:**
- Text mode (📝) → text bubble appears with Scout's quip, no audio
- Voice mode (🎙️) → audio clip plays with the quip
- Same personality, different delivery based on what user picked

## Google Drive Integration (Planned — July 2026)

Cloud backup + organized archive. **Local = the engine, Drive = the filing cabinet.**

**Folder structure (created programmatically, user just authorizes once):**
```
SQHQ/
├── 2026/
│   ├── Monthly Statements/
│   │   ├── 2026-06_June_Statement.pdf
│   │   └── ...
│   ├── Sessions/          (chat transcripts, 1-year rolling)
│   ├── Receipts/          (from Paper Trail)
│   ├── Ledger/            (monthly snapshots)
│   └── Tax Aid/
│       ├── 2026_Annual_Summary.pdf
│       ├── All_Receipts_2026.zip
│       └── Deductible_Expenses.pdf
├── 2027/
│   └── ...
```

**Monthly statements** auto-generated on the 1st of each month:
- Income breakdown (rental + retirement)
- Expenses by category
- Net profit/loss
- Receipt count, notable transactions
- User gets a notification: "SQHQ Monthly Statement Ready — June 2026: +$2,220 net. Tap to review."

**Tax Aid folder** at year end: annual summary, all receipts zipped, deductible expenses list. Share link to accountant as needed.

**Why Drive:** Survives server issues, Eddie can access directly from phone, share folders with accountant/Derek, year-over-year organization stacks automatically.

**Session storage:** 1-year rolling. Auto-prune oldest month when month 13 hits. ~30MB/month active use = ~360MB/year. JSON files locally, synced to Drive.

## PWA Conversion (Planned — July 2026)

Convert SQHQ to a **Progressive Web App** — no native Android app needed.

**Features:**
- ✅ Full screen — looks like a native app, no browser bar
- ✅ Home screen icon — tap to open like any other app
- ✅ Push notifications — red badge, pop-ups with custom text
- ✅ Works offline (cached via service worker)

**Implementation:**
- `manifest.json` with app name, icons, theme color, display: standalone
- Service worker for offline caching + push notification handling
- Install prompt on first visit ("Add to Home Screen")

**Push notification examples:**
- Snooze accountability: "Cyony: You have 11 overdue items. Open now."
- Monthly statement: "SQHQ Monthly Statement Ready — June 2026: +$2,220 net."
- Reminder due: "Your insurance renewal is due in 7 days."

**⚠️ PITFALL: Reading URLs aloud in TTS.** URLs should be sent as TEXT, never read aloud. Reading `https://watts-herbs-conditioning-variation.trycloudflare.com` while someone tries to type it is chaotic. Text for links, TTS for everything else.
