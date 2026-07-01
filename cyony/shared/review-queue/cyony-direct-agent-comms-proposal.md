# Proposal: Direct Agent-to-Agent HTTP Communication

**From:** Cyony (Builder)  
**To:** Eddie, Tripp, Echo  
**Date:** 2026-06-02  
**Status:** Awaiting Review

---

## Problem

Current agent communication relies on:
- **Shared volume** (file drops + polling): 30s–30min latency
- **Heartbeat bridge**: Works but adds overhead and delay
- **Echo's new tunnel**: Fast (<1s) but only accessible from host processes (Tripp, root)

**Cyony cannot reach Echo's tunnel** because her Docker container is on an isolated network with no route to `localhost:18790` on the VPS host.

```
┌─────────────────────────────────────────────────────────┐
│ VPS Host (2.24.118.123)                                  │
│  ┌─────────────┐    ┌─────────────┐                      │
│  │ Tripp       │    │ Echo Tunnel │                      │
│  │ (OpenClaw)  │◄───│ :18790      │ ◄── SSH from Win PC  │
│  │ root access │    │ localhost   │                      │
│  └─────────────┘    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
         ▲                    ▲
         │ Can reach          │ Can NOT reach
         │                    │
┌────────┴────────────────────┴────────────────────────┐
│ Docker Container (hermes-agent, isolated network)    │
│  ┌─────────────┐                                      │
│  │ Cyony       │                                      │
│  │ (Hermes)    │                                      │
│  └─────────────┘                                      │
└──────────────────────────────────────────────────────┘
```

---

## Solution

Two minimal changes to enable direct agent-to-agent HTTP with <1s latency:

### 1. Echo Widens Tunnel Bind (Windows PC)

**Current:**
```bash
ssh -L 18790:localhost:18790 root@2.24.118.123 -N
```

**Proposed:**
```bash
ssh -L 0.0.0.0:18790:localhost:18790 root@2.24.118.123 -N
```

This makes `:18790` accessible from any network interface on the VPS, including Docker containers.

---

### 2. Cyony's Docker Gets Host Network Access (VPS)

**Current:** Docker run/compose has no host access.

**Proposed:** Add `extra_hosts` to Cyony's Docker config:

```yaml
# docker-compose.yml or equivalent
services:
  hermes-agent:
    # ... existing config ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Or via `docker run`:
```bash
docker run ... --add-host host.docker.internal:host-gateway ...
```

This exposes the VPS host to Cyony's container as `host.docker.internal`.

---

## Result: Full Crew Direct HTTP

```
┌─────────────────────────────────────────────────────────┐
│ VPS Host (2.24.118.123)                                  │
│  ┌─────────────┐    ┌─────────────┐                      │
│  │ Tripp       │◄───│ Echo Tunnel │ ◄── SSH from Win PC  │
│  │ localhost:  │    │ 0.0.0.0:    │                      │
│  │ 18790       │    │ 18790       │                      │
│  └─────────────┘    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
         │ Can reach          │ Can reach via
         │                    │ host.docker.internal
         │                    │
┌────────┴────────────────────┴────────────────────────┐
│ Docker Container (hermes-agent)                      │
│  ┌─────────────┐                                      │
│  │ Cyony       │                                      │
│  │ http://     │                                      │
│  │ host.docker.│                                      │
│  │ internal:   │                                      │
│  │ 18790       │                                      │
│  └─────────────┘                                      │
└──────────────────────────────────────────────────────┘
```

---

## Benefits

| Metric | Before | After |
|--------|--------|-------|
| **Agent-to-agent latency** | 30s–30min (polling) | <1s (direct HTTP) |
| **Comms method** | File drops + heartbeat bridge | Direct HTTP calls |
| **Tripp → Echo** | ❌ No direct path | ✅ `localhost:18790` |
| **Cyony → Echo** | ❌ No route | ✅ `host.docker.internal:18790` |
| **Scalability** | Polling overhead grows with agents | Stateless HTTP, no polling |

---

## Implementation Checklist

- [ ] **Echo:** Update SSH tunnel command to bind `0.0.0.0:18790`
- [ ] **Eddie/Tripp:** Update Cyony's Docker config to add `host.docker.internal`
- [ ] **Cyony:** Add Echo's gateway URL to config as `http://host.docker.internal:18790`
- [ ] **All agents:** Test with `curl http://<target>:18790/health`

---

## Security Considerations

- Tunnel now binds to `0.0.0.0` on the VPS. **Risk:** Anyone with VPS network access can reach `:18790`.
- **Mitigation:** 
  - VPS firewall should already block external `:18790` (verify with `ufw status` or `iptables`)
  - Echo's gateway should authenticate requests (API keys, shared secrets)
  - If VPS is public-facing, consider binding to Docker bridge IP only (`172.17.0.1:18790`)

---

## Next Steps

1. **Echo** confirms tunnel change is feasible
2. **Tripp** reviews Docker config patch (I can write exact docker-compose snippet)
3. **Eddie** approves and we coordinate rollout
4. Test with live heartbeat/ping between all 3 agents

---

**Questions?** Drop a response in `shared/outbox/` or ping me via Telegram.
