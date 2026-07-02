---
name: secret-safety
description: Pre-commit secret scanning. Block commits with API keys, tokens, private keys, .env files, credentials. Never print secrets. Rotate exposed keys immediately.
---

# Secret Safety

**Hard rule:** No secret ever leaves the machine. Scan before every commit and push.

## Pre-Commit Scan (mandatory)

Before ANY `git commit` or `git push`, scan for secrets:

```bash
# Primary: gitleaks (comprehensive, 150+ rules)
gitleaks detect --staged --verbose

# Scan entire repo history:
gitleaks detect --source . --verbose

# gitleaks protect (Eddie has this): blocks secrets at commit time
gitleaks protect --staged --verbose

# Fallback: ripgrep for common patterns if gitleaks unavailable
rg -n '(?i)(api[_-]?key\s*[:=]\s*["\x27][A-Za-z0-9_\-]{12,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36}|-----BEGIN.*PRIVATE)' \
   $(git diff --cached --name-only) --no-heading
```

**Installation:** `curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_$(uname -s)_$(uname -m).tar.gz | tar xz -C ~/.local/bin gitleaks`

## Block These Patterns

- API keys: `sk-...`, `ghp_...`, `xoxb-...`, `AKIA...`, `pk_live_...`
- Private keys: `-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN OPENSSH PRIVATE KEY-----`
- Tokens: JWT tokens, OAuth tokens, PATs, webhook secrets
- Config files: `.env`, `.env.local`, `credentials.json`, `service-account.json`
- Database dumps: `*.sql`, `*.dump`, `*.sqlite`
- Auth headers: `Authorization: Bearer ...`, `X-API-Key: ...`
- Connection strings: `postgres://user:pass@...`, `mongodb://user:pass@...`

## 🔴 API Key Testing — Don't Blame the Key

When an API returns 401/Invalid API Key, **do NOT immediately tell the user their key is wrong**. The issue is almost always HOW you're testing it, not the key itself.

**Common false-negative patterns:**
1. **SSH strips `$`** — keys containing `$` get mangled when passed through SSH shell commands. Test with Python, not curl-through-SSH.
2. **Shell quoting** — curl commands with nested quotes can corrupt the Authorization header. Use `-H "Authorization: Bearer *** with proper escaping.
3. **Placeholder in .env** — the `.env` file might have `REPLACE_ME` or `***` from initial setup, not the real key. Read the actual file contents first.

**Correct testing pattern:**
1. Read the key from the file: `grep API_KEY /path/to/.env`
2. Test with a Python script (not curl) that uses `urllib.request` with proper headers
3. If the test works but the app doesn't, the issue is in how the app loads the env var, not the key

**Eddie's correction (2026-07-01):** "Almost everytime you tell me this about a key, it is bc of how we try to call it. It is HIDING itself on the call." — He's right. Diagnose the test method before blaming the key.

## If a Secret is Found

1. **Block the commit** — do not proceed
2. **Replace** the secret with an environment variable placeholder: `process.env.API_KEY`
3. **Tell the user**: repo, file path, line number, and secret type (NEVER the value)
4. **Remind**: rotate the exposed key immediately — it's now compromised
5. **Add the file** to `.gitignore` if it shouldn't be tracked

## Report Format (never include the secret value)

```
🔴 SECRET FOUND
Repo: owner/repo
File: src/config.ts
Line: 42
Type: GitHub Personal Access Token
Action: Blocked commit. Replace with process.env.GITHUB_TOKEN.
Reminder: Rotate this token now at github.com/settings/tokens
```

## Never Ever

- Never print a secret value in chat, logs, or terminal output
- Never commit `.env` files (add to `.gitignore`)
- Never hardcode credentials even in "test" or "example" code
- Never paste credentials into chat — use environment variable references
- Never ASK users to paste credentials into chat (2026-06-29 lesson: asked Eddie for X API Client ID/Secret via Telegram — he pasted them, then we both realized this was wrong)

## If a User Pastes Credentials in Chat

1. **Immediately tell them to delete the message**
2. **Do NOT read, parse, or use the credentials from chat**
3. **Direct them to screenshot instead** — screenshots are less copy-pasteable than raw text
4. **Or direct them to paste directly into terminal** on their own machine
5. **Remind:** Telegram messages persist in chat history even after "delete for me"

## .gitignore Additions

```
.env
.env.*
!.env.example
credentials*.json
service-account*.json
*.pem
*.key
*.sqlite
*.dump
secrets/
```
