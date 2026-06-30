#!/usr/bin/env python3
"""Task watcher template — cron-based inbox detection for multi-agent crews.

Adapt TASKS_DIR and NOTIFICATION_* to your crew. Run as a cron job
(e.g., `*/5 * * * * /path/to/task-watcher.py`) or via Hermes cronjob tool.

Design:
  - Scan a tasks directory for .md files
  - Compare against a manifest of what has been seen
  - On new tasks, notify the human coordinator (not auto-process)
  - The human then decides: handle, defer, batch, reject

Why notify human and not auto-execute:
  - Warden dropping a task ≠ agent should start it immediately
  - Human decides priority, batches related work, can redirect
  - Preserves chain of command; prevents doctrine violations
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

# === CONFIGURATION (adapt per crew) ===
TASKS_DIR = Path(os.environ.get("TASKS_DIR", "/opt/data/shared/tasks-for-hermes"))
MANIFEST_PATH = TASKS_DIR / ".processed-manifest.json"

# Notification: Telegram by default
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# File extensions considered as tasks
TASK_GLOBS = ["*.md", "*.txt"]


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))


def scan_for_new_tasks(manifest: dict) -> list[Path]:
    new = []
    for glob in TASK_GLOBS:
        for f in TASKS_DIR.glob(glob):
            name = f.name
            # Skip dotfiles/hidden
            if name.startswith("."):
                continue
            # Compare against manifest by (name, mtime) tuple
            mtime = f.stat().st_mtime
            entry = manifest.get(name)
            if entry is None or entry.get("mtime") != mtime:
                new.append(f)
    return new


def send_telegram(msg: str) -> bool:
    if not BOT_TOKEN or not CHAT_ID:
        print(f"[DRY] Would notify: {msg[:80]}", file=sys.stderr)
        return False
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = json.dumps({"chat_id": CHAT_ID, "text": msg, "parse_mode": "Markdown"}).encode()
    req = Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        urlopen(req, timeout=10)
        return True
    except URLError as e:
        print(f"Telegram notify failed: {e}", file=sys.stderr)
        return False


def summarize_task(path: Path, max_lines: int = 20) -> str:
    """Return first few lines of a task for a notification summary."""
    try:
        with open(path, encoding="utf-8") as f:
            lines = [l.rstrip() for l in f.readlines()[:max_lines]]
    except OSError as e:
        return f"(could not read: {e})"
    # Drop frontmatter if present
    if lines and lines[0].strip() == "---":
        try:
            idx = lines[1:].index("---") + 2
            lines = lines[idx:]
        except ValueError:
            pass
    body = "\n".join(lines).strip()
    if not body:
        return "(empty)"
    return body[:500] + ("..." if len(body) > 500 else "")


def main() -> int:
    if not TASKS_DIR.exists():
        # Silent exit — nothing to watch
        return 0

    manifest = load_manifest()
    new_tasks = scan_for_new_tasks(manifest)
    if not new_tasks:
        return 0

    # Build notification (one message, batched)
    parts = [f"*📬 New tasks ({len(new_tasks)}):*"]
    for t in new_tasks:
        parts.append(f"\n*{t.stem}*")
        parts.append(f"```{summarize_task(t)[:300]}```")

        # Update manifest
        manifest[t.name] = {
            "mtime": t.stat().st_mtime,
            "seen_at": datetime.now(timezone.utc).isoformat(),
            "notified": True,
        }

    message = "\n".join(parts)
    sent = send_telegram(message)
    if sent or not BOT_TOKEN:
        # Persist manifest only if notify succeeded (or dry run)
        save_manifest(manifest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
