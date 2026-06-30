# SwipeableCard — Reusable Swipe Gesture Component

## Component: `src/app/components/SwipeableCard.tsx`
## CSS: `src/app/styles/swipeable-card.css`

## Usage
```tsx
<SwipeableCard
  onSwipeRight={() => handleComplete(item)}
  onSwipeLeft={() => handleDismiss(item)}
  onTap={() => openDetail(item.id)}
  rightAction={{ direction: "right", label: "Done", icon: "✓", color: "#64c896", bgColor: "rgba(100,200,150,0.15)" }}
  leftAction={{ direction: "left", label: "Snooze", icon: "💤", color: "#6ea8fe", bgColor: "rgba(110,168,254,0.15)" }}
  mutterBubble={<ScoutBubble text="Wow, unreal..." />}
>
  <div className="feed-reminder-item">...</div>
</SwipeableCard>
```

## Gesture Detection
- **Delta-based tracking:** `touchStart` ref captures initial X, `offset = clientX - touchStart` computed on move
- **Threshold:** 80px for commit, 30px for action hint reveal
- **Flick detection:** velocity > 0.5px/ms AND offset > 30px counts as a flick (commits even if below threshold)
- **Tap detection:** offset < 10px AND elapsed < 300ms
- **Mouse fallback:** `mouseDown` ref, `onMouseMove`/`onMouseUp`/`onMouseLeave` handlers

## Phases
```
idle → dragging → shrinking → tucked → done
                → done (flyaway for complete)
```

## Animations
- **Complete (swipe right):** `cardFlyAway` — translateX(120%) rotate(12deg), opacity 0, 0.35s ease-in
- **Dismiss (swipe left):** `cardShrinkLeft` — shrinks to 60% scale, tucks left side, 0.4s cubic-bezier. Then stays in `tucked` state (grey, 60px max-height) for 2.5s while mutter bubble appears. Then `cardFadeOut` to 0.
- **Action reveal layer:** Behind the card, shows icon + label. Opacity tied to swipe progress (0 → 1 as offset approaches threshold).

## Mutter Bubble
- Passed as `mutterBubble` prop (ReactNode)
- Appears after card tucks (phase === "tucked")
- Uses `mutterSlideIn` animation (0.3s ease-out, 0.15s delay)
- In HomeFeed: parent tracks `snoozingId` and `snoozeQuip` state. Quip is generated at swipe time (not after) so it's ready when the bubble renders.
- After 2.5s tucked, both card and bubble fade out together.

## Key Pitfalls
1. **Don't unmount during animation** — the `done` phase fires the callback, parent handles removal
2. **Generate quip at swipe time** — not in the callback, because the bubble needs the text immediately
3. **CSS transition vs animation conflict** — see CSS Cascade Gotchas in main SKILL.md
