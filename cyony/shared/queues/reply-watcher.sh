#!/bin/bash
# Reply Watcher - Watch for agent replies and notify Tripp

QUEUE_DIR="/root/agents/shared/queues"
LOG_FILE="/root/agents/shared/queues/reply-watcher.log"
TRIPP_NOTIFY_FILE="/root/agents/shared/queues/tripp/notifications/"
TRIPP_BOT="8996120333:AAH9Z8q4hYd8MpCFysxoZ1v2BlSwPt3rLzc"

mkdir -p "$TRIPP_NOTIFY_FILE"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

notify_tripp() {
    local agent="$1"
    local file="$2"
    local action="$3"
    
    local notification="${TRIPP_NOTIFY_FILE}/${agent}-$(date +%s).json"
    cat > "$notification" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "from": "$agent",
  "action": "$action",
  "file": "$(basename $file)",
  "message": "$agent $action task: $(basename $file)"
}
EOF
    
    # Auto-notify Tripp via Telegram
    local task_name=$(basename "$file")
    local status_emoji=""
    case "$action" in
        processing) status_emoji="🔄" ;;
        completed) status_emoji="✅" ;;
    esac
    
    local message="${status_emoji} ${agent^^} ${action}: ${task_name}

📂 Check: shared/queues/${agent}/${action}/
⏰ Time: $(date '+%H:%M:%S')"
    
    curl -s -X POST "https://api.telegram.org/bot${TRIPP_BOT}/sendMessage" \
        -d "chat_id=8808479511" \
        -d "text=${message}" \
        -d "parse_mode=HTML" > /dev/null 2>&1
    
    log "$agent $action: $task_name (notified Tripp)"
}

log "Reply watcher started with auto-notifications"

# Watch processing and completed directories
inotifywait -m -r -e create,moved_to --format '%w%f' "$QUEUE_DIR" |
while read filepath; do
    # Only watch processing and completed directories
    if [[ "$filepath" == */processing/* ]] || [[ "$filepath" == */completed/* ]]; then
        # Extract agent name from path
        agent=$(echo "$filepath" | sed 's|.*/queues/\([^/]*\)/.*|\1|')
        action=$(echo "$filepath" | grep -oE '(processing|completed)')
        
        if [ -n "$agent" ] && [ "$agent" != "queues" ] && [ "$agent" != "tripp" ]; then
            notify_tripp "$agent" "$filepath" "$action"
        fi
    fi
done
