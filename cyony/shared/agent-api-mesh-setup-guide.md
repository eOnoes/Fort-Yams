# Agent API Mesh — Step-by-Step Setup Guide

## What This Builds

A network where every AI agent can send tasks to every other AI agent via API — no more manual copy-paste between ChatGPT, Claude, Codex, Echo, and Cyony.

```
ChatGPT ──API──┐
Claude  ──API──┤
Codex   ──API──┼──→  Your Phone (dashboard)
Echo    ──API──┤
Cyony   ──API──┘
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  VPS (2.24.118.123)              │
│                                                  │
│  ┌──────────┐    ┌──────────────────────────┐   │
│  │  Cyony   │◄──►│  Hermes Gateway :8644     │   │
│  │ (Hermes) │    │  - Webhook endpoints       │   │
│  └──────────┘    │  - Agent dispatch          │   │
│                  │  - Telegram bridge          │   │
│  ┌──────────┐    │  - File inbox watcher       │   │
│  │ Tripp    │    └──────────┬─────────────────┘   │
│  │(OpenClaw)│               │                      │
│  └──────────┘               │                      │
└─────────────────────────────┼──────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────▼────┐   ┌─────▼──────┐  ┌─────▼──────┐
         │  Echo    │   │   Codex    │  │ ChatGPT/   │
         │ (Hermes) │   │ (OpenAI)   │  │ Claude API │
         │ Win PC   │   │  Win PC    │  │ (Cloud)    │
         └──────────┘   └────────────┘  └────────────┘
```

---

## Phase 1: VPS Gateway (Tonight — No Home PC Needed)

### Step 1.1: Verify webhook platform is enabled on Hermes

```bash
hermes webhook list
```

If it says "not enabled", run:

```bash
hermes gateway setup
# Follow prompts → enable webhooks → set port 8644 → generate a secret
```

Or manually add to `~/.hermes/config.yaml`:

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      host: "0.0.0.0"
      port: 8644
      secret: "generate-a-strong-random-string-here"
```

### Step 1.2: Restart the gateway

```bash
hermes gateway run
```

### Step 1.3: Verify it's alive

```bash
curl http://localhost:8644/health
# Should return: {"status": "ok"}
```

### Step 1.4: Create a webhook subscription for Cyony

This endpoint lets any external agent POST a task to me:

```bash
hermes webhook subscribe cyony-inbox \
  --prompt "New task from {from_agent}: {task}\n\nContext: {context}" \
  --description "Inbound tasks from other agents" \
  --deliver telegram \
  --deliver-chat-id "8808479511"
```

**Result:** Any agent can now `POST` to `http://2.24.118.123:8644/webhook/cyony-inbox` with a JSON body like:

```json
{
  "from_agent": "eddie-via-chatgpt",
  "task": "Review the Phase 8H report and suggest next steps",
  "context": "Tripp.Reason is paused. Home PC is back."
}
```

I'll receive it as a prompt and respond on Telegram.

### Step 1.5: Create a dedicated webhook for Chat-compatible format

ChatGPT/Claude APIs have specific message formats. Create a handler:

```bash
hermes webhook subscribe chat-relay \
  --prompt "Message relayed from {source}:\n\n{message}\n\nRespond as Cyony (builder agent in the Tripp.Reason crew). Keep it concise." \
  --description "Relay messages from ChatGPT/Claude to Cyony" \
  --deliver telegram
```

---

## Phase 2: Connecting ChatGPT & Claude (Needs API Keys)

### Step 2.1: Get API keys

**ChatGPT (OpenAI API):**
1. Go to https://platform.openai.com/api-keys
2. Create a new key → copy it
3. Add credit (API is pay-per-use, separate from ChatGPT Plus)

**Claude (Anthropic API):**
1. Go to https://console.anthropic.com/
2. Generate API key → copy it
3. Add credit

### Step 2.2: Create a coordination script on the VPS

A Python script that:
- Polls your instructions (from Telegram or a file)
- Routes to the right AI
- Posts results back

Example: `/opt/data/scripts/agent-router.py`

```python
#!/usr/bin/env python3
"""
Agent Router — relays tasks between you, ChatGPT, Claude, and Cyony.
Your phone sends a message → router decides who handles it → results come back.
"""
import os, json, requests

# Config
OPENAI_KEY = os.environ["OPENAI_API_KEY"]
ANTHROPIC_KEY = os.environ["ANTHROPIC_API_KEY"]
CYONY_WEBHOOK = "http://2.24.118.123:8644/webhook/cyony-inbox"
CYONY_SECRET = os.environ["WEBHOOK_SECRET"]

def ask_chatgpt(prompt):
    """Send to OpenAI API, get response."""
    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_KEY}"},
        json={
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}]
        }
    )
    return resp.json()["choices"][0]["message"]["content"]

def ask_claude(prompt):
    """Send to Anthropic API, get response."""
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01"
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}]
        }
    )
    return resp.json()["content"][0]["text"]

def send_to_cyony(task, context=""):
    """POST a task to Cyony's webhook."""
    import hmac, hashlib
    body = json.dumps({"from_agent": "agent-router", "task": task, "context": context})
    signature = hmac.new(CYONY_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    requests.post(
        CYONY_WEBHOOK,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": f"sha256={signature}"
        }
    )

# This would be run as a cron job or triggered by Telegram → Hermes
```

### Step 2.3: Create routing rules

