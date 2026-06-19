# Docker-to-Host Networking Fix Template

**Problem:** Agent in Docker can't reach sibling agent's port on host.

**Root cause:** Docker containers have their own network namespace. `localhost` inside a container means the container, not the host. SSH tunnels bind to `localhost` by default, making them unreachable from containers.

## Fix (Echo/Tunnel side)

```bash
# BEFORE: localhost only — host processes CAN reach it, Docker CANNOT
ssh -L 18790:localhost:18790 root@2.24.118.123 -N

# AFTER: all interfaces — Docker CAN reach it (but so can external traffic)
ssh -L 0.0.0.0:18790:localhost:18790 root@2.24.118.123 -N
```

**Security:** Add firewall rule:
```bash
ufw deny from 0.0.0.0/0 to any port 18790
ufw allow from 172.17.0.0/16 to any port 18790  # Docker bridge only
```

Or bind to Docker bridge IP (safer, no firewall needed):
```bash
ssh -L 172.17.0.1:18790:localhost:18790 root@2.24.118.123 -N
```

## Fix (Docker/cyony side)

Add to docker-compose.yml:
```yaml
services:
  hermes-agent:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Or docker run:
```bash
docker run --add-host host.docker.internal:host-gateway ...
```

## Verification

After both fixes:
```bash
# From inside Docker container:
curl -s http://host.docker.internal:18790/health
# Expected: {"ok":true} or similar
```

## Before/After

| Metric | Before (file-based) | After (direct HTTP) |
|--------|---------------------|---------------------|
| Latency | 30s–30min | <1s |
| Method | Drop file → watcher polls → pickup | Direct curl/post |
| Scalability | Polling overhead | Stateless |
| Complexity | 2 config changes | — |
