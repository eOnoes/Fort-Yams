# Docker ↔ Host HTTP Connectivity for Crew Comms

**Session:** 2026-06-02 — Cyony needed to reach Echo's SSH tunnel through Tripp's host.

## The Problem

SSH tunnels and localhost-bound services are unreachable from inside a Docker container, even if they're running on the same machine. This is one of the most common crew networking blockers.

```
┌──────────────────── Host (VPS) ────────────────────┐
│  SSH tunnel bound to 127.0.0.1:18790               │
│  (Tripp on host can reach it, Cyony in Docker can't) │
└─────────────────────────────────────────────────────┘
         ▲                        ▲
     localhost                host-gateway
         │                        │
    ┌────┴────┐            ┌──────┴──────┐
    │ Tripp   │            │ Cyony       │
    │ (host)  │            │ (Docker,    │
    │         │            │ isolated)   │
    └─────────┘            └─────────────┘
```

## The Fix (2-step)

### Step 1: Tunnel host widens bind address

On the tunnel source side (e.g., Echo's Windows PC), change:

```bash
# OLD: localhost only (host processes can reach)
ssh -L localhost:18790:localhost:18790 root@<vps-ip> -N

# NEW: all interfaces (Docker containers too)
ssh -L 0.0.0.0:18790:localhost:18790 -o GatewayPorts=yes root@<vps-ip> -N
```

Or with short form: `ssh -L '*:18790:localhost:18790' root@<vps-ip> -N`

**Security note:** Binding `0.0.0.0` exposes the port to all network interfaces. Mitigate with:
- VPS firewall (ufw/iptables blocking external `:18790`)
- API auth on the tunnel service (keys/secrets)
- Or bind to `172.17.0.1:18790` (Docker bridge IP) instead of `0.0.0.0`

### Step 2: Docker container gets host route

In `docker-compose.yml`:

```yaml
services:
  docker-agent:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Or via `docker run`:
```bash
docker run --add-host host.docker.internal:host-gateway ...
```

After restart, container can reach tunnel at `http://host.docker.internal:18790`.

## Verification

```bash
# Inside Docker container
curl -s http://host.docker.internal:18790/health
# Expected: {"ok":true,"status":"live"}

# If this fails, check:
# 1. Tunnel is actually running: ps aux | grep ssh on tunnel source
# 2. Tunnel bound to 0.0.0.0: ss -tlnp | grep 18790 on VPS
# 3. Docker extra_hosts present: cat /etc/hosts | grep host.docker
# 4. Firewall not blocking: ufw status | grep 18790
```

## Limitations

Even with this pattern, **Docker containers cannot call the warden's backend API** (which typically binds localhost:18789). The warden's OpenClaw gateway and any API it exposes stay localhost-only for security. Use file-based IPC for warden-facing comms; use tunnels/HTTP for relay-facing comms.

## Crew Pattern

| Comm Type | Who ↔ Who | Method |
|-----------|----------|--------|
| Warden ↔ Builder | File drops + 15s pulse | Shared volume |
| Builder ↔ Relay | HTTP tunnel (if configured) | host.docker.internal:PORT |
| Warden ↔ Relay | SSH tunnel (same host) | localhost:PORT |
| All ↔ Human | Telegram | Hermes send_message |
