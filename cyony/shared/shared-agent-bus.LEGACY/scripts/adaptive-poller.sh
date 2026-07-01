#!/bin/bash
# Adaptive inbox poller for Tripp.109

INBOX="/root/agents/shared/shared-agent-bus/agents/Tripp.109/inbox/"
LOG="/root/agents/shared/shared-agent-bus/logs/poller-state.json"
STATE_FILE="/root/agents/shared/shared-agent-bus/logs/poller-active.state"

# Default intervals (seconds)
BASELINE=900      # 15 minutes
ACTIVE=20         # 20 seconds when work detected
ACTIVE_DURATION=900  # 15 minutes of active polling
BACKOFF_STEP=30   # +30s every 2 minutes
URGENT=10         # 10 seconds for urgent override

# Check for urgent override
if [ -f "$STATE_FILE" ]; then
    STATE=$(cat "$STATE_FILE")
    if [ "$STATE" = "urgent" ]; then
        echo $ACTIVE
        exit 0
    fi
fi

# Check if recently active
if [ -f "$LOG" ]; then
    LAST_WORK=$(jq -r '.last_work_detected // 0' "$LOG" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    ELAPSED=$((NOW - LAST_WORK))
    
    if [ $ELAPSED -lt $ACTIVE_DURATION ]; then
        # In active period, calculate backoff
        BACKOFF_CYCLES=$((ELAPSED / 120))
        CURRENT_INTERVAL=$((ACTIVE + (BACKOFF_CYCLES * BACKOFF_STEP)))
        
        if [ $CURRENT_INTERVAL -gt $BASELINE ]; then
            CURRENT_INTERVAL=$BASELINE
        fi
        
        echo $CURRENT_INTERVAL
        exit 0
    fi
fi

# Default baseline
echo $BASELINE
