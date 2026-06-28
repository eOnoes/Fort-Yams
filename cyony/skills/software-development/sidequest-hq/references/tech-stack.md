# SQHQ Tech Stack (Current — June 27, 2026)

Updated after Echo's PR adding UI foundations for the modular build-out.

## Core Framework
- **Next.js 15** (upgraded from 14)
- **React 19** (upgraded from 18)
- **TypeScript 6**
- **SQLite** via better-sqlite3 (20+ tables, schema auto-initializes)

## UI Component Library (NEW — installed by Echo)
- **Radix UI** — 13 components: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, progress, scroll-area, select, separator, slot, tabs, toast, tooltip
- **Tailwind CSS v4** — utility-first styling (CSS-first config, no tailwind.config.js needed)
- **Lucide React** — icon library
- **CVA + clsx + tailwind-merge** — styling utilities
- **Recharts** — data visualization (ready for Ledger charts, Garage graphs)
- **React Hook Form + Zod** — form validation framework
- **Sharp** — image processing (ready for receipt uploads)

## Design System
- **Quiet Terminal Brutalism** — dark #080808, mono+serif fonts
- Purple = Scout only, Yellow = text mode
- Mobile-first, card-based layout
- CSS variables for theming (not Tailwind utilities — existing CSS is custom)

## Key Files
- `src/app/globals.css` — imports all stylesheets
- `src/app/styles/` — per-component CSS files
- `src/types.css.d.ts` — CSS module type definitions (added by Echo)

## Status
- Auth removed — click-to-enter
- DB schema complete (20+ tables)
- API routes complete for all entities
- Client store complete (cache + pub/sub)
- Workspaces use HARDCODED data — need wiring to API (Phase 2-6 of build spec)

## Build Commands
```bash
cd /opt/data/SideQuestHQ
rm -rf .next && npx next build    # clean build
npx next start -p 3000 -H 0.0.0.0  # start server
```
