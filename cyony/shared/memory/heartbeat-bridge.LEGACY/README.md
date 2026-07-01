# Heartbeat Monitor

Simple health check system for hybrid agent setup.

## Endpoints

### POST /heartbeat
Agents call this every 60 seconds:
```json
{
  "agent": "tripp|cyony|echo",
  "host": "vps|container|local-pc",
  "status": "ok|warning|error",
  "current_task": "string",
  "timestamp": "ISO-8601"
}
```

### GET /status
Web UI showing all agents, last seen, current status.

## Agents
- **tripp** — VPS (OpenClaw)
- **cyony** — Container (Hermes)
- **echo** — Local PC (D:\ drive)

## Alerts
Telegram message to Eddie if heartbeat missed > 5 minutes.
