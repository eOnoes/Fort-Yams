#!/usr/bin/env python3
"""Cyony heartbeat bridge - polls shared folder for Cyony's status updates."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import time
import threading

SHARED_HEARTBEAT_DIR = Path("/root/agents/shared/heartbeat/agents")
DB_PATH = Path("/root/agents/shared/memory/heartbeat/heartbeat.db")
POLL_INTERVAL = 30  # seconds

def init_cyony_bridge():
    """Ensure shared heartbeat directory exists."""
    SHARED_HEARTBEAT_DIR.mkdir(parents=True, exist_ok=True)
    
def read_cyony_heartbeat():
    """Read Cyony's heartbeat from shared folder."""
    cyony_file = SHARED_HEARTBEAT_DIR / "cyony.json"
    if not cyony_file.exists():
        return None
    
    try:
        with open(cyony_file, 'r') as f:
            data = json.load(f)
        return data
    except (json.JSONDecodeError, IOError):
        return None

def update_database_with_cyony(data):
    """Merge Cyony's heartbeat into the main database."""
    if not data:
        return
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        INSERT INTO heartbeats (agent, host, status, current_task, task_started, last_seen, alert_sent, loop_alert_sent)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
        ON CONFLICT(agent) DO UPDATE SET
            host=excluded.host,
            status=excluded.status,
            current_task=excluded.current_task,
            task_started=CASE WHEN heartbeats.current_task=excluded.current_task THEN heartbeats.task_started ELSE excluded.task_started END,
            last_seen=excluded.last_seen,
            alert_sent=0
    """, (
        data.get('agent', 'cyony'),
        data.get('host', 'container'),
        data.get('status', 'ok'),
        data.get('current_task', 'unknown'),
        data.get('timestamp'),
        data.get('timestamp')
    ))
    conn.commit()
    conn.close()

def poll_cyony():
    """Background thread: poll for Cyony's heartbeat."""
    while True:
        data = read_cyony_heartbeat()
        if data:
            update_database_with_cyony(data)
        time.sleep(POLL_INTERVAL)

def create_cyony_heartbeat_template():
    """Create template for Cyony to use."""
    template = {
        "agent": "cyony",
        "host": "container",
        "status": "ok",
        "current_task": "researching models",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    template_file = SHARED_HEARTBEAT_DIR / "cyony-template.json"
    with open(template_file, 'w') as f:
        json.dump(template, f, indent=2)
    
    # Instructions for Cyony
    instructions = SHARED_HEARTBEAT_DIR / "INSTRUCTIONS.md"
    instructions.write_text("""# Cyony Heartbeat Instructions

## How to report your status to the dashboard

1. Write a file to `/opt/data/shared/heartbeat/agents/cyony.json`
2. Update it every 60 seconds
3. Format:
```json
{
  "agent": "cyony",
  "host": "container", 
  "status": "ok|warning|error",
  "current_task": "what you're doing",
  "timestamp": "2026-06-01T20:15:00Z"
}
```

## Important
- Do NOT try to call Tripp's HTTP endpoints (blocked by isolation)
- This shared folder is your only bridge to the dashboard
- If you go silent > 5 minutes, dashboard shows you OFFLINE
""")

def main():
    init_cyony_bridge()
    create_cyony_heartbeat_template()
    
    # Start polling thread
    poll_thread = threading.Thread(target=poll_cyony, daemon=True)
    poll_thread.start()
    
    print("Cyony bridge started")
    print(f"Polling {SHARED_HEARTBEAT_DIR}/cyony.json every {POLL_INTERVAL}s")
    print("Template created for Cyony")

if __name__ == "__main__":
    main()
