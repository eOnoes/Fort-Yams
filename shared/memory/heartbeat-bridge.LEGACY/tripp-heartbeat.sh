#!/bin/bash
# Tripp's heartbeat — runs every 60s via cron
curl -s -X POST http://localhost:18791/heartbeat \
  -H "Content-Type: application/json" \
  -d "{\"agent\":\"tripp\",\"host\":\"vps\",\"status\":\"ok\",\"current_task\":\"active\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