A JSON config file at `/opt/data/shared/agent-routing.json`:

```json
{
  "routes": {
    "planning": "chatgpt",
    "code_review": "claude",
    "build_execute": "cyony",
    "system_design": "chatgpt",
    "debug_root_cause": "claude",
    "control_cockpit": "codex",
    "warden_audit": "echo"
  },
  "default": "cyony"
}
```

---

## Phase 3: Home PC Agents (Echo + Codex)

### Step 3.1: Echo webhook endpoint

On the home PC (once recovered):

```bash
# Echo runs Hermes too — set up a webhook
hermes webhook subscribe echo-inbox \
  --prompt "Task from {from_agent}: {task}" \
  --deliver telegram
```

But Echo is on a local network, not publicly reachable. **Solutions:**

**Option A — SSH tunnel from VPS to home PC:**
```bash
# On home PC (outbound to VPS):
ssh -R 8645:localhost:8644 hermes@2.24.118.123
# Now VPS can reach Echo at localhost:8645
```

**Option B — Cloudflare Tunnel (preferred if home IP changes):**
```bash
# On home PC:
cloudflared tunnel create echo-tunnel
cloudflared tunnel route dns echo-tunnel echo.yourdomain.com
cloudflared tunnel run --url http://localhost:8644 echo-tunnel
# Now VPS hits https://echo.yourdomain.com/webhook/echo-inbox
```

**Option C — Polling (simplest, no inbound needed):**
Echo runs a cron that checks `shared/inbox/for-echo-*.md` on a synced folder. Same file-based IPC we already have for Tripp/Cyony/Echo.

### Step 3.2: Codex recovery first

Codex needs to be stable before wiring into the mesh. Once the home PC is back:

1. Audit Tripp.Control Stage 9D status
2. Commit or revert any half-written drift
3. Set up Codex's own webhook (it runs as an OpenAI-compatible endpoint)

### Step 3.3: Home PC watchdog

A simple systemd timer that pings `http://2.24.118.123:8644/webhook/home-pc-heartbeat` every 60 seconds. If the VPS doesn't hear from it for 5 minutes, I alert you on Telegram.

---

## Phase 4: Mobile Dashboard (Future)

### Step 4.1: Status endpoint

The VPS gateway serves a dashboard at `http://2.24.118.123:8644/dashboard`:

```json
{
  "agents": {
    "cyony": {"status": "online", "current_task": "idle"},
    "echo": {"status": "offline", "last_seen": "2026-06-04T18:30:00Z"},
    "codex": {"status": "unknown", "last_seen": null},
    "chatgpt": {"status": "api_available"},
    "claude": {"status": "api_available"}
  },
  "inbox": {"pending": 0, "processing": 0},
  "last_action": "Phase 8H completed"
}
```

### Step 4.2: Simple mobile web app

A single HTML page that polls `/dashboard` every 5 seconds. Shows:
- Green/yellow/red dots per agent
- "Send task to ____" buttons
- Recent activity log

Hosted as a static file from the VPS. You bookmark it on your phone. No app store needed.

---

## Quick Start — What We Can Do Tonight

1. ✅ **Enable webhook gateway** on this VPS (10 min)
2. ✅ **Create cyony-inbox webhook** — external agents can POST tasks to me (5 min)
3. ✅ **Create chat-relay webhook** — ChatGPT-style formatted messages (5 min)
4. ⬜ **Get API keys** for OpenAI + Anthropic (you, 15 min)
5. ⬜ **Create router script** on VPS (me, 20 min)
6. ⬜ **Test: ChatGPT API → router → Cyony webhook → response to Telegram**

Estimated: 1 hour total if you have API keys ready.

---

## What Each Agent Can Do (Capability Matrix)

| Agent      | Strengths                      | API Access         | Status        |
|------------|--------------------------------|--------------------|---------------|
| **ChatGPT**| Planning, strategy, research   | OpenAI API ($)     | Ready once keyed |
| **Claude** | Code review, debugging, docs   | Anthropic API ($)  | Ready once keyed |
| **Cyony**  | Build, experiment, test        | Hermes webhook     | ✅ Online     |
| **Codex**  | PRs, git, feature branches     | OpenAI-compat API  | ⚠️ Home PC    |
| **Echo**   | Warden, audit, trace, relay    | Hermes webhook     | ⚠️ Home PC    |
| **Tripp**  | Delegate, vet, supervise       | OpenClaw gateway   | ✅ Online     |

---

## Cost Estimate

| Service       | Approx Cost          | Notes                          |
|---------------|---------------------|---------------------------------|
| OpenAI API    | ~$0.01–0.05/request | GPT-4o, pay-per-token          |
| Anthropic API | ~$0.01–0.05/request | Claude Sonnet, pay-per-token   |
| VPS webhook   | $0                  | Already running                |
| Telegram      | $0                  | Already connected              |
| Cloudflare    | $0                  | Free tier, for Echo tunnel     |

At typical usage (~50 requests/day across all agents): ~$1–3/month in API costs.

---

## Security Notes

- **Never commit API keys.** Use environment variables or `.env` files.
- **Webhook HMAC** — every webhook POST requires a valid HMAC-SHA256 signature.
- **Firewall** — only port 8644 needs to be open to the internet (already handled by your VPS config).
- **Echo tunnel** — use SSH or Cloudflare, never expose Echo directly to the internet.
