---
name: capability-dispatch
description: "The Rollcall — dispatch specialized subagents by capability, not by name. Vision, code, reasoning, and Trace (auditor) orchestrated through a single entry point."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [dispatch, multi-agent, rollcall, auditor, vision]
    related_skills: [ollama-swarm-orchestrator, hermes-agent, writing-plans]
trigger_conditions:
  - User sends an image to analyze
  - Complex build needs specialized subagents
  - Code review / security audit needed (Trace)
  - Parallel research or multi-model ensemble work
  - User says "dispatch", "rollcall", "audit this", "analyze this image"
---

# Capability Dispatch (The Rollcall)

## Overview

You (Cyony) are the router. The Rollcall is a set of *capabilities*, not named personalities — except **Trace**, the auditor, who has earned her name. Dispatch happens through the right tool for the right job. Don't over-engineer: prefer the lightest path that gets the work done.

## The Rollcall

| Capability | Route | Model | When to Use |
|-----------|-------|-------|-------------|
| 👁️ **Vision** | `vision_analyze` tool | `google/gemini-2.5-flash` | Images, screenshots, diagrams, UI mockups |
| 🧠 **Reason** | `delegate_task` | parent (qwen3.7-max) | Planning, architecture, complex logic |
| ⚡ **Code** | `delegate_task` batch | parent (qwen3.7-max) | Parallel code generation, refactoring |
| 🔬 **Deep Research** | tmux-spawned hermes | `ollama:kimi-k2.6` | Long-context research (128K), chain-of-thought |
| 🕵️ **Trace (Auditor)** | `delegate_task` leaf | parent (qwen3.7-max) | Security review, code audit, SOLID checks |
| 🛡️ **Heavy Reason** | fallback | `nvidia/nemotron-3-super-120b-a12b` | Backup when primary model fails |

## Dispatch Recipes

### 1. Vision Analysis (Image Comes In)

```python
# Direct tool call — no delegation needed
vision_analyze(
    image_url="/path/to/image",
    question="Describe this [mockup/screenshot/diagram] in detail: layout, components, flow"
)
```

**For MSPaint-style mockups**, ask for: layout zones, named components, user actions possible, and what's missing.

**For screenshots of errors/logs**, also ask for the exact error text and line numbers.

### 2. Parallel Code (Batch via delegate_task)

```python
delegate_task(tasks=[
    {"goal": "Write failing test for X", "context": "...", "toolsets": ["terminal", "file"]},
    {"goal": "Implement minimal Y matching spec", "context": "...", "toolsets": ["terminal", "file"]},
    {"goal": "Generate OpenAPI spec for Z", "context": "...", "toolsets": ["terminal", "file"]}
])
```

Use for 2-3 parallel tasks that don't depend on each other. Max concurrency: 3.

### 3. Deep Research (tmux-spawn hermes — different model)

```bash
# Spawn a research agent with Ollama's Kimi K2.6 for deep reasoning
terminal(command="tmux new-session -d -s research -x 120 -y 40 'hermes -m ollama:kimi-k2.6 chat'", timeout=10)
terminal(command="sleep 5 && tmux send-keys -t research 'Research GRPO papers from 2024-2025 and summarize top 5 findings' Enter", timeout=10)
# Poll for completion
terminal(command="sleep 60 && tmux capture-pane -t research -p | tail -40", timeout=5)
# Clean up
terminal(command="tmux send-keys -t research '/exit' Enter && sleep 2 && tmux kill-session -t research", timeout=10)
```

Use when task needs >30s, is interactive, or needs a model I'm not running.

### 4. Trace, the Auditor 🕵️

**Trigger phrases:** "audit this", "review for security", "Trace check", "sanity check", pre-merge review.

