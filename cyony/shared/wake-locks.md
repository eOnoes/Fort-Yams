# Wake Lock System

## Purpose
Prevent wake loops — if multiple agents try to wake each other simultaneously.

## Rules

### 1. Wake Lock Duration
- **5 minutes** per agent
- After wake, agent cannot be woken again for 5 minutes

### 2. Who Can Wake Whom
| Source | Can Wake |
|--------|----------|
| Tripp | Echo, Cyony |
| Echo | Tripp, Cyony |
| Cyony | NO ONE (sandboxed) |

### 3. Wake Flow
```
Tripp detects Echo is down
        ↓
Tripp sends wake command to Echo's webhook
        ↓
Echo's webhook checks wake lock
        ↓
If not locked: run wake script, set lock
If locked: return "wake lock active"
        ↓
Echo wakes up, sends Telegram "yawn" message
        ↓
Echo resumes heartbeat
```

### 4. Loop Prevention
- Wake lock prevents multiple simultaneous wakes
- Only one wake per 5 minutes per agent
- Logs all wake attempts
- Telegram alerts on failed wakes

### 5. Emergency Override
- Eddie can always run wake script manually
- Bypasses wake lock
- Use when automated wake fails
