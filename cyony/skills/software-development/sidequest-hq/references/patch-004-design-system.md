# Patch 004 — Unified Glass UI Design System

## Overview
Complete visual overhaul of ALL workspace tabs (Garage, Assets, Ledger, Paper Trail, Connects, Reminders) to follow a single unified design language. Applied 2026-07-01.

## Universal Patterns

### Frosted Glass Headers (flex layout — NOT position:fixed)
- Lives OUTSIDE the scroll area via flex column layout (see pitfall below)
- Background: `rgba(8, 8, 8, 0.75)` + `backdrop-filter: blur(20px)`
- Border-bottom: `1px solid rgba(255,255,255,0.05)`
- `+ Add` button lives INSIDE the header row on every tab
- `flex-shrink: 0` so it never collapses

### Card Style
- Border-radius: **0** (sharp corners everywhere)
- Top-right corner cut: `clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)`
- Left accent bar: 3px wide, colored per item type
- Background: `#111`, border: `1px solid #1a1a1a`

### Card Expansion
- Only 1 card expanded at a time (auto-close previous)
- All cards start COLLAPSED on page load (`expanded` defaults to `null`)
- Smooth `max-height` transition (~300ms ease)
- Expansion pushes content below downward (no overlap)

### Content Layout
- `.workspace-page` is a flex column with `height: 100%; overflow: hidden`
- Header + summary bars are `flex-shrink: 0` (outside scroll area)
- `.workspace-scroll` is `flex: 1; overflow-y: auto` (the only scrollable area)

## Tab-Specific Layouts

### Garage (Mobile Assets)
- Header: `« Garage - Mobile Assets` + `+ Add`
- Cards: `YY Make|Model` left · `Tag#` / `Insurance date` right (stacked)
- Accent colors: Car=yellow, Truck=green, Motorcycle=red, Van=blue

### Assets (Properties)
- Header: `« Assets` + `+ Add`
- Cards: Street# left · `City, State` + `Status` right (stacked)
- Accent: green=occupied, red=vacant

### Ledger
- TWO fixed headers: title + summary bar (Total In / Total Out / % Earned)
- Cards: Description left · Amount + Date right
- Accent: green=in, red=out, blue=neutral

### Paper Trail
- TWO fixed headers: title + YTD bar (clickable year selector)
- Year selector: current year + past 3 years
- `+ Add` shows 3 options: Manual / Picture / CSV
- Filter chips: all, property, vehicle, personal, uncategorized

### Connects
- Header: `« Connects` + `+ Add`
- Cards: Name left · Phone + Category right (stacked)
- Accent: green=contractors, blue=fam, orange=work

### Reminders (NEW)
- Header: `« Reminders` + `+ Add`
- Add form: title, date, recurrence (one-time/weekly/monthly/annually), priority
- Cards: Title left · Due date + Recurrence badge right
- Accent: green=completed, yellow=upcoming, red=overdue
- DB migration: `recurrence TEXT NOT NULL DEFAULT 'one-time'` added to reminders table

## Critical Pitfall: Both position:sticky AND position:fixed FAIL in SQHQ

**Two-layer problem:**

1. `position: sticky` fails because `.app-shell` has `overflow: hidden` which breaks sticky for ALL descendants.

2. `position: fixed` ALSO fails because `.workspace` has `backdrop-filter: blur(3px)`. In CSS, `backdrop-filter` creates a new containing block, which means `position: fixed` elements are positioned relative to THAT element instead of the viewport. The header gets trapped inside `.workspace` and scrolls with it.

**Correct fix — Flex layout (no position trick needed):**

Restructure `.workspace-page` as a flex column with `overflow: hidden`, where the header sits OUTSIDE the scroll area:

```css
.workspace-page {
  display: flex;
  flex-direction: column;
  height: 100%;       /* NOT 100vh — that overflows .workspace's padding */
  overflow: hidden;
}
.workspace-header { flex-shrink: 0; }      /* never scrolls */
.workspace-summary-bar { flex-shrink: 0; }  /* never scrolls */
.workspace-scroll { flex: 1; overflow-y: auto; }  /* ONLY this scrolls */
```

**Why `height: 100%` not `100vh`:** `.workspace` has padding (16px top, ~80px bottom on mobile). If `.workspace-page` is `100vh`, it overflows `.workspace` and the outer container scrolls the header away. `100%` fills exactly the available space.

**JSX pattern (every workspace):**
```tsx
<div className="workspace-page">
  <div className="workspace-header">...frozen...</div>
  <div className="workspace-scroll">
    {/* cards, forms, content — this is the only scrollable area */}
  </div>
</div>
```

## Files Modified
- `src/app/styles/workspaces.css` — All CSS (frosted glass, clip-path, remove border-radius)
- `src/app/components/workspaces/GarageWorkspace.tsx` — New card layout
- `src/app/components/workspaces/HousesWorkspace.tsx` → Assets
- `src/app/components/workspaces/LedgerWorkspace.tsx` — Dual headers
- `src/app/components/workspaces/PaperTrailWorkspace.tsx` — Dual headers + year selector
- `src/app/components/workspaces/ConnectsWorkspace.tsx` — New card layout
- `src/app/components/workspaces/RemindersWorkspace.tsx` — NEW file
- `src/app/app/app-shell.tsx` — Reminders route added
- `src/lib/db.ts` — recurrence column migration
- `src/app/types.ts` — Reminder type updated
