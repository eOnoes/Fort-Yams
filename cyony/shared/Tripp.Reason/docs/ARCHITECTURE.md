# Tripp.Reason Architecture

> System shape, package boundaries, and runtime contracts.
> All implementation must conform to this document.

---

## Monorepo Layout

```
Tripp.Reason/
├── packages/
│   ├── shared/         # Zod schemas, types, event contracts, all cross-package interfaces
│   ├── core/           # ReasonLoop, EventStream, ApprovalGate, RunManager
│   ├── providers/      # Provider implementations (contracts live in shared)
│   ├── tools/          # Tool implementations (contracts live in shared)
│   ├── store/          # SQLite via Drizzle, schema, repositories
│   ├── server/         # Fastify HTTP + SSE (Phase 3+)
│   ├── cli/            # Phase 1: tripp run. Phase 3+: chat/audit/report/session commands.
│   ├── mcp/            # MCP bridge (Phase 4+, placeholder only in Phase 1)
│   └── swarm/          # Orchestrator + workers (Phase 5+, placeholder only)
├── docs/               # DOCTRINE.md, ARCHITECTURE.md, ROADMAP.md
├── reports/            # Run reports: <session-id>/<run-id>.md
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## Package Boundaries

### Dependency Direction (strict)

```
shared  ← (no dependencies — leaf package)
core    ← shared
providers ← shared
tools   ← shared
store   ← shared
server  ← core, providers, tools, store, shared
cli     ← core, providers, tools, store, shared
mcp     ← shared (tools loaded dynamically)
swarm   ← core, shared
```

**Forbidden dependencies:**
- `shared` must never import from any other package
- `core` must never import `providers` directly (uses ProviderAdapter interface)
- `core` must never import `tools` directly (uses ToolDispatcher interface)
- `providers` must never import `tools`
- No circular dependencies between any packages

### Package Responsibilities

#### `shared`
Single source of truth for all Zod schemas, TypeScript types, **and cross-package interfaces**. Every interface that crosses a package boundary lives here. No other package defines these contracts.

**Schemas (data shapes):**
- `Message` schema (role, content, timestamp)
- `Session` schema (id, title, provider, model, mode, timestamps)
- `Run` schema (id, session_id, status, timestamps)
- `Event` schema (id, session_id, run_id, type, payload)
- `ToolCall` schema (id, session_id, run_id, tool_name, args, result, status)
- `Approval` schema (id, tool_call_id, status, reason, timestamps)
- `Report` schema (id, session_id, run_id, path, summary)
- `StreamEvent` union (Message | ToolRequest | Finish | Error)
- `ProviderRequest` (stream response is `AsyncIterable<StreamEvent>` — no `ProviderResponse` shape)
- `ApprovalRequest` / `ApprovalResult` shapes

**Contracts (cross-package interfaces):**
- `ProviderAdapter` — what core expects from a provider package
- `Tool` — what core expects from a tool package
- `ToolDispatcher` — what core expects from the tool layer
- `Approver` — what core expects from the approval layer
- `RunReport` — standard report structure

No runtime code. No classes. No implementations. Pure schemas, types, and interface definitions.

**Import rule:** Every other package imports its contracts from `shared`. No package defines its own duplicate of any shared contract.

#### `core`
The reason loop, event emission, approval gating, and run management.

Contains:
- `ReasonLoop` — orchestrates prompt → stream → events → session → report
- `EventStream` — typed event emitter (Message, ToolRequest, Finish, Error)
- `ApprovalGate` — checks whether an operation needs approval, routes to approver
- `RunManager` — creates/runs, tracks status, emits reports
- `FastPath` / `DeepPath` — routing decision (Phase 1: always DeepPath)
- `TokenCounter` — context window management (Phase 2+)
- `ContextCompactor` — when conversation exceeds limits (Phase 2+)

Core **imports contracts from shared** (does not define them here):
- `ProviderAdapter` — imported from shared; core accepts any implementor
- `ToolDispatcher` — imported from shared; core accepts any implementor
- `Approver` — imported from shared; core accepts any implementor (CLI prompt, API, etc.)

Core runs without knowing which provider, which tools, or which approver is actually in use. It programs only against the shared contracts.

#### `providers`
Provider implementations and the model router. **Does not define the ProviderAdapter contract** — that lives in `shared`. This package only implements it.

Contains:
- `OpenAICompatibleProvider` — the only Phase 1 implementation (implements `ProviderAdapter` from shared)
- `ModelRouter` — selects provider + model based on task tier or config

Phase 1: only `OpenAICompatibleProvider` is implemented. This covers:
- Ollama Cloud (`https://ollama.com/v1`)
- Any OpenAI-shaped endpoint (OpenRouter, LiteLLM, local proxies)

