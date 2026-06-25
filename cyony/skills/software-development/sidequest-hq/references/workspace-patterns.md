# Workspace Patterns — SQHQ (June 2026)

## File Locations
- Components: `src/app/components/workspaces/{Garage,Houses,Ledger, PaperTrail,Connects}Workspace.tsx`
- CSS: `src/app/styles/workspaces.css`
- Mockup HTML files: `public/mockup-*.html` (standalone, sent as media attachments for review)

## Shared CSS Classes (workspaces.css)

### Page & Header
- `.workspace-page` — max-width 420px, centered, padding bottom 40px
- `.workspace-header` — padding 16px 6px 0, position sticky top 0, z-index 50, bg #080808. Contains ONLY back button + title row. No stats, no counts.
- `.workspace-back` — back arrow button, monospace, muted
- `.workspace-title-row` — flex row: title left (no count — count lives in scoreboard)
- `.workspace-title` — `◆ garage .focus` format (diamond + name + `.focus`)

### Scoreboard (Floating Digital Readout)
Every workspace uses a **two-layer sticky header**:
1. **Top bar** (z-index 50) — back button + title only
2. **Scoreboard** (z-index 45, `top: 52px`) — floating panel with key numbers, elevated with box-shadow

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

CSS classes:
- `.workspace-scoreboard` — sticky top 52px, z-index 45, bg #0a0a0a, border 1px #1a1a1a, rounded 10px, box-shadow for floating effect
- `.scoreboard-main` — flex column with label + value
- `.scoreboard-label` — monospace 10px, uppercase, muted (#444)
- `.scoreboard-value` — monospace 20px bold, with `.green` / `.red` color classes
- `.scoreboard-stats` — flex row, gap 14px
- `.scoreboard-stat` — flex row with dot + label, monospace 12px semi-bold

Per-workspace scoreboard content:
| Workspace | Label | Value | Stats |
|-----------|-------|-------|-------|
| Garage | fleet value | $112,400 (green) | colored dots per vehicle |
| Ledger | net this month | +$2,220 (green) | $in / $out with colored dots |
| Houses | portfolio | N properties (green) | occupied / vacant dots |
| Paper Trail | expenses YTD | −$18,420 (red) | assets / receipts count dots |
| Connects | contacts | 9 | contractors / fam / work dots |

**⚠️ PITFALL: Don't duplicate stats between header and scoreboard.** The old pattern had `workspace-stats` in the header AND a separate `net-banner` in Ledger. The scoreboard consolidates everything into ONE floating element. Remove `workspace-stats`, `workspace-count`, and `net-banner` when converting.

- `.ws-dot` — 5px colored circle, inline-block (also used in scoreboard-stat)

### Accordion Cards
- `.accordion-stack` — flex column, gap 8px, margin-top 16px
- `.accordion-card` — bg #111, rounded, relative, cursor pointer
- `.accordion-card.expanded` — bg #0f0f0f
- `.accordion-line` — absolute left 3px bar, color per entity
- `.accordion-header` — flex row: year/number | info | arrow
- `.accordion-year` — JetBrains Mono, 32px, bold, color #2a2a2a (barely visible)
- `.accordion-name` — 16px semibold
- `.accordion-brief` — monospace 11px, muted
- `.accordion-arrow` — ▼/▲, 12px
- `.accordion-index` — absolute bottom-right, "001" format, very muted (#333)
- `.accordion-details` — padding, top border
- `.accordion-pills` — flex wrap, gap 8px
- `.pill.*` — colored badge (green/yellow/blue/orange/red/gray)
- `.accordion-rows` — flex column
- `.accordion-row` — flex, key:val, monospace 13px
- `.row-key` — muted, min-width 160px, auto-appends ` :`
- `.row-val.*` — bright with color variants

### Houses-specific
- `.address-stack` — stacked state/city + street
- `.address-loc` — uppercase monospace 11px, letter-spacing
- `.mortgage-bar-wrap` — progress bar container with top border
- `.mortgage-label` — flex space-between
- `.mortgage-bar` — 6px height, bg #1a1a1a, rounded
- `.mortgage-fill` — green (#2ecc71) fill, width set by percentage
- `.vacancy-alert` — red-tinted border box with ⚠ icon

### Ledger-specific
- Scoreboard replaces old `net-banner` — net this month + in/out stats in the floating scoreboard
- `.ledger-section` — margin-top 16px
- `.ledger-section-header` — flex space-between, bottom border
- `.tx-row` — flex row with colored left bar
- `.tx-bar` — 3px wide, colored by type (green/red/blue)
- `.tx-amount.in/.out/.neutral` — colored by direction

### Paper Trail-specific
- `.action-bar` — flex row: filter icon + export button
- `.filter-icon-btn` — 36px square, ⚙ icon, toggles active state
- `.csv-btn` — 2/3 max-width, green text, 📊 icon
- `.filter-overlay` — fixed full-screen dark backdrop
- `.filter-panel` — bottom sheet, slides up, rounded top
- `.filter-chip` — pill toggle, green when selected
- `.filter-apply-btn` — full-width green button
- `.receipt-card` — flex row with badge + vendor + amount + date
- `.receipt-badge` — colored by type (receipt/manual/digital)
- `.running-total.sticky` — sticky bottom, border

### Connects-specific
- `.sort-bar` — flex row of sort chips
- `.sort-chip` — pill toggle, blue when active
- `.connect-category` — section with header
- `.contact-card` — compact card, overflow hidden
- `.contact-bar.*` — 2px left bar (green/blue/orange)
- `.contact-header-row` — name | type | phone
- `.contact-sub-row` — relation | note (italic)
- `.contact-details` — expandable, top border, detail rows
- `.detail-key` — muted, min-width 110px

## Data Structures

### Vehicle (Garage)
```ts
{ year: string; name: string; tag: string; briefTag: string; color: string;
  statusPills: Array<{ label: string; color: string }>;
  data: Array<{ key: string; val: string; color?: string }> }
```

### Property (Houses)
```ts
{ number: string; state: string; city: string; street: string; color: string;
  briefTag: string; occupied: boolean; paidOff: boolean;
  data: Array<{ key: string; val: string; color?: string }>;
  mortgagePct?: number }
```

### Transaction (Ledger)
```ts
{ name: string; detail: string; amount: string; date: string;
  type: "in" | "out" | "neutral" }
```

### Receipt (Paper Trail)
```ts
{ vendor: string; detail: string; amount: string; date: string;
  badge: string; badgeColor: string }
```

### Contact (Connects)
```ts
{ name: string; contactType: string; phone: string;
  relation: string; note: string;
  category: string; subcategory: string; barColor: string;
  details: Record<string, string> }
```

## Mockup-to-Production Workflow

1. Build standalone HTML files (inline CSS/JS, no server dependency)
2. Save to `public/mockup-*.html`
3. Send as `MEDIA:/opt/data/SideQuestHQ/public/mockup-*.html` (NOT tunnel URLs)
4. User reviews on mobile, sends screenshots
5. Iterate via patches, re-send file
6. Once approved, build TypeScript components + CSS in `src/app/`
7. Wire into app-shell routing
8. Build, restart, verify, push to GitHub

## Filter Panel Pattern (Paper Trail)

Bottom sheet overlay triggered by ⚙️ icon button. Structure:
```
.filter-overlay (fixed, full-screen backdrop, click to close)
  └── .filter-panel (fixed bottom, slide-up, rounded top)
        ├── header (title + close button)
        ├── section label ("by asset")
        ├── .filter-chips (flex wrap of toggleable pills)
        ├── section label ("by type")
        ├── .filter-chips
        └── .filter-apply-btn (full-width green)
```

Chips toggle `.selected` class on click. Apply button closes panel. Active filters shown as pills above the list.

## Expandable Contact Cards (Connects)

Contact cards use a dynamic expansion pattern — only fields with data render, so the card height adapts to available information. No empty field placeholders.

**Production (React):** `ContactCard` component receives full contact object. Expansion managed by `expanded` state (string ID or null). One card open at a time.

```tsx
{isOpen && Object.keys(c.details).length > 0 && (
  <div className="contact-details">
    {Object.entries(c.details).map(([k, v]) => v && (
      <div key={k} className="contact-detail-row">
        <span className="detail-key">{k}</span>
        <span className="detail-val">{v}</span>
      </div>
    ))}
  </div>
)}
```

**Mockup (HTML):** Data stored as JSON in `data-details` attribute. Click handler parses JSON and dynamically builds detail rows. Same conditional rendering — empty fields skipped.

Key principle: **dynamic expansion** — card height adapts to available data.
