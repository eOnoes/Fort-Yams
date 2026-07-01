#!/bin/bash
# Zombie Guard — kills stale openclaw processes before gateway restart
# Run: bash /root/agents/shared/scripts/zombie-guard.sh

LIVE_PID=$(systemctl --user show openclaw-gateway.service -p MainPID 2>/dev/null | cut -d= -f2)
ZOMBIES=$(ps aux | grep '[o]penclaw' | grep -v "$LIVE_PID" | grep -v grep | awk '{print $2}')

if [ -z "$ZOMBIES" ]; then
    echo "CLEAN: No zombie openclaw processes"
    exit 0
fi

echo "ZOMBIES FOUND:"
for pid in $ZOMBIES; do
    echo "  PID $pid"
    kill -9 $pid 2>/dev/null && echo "  -> KILLED" || echo "  -> already dead"
done

echo "All zombies cleared. Safe to restart gateway."