Additional adapters (Anthropic-native, Ollama-native, OpenRouter-native) are Phase 2+.

#### `tools`
Tool implementations. **Does not define the `Tool` or `ToolDispatcher` contracts** — those live in `shared`. This package implements them.

Phase 1 active tools:
- `list_dir` — list directory contents
- `read_file` — read file contents
- `search` — regex/grep search in files

Phase 1 contract-only (behind ApprovalGate, not executed):
- `write_file` — create/overwrite files
- `edit_file` — apply diffs
- `shell` — execute shell commands

Phase 2+:
- `git_status`, `git_diff`
- `run_tests`

`Tool` interface shape (defined in `shared`, implemented here):
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  requiresApproval: boolean;
  execute(input: unknown, context: ToolContext): Promise<ToolResult>;
}
```

#### `store`
SQLite persistence via Drizzle ORM.

Tables:
- `sessions` — id, title, created_at, updated_at, status, provider, model, mode
- `runs` — id, session_id, status, started_at, completed_at
- `messages` — id, session_id, run_id, role, content, created_at
- `events` — id, session_id, run_id, type, payload_json, created_at
- `tool_calls` — id, session_id, run_id, tool_name, args_json, result_json, status, created_at
- `approvals` — id, session_id, run_id, tool_call_id, status, reason, created_at, resolved_at
- `swarm_runs` — (Phase 5+) id, session_id, mode, worker_count, status, timestamps
- `swarm_workers` — (Phase 5+) id, swarm_run_id, role, task, status, result_json, timestamps
- `reports` — id, session_id, run_id, path, summary, created_at

#### `server` (Phase 3+)
Fastify HTTP server with SSE streaming.

Routes:
- `POST /reply` — SSE stream of agent responses
- `GET /sessions` — list sessions
- `GET /sessions/:id` — get session
- `GET /sessions/:id/events` — get events
- `GET /tools` — list available tools
- `POST /approvals/:id/resolve` — approve/deny a tool call
- `GET /health` — status check
- `GET /status` — provider/model/session counts

#### `cli` (Phase 1+, expands in Phase 3)
CLI commands via Commander or oclif. Package exists in Phase 1 with a minimal surface.

**Phase 1 (minimum viable):**
- `tripp run "<prompt>"` — single-shot run, outputs report path + summary to terminal

**Phase 3+ (expands when server exists):**
- `tripp chat` — interactive streaming session (connects to server SSE)
- `tripp audit` — view recent reports and tool calls
- `tripp report <session-id>` — display/generate report
- `tripp sessions` — list/manage sessions

Phase 1 CLI talks directly to core (no HTTP). Phase 3 CLI talks to the server over HTTP/SSE.

#### `mcp` (Phase 4+, placeholder)
MCP client loader and tool schema registry. Empty in Phase 1.

#### `swarm` (Phase 5+, placeholder)
Orchestrator, worker registry, task decomposition, merge logic. Empty in Phase 1.

---

## Event Contract

All events flow through `EventStream`. Consumers subscribe by event type.

```typescript
type StreamEvent =
  | { type: "message"; content: string; role: "assistant" }
  | { type: "tool_request"; tool: string; args: unknown; requiresApproval: boolean }
  | { type: "tool_result"; tool: string; result: unknown; status: "ok" | "error" }
  | { type: "finish"; reason: "complete" | "max_turns" | "error"; runId: string }
  | { type: "error"; message: string; recoverable: boolean };
