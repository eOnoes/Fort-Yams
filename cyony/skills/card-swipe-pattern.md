# Card Swipe Pattern — Touch Handling

## The Problem
Initial implementation used absolute `clientX` for the swipe offset check. On touchend, `swipeOffset > 100` was always true (touch X is always > 100 on mobile), so swiping left ALSO fired as "prev" — effectively only one direction worked.

## The Fix: Delta-Based Tracking
Track the STARTING touch position, then compute delta on every move:

```tsx
const [touchStart, setTouchStart] = useState(0);

const handleTouchStart = (e: React.TouchEvent) => {
  setTouchStart(e.touches[0].clientX);
  setSwiping(true);
};

const handleTouchMove = (e: React.TouchEvent) => {
  setSwipeOffset(e.touches[0].clientX - touchStart);
};

const handleTouchEnd = () => {
  setSwiping(false);
  if (swipeOffset > 60) {
    // swiped RIGHT (delta positive) → previous card
    setCurrentIndex((i) => (i - 1 + n) % n);
  } else if (swipeOffset < -60) {
    // swiped LEFT (delta negative) → next card
    setCurrentIndex((i) => (i + 1) % n);
  }
  setSwipeOffset(0);
};
```

## Threshold
- 60px minimum — not too sensitive, not too stiff
- Uses `touchStart` state (not ref) because React state batching handles the rapid touchmove updates fine — no performance issue on modern phones

## Infinite Loop
- `+ n` in the modulus prevents negative: `(i - 1 + n) % n`
- Does NOT use `Math.max/Min` — those clamp at boundaries, breaking circularity
