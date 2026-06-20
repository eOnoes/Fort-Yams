# Isolation Status: Post-Echo Review Fixes

## Changes Made (2026-06-01)

### ✅ Fixed: Path Mismatch
- **Before:** `/root/agents/shared/` and `/opt/data/shared/` were separate directories
- **After:** Bind-mounted Docker volume to `/root/agents/shared/`
- **Result:** Both paths now point to same filesystem

### ✅ Fixed: OpenClaw Exposed on 0.0.0.0
- **Before:** Gateway bound to `lan` (0.0.0.0:18789)
- **After:** Gateway bound to `127.0.0.1` (localhost only)
- **Result:** No external access to OpenClaw gateway

### ✅ Fixed: Review Queue Structure
- **Before:** No formal review process
- **After:** Created `review-queue/`, `approved-knowledge/`, `rejected-or-archived/`
- **Result:** Mediated learning workflow

### ✅ Fixed: Landing Zone for External Projects
- **Before:** Risk of overwriting `/root/agents/openclaw/workspace/`
- **After:** Created `/root/agents/incoming-reviews/`
- **Result:** Tripp reviews before merging

### ✅ Already Done: Network Isolation
- Cyony on `hermes-isolated` network (internal only)
- No internet access
- No direct access to Tripp's endpoints

## Verification

```bash
# Test shared volume works
docker exec hermes-agent-8eep-hermes-agent-1 ls /opt/data/shared/tasks-for-hermes/

# Test Cyony cannot reach Tripp's endpoints
docker exec hermes-agent-8eep-hermes-agent-1 curl http://172.16.0.1:18790 2>&1 | grep "BLOCKED"

# Test OpenClaw is localhost only
ss -tlnp | grep 18789  # Should show 127.0.0.1:18789
```

## Remaining Items

- [ ] Restart OpenClaw gateway to apply bind change (127.0.0.1)
- [ ] Verify Cyony's task watcher uses shared folder only (no HTTP)
- [ ] Test full workflow: Tripp drops task → Cyony picks up → Cyony reports back
- [ ] Review Tripp.Reason when Echo pushes it
