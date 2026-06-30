# Failure Protocol — When Tripp is Unreachable

## Escalation Ladder

| Attempt | Action | Wait Time | Who |
|---------|--------|-----------|-----|
| 1-2 | Drop task in inbox | 15 min between | Cyony |
| 3 | Check dashboard heartbeat | Immediate | Cyony |
| 4 | Ping Echo (local relay) | 10 min | Cyony |
| 5 | Ask Eddie | Immediate | Cyony |
| 6+ | Help Echo run wake kit | As directed | Cyony + Echo |

## Rules

### Don't Wake Unless:
- Tripp is 🔴 OFFLINE for >10 minutes
- Multiple tasks are pending
- Eddie confirms Tripp is down

### Do NOT:
- Wake Tripp if he's just busy (🟢 or 🔵)
- Run wake kit yourself (Echo-only, needs PC access)
- Panic after 1-2 failed attempts

### DO:
- Log failed attempts in `/opt/data/shared/memory/connection-issues.md`
- Check dashboard first (http://2.24.118.123:18791/status)
- Document what you were trying to do
- Be patient — Tripp might be in deep work

## Emergency Contacts
- **Echo:** Local PC, can run wake kit
- **Eddie:** Human, final authority
- **Dashboard:** http://2.24.118.123:18791/status

## Log Format
```markdown
## YYYY-MM-DD HH:MM
- Agent: Cyony
- Attempt: 3
- Issue: Tripp not responding to task
- Dashboard status: 🔴 OFFLINE (15 min)
- Action: Pinged Echo
- Resolution: [pending]
```
