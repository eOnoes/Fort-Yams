#!/usr/bin/env python3
"""
Daily Cleanup Script — Archives old tasks, copies to Echo's PC
Run by Tripp at 3 AM daily
"""

import shutil
import json
from datetime import datetime, timedelta
from pathlib import Path

INBOX_DIR = Path('/root/agents/shared/inbox')
OUTBOX_DIR = Path('/root/agents/shared/outbox')
ARCHIVE_DIR = Path('/root/agents/shared/archive')
ECHO_ARCHIVE = Path('/mnt/echo-d/archive')  # Mounted D:\echoshouse\archive

ARCHIVE_AGE_DAYS = 7

def archive_old_files():
    """Move completed tasks to archive."""
    cutoff = datetime.now() - timedelta(days=ARCHIVE_AGE_DAYS)
    
    # Archive completed tasks
    completed_dir = INBOX_DIR / 'completed'
    for task in completed_dir.glob('*.md'):
        mtime = datetime.fromtimestamp(task.stat().st_mtime)
        if mtime < cutoff:
            # Move to archive
            month_dir = ARCHIVE_DIR / mtime.strftime('%Y-%m')
            month_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(task), str(month_dir / task.name))
            print(f"Archived: {task.name}")
    
    # Archive outbox responses
    for resp in OUTBOX_DIR.glob('*.md'):
        mtime = datetime.fromtimestamp(resp.stat().st_mtime)
        if mtime < cutoff:
            month_dir = ARCHIVE_DIR / mtime.strftime('%Y-%m')
            month_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(resp), str(month_dir / resp.name))
            print(f"Archived: {resp.name}")

def copy_to_echo():
    """Copy archive to Echo's PC."""
    if ECHO_ARCHIVE.exists():
        for month_dir in ARCHIVE_DIR.glob('*'):
            if month_dir.is_dir():
                dest = ECHO_ARCHIVE / month_dir.name
                shutil.copytree(str(month_dir), str(dest), dirs_exist_ok=True)
        print("Copied to Echo's PC")
    else:
        print("Echo's archive not mounted — skipping copy")

def main():
    print(f"[{datetime.now()}] Starting cleanup...")
    archive_old_files()
    copy_to_echo()
    print("Cleanup complete")

if __name__ == "__main__":
    main()
