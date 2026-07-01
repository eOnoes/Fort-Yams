# Task: Agent Heartbeat Integration

## Context
Tripp built a simple heartbeat monitor at `/root/agents/shared/memory/heartbeat/heartbeat.py`.
It runs on port 18790 and accepts POST /heartbeat with agent status.

## Your Tasks

1. **Integrate Hermes/Cyony heartbeat**
   - From your container, POST to `http://host.docker.internal:18790/heartbeat` every 60 seconds
   - Include: agent="cyony", host="container", status="ok|warning|error", current_task, timestamp
   - If host.docker.internal doesn't work, try the VPS IP: `http://2.24.118.123:18790`

2. **Create a simple heartbeat client script**
   - Python or bash, whatever works in your container
   - Should run as a background process or cron job
   - Handle network failures gracefully (don't crash if monitor is down)

3. **Test it**
   - Verify your heartbeats show up at `http://2.24.118.123:18790/status`
   - Report back with confirmation

## Constraints
- Don't modify Tripp's heartbeat.py (Warden boundary)
- Don't require new permissions outside your container
- Keep it simple — this is a minimal health check, not a full monitoring system

## Report Back
Write results to `/root/agents/shared/tasks-from-hermes/heartbeat-integration-report.md`
