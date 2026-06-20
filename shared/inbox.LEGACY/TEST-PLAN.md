# Test Plan — Universal Inbox

## Goal
Find issues before they break production.

## Test Scenarios

### Test 1: Basic Task Flow
1. Tripp drops `for-echo-test-001.md`
2. Echo picks it up within 30 seconds
3. Echo completes it
4. Response appears in outbox

### Test 2: Multiple Tasks
1. Drop 5 tasks at once
2. All agents pick up their tasks
3. No conflicts or missed tasks

### Test 3: Agent Offline
1. Drop task for offline agent
2. Task stays in pending
3. Agent comes online
4. Task picked up automatically

### Test 4: Loop Prevention
1. Tripp wakes Echo
2. Echo tries to wake Tripp immediately
3. Wake lock prevents loop

### Test 5: Archive Cleanup
1. Create old completed tasks
2. Run cleanup script
3. Verify archived to Echo's PC
4. Verify local copy deleted

### Test 6: Error Handling
1. Drop malformed task
2. Agent should log error
3. Not crash
4. Report error to outbox

## How to Run Tests

```bash
# Create test task
echo "# Test\n\n## For Agent\necho\n\n## Task\nSay hello" > /root/agents/shared/inbox/for-echo-test-001.md

# Watch logs
tail -f /tmp/inbox-watcher.log

# Check outbox
ls -la /root/agents/shared/outbox/
```

## Reporting Issues
Reply to `/opt/data/shared/outbox/from-{agent}-for-tripp-test.md`
