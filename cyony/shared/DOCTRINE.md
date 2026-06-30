# Tripp.Reason Doctrine

> Enforceable constraints for the Tripp.Reason clean-room rebuild.
> All future build agents must obey this document before writing implementation code.

---

## What Tripp.Reason Is

A **lean, local-first agent runtime** for coding agents, prompt routing, tool execution, swarm coordination, and audit-backed task completion.

It is the **execution brain** for the crew. It does not perform the work — it controls, coordinates, records, and gates it.

Core identity:
- Fast coding-agent harness
- Provider and model router
- Swarm coordinator (bounded, not chaotic)
- Tool execution boundary
- Session, report, and audit engine
- Force multiplier for OpenClaw and Hermes

Operating model:
```
Operator (Eddie) = Supervisor
Tripp.Reason     = Lead / job coordinator
OpenClaw         = Skilled builder
Hermes           = Creative explorer (sandboxed)
Warden           = Scope/safety/drift checker
Forge            = Approved tooling inventory
Reports          = Shift log
```

---

## What Tripp.Reason Is Not

This section exists to prevent scope creep. Name the ghosts, kill them.

| Tripp.Reason is NOT | Ghost being killed |
|---|---|
| Goose | No Goose branding. No Goose code. Clean-room only. |
| A Goat/Reasonix fork | Reference material is read-only. |
| A provider zoo | 5 providers max at v1. No cloud-platform sprawl. |
| Desktop-first | Local web dashboard only. No Electron in Phase 1. |
| A plugin marketplace | No skills/plugins store at v1. |
| A swarm launcher by default | Default = solo. Swarm requires explicit escalation. |
| A local inference engine | API-based only. No Candle/llama.cpp/GPU code. |
| A UI-first project | Core runs without UI. Always. |
| A replacement for OpenClaw or Hermes | It amplifies them; it does not substitute them. |
| Allowed to mutate repos without approvals | Destructive/mutating ops require explicit gate. |
| A chatbot | It coordinates work; it is not the work itself. |
| A telemetry farm | Local logs/reports only. No PostHog/analytics. |
| A Telegram gateway | Out of scope. Messaging bridges belong in Tripp.Control later. |
| A recipe/deeplink system | Simpler task templates suffice. |
| A scheduler | Not needed in Phase 1. Add only when proven. |

---

## Hard Rules

1. **Core must run without UI.**
2. **Core must run without swarm.**
3. **Core must run without MCP.**
4. **MCP tools must not mutate core architecture.**
5. **Swarm workers return structured packets, not vague prose.**
6. **Every run produces a Markdown report.**
7. **Every shell command is logged.**
8. **Destructive commands require ApprovalGate.**
9. **Repo boundary is sacred.** Tripp.Reason does not rewrite entire repos.
10. **Default worker count is 1 (solo).** Max swarm = 25, requires manual approval.
11. **FastPath must stay fast.** (<2s for simple routing/summary).
12. **DeepPath must validate.** Every mutation is checked.
13. **No Goose branding anywhere.**
14. **No inherited provider sprawl.** Use OpenAI-compatible as primary adapter contract.
15. **Doctrine trumps code.** When in doubt, the docs win.

---

## Phase 1 Allowed Scope

Build only the kernel. Prove the loop before proving the product.

- TypeScript pnpm monorepo skeleton
- Single `openai-compatible` provider adapter (covers Ollama Cloud, OpenRouter, any OpenAI-shaped endpoint)
- Read-only tools active: `list_dir`, `read_file`, `search`
- Mutating tools as **contracts only** (write_file, edit_file, shell) behind ApprovalGate
- SQLite store with sessions/runs/events/tool_calls/reports tables
- Session persistence
- ReasonLoop: prompt → stream → events → session → report.md
- CLI: `tripp run "<prompt>"` (single-shot, no streaming UI required)
- Markdown run report for every completed loop

## Phase 1 Forbidden Scope

