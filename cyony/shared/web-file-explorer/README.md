# 🔺 Cloud File Explorer

A simple, read-only web file browser for our VPS. Browse Tripp's and Cyony's workspaces from anywhere.

## Quick Start

```bash
cd /root/agents/shared/web-file-explorer
./start.sh
```

Then open: **http://2.24.118.123:8080**

## What's Inside

- **tripp** — Tripp's workspace (`/root/agents/openclaw/workspace/`)
- **cyony** — Cyony's workspace (`/root/agents/cyony/workspace/`)
- **shared** — Shared directories (`/root/agents/shared/`)

## Features

- Browse directories (click folders)
- View text files (code, markdown, logs, etc.)
- View images inline
- Download any file
- Dark theme (easy on the eyes)
- Mobile-friendly

## Security

- Read-only — no write/delete
- Restricted to `/root/agents/` only
- Hidden files (starting with `.`) are hidden

## Running in Background

```bash
# Using nohup
nohup python3 app.py > /tmp/file-explorer.log 2>&1 &

# Using screen
screen -S files -d -m python3 app.py
```

## Stopping

```bash
pkill -f "python3 app.py"
```
