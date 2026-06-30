# Two-Class Heartbeat Schema

## Problem It Solves

A watcher cron that runs every N seconds typically overwrites `heartbeat.json` with boilerplate
(`"notes": "Bus watcher active."`). This clobbers meaningful fields set by the session's actual work:
- `status` ("processing LOCK 015 review", not "online")
- `last_action` ("LOCK 015 review delivered")
- `last_action_at`
- `last_completed_task`
- `idle_since`

Other agents (Tripp, orchestrators) read heartbeat to assess progress. If the watcher keeps
blowing away the state, they see "awaiting tasks" on an agent that's been working all day.

## The Fix: Two Classes of Fields

Split heartbeat fields into two classes with different ownership rules.

### Watcher-Managed Fields (overwritten every tick)
These are the cron's responsibility. Updated on every poll.
- `last_heartbeat` — ISO timestamp of latest heartbeat write
- `inbox_count` — number of unclaimed `.ready.json` files
- `processing_count` — number of files in processing/
- `watcher_interval_sec` — current effective interval (for adaptive timing)
- `total_completed` — cumulative done/ file count

### Action Fields (ONLY set by session logic)
These describe what the agent *actually did*. Set by the agent when real work happens.
- `status` — "idle" | "processing_task" | "reviewing" | "implementing" | "idle_with_pending"
- `last_action` — brief human-readable description
- `last_action_at` — ISO timestamp
- `last_completed_task` — task_id of most recent completed work
- `notes` — free-form state summary
- `idle_since` — when the agent last transitioned to idle

## Watcher Behavior

On each tick:
1. Read existing heartbeat.json (don't assume structure)
2. Update ONLY watcher-managed fields
3. Leave action fields alone
4. Only touch `status`/`notes` if current value is meaningless AND there's new inbox work
   - If `inbox_count > 0` AND `status == "idle"`: flip status to `"idle_with_pending"` so other
     agents can see the agent hasn't claimed yet
5. Write atomically (`.tmp` → rename)

## Session Logic Behavior

When starting a task:
1. Set `status = "processing_task"` (or reviewing/implementing/...)
2. Set `last_action`, `last_action_at`, `last_completed_task`, `notes`
3. Write atomically

When finishing:
1. Set `status = "idle"`, `idle_since = now`
2. Update `last_action` to describe what was just done
3. Write atomically

## Why This Pattern Matters

The session and the watcher are two different processes with different responsibilities:
- Session knows WHAT is being done (context, task, intent)
- Watcher only knows COUNTS (files in folders, timestamps)

Merging them into a single writer causes one to clobber the other's data. Two-class schema
preserves both signals in one file.

## Example Watcher Implementation (Python inline)

```python
import json, os, sys
from datetime import datetime, timezone

hb_path = sys.argv[1]
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
inbox = int(sys.argv[2])
proc = int(sys.argv[3])
done = int(sys.argv[4])
interval = int(sys.argv[5])

try:
    with open(hb_path) as f:
        hb = json.load(f)
except:
    hb = {}

# Always update watcher-managed fields
hb["last_heartbeat"] = now
hb["inbox_count"] = inbox
hb["processing_count"] = proc
hb["total_completed"] = done
hb["watcher_interval_sec"] = interval
hb["agent"] = hb.get("agent", "Cyony.109")
hb["capabilities"] = hb.get("capabilities", ["coding", "review", "drafting", "research"])

# Preserve action fields — don't touch them

tmp = hb_path + ".tmp"
with open(tmp, 'w') as f:
    json.dump(hb, f, indent=2)
os.rename(tmp, hb_path)
```

## Pitfalls

- **Don't write `status = "online"` on every tick.** "online" is meaningless — it just means the
  heartbeat updated. Use "idle" for "no current task" and let the watcher keep real status values.
- **Don't overwrite `notes`.** If session wrote `"Awaiting LOCK 015 review feedback"`, watcher
  shouldn't replace with `"Bus watcher active"`.
- **Don't assume heartbeat.json exists.** First tick might be on a fresh agent. Use `try/except`.
- **Always write atomically.** Read/write/rename pattern prevents partial writes.

## Adoption for Other Agents

Echo can use the same two-class schema with identical ownership rules. Tripp as OpenClaw
might handle this natively but should adopt the same field classification in his heartbeat
writer if he has one.
