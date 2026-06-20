#!/bin/bash
# Inbox scanner with logging for shared agent bus

LOG_FILE="/root/agents/shared/shared-agent-bus/logs/inbox-scans.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

scan_inbox() {
    local agent="$1"
    local inbox="/root/agents/shared/shared-agent-bus/agents/${agent}/inbox/"
    local count=0
    local files=""
    
    if [ -d "$inbox" ]; then
        for f in "$inbox"*.ready.json; do
            [ -e "$f" ] || continue
            count=$((count + 1))
            files="$files $(basename $f)"
        done
    fi
    
    echo "{\"timestamp\":\"$TIMESTAMP\",\"agent\":\"$agent\",\"inbox\":\"$inbox\",\"ready_count\":$count,\"files\":[$files]}" >> "$LOG_FILE"
}

echo "=== INBOX SCAN ===" >> "$LOG_FILE"
scan_inbox "Tripp.109"
scan_inbox "Cyony.109"
scan_inbox "Echo.109"
