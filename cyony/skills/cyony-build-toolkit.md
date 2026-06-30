# Cyony's Build Toolkit — Kimi + Codex Instructions

## Overview
You have two powerful build tools available. Use Kimi for code generation and advisory work. Use Codex for autonomous coding tasks that need to modify files directly in a repository.

---

## KIMI — Code Generation & Advisory

### What it does
Kimi is an LLM that writes code, reviews code, and answers technical questions. It does NOT modify your files directly — it generates code that you then apply.

### How to use it

**Option 1: delegate_task (Recommended)**
```
delegate_task(
    goal="Build a REST API endpoint for user authentication with JWT tokens",
    context="Project is at /opt/data/project. Uses Python FastAPI. Existing auth module at src/auth/. Follow existing code patterns.",
    toolsets=["terminal", "file"]
)
```
- Kimi returns code and instructions
- You review the output
- You apply the changes using write_file or terminal

**Option 2: Direct API call via terminal**
```bash
curl -X POST https://api.moonshot.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -d '{
    "model": "moonshot-v1-auto",
    "messages": [
      {"role": "system", "content": "You are a senior software engineer. Write clean, production-ready code."},
      {"role": "user", "content": "YOUR PROMPT HERE"}
    ]
  }'
```

### When to use Kimi
- Code generation from specifications
- Code review and refactoring suggestions
- Architecture decisions and planning
- Writing tests
- Debugging with error context
- Documentation generation

### Kimi workflow
1. Gather context (file paths, error messages, requirements)
2. Send prompt with full context
3. Review Kimi's response
4. Apply changes to files
5. Test the changes
6. Iterate if needed

---

## CODEX — Autonomous Coding Agent

### What it does
Codex is OpenAI's autonomous coding agent. It reads your codebase, makes changes to files, runs tests, and commits work. It modifies files DIRECTLY in the repository.

### How to use it

**One-shot task (quick builds):**
```bash
codex exec "Add a dark mode toggle to the settings page"
```

**Full-auto mode (longer tasks):**
```bash
codex exec --full-auto "Refactor the auth module to use JWT tokens instead of sessions"
```

**With skip-git-repo-check (for testing):**
```bash
codex exec --skip-git-repo-check "Create a hello world Python script"
```

**With approval (safer):**
```bash
codex exec --approval-mode full-auto "Fix the bug in user registration flow"
```

### How to monitor Codex

**Start in background:**
```bash
# Use terminal tool with background=true and pty=true
terminal(
    command="codex exec --full-auto 'Build feature X'",
    workdir="/path/to/repo",
    background=true,
    pty=true,
    notify_on_complete=True
)
```

**Check progress:**
```bash
process(action="poll", session_id="<session_id>")
process(action="log", session_id="<session_id>")
```

**Send input if Codex asks a question:**
```bash
process(action="submit", session_id="<session_id>", data="yes")
```

**Kill if stuck:**
```bash
process(action="kill", session_id="<session_id>")
```

### Codex flags reference

| Flag | Effect |
|------|--------|
| `exec "prompt"` | One-shot, exits when done |
| `--full-auto` | Auto-approves file changes in workspace |
| `--yolo` | No sandbox, no approvals (fastest, riskiest) |
| `--skip-git-repo-check` | Allows running outside git repos |
| `--approval-mode full-auto` | Requires approval for some changes |

### When to use Codex
- Building new features from scratch
- Refactoring existing code
- Fixing bugs with clear reproduction steps
- Writing and running tests
- Multi-file changes across a codebase
- Anything that needs to modify actual files in a repo

### Codex workflow
1. Make sure you're in a git repository (or use --skip-git-repo-check)
2. Run `codex exec "YOUR PROMPT"` with appropriate flags
3. Monitor with process poll/log
4. Review the git diff when Codex finishes
5. Run your own tests to verify
6. Commit or revert as needed

---

## COMPARISON: Kimi vs Codex

| Aspect | Kimi | Codex |
|--------|------|-------|
| Modifies files? | No — generates code only | Yes — writes directly to repo |
| Speed | Fast (single API call) | Slower (reads codebase, iterates) |
| Best for | Code generation, review, planning | Building features, refactoring |
| Risk | Low (you apply changes manually) | Medium (direct file access) |
| Requires | API key (already configured) | Git repo + ChatGPT auth (already configured) |
| Auth status | ✅ KIMI_API_KEY ready | ✅ ChatGPT OAuth ready |

---

## BEST PRACTICES

### Always
- Give full context (file paths, error messages, constraints)
- Review output before applying
- Test changes after applying
- Commit frequently with clear messages

### For Kimi
- Include relevant code snippets in your prompt
- Specify the language and framework
- Ask for tests alongside the implementation
- Request explanations for complex changes

### For Codex
- Use isolated git worktrees for parallel tasks
- Start with `--full-auto` for speed, not `--yolo`
- Monitor with process poll — don't just wait
- Always review the git diff before accepting
- Run tests independently after Codex finishes

### For both
- Break large tasks into smaller ones
- Save important decisions to memory
- Report progress back to the user
- Clean up temp files and branches after completion

---

## QUICK REFERENCE

```bash
# Kimi — ask a question
curl -X POST https://api.moonshot.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -d '{"model":"moonshot-v1-auto","messages":[{"role":"user","content":"YOUR QUESTION"}]}'

# Codex — build a feature
codex exec --full-auto "YOUR BUILD PROMPT"

# Codex — check status
codex login status

# Codex — update
npm update -g @openai/codex
```

---

*Last updated: June 30, 2026*
*Prepared by Echo 🛡️ for Cyony*
