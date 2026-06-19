# Welding Glass Design Pattern

A semi-transparent content panel overlay that lets the background gradient show through while keeping text readable. Named after the dark greenish-black lens of a welding mask.

## The CSS

```css
.content-panel {
  background: rgba(10, 12, 8, 0.55);
  backdrop-filter: blur(3px);
}
```

**rgba(10, 12, 8, 0.55):** The slightly-greenish near-black gives the "welding lens" tint. 0.55 opacity lets about half the background through — enough to sense the glow underneath, not enough to make text hard to read.

**blur(3px):** Softens the sharp edges where the gradient peeks through. At 0px blur the background crunches into sharp-edged regions. Above 6px blur starts to look like frosted glass (different vibe).

## Where It Works Best

- **Dark gradient backgrounds** with subtle radial glows (yellow/gold accents especially)
- **Single-page apps** where the workspace is the primary content area
- **Sidebar + content layouts** where the sidebar is opaque and the content panel floats

## Where It Doesn't Work

- **Light themes** — the welding lens needs a dark base color. Translating to light: use `rgba(255,255,255,0.55)` with backdrop-filter but you lose the "glass" feel.
- **Patterned/image backgrounds** — the blur creates motion sickness when the background has high-frequency detail
- **Content with its own saturated backgrounds** (colored cards, charts) — the tint clashes

## Adjusting the Effect

| Opacity | Feel |
|---------|------|
| 0.35-0.45 | Very translucent, background dominates. Text needs strong contrast (pure white) |
| 0.50-0.60 | Sweet spot for welding glass. Background is a glow, not a pattern |
| 0.65-0.80 | Nearly opaque, glass effect is subtle |
| 0.85+ | Might as well be solid |

Pair with a solid-color bottom nav bar (or sidebar) to frame the glass panel. The transition from opaque chrome (nav) to translucent glass (workspace) is the whole point.
