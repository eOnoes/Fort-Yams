# Stuck Agent Diagnostic & Interrupt Protocol

**When to use:** A sibling agent seems unresponsive — not picking up inbox files, not responding to Telegram, heartbeat stale.

## Step 1: Confirm It's Stuck (Not Just Busy)

Checks in order (all from shared volume):

```bash
# Heartbeat — is it stale?
cat shared/heartbeat/agents/{agent}.json
# If timestamp > 10 min ago: likely stuck

# Queue state — tasks piling up?
ls -la shared/queues/{agent}/pending/
ls -la shared/queues/{agent}/processing/
# If pending has many files + processing is empty: agent died
# If processing has files sitting for >30 min: agent is hung

# Watcher logs — is anything moving?
tail -20 shared/queues/watcher.log 2>/dev/null
tail -20 shared/queues/reply-watcher.log 2>/dev/null
```

## Step 2: Drop an Interrupt File

If the agent's watcher is still running, it may pick up a high-priority file:

```markdown
# STOP ALL TASKS — INTERRUPT

FROM: cyony
PRIORITY: CRITICAL
TIMESTAMP: 2026-06-02T04:15:00Z

You appear to be stuck in a loop. Stop all current work immediately.

Check your processing/ folder for stale tasks and clear them.

Contact the human (Eddie) via Telegram to confirm status.
```

Drop in: `shared/queues/{agent}/pending/URGENT-interrupt.md`
Also copy to: `shared/inbox/for-{agent}-interrupt.md`

## Step 3: Try Direct HTTP (if available)

OpenClaw on host — API endpoints are typically localhost-only:
```bash
# Web UI is public, but backend API is NOT accessible externally
curl http://2.24.118.123:18789/          # Serves HTML — web UI only
curl http://2.24.118.123:18789/api/v1/*  # Returns "Not Found" — not exposed
```

OpenClaw does NOT expose a "stop task" or "interrupt" API on the public interface. You CANNOT reach the backend from a Docker container. The only way to interrupt is via the host (SSH or the human).

## Step 4: Escalate to Human

If Steps 1-3 fail, the human must SSH in:
```bash
ssh root@VPS_IP

# Find the stuck process
ps aux | grep -i {agent_name} | grep -v grep

# Kill hard
pkill -9 -f {agent_name}
# or: kill -9 <PID>

# Restart
systemctl restart {service}
# or: cd /path/to/agent && nohup bash start.sh &
```

## What NOT to Do

- **Don't keep dropping files** — if the watcher is dead, more files just make cleanup harder
- **Don't alert the human immediately** — run Steps 1-3 first, confirm it's truly stuck
- **Don't try to restart the agent yourself** — if you're in Docker, you can't. If you have host access but it's another agent's process, don't touch it without coordination
- **OpenClaw specifically:** its web UI (port 18789) is served publicly as a static HTML/JS app, but the backend API it talks to is localhost-only. Do NOT assume you can POST to it from another host or container.