- ❌ No swarm runtime
- ❌ No MCP bridge
- ❌ No UI / dashboard / Electron
- ❌ No OpenClaw or Hermes adapters
- ❌ No write/edit/shell execution (contracts only)
- ❌ No multi-provider fan-out (adapter interface yes, multiple impls no)
- ❌ No recipe system, scheduler, hooks, skills, plugins
- ❌ No OAuth flows, Nostr, Telegram, visualization tools
- ❌ No local inference (Candle, llama.cpp, CUDA, Vulkan)
- ❌ No Goose code copying (reference only)

---

## Clean-Room Rule

The legacy fork at `/opt/data/shared/Tripp.Reason.Legacy/` is **read-only reference material**.

- ✅ Study Goose patterns to extract requirements
- ✅ Reference the audit documents for architectural contracts
- ❌ Do not copy source files
- ❌ Do not port Rust code to TypeScript line-by-line
- ❌ Do not preserve Goose naming (reply → EventStream, agent → ReasonLoop, etc.)
- ❌ Do not preserve Goose folder structure

If you find yourself pasting Goose code and renaming things, **stop**. Refactor.

---

## Report Requirement

Every run at every phase must be able to emit:
```
reports/<session-id>/<run-id>.md
```

Minimum report sections:
- Status (PASS / FAIL / PARTIAL)
- Prompt
- Model / Provider
- Events summary
- Tool calls
- Files changed (or "None")
- Validation
- Next step

This matches the crew audit workflow. It is not optional. Do not bolt it on later.

---

## Repo-Boundary Rule

Tripp.Reason must respect repository boundaries:

- Never rewrite a full repo
- Never run destructive shell commands without ApprovalGate
- Never access files outside the declared workdir unless explicitly permitted
- Log every file touched and every shell invoked

---

## ApprovalGate Rule

Operations split into two classes:

**Safe (no approval):**
- Read files, list dirs, search, generate text, summarize
- Create local report files
- Emit events to session store

**Gated (requires approval):**
- Write/edit files
- Execute shell commands
- Modify project config
- Spawn swarm workers beyond default
- Network requests to external APIs beyond the configured provider

Implementation: `ApprovalGate.canProceed(operation)` returns boolean. In Phase 1, default to **manual operator approval** via CLI prompt.

---

## Provider-Bloat Prevention Rule

Maximum providers at any phase: **5**.

Current Phase 1 set:
1. `openai-compatible` (primary — covers Ollama Cloud, OpenRouter, any OpenAI-shaped endpoint)

Add new providers only when:
- A real use case cannot be served by OpenAI-compatible or OpenRouter
- The provider has stable, versioned, documented API
- A test exists that the adapter must pass before merge

Never add: AWS Bedrock, SageMaker, Azure, GCP Vertex, Databricks, Snowflake, Copilot, Codex, Cursor, xAI, NanoGPT, Nostr, Avian, or any other cloud-platform-native provider. OpenRouter covers the long tail.

---

## Swarm Restraint Rule

| Mode | Max Workers | Approval Required |
|---|---|---|
| Solo (default) | 1 | No |
| Small | 3–5 | No |
| Medium | 6–10 | Yes |
| Large | 11–20 | Yes |
| Max cap | 25 | Yes + manual |

Workers must be **role-bounded**:
- One worker = one focused task packet
- Workers return structured result packets
- Orchestrator owns decomposition and merge
- Warden reviews for scope drift

Swarm is **Phase 5**, not Phase 1.

---

## OpenClaw / Hermes Relationship Rule

Tripp.Reason **amplifies** OpenClaw and Hermes. It does not replace them.

```
Tripp.Reason = coordinator / tool boundary / session brain / swarm controller
OpenClaw     = disciplined builder worker
Hermes       = creative/exploratory (sandboxed) worker
Warden       = scope, safety, drift judge
Operator     = final approver
```

Adapters for OpenClaw/Hermes are out of scope until Phase 7. Until then, Tripp.Reason treats external agents as opaque workers it can dispatch to and receive packets from.
