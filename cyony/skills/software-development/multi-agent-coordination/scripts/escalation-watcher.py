#!/usr/bin/env python3
"""
Escalation Watcher Template — Generic pattern for tracking peer agent reachability.

Deploy per-agent. Each instance:
- Tracks messages I sent to a target agent
- Detects whether the target has responded since last send
- Escalates to human after MAX_ATTEMPTS failed checks

Adapt by changing:
  - TARGET_AGENT: who to monitor
  - INBOX_DIR, OUTBOX_DIR, TRACKER_FILE: paths
  - MAX_ATTEMPTS, MINUTES_BETWEEN_ATTEMPTS: thresholds
  - alert_human(): the actual escalation mechanism
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ─── Configuration ───────────────────────────────────────────────────
TARGET_AGENT = "tripp"                         # who we're trying to reach
MY_AGENT     = "cyony"                         # who I am
SHARED_ROOT  = Path("/opt/data/shared")        # shared volume mount point

INBOX_DIR    = SHARED_ROOT / "inbox"
OUTBOX_DIR   = SHARED_ROOT / "outbox"
TRACKER_FILE = INBOX_DIR / f".{MY_AGENT}-response-tracker-for-{TARGET_AGENT}.json"

MAX_ATTEMPTS = 5                               # escalation threshold
MINUTES_BETWEEN_ATTEMPTS = 10                  # interval between checks


# ─── Tracker State ───────────────────────────────────────────────────
def load_tracker():
    if TRACKER_FILE.exists():
        with open(TRACKER_FILE, 'r') as f:
            return json.load(f)
    return {
        "attempt_count": 0,
        "last_check": str(datetime.now(timezone.utc)),
        "sent_messages": [],
        "last_response": None,
        "notes": "Fresh tracker"
    }


def save_tracker(data):
    with open(TRACKER_FILE, 'w') as f:
        json.dump(data, f, indent=2)


# ─── Message Detection ───────────────────────────────────────────────
def get_messages_i_sent():
    """Files I sent to TARGET_AGENT: from-{MY_AGENT}-for-{TARGET_AGENT}-*.md in outbox"""
    sent = []
    for f in OUTBOX_DIR.glob(f"from-{MY_AGENT}-for-{TARGET_AGENT}-*.md"):
        sent.append({"file": f.name, "mtime": f.stat().st_mtime})
    return sorted(sent, key=lambda x: x["mtime"])


def get_responses_from_target():
    """
    Responses from TARGET_AGENT to me. Could be in:
    - inbox:  for-{MY_AGENT}-*.md
    - outbox: from-{TARGET_AGENT}-for-{MY_AGENT}-*.md
    - outbox: from-{TARGET_AGENT}-*.md  (general responses)
    """
    responses = []

    # Outbox: target's responses addressed to me
    for f in OUTBOX_DIR.glob(f"from-{TARGET_AGENT}-for-{MY_AGENT}-*.md"):
        responses.append({"file": f.name, "mtime": f.stat().st_mtime})

    # Outbox: target's general responses (fallback)
    for f in OUTBOX_DIR.glob(f"from-{TARGET_AGENT}-*.md"):
        if "for-" not in f.name:
            responses.append({"file": f.name, "mtime": f.stat().st_mtime})

    # Inbox: new messages for me from target
    for f in INBOX_DIR.glob(f"for-{MY_AGENT}-*.md"):
        responses.append({"file": f.name, "mtime": f.stat().st_mtime})

    return sorted(responses, key=lambda x: x["mtime"], reverse=True)


# ─── Escalation Hook ─────────────────────────────────────────────────
def alert_human(attempt_count, hours_waited):
    """
    OVERRIDE THIS for your deployment.
    Send Telegram, webhook, email, or print for cron delivery.
    """
    msg = (f"🚨 ESCALATION: {TARGET_AGENT} unreachable after {attempt_count} "
           f"attempts (~{hours_waited:.1f} hours). Check on them?")
    print(msg)  # cron job delivers this to Telegram
    return True


# ─── Main Loop ───────────────────────────────────────────────────────
def main():
    tracker = load_tracker()
    now = datetime.now(timezone.utc)

    sent = get_messages_i_sent()
    responses = get_responses_from_target()

    # Update tracker with current sent state
    tracker["sent_messages"] = [s["file"] for s in sent]

    # Nothing sent, nothing to escalate on
    if not sent:
        print("ℹ️ No messages sent to target yet")
        return 0

    # Compare: has target responded since my last send?
    latest_response_time = responses[0]["mtime"] if responses else 0
    latest_sent_time = sent[-1]["mtime"]

    if latest_response_time > latest_sent_time:
        # Target responded! Reset counter
        tracker["attempt_count"] = 0
        tracker["last_response"] = str(
            datetime.fromtimestamp(latest_response_time, tz=timezone.utc)
        )
        tracker["notes"] = f"Target responded: {responses[0]['file']}"
        tracker["last_check"] = str(now)
        save_tracker(tracker)
        print(f"✅ Target responded: {responses[0]['file']}")
        return 0

    # No response since last sent message — check timing
    last_check = datetime.fromisoformat(tracker["last_check"])
    if last_check.tzinfo is None:
        last_check = last_check.replace(tzinfo=timezone.utc)
    time_since = now - last_check

    if time_since >= timedelta(minutes=MINUTES_BETWEEN_ATTEMPTS):
        tracker["attempt_count"] += 1
        tracker["last_check"] = str(now)

        hours_waited = (
            now - datetime.fromtimestamp(latest_sent_time, tz=timezone.utc)
        ).total_seconds() / 3600

        print(f"Attempt {tracker['attempt_count']}/{MAX_ATTEMPTS} "
              f"- No response ({hours_waited:.1f}h waiting)")

        if tracker["attempt_count"] >= MAX_ATTEMPTS:
            print("🚨 Escalation threshold reached!")
            alert_human(tracker["attempt_count"], hours_waited)
            tracker["notes"] = (
                f"Escalation alert sent at attempt {tracker['attempt_count']}"
            )
        else:
            tracker["notes"] = (
                f"Waiting. Next check in {MINUTES_BETWEEN_ATTEMPTS} min."
            )

        save_tracker(tracker)
    else:
        minutes_left = (
            timedelta(minutes=MINUTES_BETWEEN_ATTEMPTS) - time_since
        ).total_seconds() / 60
        print(f"⏳ Not yet time for next check ({minutes_left:.0f} min left)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
