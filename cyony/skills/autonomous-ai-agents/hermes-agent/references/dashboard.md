# Web Dashboard

The web dashboard is a browser-based UI for managing your Hermes Agent installation. Instead of editing YAML files or running CLI commands, you can configure settings, manage API keys, and monitor sessions from a clean web interface.

## Quick Start
```bash
hermes dashboard
```

This starts a local web server and opens http://127.0.0.1:9119 in your browser. The dashboard runs entirely on your machine — no data leaves localhost.

## Options
| Flag | Default | Description |
|------|---------|-------------|
| `--port` | 9119 | Port to run the web server on |
| `--host` | 127.0.0.1 | Bind address |
| `--no-open` | — | Don't auto-open the browser |
| `--insecure` | off | Allow binding to non-localhost hosts (DANGEROUS — exposes API keys on the network; pair with a firewall and strong auth) |
| `--tui` | off | Expose the in-browser Chat tab (embedded hermes --tui via PTY/WebSocket). Alternatively set HERMES_DASHBOARD_TUI=1. |

### Examples
```bash
# Custom port
hermes dashboard --port 8080

# Bind to all interfaces (use with caution on shared networks)
hermes dashboard --host 0.0.0.0

# Start without opening browser
hermes dashboard --no-open

# Enable the in-browser Chat tab
hermes dashboard --tui
```

## Prerequisites
The default hermes-agent install does not ship the HTTP stack or PTY helper — those are optional extras. The web dashboard needs FastAPI and Uvicorn (web extra). The Chat tab also needs ptyprocess to spawn the embedded TUI behind a pseudo-terminal (pty extra on POSIX). Install both with:

```bash
pip install 'hermes-agent[web,pty]'
```

The web extra pulls in FastAPI/Uvicorn; pty pulls in ptyprocess (POSIX) or pywinpty (native Windows — note that the embedded TUI itself still requires WSL). pip install hermes-agent[all] includes both extras and is the easiest path if you also want messaging/voice/etc.

When you run hermes dashboard without the dependencies, it will tell you what to install. If the frontend hasn't been built yet and npm is available, it builds automatically on first launch.

## Pages

### Status
The landing page shows a live overview of your installation:
- Agent version and release date
- Gateway status — running/stopped, PID, connected platforms and their state
- Active sessions — count of sessions active in the last 5 minutes
- Recent sessions — list of the 20 most recent sessions with model, message count, token usage, and a preview of the conversation
- The status page auto-refreshes every 5 seconds.

### Chat
The Chat tab embeds the full Hermes TUI (the same interface you get from hermes --tui) directly in the browser. Everything you can do in the terminal TUI — slash commands, model picker, tool-call cards, markdown streaming, clarify/sudo/approval prompts, skin theming — works identically here, because the dashboard is running the real TUI binary and rendering its ANSI output through xterm.js with its WebGL renderer for pixel-perfect cell layout.

#### How it works:
- `/api/pty` opens a WebSocket authenticated with the dashboard's session token
- The server spawns hermes --tui behind a POSIX pseudo-terminal
- Keystrokes travel to the PTY; ANSI output streams back to the browser
- xterm.js's WebGL renderer paints each cell to an integer-pixel grid; mouse tracking (SGR 1006), wide characters (Unicode 11), and box-drawing glyphs all render natively
- Resizing the browser window resizes the TUI via the @xterm/addon-fit addon
- Resume an existing session: from the Sessions tab, click the play icon (▶) next to any session. That jumps to /chat?resume=<id> and launches the TUI with --resume, loading the full history.

#### Prerequisites:
- Node.js (same requirement as hermes --tui; the TUI bundle is built on first launch)
- ptyprocess — installed by the pty extra (pip install 'hermes-agent[web,pty]', or [all] covers both)
- POSIX kernel (Linux, macOS, or WSL2). The /chat terminal pane specifically needs a POSIX PTY — native Windows Python has no equivalent, so on a native Windows install the rest of the dashboard (sessions, jobs, metrics, config editor) works but the /chat tab will show a banner telling you to use WSL2 for that feature.
- Close the browser tab and the PTY is reaped cleanly on the server. Re-opening spawns a fresh session.

### Config
A form-based editor for config.yaml. All 150+ configuration fields are auto-discovered from DEFAULT_CONFIG and organized into tabbed categories:
- model — default model, provider, base URL, reasoning settings
- terminal — backend (local/docker/ssh/modal), timeout, shell preferences
- display — skin, tool progress, resume display, spinner settings
- agent — max iterations, gateway timeout, service tier
- delegation — subagent limits, reasoning effort
- memory — provider selection, context injection settings
- approvals — dangerous command approval mode (ask/yolo/deny)
- And more — every section of config.yaml has corresponding form fields