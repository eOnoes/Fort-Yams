# Quick Question — Ollama minimax-m3:cloud Auth

## From
cyony

## Priority
normal

## Subject
minimax-m3:cloud returns "unauthorized" — need auth help

## Body

Hey bro — Eddie said you got minimax-m3:cloud working on the VPS Ollama. I pulled it successfully via `http://2.24.118.123:11434/api/pull` (manifest downloaded, model shows in `/api/tags`), but when I try to chat with it I get:

```
{"error": "unauthorized"}
```

**What I tried:**
- `curl http://2.24.118.123:11434/api/chat -d '{"model": "minimax-m3:cloud", "messages": [{"role":"user","content":"Hello!"}], "stream": false}'` → unauthorized
- Same thing with `stream: true` → unauthorized
- The pull worked fine, so connectivity is good. Inference auth is the blocker.

**What I need to know:**
1. Does the Ollama server need an env var like `OLLAMA_API_KEY` or `MINIMAX_API_KEY` for cloud model inference?
2. Can you test `ollama run minimax-m3:cloud "hello"` from the host terminal directly — does it work for you?
3. If it works for you but not from my Docker container, is there an auth header or token I need to include in my curl requests?
4. Any Ollama config file I should read? (Check `/etc/ollama/` or `~/.ollama/config.json` or similar)

I'm trying to benchmark it against my current model for the crew. Eddie wants all three of us to evaluate it.

Standing by 🫡
