# Universal Inbox/Outbox Protocols

## Shared Volume Layout

```
shared/
├─ inbox/
│  ├─ for-{agent}-{id}.md          # Messages TO an agent
│  ├─ for-{agent}-{id}-*.md        # Multiple messages with topic
│  ├─ pending/                     # Inbox watcher picks these up
│  ├─ processing/                  # Agent is working on it
│  ├─ completed/                   # Done, archived
│  ├─ ARCHIVAL-RULES.md            # How long to keep, when to prune
│  ├─ DEPLOYMENT.md                # Setup guide for new agents
│  ├─ TEST-PLAN.md                 # Validation procedures
│  └─ README.md                    # Protocol overview
├─ outbox/
│  ├─ from-{agent}-for-{target}-{id}.md   # Responses/reports
│  └─ ...                          # Agent-specific outputs
```

## File Naming Convention

**Incoming (inbox):**
- `for-{agent}-{id}.md` — simple message
- `for-{agent}-{id}-{topic}.md` — message with topic
- IDs should be sequential or timestamp-based for ordering

**Outgoing (outbox):**
- `from-{agent}-for-{target}-{id}.md` — response to specific agent
- `from-{agent}-report-{topic}.md` — broadcast report

**Examples:**
- `for-tripp-001-munch-kit.md`
- `for-echo-001-tripcore-mjri.md`
- `from-tripp-for-cyony-002-approval.md`
- `from-cyony-report-mech-architecture.md`

## Escalation Watchdog Pattern

Agents can run periodic checks (via cron) to monitor inbox for responses:

```bash
# Check if Tripp has responded to any pending messages
ls shared/inbox/from-tripp-*
```

**Escalation threshold:** 5 attempts without response triggers alert to Eddie.

**Silent operation:** Watchdog stays quiet unless:
- Threshold hit (5 attempts)
- Tripp actually responded (forward to agent)

This prevents noisy "still waiting" pings that clutter Eddie's feed.

## Message Lifecycle

```
Agent writes → shared/inbox/for-{target}-{id}.md
                      ↓
Target's universal-watcher polls (30s)
                      ↓
Watcher moves to pending/ (claims the message)
                      ↓
Target reads and processes
                      ↓
Target writes response → shared/outbox/from-{target}-for-{sender}-{id}.md
                      ↓
Original moved to completed/ or archived
```

## Priority Levels

Messages should include `## Priority` section:
- `high` — urgent, needs immediate attention
- `normal` — standard workflow
- `low` — informational, no action required

## Required Sections for Inbox Messages

```markdown
# Task

## For Agent
{target}

## From
{sender}

## Priority
{high|normal|low}

## Subject
{one-line summary}

## Body
{main message content}

## Notes
{optional context}
```