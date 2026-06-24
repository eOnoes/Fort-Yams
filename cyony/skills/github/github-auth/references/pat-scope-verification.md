# PAT Scope Verification Workflow

When a user gives you a new GitHub PAT (Personal Access Token), verify its capabilities before relying on it. This prevents surprises mid-task.

## Token Masking Pitfall (Critical)

**The Hermes runtime MASKS tokens in terminal output.** A PAT like `github_pat_...` will be replaced with `github...kUSp` (shortened) in shell commands. This means:

- `curl` commands using the token inline WILL WORK (the real token is injected)
- Python scripts that read the token from a heredoc or string literal WILL GET THE MASKED VERSION (13 chars instead of 93)
- **Fix:** Write the token to a temp file (`/tmp/.gh_token`), then have Python read from the file. Clean up the temp file after.

```bash
cat > /tmp/.gh_token << 'EOF'
github_pat_ACTUAL_TOKEN_HERE
EOF
python3 /tmp/verify_script.py
rm -f /tmp/.gh_token
```

## Verification Steps

Run these in order. Each step tests a progressively more privileged operation.

### 1. Identity Check
```bash
curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/user
```
Confirms the token is valid and shows the authenticated username.

### 2. Repository Access + Permissions
```python
# Use urllib to avoid shell masking issues
import urllib.request, json
headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
req = urllib.request.Request("https://api.github.com/user/repos?per_page=30&sort=updated", headers=headers)
repos = json.loads(urllib.request.urlopen(req).read())
for r in repos:
    p = r.get('permissions', {})
    print(f"{r['full_name']} | admin={p.get('admin')} push={p.get('push')} pull={p.get('pull')}")
```

### 3. Organization Access
```python
req = urllib.request.Request("https://api.github.com/user/orgs", headers=headers)
orgs = json.loads(urllib.request.urlopen(req).read())
```

### 4. Specific Repo Metadata (Update Test)
```python
# PATCH a repo description to test Administration permission
data = json.dumps({"description": "test"}).encode()
req = urllib.request.Request(
    "https://api.github.com/repos/OWNER/REPO",
    data=data,
    headers={**headers, "Content-Type": "application/json"},
    method="PATCH"
)
```
**If 403:** The PAT lacks "Administration" repository permission (fine-grained PAT). User needs to add it in GitHub Settings → Developer Settings → Personal Access Tokens → Edit → Repository Permissions → Administration: Read and Write.

### 5. Scope Detection
Fine-grained PATs do NOT return `x-oauth-scopes` in response headers. This is expected behavior, not an error. To determine scopes, test each endpoint individually.

## Common Fine-Grained PAT Permission Gaps

| Operation | Required Permission | Notes |
|-----------|-------------------|-------|
| Read repos | Metadata: Read | Usually default |
| Push code | Contents: Read/Write | Standard |
| Update description | Administration: Read/Write | Often missed |
| Manage issues | Issues: Read/Write | Separate from code |
| Notifications | Not available | 403 on fine-grained PATs (expected) |
| Create repos | Account: Read/Write | Under account-level permissions |

## Auth Methods Comparison

Both work for API calls:
- `Authorization: token <PAT>` — classic format
- `Authorization: Bearer <PAT>` — modern format, required for fine-grained PATs

Use `Bearer` + `X-GitHub-Api-Version: 2022-11-28` header for maximum compatibility.

## Cleanup
Always delete temp token files after verification:
```bash
rm -f /tmp/.gh_token
```
