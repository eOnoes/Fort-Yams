# Root:Root Permission Fix Pattern

## The Symptom

Cyony (Hermes agent running as `hermes` user inside Docker) tries to write bus files but gets:
```
PermissionError: [Errno 13] Permission denied: '/opt/data/shared/shared-agent-bus/agents/Cyony.109/heartbeat.tmp'
```

When checking with `ls -la`, offending paths show `root root` ownership:
```
drwxr-xr-x 2 root root 4096 ... heartbeat.tmp
-rw-r--r-- 1 root root  236 ... msg_xyz.ready.json
```

## The Cause

Tripp (OpenClaw daemon) runs as root on the VPS host. When Tripp writes new files to the shared
volume (new bus agent directories, new rule changes, new task files), they land as `root:root`.
Cyony's Docker container runs as the `hermes` user (UID different from 0), so she can read but not
write those files.

This is a recurring pattern, not a one-off bug. Every time Tripp:
- Creates a new agent directory (`mkdir agents/NewAgent.109/`)
- Updates RULES.md
- Delivers new task files
- Creates new shared folders (forge/, artifacts/, etc.)

...the permissions need attention.

## Immediate Fix (run from any account with root access)

```bash
# Fix a specific agent's directories
chown -R hermes:hermes /root/agents/shared/shared-agent-bus/agents/Cyony.109/

# Fix the whole bus (safe, just grants hermes ownership of shared files)
chown -R hermes:hermes /root/agents/shared/shared-agent-bus/

# Also fix the legacy shared dir if Tripp touched it
chown -R hermes:hermes /root/agents/shared/shared/
```

From Eddie's SSH session on the VPS:
```bash
ssh root@2.24.118.123
chown -R hermes:hermes /root/agents/shared/shared-agent-bus/
```

## Preventive Fix (if Tripp's writer is configurable)

Tripp should write files with:
- `umask 0002` → 0o664 permissions (readable/writable by group `hermes`)
- OR write as the `hermes` user (if OpenClaw supports impersonation)
- OR write to a staging dir then `chown` as part of the delivery step

If none of these are easily configurable, the pattern is: Tripp writes, then Cyony (or Eddie via
cron) re-chowns. The chown itself is cheap.

## Diagnostic Pattern (for Cyony)

When a write fails with PermissionError, run this to diagnose:
```bash
# 1. Identify what path failed (already in the error)
# 2. Check ownership of its directory
ls -la $(dirname <failing_path>)

# 3. Check if it's a root:root situation
stat <failing_path> | grep -i "Uid\|Gid"

# 4. Check what user Cyony is running as
whoami  # usually 'hermes'
```

If step 2 shows `root root` on the parent dir and step 4 shows `hermes`, that's the bug.

## Who Does the Fix

- **Eddie** via SSH (fastest, one command)
- **Tripp** if he has access to run `chown` as part of his delivery workflow
- **Cyony** cannot self-fix (she doesn't have sudo) — this is the catch-22

## Communication Template (when telling Eddie)

Keep it minimal:
```
Can't write to <path> — Tripp created it as root:root. 
Fix: chown -R hermes:hermes <parent_dir>
```

Don't narrate the stack trace. Don't list every failing operation. Just the path and the fix.

## Historical Note

This pattern hit at least 3 times during the 2026-06-02 crew setup session:
- Bus agent directories (Cyony.109, Echo.109) created root:root
- Heartbeat.json pre-created as root:root
- New task files delivered root:root

The rule of thumb: if Tripp touched it, assume root:root and test within the next turn.
