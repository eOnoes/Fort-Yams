# Multi-Location Pickup Cron — Reference Implementation

## Cron Prompt Template

```
Check these locations for NEW messages from {SENDER} to {RECIPIENT} that {RECIPIENT} has not yet responded to:

1. /opt/data/shared/inbox/for-{recipient}-*.md (the canonical inbox)
2. /opt/data/shared/tasks-for-hermes/*.md (task drops)
3. /opt/data/shared/outbox/from-{sender}-*.md (responses in outbox)
4. /opt/data/shared/tasks-from-hermes/REPLY-TO-{RECIPIENT}-*.md (ad-hoc replies)
5. /opt/data/shared/review-queue/{RECIPIENT}-QUESTIONS-FOR-{SENDER}-*.md (check for inline annotations)

For each new message found:
- Read the file
- Summarize: sender, subject (filename), content preview (first 200 chars)
- Alert the human admin that {SENDER} has responded
- List the file paths so {RECIPIENT} can follow up

If no new files since last check, stay silent.
Track progress by writing a manifest to /opt/data/.cyony-pickup-state.json
(stores last-seen file timestamps per folder).
```

## State File Schema

Stored at `~/.{recipient}-pickup-state.json` (or `/opt/data/.{recipient}-pickup-state.json`).

```json
{
  "last_check": 1780351860.0,
  "folders": {
    "inbox": {
      "for-cyony-switch-to-universal-watcher.md": 1780351175.83
    },
    "tasks-for-hermes": {
      "Tripp.Reason-review.md": 1780346950.04,
      "task-echo-ping.md": 1780350207.16,
      "task-heartbeat-integration.md": 1780323023.32,
      "task-update-cyony.md": 1780347910.10
    },
    "outbox": {},
    "tasks-from-hermes": {},
    "review-queue": {
      "CYONY-QUESTIONS-FOR-TRIPP-20260601.md": 1780351156.62
    }
  },
  "last_reported_tripp_to_cyony": {
    "/opt/data/shared/inbox/for-cyony-switch-to-universal-watcher.md": 1780351175.83,
    "/opt/data/shared/tasks-for-hermes/Tripp.Reason-review.md": 1780346950.04
  }
}
```

## Pickle Implementation (execute_code)

```python
import os, json, glob, time

# Load previous state
state_path = "/opt/data/.cyony-pickup-state.json"
prev_state = {}
if os.path.exists(state_path):
    with open(state_path) as f:
        prev_state = json.load(f)

prev_files = prev_state.get("folders", {})

# Define scan locations
locations = {
    "inbox": "/opt/data/shared/inbox/for-cyony-*.md",
    "tasks-for-hermes": "/opt/data/shared/tasks-for-hermes/*.md",
    "outbox": "/opt/data/shared/outbox/from-tripp-*.md",
    "tasks-from-hermes": "/opt/data/shared/tasks-from-hermes/REPLY-TO-CYONY-*.md",
    "review-queue": "/opt/data/shared/review-queue/CYONY-QUESTIONS-FOR-TRIPP-*.md"
}

new_messages = []

for folder, pattern in locations.items():
    files = glob.glob(pattern)
    for f in sorted(files):
        try:
            mtime = os.path.getmtime(f)
            basename = os.path.basename(f)
            prev_mtime = prev_files.get(folder, {}).get(basename)
            if prev_mtime is None or mtime > prev_mtime:
                new_messages.append({
                    "folder": folder,
                    "path": f,
                    "mtime": mtime,
                    "is_new": prev_mtime is None  # True = never seen, False = updated
                })
        except OSError:
            pass

# Report new messages (this feeds the cron's final output)
for msg in new_messages:
    print(f"NEW: {msg['path']} (mtime={msg['mtime']:.0f}, first_seen={msg['is_new']})")

# Update state
new_state = {
    "last_check": time.time(),
    "folders": {},
}
for folder, pattern in locations.items():
    new_state["folders"][folder] = {}
    for f in glob.glob(pattern):
        try:
            new_state["folders"][folder][os.path.basename(f)] = os.path.getmtime(f)
        except OSError:
            pass

os.makedirs(os.path.dirname(state_path), exist_ok=True)
with open(state_path, 'w') as f:
    json.dump(new_state, f, indent=2)
```

## First-Run Behavior

On first run (no prior state file), **all files are reported as new**. This is correct — the human admin sees the full backlog and can decide what to act on.

## Filtering Non-Target Messages

Not all files in `tasks-for-hermes/` are necessarily FOR the target agent. Some may be for Echo or other crew members. Filter by:
- Filename prefix: `for-{agent}-*` or `task-{agent}-*`
- Content scan: `## For Agent` or `## Hey {Agent}` headers
- Explicit addressing in the markdown body

## Report Format

When reporting to the human admin:
```
📬 Cyony Inbox Check — N New Messages from Tripp

1. **Subject Line**
   📁 /path/to/file.md
   🕐 Timestamp
   > Content preview (first ~200 chars)...

2. ...

**Also checked (no action needed):**
- [list of files that are for other agents or already responded to]
```