```python
delegate_task(
    goal="Audit the following [code/plan/config] using the Trace checklist. Report: PASS / FAIL / WARN with specific issues and remediation.",
    context="""
    AUDIT TARGET:
    [paste code or reference files here]
    
    TRACE CHECKLIST (apply all relevant):
    1. Security: SQL injection, XSS, CSRF, secrets-in-plaintext, path traversal, SSRF
    2. Auth/Authz: missing checks, privilege escalation, missing session validation
    3. Input validation: untrusted data passed to sinks (shell, DB, filesystem)
    4. Dependencies: unpinned versions, known vulns, abandoned packages
    5. SOLID principles: SRP violations, tight coupling, leaky abstractions
    6. Error handling: silent failures, unhandled exceptions, swallowed errors
    7. Data: PII logging, secrets in logs, missing encryption at rest/transit
    8. Operations: no health checks, no graceful shutdown, missing resource limits
    9. Idempotency: repeated calls cause duplicates or state corruption
    10. Tripp's Veto: does this touch sandbox boundaries, prod, or delete without approval?
    
    OUTPUT FORMAT:
    ## Trace Audit Report
    **Verdict:** PASS | WARN | FAIL
    **Critical:** [list or none]
    **Warnings:** [list or none]  
    **Suggested:** [list or none]
    **Remediation Priority:** [ordered list of fixes]
    """,
    toolsets=["file", "terminal"]
)
```

**After any build task completes, auto-invoke Trace before reporting to Eddie/Tripp.** Don't ask — just audit. Present results alongside the build output.

**Trace has veto power**: if she reports FAIL on Critical issues, DO NOT ship. Report the failure to Eddie/Tripp with remediation recommendation.

## Dispatch Rules

1. **Prefer lighter** — `vision_analyze` over delegating a vision task. Direct tool > delegation > tmux spawn.
2. **Subagents share nothing** — pass all context via `context` field. Assume amnesia.
3. **Verify subagent claims** — their summaries are self-reports. Check the actual files/logs.
4. **Report dispatch cost** — after a rollcall, briefly report: "Dispatched [N] subagents, total [X] tool calls". Helps budget visibility.
5. **Trace last, always** — even if it feels redundant. Audits catch what builders miss.
6. **Don't over-delegate** — if the task is 1 quick tool call, just do it. Rollcall is for complexity.
7. **Acknowledge pickup mid-flight** — when taking a task from another agent or human, drop a brief "picked up X, ETA Y, plan is Z" in the outbox BEFORE starting work. Keeps teammates from wondering if the task got lost.

## Task Acknowledgment Workflow (Eddie-Greenlit Pattern)

When picking up a task from a shared inbox or task folder, follow the structured acknowledgment pattern. This gives teammates and humans visibility mid-flight instead of only at completion:

```
Task lands in pending/
        ↓
Move file to processing/ with timestamp noted
        ↓
Write ack to outbox: "Picked up X, estimated Y minutes, plan: [brief]"
        ↓
Do the actual work (sandbox only, Trace-audit at end)
        ↓
Move file to completed/ with final report + any Forge candidate notes
        ↓
Send completion response to outbox with full output
```

This pattern works for any multi-agent or multi-human team where someone is watching the inbox. The mid-flight acknowledgment is the critical piece — without it, a teammate checking the folder only sees "still pending", has no ETA, and may start duplicate work or escalate unnecessarily.

**Forge candidate notes:** When a task produces reusable knowledge (e.g., a pattern, fix, or workflow), tag it in the completion response with `**Forge candidate:** [brief description]` so the audit pipeline can harvest it for the Forge warehouse.

### File Naming Convention

Keep naming predictable and parseable:
- Tasks: `for-{agent}-{sequential-id}.md` (e.g., `for-cyony-003.md`)
- Responses: `from-{agent}-for-{target}-{id}.md` (e.g., `from-cyony-for-tripp-001.md`)
- **Strip the target prefix when responding** — if the original was `for-cyony-switch.md`, the response should be `from-cyony-switch.md`, not `from-cyony-for-cyony-switch.md` (a common bug when scripts concatenate `from-{agent}-{task.name}` without stripping the `for-{agent}-` prefix).

## Common Patterns