```

Every event is persisted to the `events` table before emission. No events are lost.

---

## Report Contract

Every completed run produces a Markdown report at:
```
reports/<session-id>/<run-id>.md
```

Report template:
```markdown
# Tripp.Reason Run Report

## Status
PASS | FAIL | PARTIAL

## Prompt
<user prompt>

## Model / Provider
<provider> / <model>

## Duration
<start> → <end> (<elapsed>)

## Events
<summary of event types and counts>

## Tool Calls
<list of tools called, args summary, result summary>

## Files Changed
<list or "None">

## Validation
<check results or "N/A">

## Next Step
<suggested follow-up or "Done">
```

---

## Minimum Phase 1 Runtime Flow

```
1. User submits prompt via CLI (tripp run "...")
2. RunManager creates Run record (status: "running")
3. ReasonLoop starts:
   a. Build ProviderRequest from prompt + session history
   b. Call ProviderAdapter.stream(request)
   c. For each StreamEvent:
      - Emit to EventStream
      - Persist to events table
      - If tool_request: check ApprovalGate
         - Safe tool: execute immediately
         - Gated tool: pause, request approval
      - If tool_result: persist to tool_calls table
      - If message: persist to messages table
   d. On finish: mark Run complete
4. RunManager generates report.md
5. Report path saved to reports table
6. CLI outputs report path + summary
```

This flow works with:
- One provider (openai-compatible)
- Read-only tools active
- Mutating tools as gated contracts
- No swarm, no MCP, no UI, no server

**Streaming distinction:**
- **Allowed in Phase 1:** _internal_ provider async streaming. `ProviderAdapter.stream()` returns an `AsyncIterable<StreamEvent>` that ReasonLoop consumes in-process. This is not HTTP — it is an in-memory async generator.
- **Forbidden in Phase 1:** HTTP/SSE server streaming. There is no HTTP listener, no SSE endpoint, no Fastify, no external consumer.
- **Allowed in Phase 3:** Fastify HTTP server exposes `/reply` as an SSE endpoint that forwards the internal stream to external clients. This is the boundary where internal async streaming becomes network-visible.

The distinction matters because the Goose audit shows SSE is a retained speed pattern, but the network exposure belongs to the server layer, not the core loop.

---

## ApprovalGate Contract

> **Contract ownership:** `Approver`, `ApprovalRequest`, and `ApprovalResult` are defined in `packages/shared`. Implementations live in the packages that provide them.

```typescript
interface Approver {
  requestApproval(operation: ApprovalRequest): Promise<ApprovalResult>;
}

interface ApprovalRequest {
  toolName: string;
  args: unknown;
  riskLevel: "safe" | "mutating" | "destructive";
  context: { session_id: string; run_id: string };
}

type ApprovalResult =
  | { approved: true; reason?: string }
  | { approved: false; reason: string };
```

Phase 1: `CliApprover` in `packages/cli` (prompts operator in terminal).
Phase 3+: `ApiApprover` in `packages/server` (HTTP endpoint for dashboard).
Phase 5+: `AutoApprover` in `packages/swarm` (policy-based, for trusted swarm workers).

---

## Provider Adapter Contract

> **Contract ownership:** `ProviderAdapter` and `ProviderRequest` are defined in `packages/shared`. The provider response is `AsyncIterable<StreamEvent>` — no separate `ProviderResponse` shape. Implementations live in `packages/providers`.

```typescript
interface ProviderAdapter {
  name: string;
  stream(request: ProviderRequest): AsyncIterable<StreamEvent>;
  listModels(): Promise<string[]>;
}

interface ProviderRequest {
  model: string;
  messages: Message[];
  tools?: ToolSchema[];
  maxTokens?: number;
  temperature?: number;
}
```

The `OpenAICompatibleProvider` implements this by hitting any base URL that speaks OpenAI chat/completions format. This is the universal adapter — it covers Ollama Cloud, OpenRouter, and any OpenAI-shaped endpoint.
