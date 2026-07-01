# Kimi (Moonshot) API — Working Configuration

## Endpoint
```
https://api.kimi.com/coding/v1/chat/completions
```

**Note:** The base URL is `api.kimi.com/coding`, NOT the old `api.moonshot.ai` or `api.moonshot.cn`.

## Auth
```
Authorization: Bearer <KIMI_API_KEY>
```
Key is stored in `/opt/data/.env` as `KIMI_API_KEY`. Key format: `sk-kimi-*` (72 chars).

## Models
| Model | Use Case |
|-------|----------|
| `kimi-k2.5` | Default — coding, reasoning, general tasks |
| `moonshot-v1-auto` | Auto-selects best model |
| `kimi-k2` | Alternative coding model |

## Python Test Call
```python
import requests
with open('/opt/data/.env', 'rb') as f:
    for line in f.read().split(b'\n'):
        if b'KIMI_API_KEY' in line:
            key = line.split(b'=', 1)[1].decode()
            break

resp = requests.post(
    'https://api.kimi.com/coding/v1/chat/completions',
    headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'},
    json={'model': 'kimi-k2.5', 'messages': [{'role': 'user', 'content': 'Say hi'}]},
    timeout=15)
print(resp.json()['choices'][0]['message']['content'])
```

## Key Strengths
- Strong code generation and review
- Reasoning chain visible in `reasoning_content` field
- Fast response times
- Good at architecture planning and debugging

## Integration Pattern (Kimi + Codex)
1. **Kimi for research/planning** — understand the problem, design the approach
2. **I audit the plan** — verify it matches Eddie's vision
3. **Codex for execution** — implement the approved plan
4. **I audit the output** — ensure quality and alignment

## Pitfalls
- The old Moonshot endpoint (`api.moonshot.ai`) is deprecated — use `api.kimi.com/coding`
- Env var masking: `echo $KIMI_API_KEY` shows `***` due to Hermes redaction — test actual API calls instead of printing the key
- Key must be read from raw file bytes to avoid shell redaction issues
