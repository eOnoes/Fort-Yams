# Tripp.Reason Smoke Test Pattern

Reusable boilerplate for Phase 1 smoke tests. Copy, adapt, delete after use.

## Why This Pattern
- `npx tsx -e '...'` cannot resolve `workspace:*` package aliases in eval mode
- Standalone `.mjs` files with `./dist/index.js` imports work reliably
- Requires `pnpm build` to have run first (dist/ must exist)
- Must NOT ship with the phase — `rm` before writing the report

## Standard Structure

```javascript
/**
 * Phase <X> Smoke Test
 * Run: cd packages/<pkg> && node smoke-test.mjs
 */
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

// Direct dist imports — never workspace: aliases in smoke tests
import { createX, createY } from "./dist/index.js";
import { createZ } from "../other-pkg/dist/index.js";

const workdir = join(tmpdir(), `tripp-<phase>-smoke-${randomUUID()}`);

async function setup() {
  await mkdir(workdir, { recursive: true });
  console.log("✅ Setup: Created temp workdir");
}

async function teardown() {
  await rm(workdir, { recursive: true, force: true });
  console.log("✅ Teardown: Removed temp workdir");
}

// ── Mocks ──────────────────────────────────────────────────────────

/**
 * Mock ProviderAdapter — emits message chunks only, NO finish event.
 * ReasonLoop owns finish event emission (Phase 1D boundary).
 */
function createMockProvider() {
  return {
    name: "mock-provider",
    async *stream(request) {
      yield { type: "message", content: "Hello ", role: "assistant" };
      yield { type: "message", content: "world!", role: "assistant" };
      // No finish. Provider stops here.
    },
    async listModels() {
      return ["mock-model"];
    },
  };
}

/**
 * Mock ToolDispatcher — safe read tool + gated write tool.
 * Used by ReasonLoop smoke tests (Phase 1F).
 */
function createMockDispatcher() {
  const listDirTool = {
    name: "list_dir",
    description: "List directory",
    inputSchema: { safeParse: (x) => ({ success: true, data: x }) },
    requiresApproval: false,
    async execute(input, context) {
      return { status: "ok", output: { entries: ["file1.txt", "file2.txt"] } };
    },
  };

  const writeFileTool = {
    name: "write_file",
    description: "Write file",
    inputSchema: { safeParse: (x) => ({ success: true, data: x }) },
    requiresApproval: true,
    async execute(input, context) {
      return { status: "ok", output: { written: true } };
    },
  };

  return {
    listTools() { return [listDirTool, writeFileTool]; },
    async dispatch(toolName, input, context) {
      const tool = [listDirTool, writeFileTool].find((t) => t.name === toolName);
      if (!tool) return { status: "error", output: null, error: `Unknown tool: ${toolName}` };
      return tool.execute(input, context);
    },
  };
}

/**
 * Mock Approver — always approves. For approval-flow smoke tests.
 */
function createMockApprover() {
  return {
    async requestApproval(operation) {
      return { approved: true, reason: "mock-approved" };
    },
  };
}

// ── In-Memory Store Helper ─────────────────────────────────────────

function createTestStore() {
  // initDb(":memory:") for SQLite in-memory testing
  // Returns { db, repos }
}

// ── Test Structure ─────────────────────────────────────────────────

async function main() {
  console.log("\n=== Phase <X> Smoke Test ===\n");
  await setup();

  try {
    // 10+ numbered test steps, each logging ✅ on pass
    console.log("✅ Test 1: ...");
    console.log("✅ Test 2: ...");
    console.log("\nALL PASS — N/N\n");
  } catch (err) {
    console.error("FAIL:", err.message);
    process.exit(1);
  } finally {
    await teardown();
  }
}

main();
```

## Execution Recipe
```bash
# In packages/<pkg>:
pnpm build                     # dist/ must exist first
node smoke-test.mjs            # run the test
rm smoke-test.mjs              # delete before report
# Then write the phase report
```

## Things That Always Bite
1. **Forgetting `pnpm build`** — smoke test imports from `./dist/index.js`, which doesn't exist until build runs
2. **Using `workspace:*` imports** — Node runtime can't resolve pnpm workspace aliases without a bundler
3. **Leaving smoke-test.mjs in the repo** — it's not permanent infrastructure, delete before report
4. **Mock provider emitting finish events** — violates the Phase 1D boundary. ReasonLoop owns finish.
5. **Async generator typos** — `async *stream(request)` not `async stream(request)`. Missing `*` turns it into a regular async function that returns an iterable promise rather than being an iterable itself.

## Phase-Specific Adaptations
- **Phase 1B (store)**: Only needs `initDb(":memory:")` + the actual repositories. No mocks.
- **Phase 1C (core)**: Uses real `createRunManager` + real `initDb(":memory:")`
- **Phase 1D (providers)**: Needs `globalThis.fetch` mock for SSE streaming simulation
- **Phase 1E (tools)**: Needs real filesystem under `workdir` (mkdir/writeFile in setup)
- **Phase 1F (ReasonLoop)**: Full stack — mock provider + mock dispatcher + mock approver + real RunManager + real store