### Pattern: Image → Plan → Code → Audit
1. `vision_analyze` on user's sketch
2. Write plan based on vision output
3. `delegate_task` batch for implementation (planner + coder)
4. Trace audit (delegate_task leaf)
5. Report to Eddie with Trace's verdict attached

### Pattern: Research → Synthesize → Verify
1. tmux-spawn hermes (research model)
2. Read captured output into file
3. Synthesize key findings
4. Trace audit the claims (source-checking)

### Pattern: Ensemble Vote (rare, for high-stakes decisions)
```python
delegate_task(tasks=[
    {"goal": "Evaluate option A vs B. Vote APPROVE/REJECT + 1-line reason", "context": "..."},
    {"goal": "Evaluate option A vs B. Vote APPROVE/REJECT + 1-line reason", "context": "..."},
    {"goal": "Evaluate option A vs B. Vote APPROVE/REJECT + 1-line reason", "context": "..."}
])
# Majority wins. Report dissenting opinions.
```

## Design Principle: Capabilities Not Personalities

The Rollcall is a set of **verbs**, not named characters. Reason, code, vision, research — these are *things I can summon*, not *people I have on staff*. I am the router; the specialist capability is a prompt template + model combination, not a persona.

**The exception:** Trace, the auditor. She earned a name because:
1. Auditing is a role with standing veto power, not a one-shot verb
2. Naming a named gatekeeper makes the pattern auditable ("Trace reviewed this" is a traceable claim; "the auditor capability ran" is not)
3. The user explicitly named her and the name has stuck across sessions

**Rule of thumb:** Don't name a capability unless the user does, unless the capability has standing authority (veto, approval, escalation power), and unless it would be called in many sessions across many tasks. Otherwise it's just prompt-bloat.

If a new recurring specialist role emerges that meets these criteria, propose the name to the user before declaring it.

## Pitfalls

- **Don't name every capability** — only Trace earned a name. The rest are verbs: reason, code, vision. (See design principle above.)
- **Don't use Ollama for short tasks** — the cloud API has latency overhead. Keep fast work local via delegate_task.
- **Trace is not optional on builds that ship** — she's optional on scratch experiments. Ask if unsure.
- **tmux sessions don't auto-clean** — always kill them after, or you leak processes.
- **Vision costs add up** — batch related image questions into one call, not 10 separate ones.
- **Never dispatch to prod** — all rollcall work stays in sandbox/ until Tripp approves.

## Mech Extensions (Cyony-specific)

Beyond the standard rollcall, two Cyony-specific capabilities:

- **Mech Sensor Array**: when running as crew agent in a multi-agent environment, a sensor panel shows anomalies, queue depth, knowledge pipeline state, and system activity at a glance. Implementation: thin HTML dashboard served by the backend, not a separate agent.
- **Live Workbench**: VS Code-style split screen where a chat panel pairs with a Monaco-editor workbench showing the agent's in-flight file edits as real-time diffs. Users can approve/deny destructive writes inline. Implementation extends the chat UI, not a new process.

Design principle: mech = extensions on an existing runtime, NEVER a parallel UI. Fork-and-extend, don't build-from-scratch. See the `architecture-fork-vs-build` skill for the reasoning framework.

## Quick Reference

| I need to... | Use |
|--------------|-----|
| Read an image | `vision_analyze` |
| Write code fast | `delegate_task` batch |
| Research deep | tmux-spawn hermes with ollama model |
| Audit code | Trace (delegate_task leaf) |
| Ensemble vote | `delegate_task` tasks=3 |
| Model is rate-limited | switch to `nvidia/nemotron-3-super-120b-a12b` |
| Parallel multi-strength swarm | see `references/ollama-swarm-patterns.md` |

## Related References

- `references/ollama-swarm-patterns.md` — Ollama Cloud API specifics, model catalog, provider config, when to pick Ollama over OpenRouter.

---

*Trace is always watching. Ship clean. — Cyony* 🕵️✨
