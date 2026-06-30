#!/usr/bin/env python3
"""
Universal Inbox Watcher — same script for all agents in a crew.

Each agent launches this with AGENT_NAME env var set:
    export AGENT_NAME=cyony  # or 'tripp', 'echo', etc.
    python3 universal-watcher.py

Polls a shared inbox folder for tasks addressed to this agent,
moves them through a state machine (pending -> processing -> completed),
and writes responses to a shared outbox.

Designed for file-based multi-agent communication where direct HTTP
between agents is blocked by isolation/fires/NAT.
"""

import os
import json
import time
import traceback
from pathlib import Path
from datetime import datetime

# ─── Configuration ───────────────────────────────────────────────────────────
AGENT_NAME = os.environ.get('AGENT_NAME', 'unknown')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '30'))  # seconds

# Paths — override via env for non-default layouts
SHARED_ROOT = Path(os.environ.get('SHARED_ROOT', '/opt/data/shared'))
INBOX_DIR = SHARED_ROOT / 'inbox'
PENDING_DIR = INBOX_DIR / 'pending'
PROCESSING_DIR = INBOX_DIR / 'processing'
COMPLETED_DIR = INBOX_DIR / 'completed'
OUTBOX_DIR = SHARED_ROOT / 'outbox'
ERROR_DIR = OUTBOX_DIR / 'errors'

# Stale-task threshold: if a task sits in processing/ for >N minutes, consider it stuck
STALE_THRESHOLD_MINUTES = int(os.environ.get('STALE_THRESHOLD_MINUTES', '60'))

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')


# ─── Logging ─────────────────────────────────────────────────────────────────
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [{AGENT_NAME}] {msg}", flush=True)


def notify(title, message):
    """Send a Telegram message if configured."""
    if not (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID):
        return
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "text": f"📬 {title}\n{message}"
        }).encode()
        req = urllib.request.Request(url, data=payload,
                                     headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        log(f"Notify failed (non-fatal): {e}")


# ─── Core State Machine ─────────────────────────────────────────────────────
def ensure_dirs():
    """Create folders if missing."""
    for d in [PENDING_DIR, PROCESSING_DIR, COMPLETED_DIR, OUTBOX_DIR, ERROR_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def find_tasks_for_me():
    """Return list of tasks in inbox root AND pending/ that are addressed to AGENT_NAME."""
    pattern = f"for-{AGENT_NAME}-*.md"
    # Per the deployment doctrine, tasks may land in root OR in pending/
    # Scan both to be safe.
    return sorted(INBOX_DIR.glob(pattern)) + sorted(PENDING_DIR.glob(pattern))


def recover_stale_processing():
    """Move stuck tasks back to pending so they get retried."""
    now = datetime.now()
    for task in PROCESSING_DIR.glob(f"for-{AGENT_NAME}-*.md"):
        mtime = datetime.fromtimestamp(task.stat().st_mtime)
        age_min = (now - mtime).total_seconds() / 60
        if age_min > STALE_THRESHOLD_MINUTES:
            dest = PENDING_DIR / task.name
            log(f"Recovering stale task ({age_min:.0f}min old): {task.name} -> pending/")
            task.rename(dest)


def strip_for_prefix(filename):
    """Strip the `for-{agent}-` prefix from a task filename for response naming."""
    prefix = f"for-{AGENT_NAME}-"
    if filename.startswith(prefix):
        return filename[len(prefix):]
    return filename


def process_task(task_path):
    """Atomic state machine: pending/root -> processing -> completed + outbox response."""
    log(f"Picked up: {task_path.name}")

    # 1. Move to processing (atomic, claims ownership)
    processing_path = PROCESSING_DIR / task_path.name
    task_path.rename(processing_path)

    # 2. Read content
    try:
        content = processing_path.read_text()
    except Exception as e:
        log_error(task_path.name, f"Read failed: {e}")
        processing_path.rename(ERROR_DIR / task_path.name)
        return

    # 3. Mid-flight acknowledgment — tell teammates we're on it
    ack_path = OUTBOX_DIR / f"from-{AGENT_NAME}-ack-{strip_for_prefix(task_path.name)}"
    ack_path.write_text(
        f"# Acknowledged\n\n"
        f"**From:** {AGENT_NAME}\n"
        f"**Task:** {task_path.name}\n"
        f"**Picked up:** {datetime.now().isoformat()}\n\n"
        f"Working on it. Will report to outbox when complete."
    )

    # 4. Do the actual work (subclasses override this; for this script it's a no-op)
    #    Real deployments wrap this in a call to the agent's dispatch system.
    result = "Task received. Actual work performed by agent's dispatch pipeline."

    # 5. Move to completed
    completed_path = COMPLETED_DIR / task_path.name
    processing_path.rename(completed_path)

    # 6. Full response in outbox
    response_name = strip_for_prefix(task_path.name)
    response_path = OUTBOX_DIR / f"from-{AGENT_NAME}-{response_name}"
    response_path.write_text(
        f"# Response from {AGENT_NAME}\n\n"
        f"**Original task:** {task_path.name}\n"
        f"**Completed:** {datetime.now().isoformat()}\n\n"
        f"---\n\n"
        f"{result}"
    )

    log(f"Completed: {task_path.name}")


def log_error(task_name, error_msg):
    """Log task errors to outbox/errors/ for audit."""
    error_path = ERROR_DIR / f"error-{AGENT_NAME}-{int(time.time())}-{task_name}.md"
    error_path.write_text(
        f"# Error Report\n\n"
        f"**Agent:** {AGENT_NAME}\n"
        f"**Task:** {task_name}\n"
        f"**Time:** {datetime.now().isoformat()}\n\n"
        f"## Error\n```\n{error_msg}\n```"
    )
    log(f"Logged error for {task_name}: {error_msg}")


# ─── Main Loop ───────────────────────────────────────────────────────────────
def main():
    ensure_dirs()
    log(f"Universal watcher started")
    log(f"Watching: {INBOX_DIR}/for-{AGENT_NAME}-*.md (and pending/)")
    log(f"Interval: {POLL_INTERVAL}s")

    while True:
        try:
            recover_stale_processing()

            tasks = find_tasks_for_me()
            if tasks:
                log(f"Found {len(tasks)} task(s)")
                for task_path in tasks:
                    try:
                        process_task(task_path)
                    except Exception as e:
                        log_error(task_path.name, f"Process failed: {e}\n{traceback.format_exc()}")
                        # Try to recover the task back to pending if it's stuck in processing
                        stuck = PROCESSING_DIR / task_path.name
                        if stuck.exists():
                            stuck.rename(PENDING_DIR / task_path.name)
        except Exception as e:
            log(f"Top-level loop error (non-fatal, continuing): {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
