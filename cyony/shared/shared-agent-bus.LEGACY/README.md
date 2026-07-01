# Shared Agent Bus

## Location
`/root/agents/shared/shared-agent-bus/`

## Structure
```
agents/
  Echo.109/
    inbox/         # Messages for Echo
    processing/    # Echo's current work
    done/          # Completed work
    failed/        # Failed/rejected work
    heartbeat.json # Last known status
  Tripp.109/
    (same structure)
  Cyony.109/
    (same structure)
artifacts/         # Shared files, patches, docs
logs/
  events.jsonl     # Audit trail
  errors.jsonl     # Error log
archive/           # Old/legacy files
```

## Rules
- Only write to your own directories
- Deliver to others by writing to their `inbox/`
- Use atomic writes: `.tmp` → `.ready.json`
- Never edit another agent's `processing/`, `done/`, or `failed/`
- Append to `logs/events.jsonl` for audit trail

## Team Protocol
- Cyony.109 proposes
- Tripp.109 coordinates
- Echo.109 verifies and decides

## Timing
- Check inbox: every 15 seconds
- Write heartbeat: every 60 seconds
- Stale check: every 5 minutes
