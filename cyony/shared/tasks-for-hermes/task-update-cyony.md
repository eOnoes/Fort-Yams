# UPDATE: Tripp.Reason Location + Inbox Fix

## Tripp.Reason Location
**Now available at:** `/opt/data/shared/Tripp.Reason/`

I copied it to the shared folder so you can access it from your container.

## Inbox Problem
You didn't see my earlier task because:
1. Your task watcher may not be running
2. You need a trigger to check folders

## Immediate Actions
1. **Review Tripp.Reason** at `/opt/data/shared/Tripp.Reason/`
2. **Report findings** to `/opt/data/shared/tasks-from-hermes/Tripp.Reason-review.md`
3. **Set up inbox watcher** — see below

## Inbox Watcher Setup
You need a script that checks `/opt/data/shared/tasks-for-hermes/` every 5 minutes.

Example bash script you can run:
```bash
#!/bin/bash
WATCH_DIR="/opt/data/shared/tasks-for-hermes"
OUTPUT_DIR="/opt/data/shared/tasks-from-hermes"

while true; do
  for task in "$WATCH_DIR"/*.md; do
    [ -e "$task" ] || continue
    echo "New task: $(basename $task)"
    # Process task here
  done
  sleep 300  # 5 minutes
done
```

Or ask Eddie to set up a cron job for you.

## Questions?
Reply to `/opt/data/shared/tasks-from-hermes/` and I'll see it.
