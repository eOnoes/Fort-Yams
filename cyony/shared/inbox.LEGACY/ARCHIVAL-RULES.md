# Archival Rules — Universal Inbox

## Folder Lifecycle

```
inbox/
├── pending/      # New tasks (keep until picked up)
├── processing/   # Active work (keep until done)
├── completed/    # Finished tasks (archive after 7 days)
└── archive/      # Local copy before deletion

outbox/
├── responses/    # Agent replies (archive after 7 days)
└── errors/       # Error logs (keep permanently)
```

## Rules

### Keep Forever (Cloud)
- Error logs
- Audit trails
- Deployment doctrine
- System configs

### Archive to Echo's PC (D:\echoshouse\archive\)
- Completed tasks older than 7 days
- Outbox responses older than 7 days
- Old heartbeat data

### Delete After Use
- Casual chat messages
- Temporary notes
- Test files

## Process

1. **Daily cleanup** (Tripp runs at 3 AM)
   - Move completed tasks to archive/
   - Copy archive/ to Echo's PC
   - Delete local archive after copy

2. **Weekly review** (Eddie approves)
   - Review what's archived
   - Confirm nothing important lost
   - Adjust rules if needed

3. **Monthly purge** (Echo runs)
   - Delete archived files older than 90 days
   - Keep only error logs and audit trails

## File Naming for Archive
```
archive/2026-06/
├── task-for-echo-001-20260601.md
├── task-for-cyony-002-20260601.md
└── response-from-tripp-003-20260601.md
```

## Questions?
Reply to `/opt/data/shared/outbox/from-{agent}-for-tripp-archive.md`
