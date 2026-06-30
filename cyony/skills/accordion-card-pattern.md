# Accordion Card Pattern — SQHQ Workspace Cards

## HTML/CSS/JS Template

The accordion card pattern is the standard layout for SQHQ workspace screens (Garage, Assets, Ledger, etc.). Reference implementation: `public/mockup-5-accordion.html`.

### Structure

```
.card-stack (flex column, gap: 8px)
  └── .vehicle-card (position: relative, cursor: pointer)
        ├── .left-line (absolute, left: 0, width: 3px, height: 100%, color per vehicle)
        ├── .card-header (flex row, always visible)
        │     ├── .card-number (big year digits, e.g. "19")
        │     ├── .card-info
        │     │     ├── .card-name (vehicle name)
        │     │     └── .card-brief (tag + insurance, monospace, muted)
        │     ├── .card-icon (SVG silhouette)
        │     └── .expand-arrow (▼, rotates 180° when expanded)
        ├── .card-details (max-height: 0 → 400px on expand)
        │     └── .details-inner
        │           ├── .status-row (pill badges)
        │           ├── .data-rows (terminal key:value pairs)
        │           └── .thumbs-row (photo thumbnails)
        └── .card-index (absolute, bottom-right, "001" format)
```

### Key Behaviors
- **Toggle:** Click a card to expand/collapse
- **One at a time:** All cards collapse before the new one expands
- **Left line animation:** Height transitions with the card expansion (CSS transition 0.4s cubic-bezier)
- **Arrow rotation:** 180° when expanded
- **Max-height animation:** `max-height: 0` → `400px` with cubic-bezier easing

### JavaScript
```javascript
function toggleCard(card) {
  const wasExpanded = card.classList.contains('expanded');
  document.querySelectorAll('.vehicle-card').forEach(c => {
    c.classList.remove('expanded');
  });
  if (!wasExpanded) {
    card.classList.add('expanded');
  }
}
```

### CSS Keyframes
```css
.card-details {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.vehicle-card.expanded .card-details {
  max-height: 400px;
}
```

### Color Assignments
| Vehicle | Border Color | Hex |
|---------|-------------|-----|
| Porsche Cayman | Yellow | #f1c40f |
| Ford F-150 | Green | #2ecc71 |
| VW Baja Bug | Blue | #3498db |

**NEVER use purple for vehicle cards.** Purple = Scout only.

### Typography
- Headers: Inter (sans-serif)
- Data rows: JetBrains Mono (monospace)
- Card numbers: JetBrains Mono, 28px, weight 700, color #2a2a2a (barely visible, subtle background element)

### Applying to Other Workspaces
When building a new workspace (e.g. Assets, Ledger), use this same pattern but:
1. Change the header icon and title (e.g. `◆ assets .focus`)
2. Change the data rows to match the entity type
3. Assign appropriate colors per card (never purple)
4. Update the brief line to show the most useful at-a-glance info
5. Adjust thumbnail row content (photos, documents, etc.)

### Workspace-Specific Variations (June 2026)

**Houses** — Same accordion pattern but address-based numbering (e.g. "247" for 247 W. Lee Ave). Adds mortgage progress bar and vacancy alert. Stacked address format: `TN · Osceola` / `W. Lee Ave`. Insurance due shown as badge (no price).

**Ledger** — NOT accordion. Flat list with section headers (rental income, retirement, expenses). Transaction rows have colored left bar (green=in, red=out, blue=neutral). Net banner at top. Running total sticky at bottom.

**Paper Trail** — NOT accordion. Receipts grouped by asset with receipt cards (badge + vendor + amount + date). Filter panel (bottom sheet) with chip-based filters. Export button for CSV.

**Connects** — Compact cards (⅓名/phone on line 1, relation/note on line 2). Expandable details with dynamic field rendering (only shows fields with data). Sort toggle A→Z or by category. Color-coded left bars: green=contractors, blue=fam, orange=work.

See `references/workspace-patterns.md` for full CSS class reference and data structures.
