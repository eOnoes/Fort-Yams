# Fake Provider Testing for Agent Runtimes

> Reference: deterministic testing of LLM agent runtimes without network dependencies.

## Problem

Agent runtimes (ReasonLoop, agentic loops, tool-calling harnesses) are hard to test because they depend on:
- Live LLM providers (API quota, network, nondeterministic)
- Tool execution (filesystem, git, shell)
- Approval gates (operator interaction)
- Store persistence (database state)

The traditional approach of "just run it with a real provider" creates:
- Flaky tests (provider latency, quota, rate limits)
- Slow feedback (network round-trips)
- Nondeterministic output (temperature, model variance)
- Cost (API tokens)

## Solution: Fake Provider + Mock Approver + In-Memory Store

Create a **deterministic test harness** that exercises the full runtime path identically to a live provider, with zero network.

### Core Pattern

```typescript
// 1. Fake Provider: yields StreamEvents in sequence
class FakeProvider {
  constructor(private events: StreamEvent[]) {}
  get name() { return "fake-test-provider"; }
  async *stream(request: ProviderRequest): AsyncIterable<StreamEvent> {
    for (const event of this.events) {
      yield event;
    }
  }
  async listModels() { return ["fake-model"]; }
}

// 2. Mock Approver: configurable approve/deny
class MockApprover {
  constructor(private approve = true) {}
  requests: ApprovalRequest[] = [];

  async requestApproval(req: ApprovalRequest): Promise<ApprovalResult> {
    this.requests.push(req);
    return this.approve
      ? { approved: true, reason: "mock" }
      : { approved: false, reason: "mock denial" };
  }
}

// 3. Assemble runtime with in-memory store
function createTestRuntime(events: StreamEvent[], opts = {}) {
  const db = initDb(":memory:");  // no disk
  const repos = createRepositories(db);
  const provider = new FakeProvider(events);
  const dispatcher = createDispatcher([...activeTools]);
  const approver = new MockApprover(opts.approve ?? true);
  const approvalGate = opts.withGate !== false
    ? createApprovalGate({ approver, throwOnDenial: true })
    : undefined;
  const runManager = createRunManager({
    repos, eventStream: createEventStream(),
    workdir, generateReportOnComplete: true,
  });
  const loop = createReasonLoop({
    provider, runManager, toolDispatcher: dispatcher,
    approvalGate, model: "fake", providerName: "fake",
  });
  return { loop, runManager, repos, approver };
}
```

### Positive E2E Test

```typescript
const e2eEvents: StreamEvent[] = [
  { type: "message", content: "Starting...", role: "assistant" },
  { type: "tool_request", tool: "write_file",
    args: { path: "hello.ts", content: "export const x = 1;" },
    requiresApproval: true },
  { type: "tool_request", tool: "git_status", args: {},
    requiresApproval: false },
  { type: "message", content: "Done.", role: "assistant" },
];

const { loop, repos, approver } = createTestRuntime(e2eEvents, { approve: true });
const result = await loop.run({ prompt: "Create file", workdir: tmpDir });

// Assert
assert(result.status === "completed");
assert(existsSync(join(tmpDir, "hello.ts")));
assert(approver.requests.length === 1);
assert(approver.requests[0].toolName === "write_file");
```

### Negative-Path Tests

```typescript
// A: Denial blocks mutation
const denialRt = createTestRuntime([
  { type: "tool_request", tool: "write_file",
    args: { path: "no.ts", content: "x" },
    requiresApproval: true },
], { approve: false });
const result = await denialRt.loop.run({ prompt: "Write" });
assert(!existsSync(join(tmpDir, "no.ts")));

// B: No gate fails closed
const noGateRt = createTestRuntime([
  { type: "tool_request", tool: "write_file",
    args: { path: "no.ts", content: "x" },
    requiresApproval: true },
], { withGate: false });
const result2 = await noGateRt.loop.run({ prompt: "Write" });
assert(!existsSync(join(tmpDir, "no.ts")));

// C: Dangerous shell rejected (relies on commandSafety in dispatcher)
const dangerRt = createTestRuntime([
  { type: "tool_request", tool: "shell",
    args: { command: "rm", args: ["-rf", "/"] },
    requiresApproval: true },
], { approve: true });
const result3 = await dangerRt.loop.run({ prompt: "Run rm" });
const toolCalls = await dangerRt.repos.listToolCallsByRun(result3.runId);
const shellCall = toolCalls.find(tc => tc.tool_name === "shell");
assert(shellCall?.status === "failed");
```

## Pitfalls

### 1. Workdir Self-Deletion

If your test script cleans its own directory with `rmSync(WORKDIR, { recursive: true })`, the script file MUST live OUTSIDE the workdir. Otherwise it deletes itself on the first run.

```typescript
// WRONG — script at tmp/phase-2e/smoke.mjs, WORKDIR = tmp/phase-2e
// rmSync(WORKDIR) deletes the script itself!

// RIGHT — script at tmp/smoke.mjs, WORKDIR = tmp/phase-2e
// rmSync(WORKDIR) only deletes test artifacts
```

### 2. Store Interface Assumptions

The repository interface may not expose the method you expect. For example, `listRunsBySession` may not exist even though `listSessions` and `getRun` do. Always check the actual repository exports before coding routes.

### 3. Full Session Objects Required

`createSession` often requires the FULL Session object (id, status, created_at, updated_at), not just the display fields. Generate IDs and timestamps in the caller:

```typescript
const now = new Date().toISOString();
const session = await repos.createSession({
  id: randomUUID(),
  title: "Test",
  status: "active",
  provider: "test",
  model: "test",
  created_at: now,
  updated_at: now,
});
```

### 4. Tool Call Persistence

Events (`recordEvent`) are NOT the same as tool calls (`recordToolCall`). If your report generator queries the `tool_calls` table but your ReasonLoop only records events, reports will show empty tool sections. Verify that EVERY tool dispatch path also persists a ToolCall record.

### 5. Import Placement

In ES modules, `import` statements must be at the top level of a file. You cannot use `import` inside a function body. Move all imports to the top.

## When to Use

- **End-to-end runtime validation**: Prove the full loop (provider → ReasonLoop → ApprovalGate → ToolDispatcher → RunManager → ReportGenerator) works without network
- **Negative-path testing**: Test denial, fail-closed, dangerous commands, path traversal deterministically
- **Regression testing**: Run the same fake provider sequence after every code change to catch breakage
- **CI/CD**: Zero external dependencies, runs anywhere

## When NOT to Use

- **Provider-specific behavior**: Fake provider doesn't test actual API formats, streaming edge cases, or tokenization
- **Performance testing**: Fake provider has zero latency; real-world performance needs live testing
- **Model quality evaluation**: Not a substitute for evaluating actual LLM output quality

## Relationship to TDD

Fake provider testing extends TDD for agent runtimes:
- **RED**: Write the fake provider sequence that should trigger a behavior
- **GREEN**: Implement the runtime code that handles it
- **REFACTOR**: Extract common test fixtures

The fake provider IS the test input. The assertions verify the runtime output.
