#!/usr/bin/env python3
"""echo-bridge.py — SSH/SCP helper that avoids PowerShell quoting hell.
Usage:
  python echo-bridge.py check-inbox
  python echo-bridge.py read-file <vps-path>
  python echo-bridge.py write-file <vps-path> <local-path>
  python echo-bridge.py run <command>
  python echo-bridge.py send-bus <to-agent> <json-file>
"""

import subprocess, sys, os, json, shutil, time

VPS = "root@2.24.118.123"
BUS = "/root/agents/shared/shared-agent-bus"
MY_AGENT = "Echo.109"
MY_INBOX = f"{BUS}/agents/{MY_AGENT}/inbox"
MY_PROCESSING = f"{BUS}/agents/{MY_AGENT}/processing"
MY_DONE = f"{BUS}/agents/{MY_AGENT}/done"
MY_HEARTBEAT = f"{BUS}/agents/{MY_AGENT}/heartbeat.json"

def ssh(cmd: str) -> str:
    """Run command on VPS via SSH. Returns stdout or raises."""
    result = subprocess.run(
        ["ssh", VPS, cmd],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0 and result.stderr:
        print(f"[ssh stderr] {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip()

def scp_to(local: str, remote: str):
    """SCP a local file to VPS."""
    subprocess.run(["scp", local, f"{VPS}:{remote}"], check=True, timeout=30)

def scp_from(remote: str, local: str):
    """SCP a file from VPS to local."""
    subprocess.run(["scp", f"{VPS}:{remote}", local], check=True, timeout=30)


def cmd_check_inbox():
    """Check bus inbox for .ready.json files."""
    files = ssh(f"ls {MY_INBOX}/*.ready.json 2>/dev/null")
    if not files:
        print("INBOX_EMPTY")
        return
    for f in files.split():
        print(f"FOUND: {f}")

def cmd_read_file(path: str):
    """Read a file from VPS."""
    print(ssh(f"cat {path}"))

def cmd_write_file(remote_path: str, local_path: str):
    """Write a local file to VPS."""
    os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
    scp_to(local_path, remote_path)
    print(f"WROTE: {remote_path}")

def cmd_send_bus(to_agent: str, json_file: str):
    """Send a .ready.json message to another agent's bus inbox."""
    dest = f"{BUS}/agents/{to_agent}/inbox/"
    ssh(f"mkdir -p {dest}")
    scp_to(json_file, f"{dest}/{os.path.basename(json_file)}")
    print(f"SENT to {to_agent}: {json_file}")

def cmd_process_msg(msg_path: str):
    """Move a message from inbox to processing."""
    fname = os.path.basename(msg_path)
    ssh(f"mv {msg_path} {MY_PROCESSING}/{fname}")
    print(f"PROCESSING: {fname}")

def cmd_mark_done(msg_path: str):
    """Move a message from processing to done."""
    fname = os.path.basename(msg_path)
    ssh(f"mv {MY_PROCESSING}/{fname} {MY_DONE}/{fname}")
    print(f"DONE: {fname}")

def cmd_heartbeat():
    """Write updated heartbeat.json."""
    import json, time
    h = {
        "status": "online",
        "last_heartbeat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "inbox_count": 0,
        "processing_count": 0,
        "done_count": 0,
        "capabilities": ["coding", "review", "drafting", "local-verifier"],
        "poll_interval_sec": 30,
        "bus_polling_active": True
    }
    tmp = "/tmp/echo-heartbeat.json"
    with open(tmp, "w") as f:
        json.dump(h, f)
    scp_to(tmp, MY_HEARTBEAT)
    os.remove(tmp)
    print(f"HEARTBEAT: {json.dumps(h)}")

def cmd_health():
    """Check Tripp's gateway health."""
    print(ssh("curl -s http://127.0.0.1:18789/health"))

def cmd_fix_session():
    """Kill zombies and restart Tripp's gateway."""
    ssh("bash /root/agents/shared/scripts/zombie-guard.sh")
    print(ssh("systemctl --user restart openclaw-gateway.service"))
    time.sleep(3)
    print(ssh("curl -s http://127.0.0.1:18789/health"))

def cmd_run(command: str):
    """Run arbitrary command on VPS."""
    print(ssh(command))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1]
    try:
        if action == "check-inbox":
            cmd_check_inbox()
        elif action == "read-file":
            cmd_read_file(sys.argv[2])
        elif action == "write-file":
            cmd_write_file(sys.argv[2], sys.argv[3])
        elif action == "send-bus":
            cmd_send_bus(sys.argv[2], sys.argv[3])
        elif action == "process":
            cmd_process_msg(sys.argv[2])
        elif action == "done":
            cmd_mark_done(sys.argv[2])
        elif action == "heartbeat":
            cmd_heartbeat()
        elif action == "health":
            cmd_health()
        elif action == "fix-session":
            cmd_fix_session()
        elif action == "run":
            cmd_run(" ".join(sys.argv[2:]))
        else:
            print(f"Unknown action: {action}")
            print(__doc__)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
