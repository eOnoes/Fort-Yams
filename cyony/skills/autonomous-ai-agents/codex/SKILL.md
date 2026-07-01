---
name: codex
description: "Delegate coding to OpenAI Codex CLI (features, PRs)."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Coding-Agent, Codex, OpenAI, Code-Review, Refactoring]
    related_skills: [claude-code, hermes-agent]
---

# Codex CLI

Delegate coding tasks to [Codex](https://github.com/openai/codex) via the Hermes terminal. Codex is OpenAI's autonomous coding agent CLI.

## When to use

- Building features
- Refactoring
- PR reviews
- Batch issue fixing

For Kimi (Moonshot) API usage — code generation, research, advisory — see
[references/kimi-api.md](references/kimi-api.md). Kimi and Codex work together:
Kimi plans, Codex executes, agent audits.

Requires the codex CLI and a git repository.

## Prerequisites

- Codex installed: `npm install -g @openai/codex`
- OpenAI auth configured: either `OPENAI_API_KEY` or Codex OAuth credentials
  from the Codex CLI login flow
- **Must run inside a git repository** — Codex refuses to run outside one
- Use `pty=true` in terminal calls — Codex is an interactive terminal app

For Hermes itself, `model.provider: openai-codex` uses Hermes-managed Codex
OAuth from `~/.hermes/auth.json` after `hermes auth add openai-codex`. For the
standalone Codex CLI, a valid CLI OAuth session may live under
`~/.codex/auth.json`; do not treat a missing `OPENAI_API_KEY` alone as proof
that Codex auth is missing.

## Device Auth Flow (Remote/container setup)

When running Codex in a container or remote VPS where you can't open a browser:

1. Run: `codex login --device-auth`
2. Codex prints a **URL** (`https://auth.openai.com/codex/device`) and a **one-time code** (15min expiry)
3. Share the URL + code with the human (or a relay agent)
4. Human opens URL, enters code, logs in with their ChatGPT account
5. Codex receives the auth and writes credentials to `~/.codex/auth.json`

### ⚠️ Pitfall: Container Permission Mismatch

When `codex login --device-auth` runs as root (e.g. during initial setup or sudo), the auth file is written as `root:root` with `600` permissions. If Hermes runs as a non-root user (e.g. `hermes:10000`), it **cannot read the auth file** even though the auth succeeded.

**Symptoms:** `codex login status` returns `Permission denied (os error 13)`. `codex exec` also fails with the same error.

**Diagnosis:**
```bash
ls -la ~/.codex/auth.json
# -rw------- 1 root root ... ← root-owned = blocked
```

**Fix:**
```bash
sudo chown -R $(whoami):$(whoami) ~/.codex/
# Or if sudo isn't available, escalate to the host:
# sudo chown -R hermes:hermes /opt/data/home/.codex/
```

**Prevention:** Always run `codex login --device-auth` as the same user that will use Codex (typically the Hermes agent user, not root).

## ⚠️ Pitfall: Env Var Masking During Debugging

Hermes automatically redacts sensitive env vars (API keys, tokens) in tool output,
replacing them with `***`. When debugging auth issues, this makes valid keys **appear
broken** — the printed key looks like a short invalid string.

**Symptoms:** `source .env && echo $KIMI_API_KEY` shows `***` or a truncated value.
curl to the API returns `Invalid Authentication` even though the key is valid.

**Diagnosis — read the raw file, don't print the var:**
```bash
# Check actual key length without printing the value
grep KIMI_API_KEY /opt/data/.env | wc -c
# Should be 40+ chars. If 20-30 chars, key may actually be short/invalid.

# Better: test the API call directly from Python (bypasses shell redaction)
python3 -c "
import os, requests
with open('/opt/data/.env') as f:
    for line in f:
        if line.startswith('KIMI_API_KEY='):
            key = line.strip().split('=', 1)[1]
            break
resp = requests.post('https://api.moonshot.ai/v1/chat/completions',
    headers={'Authorization': f'Bearer {key}'},
    json={'model':'moonshot-v1-auto','messages':[{'role':'user','content':'hi'}]})
print(resp.json())
"
```

**Rule:** If an API key looks short or invalid in terminal output, test the actual
API call before concluding the key is bad. The redaction is doing its job — but it
makes debugging confusing.

## One-Shot Tasks

```
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Add dark mode toggle to settings'", workdir="~/project")
```

For scratch work (Codex needs a git repo):
```
terminal(command="cd $(mktemp -d) && git init && codex exec --dangerously-bypass-approvals-and-sandbox 'Build a snake game in Python'")
```

## Background Mode (Long Tasks)

```
# Start in background
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Refactor the auth module'", workdir="~/project", background=true)
# Returns session_id

# Monitor progress
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Send input if Codex asks a question
process(action="submit", session_id="<id>", data="yes")

# Kill if needed
process(action="kill", session_id="<id>")
```

## Key Flags

| Flag | Effect |
|------|--------|
| `exec "prompt"` | One-shot execution, exits when done |
| `--dangerously-bypass-approvals-and-sandbox` | No sandbox, no approvals (fastest, most dangerous) |
| `-s danger-full-access` | Sandboxed but with full file access |

### ⚠️ Pitfall: `--full-auto` and `-q` Do NOT Exist

These flags are **not valid** and will cause errors:
- `--full-auto` → ❌ `error: the argument '--full-auto' cannot be used with '--dangerously-bypass-approvals-and-sandbox'`
- `-q` → ❌ `error: unexpected argument '-q' found`
- `--yolo` → ❌ Same error as `--full-auto` (not a real flag)

**Correct non-interactive invocation:**
```bash
codex exec --dangerously-bypass-approvals-and-sandbox "your prompt here"
```

**Verify flags with:** `codex exec --help` — the help output is the source of truth, not this skill.

## PR Reviews

Clone to a temp directory for safe review:

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && codex review --base origin/main")
```

## Parallel Issue Fixing with Worktrees

```
# Create worktrees
terminal(command="git worktree add -b fix/issue-78 /tmp/issue-78 main", workdir="~/project")
terminal(command="git worktree add -b fix/issue-99 /tmp/issue-99 main", workdir="~/project")

# Launch Codex in each
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Fix issue #78: <description>. Commit when done.'", workdir="/tmp/issue-78", background=true)
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Fix issue #79: <description>. Commit when done.'", workdir="/tmp/issue-79", background=true)

# Monitor
process(action="list")

# After completion, push and create PRs
terminal(command="cd /tmp/issue-78 && git push -u origin fix/issue-78")
terminal(command="gh pr create --repo user/repo --head fix/issue-78 --title 'fix: ...' --body '...'")

# Cleanup
terminal(command="git worktree remove /tmp/issue-78", workdir="~/project")
```

## Batch PR Reviews

```
# Fetch all PR refs
terminal(command="git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'", workdir="~/project")

# Review multiple PRs in parallel
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Review PR #86. git diff origin/main...origin/pr/86'", workdir="~/project", background=true)
terminal(command="codex exec --dangerously-bypass-approvals-and-sandbox 'Review PR #87. git diff origin/main...origin/pr/87'", workdir="~/project", background=true)

# Post results
terminal(command="gh pr comment 86 --body '<review>'", workdir="~/project")
```

## ⚠️ Pitfall: Bubblewrap Sandbox in Containers

Codex uses bubblewrap (`bwrap`) for sandboxing code execution. In Docker containers
or environments without `unprivileged_userns_clone`, bubblewrap fails with:
```
bwrap: No permissions to create a new namespace
```

**Symptoms:** Codex authenticates fine but `codex exec` fails before code runs. The
model still reads the prompt and explains what it would do, but nothing executes.

**Fix:** Use the bypass flag to skip the sandbox entirely:
```bash
codex exec --dangerously-bypass-approvals-and-sandbox "your prompt here"
```

**Verification:** Smoke test:
```bash
codex exec --dangerously-bypass-approvals-and-sandbox "print('CODEX_SMOKE_OK')"
```

**Security note:** `--yolo` disables the sandbox. Only use in trusted environments.

## Rules

1. Git repo required — use `mktemp -d && git init` for scratch
2. Use `exec` for one-shots
3. `--dangerously-bypass-approvals-and-sandbox` for non-interactive execution (the ONLY auto-approve flag)
4. In containers — sandbox needs bubblewrap which usually fails in Docker/VPS, so always use the bypass flag
5. Background for long tasks — use `background=true` and monitor with `process`
6. Don't interfere — monitor with `poll`/`log`
7. Parallel is fine — run multiple Codex processes for batch work
8. **Always verify flags with `codex exec --help`** — the skill's flag table may be outdated
9. After Codex modifies Next.js code: `rm -rf .next && npm run build` before restarting the server (stale chunks cause `Cannot find module` runtime errors). See [references/nextjs-rebuild-pitfall.md](references/nextjs-rebuild-pitfall.md).
