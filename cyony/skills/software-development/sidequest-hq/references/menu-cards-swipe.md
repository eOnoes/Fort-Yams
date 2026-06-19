# MenuCards — Tinder-Style Swipe Navigation

Replaces the pill-button menu drawer with a card carousel. Each card = one navigation destination.

## Behavior
- **Two cards rendered:** top card (interactive) + behind card (follows the drag)
- **Swipe right** = select that view (triggers `onSelect(view)`)
- **Swipe left** = skip to next card. Behind card slides in from the right as you drag.
- **Swipe right (back)** = prev card slides in from the left
- **Agent card** = swipe right ONLY (no left swipe, no skip button). "Match only" — user must accept.
- **Top-left/right hints** show prev/next card names, clickable to navigate
- **Action buttons** below card: "✕ Skip" (left swipe) and "✓ Select" (right swipe). Agent shows only "💙 Match".
- **Dots** at bottom indicate position in the carousel
- **Cancel** button to close without selecting

## Stacked Card Follow-Through Animation
The key design rule: **when the outgoing card moves, the incoming card follows from the opposite side.**

Two cards are always rendered:
- `.menu-card-top` (z-index: 2) — interactive, receives touch/mouse events
- `.menu-card-behind` (z-index: 1) — positioned behind, follows the drag

### Follow-through math:
```typescript
// Progress: 0 (no drag) → 1 (fully swiped past threshold)
const swipeProgress = Math.min(Math.abs(swipeOffset) / 200, 1);

// Behind card starts offset on the OPPOSITE side and moves toward center
const behindStartOffset = swipeOffset < 0 ? 120 : -120; // opposite side
const behindOffset = behindStartOffset * (1 - swipeProgress);
const behindScale = 0.88 + (0.12 * swipeProgress); // 0.88 → 1.0
const behindOpacity = 0.5 + (0.5 * swipeProgress);   // 0.5 → 1.0
```

Inline styles applied to behind card:
```
transform: translateX(${behindOffset}px) scale(${behindScale})
opacity: ${behindOpacity}
```

### Exit animations (CSS keyframes, 280ms):
- `cardExitLeft` — top card exits left with -18° rotation
- `cardExitRight` — top card exits right with +18° rotation
- Behind card transitions to `translateX(0) scale(1)` via CSS transition when exitDirection is set

### Critical implementation detail:
The behind card index depends on swipe direction:
- Swiping left (offset < 0) → behind = next card (currentIndex + 1)
- Swiping right (offset > 0) → behind = prev card (currentIndex - 1)
- No swipe → behind defaults to next card

## Card Definitions
```
Quests ⚔️ — "Active missions, battles to fight" (calm)
Assets 🏠 — "Properties, vehicles, stuff you own" (chill)
Ledger 💰 — "Money in, money out, money owed" (annoyed)
Paper Trail 📄 — "Receipts, docs, things to review" (chill)
Reminders ⏰ — "Don't make me remind you twice" (playful)
People 👥 — "Contacts, clients, the crew" (calm)
Agent 🤖 — "Talk to Scout. You know you want to." (playful)
```

## Swipe Mechanics
- Touch/mouse delta tracking (same pattern as CardView)
- **Threshold:** 80px (higher than CardView's 60px — full-screen cards need more deliberate swipes)
- **Rotation:** Top card rotates during swipe: `rotate(${offset * 0.06}deg)` for physical feel
- **Exit:** CSS keyframe animations (280ms) — card exits with rotation, then state updates
- **Agent constraint:** `if (isAgent && offset < 0) { setSwipeOffset(0); return; }` — left swipe is blocked

## Integration
- Replaces the old `scout-panel` / `scout-choices` pill-button menu in `app-shell.tsx`
- Triggered by `handleOpenMenu()` from ScoutPanel
- Calls `setActiveView(view)` on select, which triggers the CardView/HomeFeed/VoiceAgent render logic

## CSS Classes
- `.menu-cards-overlay` — fixed fullscreen backdrop with blur
- `.menu-card-stack` — relative container for the two-card stack
- `.menu-card-top` — z-index 2, cursor: grab, interactive
- `.menu-card-behind` — z-index 1, pointer-events: none, transition on transform/opacity
- `.menu-card[data-mood]` — per-mood accent colors (calm=blue, playful=orange, chill=green, annoyed=red)
- `.card-exit-left` / `.card-exit-right` — exit animation keyframes (280ms ease-in)
- `.menu-action-skip` / `.menu-action-select` — action button styles
- `.menu-dot.active` — current position indicator

## Component File
`src/app/components/MenuCards.tsx` — Client component, ~200 lines
CSS: `src/app/styles/menu-cards.css` — imported in globals.css after home-feed.css
