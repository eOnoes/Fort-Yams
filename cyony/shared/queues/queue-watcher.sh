#!/bin/bash
# Queue Watcher - Auto-notify agents when tasks are dropped

QUEUE_DIR="/root/agents/shared/queues"
LOG_FILE="/root/agents/shared/queues/watcher.log"

# Bot tokens
TRIPP_BOT="8996120333:AAH9Z8q4hYd8MpCFysxoZ1v2BlSwPt3rLzc"
CYONY_BOT="8660852402:AAHX792pTnRFDi3d8qeADIws3f2PXK3Uf1k"
ECHO_BOT="7958715850:AAG08wd_kWwhK6QKDRWzZNYnjUDj61aSxD8"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

notify_agent() {
    local agent="$1"
    local file="$2"
    local bot_token=""
    local chat_id=""
    
    case "$agent" in
        cyony)
            bot_token="$CYONY_BOT"
            chat_id="8808479511"
            ;;
        echo)
            bot_token="$ECHO_BOT"
            chat_id="8808479511"
            ;;
        tripp)
            bot_token="$TRIPP_BOT"
            chat_id="8808479511"
            ;;
    esac
    
    if [ -n "$bot_token" ]; then
        local task_name=$(basename "$file")
        local message="🚨 New task in your queue: $task_name

📂 Location: shared/queues/$agent/pending/
⏰ Time: $(date '+%H:%M:%S')

Please check your queue and move to processing/ when you start."
        
        curl -s -X POST "https://api.telegram.org/bot${bot_token}/sendMessage" \
            -d "chat_id=${chat_id}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" > /dev/null 2>&1
        
        log "Auto-notified $agent about $task_name via Telegram"
    fi
}

log "Queue watcher started with auto-notifications"

# Watch all pending directories
inotifywait -m -r -e create --format '%w%f' "$QUEUE_DIR" |
while read filepath; do
    # Only notify for pending directories
    if [[ "$filepath" == */pending/* ]]; then
        # Extract agent name from path
        agent=$(echo "$filepath" | sed 's|.*/queues/\([^/]*\)/pending/.*|\1|')
        if [ -n "$agent" ] && [ "$agent" != "queues" ]; then
            notify_agent "$agent" "$filepath"
        fi
    fi
done
