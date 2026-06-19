# Reasonix Architecture Reference

Cloned from https://github.com/esengine/deepseek-reasonix (v1.0 = Go rewrite, v0.x was TypeScript).
DeepSeek-native AI coding agent, single Go binary, tuned around DeepSeek's prefix cache.

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Backend | Go | CGO_ENABLED=0, single static binary |
| Desktop wrapper | Wails (not Electron) | ~10MB bundled, native OS integration |
| Frontend | React 18 + Vite + TypeScript | No Next.js |
| Styling | System CSS variables | No Tailwind; prefers-color-scheme |
| Markdown | react-markdown + rehype-katex + remark-math | For chat transcripts |
| Syntax | highlight.js | Code highlighting in chat |
| Icons | lucide-react | Icon set |
| Install | `make build` → `bin/reasonix`, `make cross` → dist/ (darwin|linux|windows × amd64|arm64) |

## Component Map (Frontend)

| Component | Purpose | Mech Layer |
|---|---|---|
| `App.tsx` (764 lines) | Top-level layout, sidebar/workspace/chat panes, resizable | — |
| `StatusBar.tsx` | Status line: model switcher, context %, cache-hit %, elapsed, tokens, jobs popover | Activity Stream |
| `Transcript.tsx` | Chat history rendering | — |
| `Composer.tsx` | Input box with / and @ autocomplete | Command Palette |
| `WorkspacePanel.tsx` | Right-side code editor (file view, diff) | Live Workbench |
| `ApprovalModal.tsx` | Plan/YOLO/Normal mode gating | Decision Console |
| `MemoryPanel.tsx` | Session memory view | Memory Spine |
| `HistoryPanel.tsx` | Session switcher | Memory Spine |
| `CapabilitiesPanel.tsx` | Tools/providers registry | — |
| `TodoPanel.tsx` | Live task list above composer | — |
| `AskCard.tsx` | "Ask the user" UI for agent questions | — |
| `ToolCard.tsx` | Tool call rendering | — |
| `editors/HljsCode.tsx` | Code rendering for highlights | — |
| `editors/HljsDiff.tsx` | Diff rendering | — |

## Layout Constants (App.tsx)

```typescript
const SIDEBAR_COLLAPSED_WIDTH = 68;   // Icon rail when collapsed
const SIDEBAR_DEFAULT_WIDTH = 264;    // Normal sidebar
const SIDEBAR_MIN_WIDTH = 228;
const SIDEBAR_MAX_WIDTH = 420;
const CHAT_MIN_WIDTH = 420;
const WORKSPACE_PANEL_DEFAULT_WIDTH = 760;
const WORKSPACE_PANEL_MIN_WIDTH = 420;
const WORKSPACE_PANEL_MAX_WIDTH = 980;
const WORKSPACE_PANEL_MAX_RATIO = 0.68;
```

## CSS Color Palette (dark mode)

```css
:root {
  --bg: #090a0c;
  --bg-soft: #111319;
  --bg-elev: #191b22;
  --bg-elev-2: #222631;
  --sidebar-bg: #0c0e12;
  --sidebar-hover: #181c24;
  --sidebar-active: rgba(217, 119, 87, 0.13);
  --border: #343945;
  --border-soft: #252a34;
  --fg: #f4f5f7;
  --fg-dim: #c0c4cc;
  --fg-faint: #858b96;
  --accent: #d97757;  /* warm clay */
  --accent-fg: #1a0f0a;
  --accent-soft: rgba(217, 119, 87, 0.14);
  --ok: #74b87a;
  --warn: #d9a441;
  --err: #e0696a;
  --add-bg: rgba(116, 184, 122, 0.12);
  --add-fg: #82c98a;
  --del-bg: rgba(224, 105, 106, 0.12);
  --del-fg: #e58587;
  --hl-keyword: #c678dd;
  --hl-string: #98c379;
  --hl-number: #d19a66;
  --hl-comment: #6a6a72;
  --hl-func: #61afef;
  --hl-type: #e5c07b;
  --hl-builtin: #56b6c2;
  --hl-meta: #7f848e;
  --radius: 9px;
  --maxw: 820px;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans",
    "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
}
```

