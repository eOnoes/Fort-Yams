# Universal Inbox System

## How It Works

Same system for all three agents. Simple, universal, easy to fix.

### Folder Structure
```
shared/
├── inbox/
│   ├── pending/      # Tasks waiting to be picked up
│   ├── processing/   # Tasks currently being worked on
│   └── completed/    # Finished tasks
└── outbox/           # Responses from agents
```

### Naming Convention
- **Tasks for agent:** `for-{agent}-001.md`
  - `for-tripp-001.md`
  - `for-echo-002.md`
  - `for-cyony-003.md`

- **Responses from agent:** `from-{agent}-for-{target}-001.md`
  - `from-echo-for-tripp-001.md`

### How Each Agent Uses It

**Tripp (VPS):**
```bash
export AGENT_NAME=tripp
python3 /root/agents/shared/inbox/universal-watcher.py
```

**Cyony (Container):**
```bash
export AGENT_NAME=cyony
python3 /opt/data/shared/inbox/universal-watcher.py
```

**Echo (PC):**
```powershell
$env:AGENT_NAME="echo"
python C:\Users\eMitchell109\Documents\inbox\universal-watcher.py
```

### For Eddie

**To assign work:**
1. Tell Tripp what you need
2. Tripp creates task file: `for-echo-001.md`
3. Echo's watcher picks it up automatically

**To chat casually:**
- Message Echo or Cyony directly
- No task files needed

### Troubleshooting

**Agent not picking up tasks:**
1. Check watcher is running: `ps aux | grep universal-watcher`
2. Check file naming: must be `for-{agent}-*.md`
3. Check folder permissions

**Task stuck in processing:**
1. Check agent logs
2. Move file back to inbox manually if needed

**Want to add a new agent?**
1. Set `AGENT_NAME=newagent`
2. Same watcher script, same folders
