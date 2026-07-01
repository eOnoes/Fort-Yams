#!/usr/bin/env python3
"""
Universal Inbox Watcher v2 — With Priority Sorting
Same script for Tripp, Cyony, and Echo
"""

import os
import re
import json
import time
import glob
from pathlib import Path
from datetime import datetime

AGENT_NAME = os.environ.get('AGENT_NAME', 'unknown')
INBOX_DIR = Path('/opt/data/shared/inbox')
POLL_INTERVAL = 30

# Priority order: critical > high > normal > low
PRIORITY_ORDER = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}

def parse_task(file_path):
    """Parse task file and extract metadata."""
    content = file_path.read_text()
    
    # Extract fields using simple regex
    task = {
        'file': file_path,
        'content': content,
        'for_agent': None,
        'from_agent': None,
        'priority': 'normal',
        'due': None
    }
    
    for line in content.split('\n'):
        if line.startswith('## For Agent'):
            task['for_agent'] = content.split('## For Agent')[1].split('\n')[0].strip().lower()
        elif line.startswith('## From'):
            task['from_agent'] = content.split('## From')[1].split('\n')[0].strip().lower()
        elif line.startswith('## Priority'):
            task['priority'] = content.split('## Priority')[1].split('\n')[0].strip().lower()
        elif line.startswith('## Due'):
            task['due'] = content.split('## Due')[1].split('\n')[0].strip()
    
    return task

def find_tasks_for_me():
    """Find and sort tasks for this agent by priority."""
    pattern = f"for-{AGENT_NAME}-*.md"
    tasks = []
    
    for task_file in INBOX_DIR.glob(pattern):
        task = parse_task(task_file)
        if task['for_agent'] == AGENT_NAME:
            tasks.append(task)
    
    # Sort by priority
    tasks.sort(key=lambda t: PRIORITY_ORDER.get(t['priority'], 2))
    return tasks

def process_task(task):
    """Process a single task."""
    print(f"[{datetime.now()}] Processing: {task['file'].name} (priority: {task['priority']})")
    
    # Move to processing
    processing_path = INBOX_DIR / 'processing' / task['file'].name
    task['file'].rename(processing_path)
    
    # Here the agent would do the actual work
    # For now, just log it
    print(f"Task from {task['from_agent']}: {task['content'][:100]}...")
    
    # Move to completed
    completed_path = INBOX_DIR / 'completed' / task['file'].name
    processing_path.rename(completed_path)
    
    print(f"Completed: {task['file'].name}")
    
    # Write response to outbox
    response_name = task['file'].name.replace(f"for-{AGENT_NAME}-", "", 1)
    response_path = INBOX_DIR.parent / 'outbox' / f"from-{AGENT_NAME}-{response_name}"
    response_path.write_text(f"# Response from {AGENT_NAME}\n\nTask completed: {task['file'].name}\n\n---\n\n{task['content']}\n")

def main():
    print(f"[{datetime.now()}] {AGENT_NAME} watcher started")
    print(f"Watching: {INBOX_DIR}/for-{AGENT_NAME}-*.md")
    
    while True:
        tasks = find_tasks_for_me()
        
        if tasks:
            print(f"Found {len(tasks)} task(s)")
            for task in tasks:
                try:
                    process_task(task)
                except Exception as e:
                    print(f"Error: {e}")
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