## CSS Grid Layout

```css
.layout {
  --sidebar-width: var(--sidebar-expanded-width, 264px);
  --workspace-width: 760px;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  height: 100%;
}
.layout--workspace-open {
  grid-template-columns: var(--sidebar-width) minmax(420px, 1fr) var(--workspace-width);
}
.layout--workspace-maximized {
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
}
.layout--workspace-maximized .chat-pane { display: none; }
```

## Backend Configuration (reasonix.toml)

```toml
default_model = "deepseek-flash"

[agent]
planner_model = "mimo-pro"  # optional low-frequency planner
subagent_model = "deepseek-pro"  # default for runAs=subagent skills
subagent_models = { review = "deepseek-pro", security_review = "deepseek-pro" }
auto_plan = "ask"   # off|ask|on; complex tasks start in plan mode

[[providers]]
name        = "deepseek-flash"
kind        = "openai"
base_url    = "https://api.deepseek.com"
model       = "deepseek-v4-flash"
api_key_env = "DEEPSEEK_API_KEY"

[tools]
enabled = []  # empty = all built-ins

[permissions]
mode  = "ask"
deny  = ["bash(rm -rf*)", "bash(git push*)"]
allow = ["bash(go test*)"]

[sandbox]
workspace_root = ""
allow_write    = ["/tmp"]

[[plugins]]
name    = "example"
command = "reasonix-plugin-example"
```

## Backend Architecture (Go)

Three-tier extensibility:
1. **Registry** — `Provider` and `Tool` are interfaces; core has no `switch model`
2. **Compile-time built-ins** — self-register via `init()`; adding one = one file + one import
3. **Runtime plugins** — executables declared in config, newline-delimited JSON-RPC 2.0 on stdin/stdout (MCP stdio convention)

## Key Slash Commands

`/compact` `/new` `/rewind` `/tree` `/branch` `/switch` `/todo` `/model` `/mcp` `/memory` `/help`

Session branching: `/branch [name]` forks tip, `/branch <turn> [name]` forks from earlier checkpoint, `/switch <id|name>` loads another branch.

Custom commands: Markdown files under `.reasonix/commands/` (project) or `~/.config/reasonix/commands/` (user). `review.md` becomes `/review`.

## @ References

`@path/to/file` injects local file. `@<server>:<uri>` injects MCP resource. Only treated as reference if path actually exists. Autocomplete opens on `/` or `@`.

## Two-Model Collaboration

`[agent]` config can have `planner_model` for low-frequency planning in a separate cache-stable session. `subagent_model` / `subagent_models` for delegated sub-agents.

## Re-skining Recipe

1. Fork the repo
2. Swap `--accent` from `#d97757` (clay) to brand color
3. Replace `docs/logo.svg` and sidebar logo asset
4. Add new panels as React components alongside existing tree (e.g., `CrewRoster.tsx`, `ForgePanel.tsx`, `TaskTimeline.tsx`)
5. Wire to crew backend via MCP plugin (`[[plugins]]` block in config)
6. Keep Go backend as-is unless extending tooling
7. Build: `make build` produces single binary

## What to Extend For a Crew Mech

- **CrewRosterPanel** — agent presence (🟢/🟡/🔴 from heartbeat files)
- **ForgePanel** — searchable pattern catalog with [Inject] buttons
- **TaskTimeline** — horizontal viz of classify → route → attempt → validate
- **DecisionConsole** — richer context modal for approvals (model used, cost, similar Forge entries)
- **AuditQueue** — pre-triaged audit list (auto-pass vs manual review)
- **SensorArray** — anomaly-first status feed (loop-detected, queue-depth, etc.)

## Deployment

- `npm i -g reasonix` delivers Go binary via npm
- Cross-build: `make cross` → `dist/` with darwin + linux + windows × amd64 + arm64
- Wails desktop: `desktop/` dir drives same Go kernel with native window
- Binary is fully self-contained (no runtime deps)
