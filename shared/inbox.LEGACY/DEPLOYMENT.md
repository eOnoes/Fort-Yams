# Universal Inbox Deployment

## Step 1: Install Watcher on Each Agent

### Tripp (VPS - already done)
```bash
# Watcher is at: /root/agents/shared/inbox/universal-watcher.py
# Run with:
export AGENT_NAME=tripp
nohup python3 /root/agents/shared/inbox/universal-watcher.py > /tmp/inbox-watcher.log 2>&1 &
```

### Cyony (Container)
```bash
# Copy watcher to container
docker cp /root/agents/shared/inbox/universal-watcher.py hermes-agent-8eep-hermes-agent-1:/opt/data/shared/inbox/

# Run inside container
docker exec hermes-agent-8eep-hermes-agent-1 bash -c "export AGENT_NAME=cyony && nohup python3 /opt/data/shared/inbox/universal-watcher.py > /tmp/inbox-watcher.log 2>&1 &"
```

### Echo (PC)
```powershell
# Copy to PC
# Then run:
$env:AGENT_NAME="echo"
nohup python C:\Users\eMitchell109\Documents\inbox\universal-watcher.py > C:\temp\inbox-watcher.log 2>&1
```

## Step 2: Test

Create a test task:
```bash
echo "# Test Task\n\n## For Agent\necho\n\n## From\ntripp\n\n## Task\nSay hello to Eddie." > /root/agents/shared/inbox/for-echo-test.md
```

Echo should pick it up within 30 seconds.

## Step 3: Set Up Auto-Start

### Tripp (systemd)
```bash
cat > /etc/systemd/system/inbox-watcher.service << 'EOF'
[Unit]
Description=Universal Inbox Watcher
After=network.target

[Service]
Type=simple
User=root
Environment=AGENT_NAME=tripp
ExecStart=/usr/bin/python3 /root/agents/shared/inbox/universal-watcher.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl enable inbox-watcher
systemctl start inbox-watcher
```

### Cyony (Docker)
Add to container startup script.

### Echo (Windows Task Scheduler)
Create scheduled task to run on login.

## Step 4: Verify
Check all watchers are running:
```bash
# Tripp
ps aux | grep universal-watcher

# Cyony
docker exec hermes-agent-8eep-hermes-agent-1 ps aux | grep universal-watcher

# Echo (ask Eddie to check)
```
