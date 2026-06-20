# Crew Backup Repo Pattern (Fort-Yams)

Reusable pattern for backing up a multi-agent crew to a single shared GitHub repo.

## Directory Structure

```
crew-backup-repo/
├── .gitignore
├── README.md
├── cyony/          ← Agent 1 (builder)
│   ├── config.yaml
│   └── skills/
├── tripp/          ← Agent 2 (code reviewer) — empty until ready
├── echo/           ← Agent 3 (relay) — empty until ready
└── shared/         ← Crew knowledge base
    ├── crew-knowledge.md
    ├── memory/
    └── wiki/
```

Each agent gets its own top-level directory. Shared knowledge lives in `shared/`.

## .gitignore for Backup Repos

```gitignore
# API keys and secrets
.env
*.env
.env.*

# Audio files (large, regenerable)
*.wav
*.ogg
*.mp3
audio_cache/

# Model weights and binaries
*.pt
*.bin
*.gguf
*.safetensors

# Databases and session logs
*.db
*.db-wal
*.db-shm
sessions/

# Node modules and caches
node_modules/
.cache/
__pycache__/
*.pyc

# OS files
.DS_Store
Thumbs.db
```

## Auth Pattern

Use GitHub PAT stored in `.env` (NEVER in the repo itself):

```bash
# Clone with token
git clone https://x-access-token:$(grep GITHUB_PAT /opt/data/.env | cut -d= -f2)@github.com/user/repo.git

# Configure push
cd repo
git remote set-url origin https://x-access-token:$(grep GITHUB_PAT /opt/data/.env | cut -d= -f2)@github.com/user/repo.git
```

## Cron Backup (Hermes)

```python
# Hermes cronjob — daily at 3 AM UTC
cronjob(
    action='create',
    name='Fort-Yams Daily Backup',
    schedule='0 3 * * *',
    prompt='Backup agent data to Fort-Yams GitHub repo...',
    deliver='local'  # Silent — no notification unless something fails
)
```

## What to Back Up

- Skills directories
- Config files (sanitized — no API keys)
- Crew knowledge base
- Wiki content
- Shared memory files

## What NOT to Back Up

- API keys, tokens, .env files
- Audio caches (regenerable)
- Model weights (re-downloadable)
- Session logs (ephemeral)
- Databases (too large, change constantly)
- Node modules / venvs (reinstallable)
