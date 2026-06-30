# Phase 5E ReasonLoop Worker Smoke Test Pattern

Reusable pattern for testing swarm workers with a ReasonLoop backed by a FakeProviderAdapter and in-memory SQLite.

## When to Use
- Testing any ReasonLoop-backed worker (swarm or standalone)
- Integration tests that need full ReasonLoop lifecycle without live providers
- Smoke tests for Phase 5E, 5F, 5G, or any future phase adding worker behavior

## Core Pattern

```javascript
import { initDb, createRepositories } from "../store/dist/index.js";
import { createRunManager, createReasonLoop } from "../core/dist/index.js";
import { runReasonLoopWorker } from "../swarm/dist/index.js";

// 1. In-memory store
const db = initDb(":memory:");
const repos = createRepositories(db);

// 2. RunManager
const runMgr = createRunManager({
  repos,
  workdir: "/tmp/test",
  generateReportOnComplete: false,  // skip report for speed
});

// 3. Fake provider (implements ProviderAdapter)
const fakeProvider = {
  name: "fake",
  async *stream(request) {
    yield {
      type: "message",
      content: JSON.stringify({ status: "pass", summary: "done" }),
      role: "assistant",
    };
    yield { type: "finish", runId: "test", status: "completed" };
  },
  async listModels() { return ["fake-model"]; },
};

// 4. ReasonLoop
const loop = createReasonLoop({
  provider: fakeProvider,
  runManager: runMgr,
  model: "fake-model",
  providerName: "fake",
});

// 5. Worker
const sub = { id: "s1", name: "Test", role: "coder", systemPrompt: "...", modelTier: "Fast Technical Builder", timeoutMs: 30000, frozenBehavior: true };
const task = { id: "t1", role: "coder", title: "Test", objective: "test", scope: "/tmp", modelTier: "Fast Technical Builder", riskLevel: "safe", timeoutMs: 10000, requiresApproval: false, expectedOutput: "JSON" };

const result = await runReasonLoopWorker({
  subagent: sub,
  taskPacket: task,
  reasonLoop: loop,
  workdir: "/tmp/test",
});

// result.status === "pass"
```

## FakeProviderAdapter Variants

### Structured JSON output (normal)
```javascript
async *stream() {
  yield {
    type: "message",
    content: '```json\n{"status":"pass","summary":"done"}\n```',
    role: "assistant",
  };
  yield { type: "finish", runId: "test", status: "completed" };
}
```

### Malformed output (tests partial result path)
```javascript
async *stream() {
  yield {
    type: "message",
    content: "Here is some unstructured text. No JSON here!",
    role: "assistant",
  };
  yield { type: "finish", runId: "test", status: "completed" };
}
```

### Tool request output (tests tool dispatch)
```javascript
async *stream() {
  yield {
    type: "tool_request",
    content: "",
    role: "assistant",
    tool_calls: [{ id: "call-1", function: { name: "list_dir", arguments: "{}" } }],
  };
}
```

### Never yields (tests timeout)
```javascript
const slowProvider = {
  name: "slow",
  async *stream() {
    await new Promise(() => {}); // hangs forever
  },
  async listModels() { return ["slow"]; },
};

const task = { ...task, timeoutMs: 500 }; // short timeout
```

## Mock ToolDispatcher

```javascript
function createMockDispatcher(extraTools = []) {
  const tools = [
    {
      name: "list_dir",
      description: "List directory",
      inputSchema: { safeParse: (x) => ({ success: true, data: x }) },
      requiresApproval: false,
      async execute() { return { status: "ok", output: { entries: [] } }; },
    },
    {
      name: "write_file",
      description: "Write file",
      inputSchema: { safeParse: (x) => ({ success: true, data: x }) },
      requiresApproval: true,
      async execute() { return { status: "ok", output: { path: "/tmp/x" } }; },
    },
    ...extraTools,
  ];
  return {
    listTools() { return tools; },
    async dispatch(name, input, ctx) {
      const tool = tools.find(t => t.name === name);
      if (!tool) return { status: "error", output: null, error: `Unknown: ${name}` };
      return tool.execute(input, ctx);
    },
  };
}
```

## Key Pitfalls

### initDb returns TrippDb, not { db, repos }
```javascript
// ❌ WRONG
const { db, repos } = store.initDb(":memory:");

// ✅ RIGHT
const db = store.initDb(":memory:");
const repos = store.createRepositories(db);
```

### Drizzle db has no .close()
The Drizzle `TrippDb` wrapper doesn't expose `.close()`. In-memory databases self-destruct when the process exits. No explicit close needed for smoke tests.

### ApprovalGate comes from @tripp-reason/core, not shared
```typescript
// ❌ WRONG
import type { ApprovalGate } from "@tripp-reason/shared";

// ✅ RIGHT
import type { ApprovalGate } from "@tripp-reason/core";
```

Shared exports: `Approver` (interface), `ApprovalRequest`, `ApprovalResult` (schemas).
Core exports: `ApprovalGate` (class), `createApprovalGate`, `ReasonLoop`, `createReasonLoop`, `RunManager`, `createRunManager`.

### Fake provider must NOT emit finish in stream()
The `stream()` async generator should yield `{ type: "message" }` events and optionally `{ type: "finish" }` as the last event. ReasonLoop consumes the stream and emits finish itself. If your fake provider yields finish events in the middle of the stream, it can cause phantom lifecycle events.
