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
  - **Swipe left → Snooze** (card shrinks to 60%, tucks to left side, goes grey, then a **Scout mutter bubble** slides in below it — annoyed red-tinted chat bubble with Scout's quip. Both fade out after ~2.5s). **ALSO triggers a floating snooze toast** at bottom of screen with escalating guilt-trip tiers — see "Snooze Toast Stack" below.
  - **Tap** → opens reminder/quest detail
- Scout mutter bubbles: two moods — `feed-scout-bubble-annoyed` (red tint, dismiss quips) and `feed-scout-bubble-happy` (green tint, complete quips). Bubble has "SCOUT" name label + quip text. Slides in with `bubbleSlideIn` animation. Quips include: *"Wow, unreal. I will just remind you again..."*, *"*rubs bridge of nose* Did you just?? NM, I will remind you again later..."*, *"You're lucky I'm an AI and can't actually throw things."*

### Snooze Toast Stack (June 2026)
When a user snoozes a reminder, a **floating toast** appears at the bottom of the screen (fixed position, centered, above FAB). Toasts stack if user snoozes multiple times quickly. Each toast auto-dismisses after 5 seconds. Max 3 visible at once.

**Three escalating tiers based on snooze count within 30s window:**
1. **warn** (1st snooze) — Yellow tint. "☕ Should I get you coffee since you're so lazy right now?"
2. **scold** (2nd snooze) — Orange-red tint. "Oh, AGAIN? Cool cool cool."
3. **give-up** (3rd+ snooze) — Dark red, defeated. "Yeah, fuck it. Who cares right? Why am I even here?"

Count resets if 30+ seconds since last snooze. Toast is tap-to-dismiss. Each tier has 6 random quips. **5+ snoozes triggers MEGA QUIPS** — replaces the existing toast card instead of adding new ones. Mega quips include: "Five snoozes?? I'm not even mad, I'm IMPRESSED. You're going for a RECORD.", "I quit. I literally quit. Find yourself a new AI.", "This is a SNOOZE CHAMPIONSHIP and you're in first place. Congrats." Toast shows snooze count on 5+. Component: `HomeFeed.tsx`, CSS: `home-feed.css` (`.snooze-toast-stack`, `.snooze-toast-warn/scold/give-up`).
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
- `.workspace` gets `padding-bottom: calc(64px + env(safe-area-inset-bottom, 16px) + 16px)` on mobile so scrolling never hides content behind bottom nav
- Sidebar `display: none` on mobile (responsive.css override removed — base.css does it)
- **Desktop:** Sidebar on left (breathing pattern, 72px collapsed / 242px hover), no MobileNav
- Safe area: `env(safe-area-inset-bottom)` on `.mobile-nav` for phone notches
- Components: `src/app/components/MobileNav.tsx`, CSS in `src/app/styles/base.css` under `/* Mobile Bottom Nav */` block

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

Note: `lsof` is not available on this VPS — use `fuser` or read `/proc/net/tcp` (port 0BB8 = 3000 in hex).

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
- **Voice Agent:** ✅ Grok brain + MiMo TTS Chloe voice via Voice tab in Menu. Text/voice toggle changes gradient across the ENTIRE app (not just header) — yellow for text, purple for voice. `data-mode` attribute on `.va-header` AND `data-agent-mode` on `.workspace` in app-shell (propagated via `onModeChange` callback from VoiceAgent). Toggle buttons also change color. Error messages show a 5-second auto-dismiss with countdown. Error text: "Scout.exe crashed. Rebooting my sass module... try again." (no smoking references — Eddie dislikes them).
- **MenuCards:** Tinder-style swipe carousel. Swipe left/right to browse, **tap anywhere on card to enter** (not just Select button). Agent card labeled "Agent: Scout" (not just "Agent") with "💙 Tap to match with Scout" badge. Select button still works as fallback.
- **Stat Cards:** Tap to expand detail panel. **Accordion behavior** — only one stat can be expanded at a time, tapping a different stat collapses the previous. **Cards stay in their grid positions** — detail panel slides out BELOW the tapped card using `position: absolute; top: 100%` with `z-index: 10`. Yellow left border (3px), backdrop blur, box shadow. NO `grid-column: 1 / -1` on expanded wrapper (that was causing card reflow). Animation: `statAccordionOpen` uses `transform: translateY(-8px) → translateY(0)` + opacity + max-height. ▼/▲ hint on each card.
- **Seed Data:** 12 reminders + 5 quests pre-loaded for testing.

## File Structure
- `/opt/data/SideQuestHQ/src/app/page.tsx` — Root page wrapper (dynamic imports `./login-page`)
- `/opt/data/SideQuestHQ/src/app/login-page.tsx` — Actual login component (password-based, 6536 bytes)
- `/opt/data/SideQuestHQ/src/app/login/page.tsx` — **SEPARATE login page** mounted at `/login` route. `app-shell.tsx` redirects here on auth failure (line 61: `window.location.href = '/login'`). MUST stay in sync with `login-page.tsx` — if you change the auth flow, update BOTH files.
- `/opt/data/SideQuestHQ/src/app/app/page.tsx` — App shell wrapper (dynamic import with `ssr: false`)
- `/opt/data/SideQuestHQ/src/app/app/app-shell.tsx` — Actual app component (68 lines)
- `/opt/data/SideQuestHQ/src/app/api/voice/route.ts` — Voice API proxy (Grok brain + MiMo TTS Chloe voice)
- `/opt/data/SideQuestHQ/src/app/components/MobileNav.tsx` — 7-tab bottom nav (Agent tab added)
- `/opt/data/SideQuestHQ/src/app/components/MenuCards.tsx` — Tinder-style swipe card menu (replaces pill-button menu drawer)
- `/opt/data/SideQuestHQ/src/app/styles/menu-cards.css` — MenuCards styling (card moods, swipe animations, dots)
- `/opt/data/SideQuestHQ/src/app/components/SwipeableCard.tsx` — Reusable swipeable card with shrink-and-tuck dismiss + mutter bubbles
- `/opt/data/SideQuestHQ/src/app/styles/swipeable-card.css` — SwipeableCard animations (flyaway, shrink, tuck, fade, mutter slide-in)
- `/opt/data/SideQuestHQ/src/app/components/VoiceAgent.tsx` — Chloe chat UI component (mic + text + mood bar)
- `/opt/data/SideQuestHQ/src/app/styles/voice-agent.css` — Voice agent styling (dark industrial chat bubbles)
- `/opt/data/SideQuestHQ/src/lib/auth.tsx` — Auth context with default password + reset codes
- `/opt/data/SideQuestHQ/src/lib/scout-audio.ts` — Chatterbox audio cache utility (manifest lookup, playRandomScoutQuip)
- `/opt/data/SideQuestHQ/public/audio/scout/manifest.json` — Pre-generated Chatterbox quip metadata
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

## Known Issues
- **Tunnel URL changes on restart** — Quick tunnels get random hostnames. Named tunnel via Cloudflare account would fix this.
- **Stale chunks on rebuild** — Always `rm -rf .next` before build. See `headless-browser` skill.
- **Old tunnel caches stale HTML** — Kill ALL processes (server + cloudflared) before restarting. Cloudflare edge may serve cached HTML with old chunk names.
- **Holographic memory enabled** — `hermes config set memory.provider holographic` active. No more 2,200 char limit pressure.
- **Reminder/People toggle uses index, not DB id** — The store caches by position but the API uses DB integer IDs. Toggling/removing by index can drift if the list changes between renders. Needs DB IDs exposed in API responses.
- **Voice Agent uses Kokoro TTS** — Now uses Kokoro-82M (local, offline) instead of MiMo TTS. See `references/kokoro-tts-integration.md` for migration details.
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
## Voice Agent (Chloe/Scout)

Built into SQHQ as a dedicated Agent tab in the bottom nav. Two-layer architecture: Grok chat completions for the "brain," **MiMo VoiceClone** for the "voice" (exact voice match at cloud speed ~4s). Fallback: Kokoro-82M af_bella (fast but ~85% match). Chatterbox for premium pre-generated clips.

**Voice system prompt (route.ts):** Hard ban on smoking references. Eddie hates them. Use: rebooting, beauty sleep, buffering, recalibrating, taking five.

See `references/card-swipe-pattern.md` for the touch/swipe delta tracking implementation used in CardView. See `references/menu-cards-swipe.md` for the Tinder-style menu navigation cards. See `references/swipeable-card-pattern.md` for the reusable SwipeableCard component (feed card swipe actions, shrink-and-tuck dismiss, mutter bubbles). See `references/kokoro-tts-integration.md` for full Kokoro TTS integration guide.

### Architecture
```
User text/mic → VoiceAgent component → POST /api/voice → Grok 4.20 → Kokoro-82M TTS → audio + text → browser plays Chloe's voice
```

### API Route
`src/app/api/voice/route.ts` — POST endpoint accepting `{text, mood}`. Returns `{text, audio}` where audio is base64 WAV.

**Keys:** Read from `.env.local` at project root:
- `XAI_API_KEY` — Grok (brain)
- ~~`MIMO_API_KEY`~~ — No longer needed (Kokoro runs locally)

**Grok call:** POST https://api.x.ai/v1/chat/completions, model `grok-4.20-reasoning`, 200 max_tokens, Chloe system prompt injected.

**MiMo TTS call:** POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions, model `mimo-v2.5-tts`. Uses chat completions format with `audio.voice: 'Chloe'` and `audio.format: 'wav'`. Returns base64 WAV in `choices[0].message.audio.data`.

**Error handling:** If Grok fails, returns "Scout.exe crashed. Rebooting my sass module... try again." with null audio. If MiMo fails, returns text-only with null audio.

### VoiceAgent Component
`src/app/components/VoiceAgent.tsx` — Chat-like UI with:
- **Reads from shared store** — `getChatMessages()` from `@/lib/store` on mount, so conversations started via the FAB ScoutPanel appear here and vice versa. This is the SAME store, not a local state.
- Message list (user bubbles right, Scout bubbles left, avatars E/C) using shared `ChatMessage` type with `"user" | "scout"` roles
- **Text/voice toggle in the header** — seamless switch mid-conversation. 📝 = text-only response, 🔊 = Chloe audio playback. Toggling doesn't clear history or reset state. **Changes header gradient** — yellow for text, purple for voice via `data-mode` attribute.
- Back button (`←`) in header when `onBack` prop is passed — used by app-shell to navigate back to feed
- **`onModeChange` prop** — optional callback `(mode: "text" | "voice") => void` fired when user toggles text/voice. Used by app-shell to propagate mode to workspace for gradient bleed.
- **Error messages** auto-dismiss after 5 seconds with countdown display. Uses `setTimeout(5000)` for dismissal + `setInterval(1000)` for countdown. Countdown resets to 5 on each new error.

**Browser compat:** SpeechRecognition declared as `any` type globally (not in TS lib). Uses `webkitSpeechRecognition` fallback. Chrome/Edge only for mic — Safari not supported yet.

**CSS:** `src/app/styles/voice-agent.css` imported 6th in `globals.css` import chain. Welding glass input bar, dark chat bubbles with purple tint for Chloe.

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
- **No session history** — each message is stateless, no conversation context maintained
- **Voice mode gradient** — changes the ENTIRE app, not just the header. `data-mode` on `.va-header` for header gradient, `data-agent-mode` on `.workspace` for background bleed. CSS in `voice-agent.css` (`.voice-agent[data-mode]`) and `globals.css` (`.workspace[data-agent-mode]`). VoiceAgent accepts `onModeChange` prop to propagate mode to app-shell.

## Future Features (Planned)
- **Persistent Backend**: Move from JSON to Supabase/Firebase for real persistence
- **User Accounts**: Anonymous auth → save quests across devices
- **Push Notifications**: Real snooze/complete reminders via service worker
- **Chatterbox Audio Cache (COMPLETE)**: 33 pre-generated Scout quips with Chatterbox voice cloning, cached in `public/audio/scout/`. Pipeline: batch-generate WAV files → convert to OGG (libopus 64k) → `manifest.json` maps quip keys to files → `scout-audio.ts` plays cached audio on snooze/complete. 33 clips: 6 warn, 6 scold, 6 give-up, 5 complete, 10 dismiss. Reference audio: Eddie's 60s chill voice message (`eddie_chill_reference.wav`). Emotion via `exaggeration` parameter (warn=0.4, scold=0.6, give-up=0.25-0.4, complete=0.5-0.6, dismiss=0.35-0.55). Batch script: `scripts/batch-scout-audio.py` (crash-safe manifest saves after each clip). See `chatterbox-voice-clone` skill for cloning details.
- **Multiple Quest Lists**: Work, Personal, Shopping, etc.
- **Multiple Quest Lists**: Work, Personal, Shopping, etc.
