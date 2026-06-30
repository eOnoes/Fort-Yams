# Phase 1D Providers Package Report

## PHASE
Phase 1D — Providers Package / OpenAI-Compatible Adapter / ModelRouter

## STATUS
**PASS** ✅

## MODEL TIERS USED
- **Heavy Technical Thinking** — provider contract alignment, streaming SSE translation, finish-event ownership boundary, model allowlist enforcement, error recovery strategy
- **Fast Technical Builder** — file creation, implementation, build/validation execution
- **Code Review / Warden Pass** — pre-submission scope compliance, dependency direction verification, forbidden pattern scan

---

## EXECUTIVE SUMMARY
Built the provider infrastructure layer for Tripp.Reason: 8 source files implementing `OpenAICompatibleProvider` (OpenAI-shaped chat/completions adapter with SSE streaming) and `ModelRouter` (multi-provider registry with selection by name or default). All components import only from `@tripp-reason/shared`, implement the `ProviderAdapter` contract, and produce valid `StreamEvent` outputs.

**Critical architectural decision**: Providers emit `message` and `error` stream events only — they do NOT emit `finish` events. Only ReasonLoop (Phase 1F) knows the `runId` and therefore owns finish event emission. This preserves the lifecycle boundary: providers stream model output, ReasonLoop owns run lifecycle.

**Full mock-fetch smoke test passed (10/10)**: provider creation, model allowlist rejection, missing model rejection, SSE streaming translation (2 message chunks → 2 StreamEvents, 0 finish events), listModels with endpoint + fallback, ModelRouter registration/selection/streaming, config validation.

**TypeScript compilation**: 0 errors across all 4 packages (shared, store, core, providers).

---

## FILES CREATED

### Package Configuration (2 files)
1. **`packages/providers/package.json`** — 19 lines, dep: `@tripp-reason/shared` only
2. **`packages/providers/tsconfig.json`** — 14 lines, extends base, adds `DOM`+`DOM.Iterable` lib for `fetch`/`Response`/`TextDecoder` types

### Source Files (6 files)
3. **`packages/providers/src/errors.ts`** — 36 lines, 4 error classes: `ProviderError`, `ProviderConfigError`, `ProviderRequestError`, `ProviderStreamError`
4. **`packages/providers/src/config.ts`** — 34 lines, `OpenAICompatibleConfig` + `ModelRouterConfig` interfaces
5. **`packages/providers/src/streaming.ts`** — 85 lines, `parseSSEStream(response)` async generator + `parseSSEChunk(data)` helper
6. **`packages/providers/src/openaiCompatibleProvider.ts`** — 145 lines, `OpenAICompatibleProvider` class implementing `ProviderAdapter`
7. **`packages/providers/src/modelRouter.ts`** — 76 lines, `ModelRouter` class with register/getProvider/getDefaultProvider/stream
8. **`packages/providers/src/index.ts`** — 28 lines, barrel exports

### Report (1 file)
9. **`reports/phase-1d-providers-report.md`** — This document

---

## FILES MODIFIED

### None
No existing files were modified. `pnpm-lock.yaml` was regenerated automatically by `pnpm install`.

---

## PROVIDER COMPONENTS CREATED

### 1. OpenAICompatibleProvider
Implements `ProviderAdapter` for any OpenAI-shaped chat/completions endpoint.

**Constructor config:**
- `name?` — provider name (default: "openai-compatible")
- `baseUrl` — API base URL (required)
- `apiKey?` — bearer token auth
- `defaultModel?` — fallback when request.model is absent
- `allowedModels?` — whitelist; models not in list are rejected
- `headers?` — additional HTTP headers

**stream(request):**
- Translates `ProviderRequest` → OpenAI chat/completions body
- Sets `stream: true` for SSE response
- Passes `model`, `messages`, `max_tokens`, `temperature`, `tools`
- Parses SSE `data: {...}` lines via `parseSSEStream()`
- Yields `StreamEventMessage` for `delta.content` chunks
- Yields `StreamEventError` for `chunk.error`
- **Does NOT yield `StreamEventFinish`** — ReasonLoop owns finish events

**listModels():**
- Tries `GET {baseUrl}/models`
- Falls back to `allowedModels` → `defaultModel` → empty array

### 2. ModelRouter
Multi-provider registry with selection by name.

- `register(provider)` — adds/replaces provider by name
- `getProvider(name)` — returns specific provider or throws
- `getDefaultProvider()` — returns configured default or first registered
- `listProviders()` — returns all registered provider names
- `stream(request, providerName?)` — convenience wrapper

### 3. Streaming Module
- `parseSSEStream(response: Response)` — async generator over `ReadableStream`
- `parseSSEChunk(data: string)` — single-line SSE parser
- Handles `data: [DONE]` sentinel
- Handles `chunk.error` field
- Extracts `choices[0].delta.content` for message events

### 4. Error Classes
- `ProviderError` — base class
- `ProviderConfigError` — invalid config (empty baseUrl)
- `ProviderRequestError` — model not allowed, no model specified, HTTP errors
- `ProviderStreamError` — SSE parse failure, network read failure

---

## VALIDATION RESULT

### TypeScript Compilation
```
$ pnpm typecheck
packages/shared typecheck: Done (0 errors)
packages/store typecheck: Done (0 errors)
packages/core typecheck: Done (0 errors)
packages/providers typecheck: Done (0 errors)
```

### Build
```
$ pnpm build
packages/shared build: Done
packages/store build: Done
packages/providers build: Done
packages/core build: Done
```

### Scope Compliance
- ✅ No `packages/tools/` directory
- ✅ No `packages/server/` directory
- ✅ No `packages/cli/` directory
- ✅ No `packages/mcp/` directory
- ✅ No `packages/swarm/` directory
- ✅ Only `shared`, `store`, `core`, `providers` exist

### Dependency Direction
- ✅ `shared` imports no internal packages
- ✅ `store` imports shared only
- ✅ `core` imports shared + store only
- ✅ `providers` imports **shared only** (no core, no store)

---

## SMOKE TEST RESULT

### Mock-Fetch Provider Tests (10 operations)

| # | Test | Result |
|---|------|--------|
| 1 | Provider created with config | ✅ Pass |
| 2 | Model allowlist rejects "forbidden-model" | ✅ ProviderRequestError |
| 3 | Missing model + no default caught | ✅ ProviderRequestError |
| 4 | SSE stream: 2 message chunks → 2 StreamEventMessage | ✅ Pass |
| 5 | Stream content: "Hello world!" reconstructed | ✅ Pass |
| 6 | **No finish event emitted by provider** | ✅ 0 finish events |
| 7 | listModels via endpoint: 3 models returned | ✅ Pass |
| 8 | listModels fallback to allowedModels | ✅ `["model-a","model-b"]` |
| 9 | ModelRouter register/select/stream | ✅ 2 providers, stream works |
| 10 | Config validation (empty baseUrl) | ✅ ProviderConfigError |

---

## SCOPE COMPLIANCE

| Constraint | Status |
|------------|--------|
| No ReasonLoop implementation | ✅ Pass |
| No tool implementation | ✅ Pass |
| No CLI implementation | ✅ Pass |
| No server implementation | ✅ Pass |
| No MCP implementation | ✅ Pass |
| No swarm implementation | ✅ Pass |
| No UI implementation | ✅ Pass |
| No extra provider implementations | ✅ Pass (only OpenAICompatibleProvider) |
| No Goose code copied | ✅ Pass |
| Providers imports only shared | ✅ Pass |

---

## DESIGN DECISIONS

### 1. Finish Event Ownership — Provider Does NOT Emit Finish
**Choice**: `OpenAICompatibleProvider.stream()` emits only `message` and `error` events. It explicitly skips `finish_reason` chunks from the SSE stream.

**Rationale**:
- Only ReasonLoop knows the `runId`
- `StreamEventFinish` requires `runId` field per shared schema
- If provider faked a runId, it would create a phantom lifecycle event
- Provider's job: translate model output into StreamEvents
- ReasonLoop's job: manage run lifecycle (start → stream → finish)

**Architecture boundary preserved**: Providers stream model output. ReasonLoop owns run lifecycle. No cross-contamination.

**Code evidence** (`streaming.ts:48`):
```ts
// finish_reason present but no runId → skip (ReasonLoop emits finish later)
// This is intentional: provider does not know runId, so cannot emit finish event.
return null;
```

**Test evidence** (smoke test #6): Zero finish events emitted across full mock SSE stream.

### 2. Native fetch() — Zero HTTP Dependencies
**Choice**: Use Node.js 20+ built-in `fetch()` for all HTTP calls.

**Rationale**:
- Node 20+ has fetch natively (no `node-fetch`, `got`, `undici`, `axios` needed)
- Zero additional dependencies
- Standard Web API — portable across environments
- Streaming via `ReadableStream.getReader()` is well-supported

**Trade-off**: Had to add `DOM` + `DOM.Iterable` to providers tsconfig lib (these types come from the DOM spec even though Node implements them)

### 3. SSE Parsing — Line-Based Buffer
**Choice**: Buffer response body chunks, split on `\n`, process `data: ` lines.

**Rationale**:
- SSE format is line-delimited
- Chunks may arrive mid-line (network fragmentation)
- Buffer + split ensures complete lines are always processed
- `[DONE]` sentinel cleanly terminates the stream

**Implementation** (`streaming.ts:25-42`):
```ts
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split("\n");
buffer = lines.pop() ?? ""; // Keep incomplete line
for (const line of lines) { ... }
```

### 4. Model Allowlist — Enforced at Stream Entry
**Choice**: `stream()` checks `allowedModels` before making any HTTP call.

**Rationale**:
- Fail fast — no wasted API call for disallowed models
- Clear error message includes allowed list
- Aligns with MODEL_TIERS.md doctrine (provider config enforces tier routing)

### 5. listModels Fallback Chain
**Choice**: Try endpoint → fall back to allowedModels → fall back to defaultModel → empty array.

**Rationale**:
- Some endpoints don't support `/models` (e.g., certain Ollama configs)
- Graceful degradation prevents hard failures
- Empty array is a valid return — caller decides what to do

### 6. ModelRouter — Registry Pattern, No Fanout
**Choice**: Simple map of name → adapter. Selection by name or default. No fallback chains.

**Rationale**:
- Phase 1 is single-provider (one adapter per endpoint)
- Fanout/fallback adds complexity without Phase 1 value
- Future phases can add tier-based routing (DOC: MODEL_TIERS.md already defines the tier labels)
- `register()` is idempotent (replace by name)

### 7. Error Taxonomy — 4 Classes
**Choice**: `ProviderError` base + `ConfigError` + `RequestError` + `StreamError`.

**Rationale**:
- Config errors = fix the setup
- Request errors = fix the input
- Stream errors = handle network/parse issues
- `instanceof` checks for typed error recovery in ReasonLoop (Phase 1F)

---

## BLOCKERS
**None.**

Ollama Cloud quota was exhausted during earlier crew usage. Provider is architecturally ready — just needs live API testing when quota refreshes. The mock-fetch smoke test validates all translation/routing logic without network dependency.

---

## NEXT STEP

### Recommended: Phase 1E — Tools Package
**Preconditions** (all met):
- ✅ `packages/shared/` complete (Phase 1A)
- ✅ `packages/store/` complete (Phase 1B)
- ✅ `packages/core/` complete (Phase 1C)
- ✅ `packages/providers/` complete (Phase 1D)
- ✅ Doctrine compliance verified

**Phase 1E Goals**:
1. Implement local file tools: `list_dir`, `read_file`, `search`
2. Implement gated tools: `write_file`, `edit_file`, `shell` (require approval)
3. Wire tool contracts to shared `Tool` interface
4. Build ToolDispatcher for routing tool calls by name

**Then after Phase 1E:**

### Phase 1F — ReasonLoop Integration
1. Wire prompt → provider.stream() → event processing
2. Optional tool request handling (via ApprovalGate + ToolDispatcher)
3. RunManager integration (lifecycle + report generation)
4. Finish event emission (ReasonLoop owns this)

---

## ADDITIONAL NOTES

### Lessons Learned
1. **Node 20+ fetch needs DOM lib in tsconfig** — counterintuitive for server code, but the types live in the DOM spec
2. **Finish event boundary is the most important design decision here** — getting this wrong would create phantom lifecycle events that corrupt reports and audit trails
3. **Mock fetch is sufficient for provider validation** — no need for live API testing during build phases
4. **SSE parsing is straightforward** — line-based buffering + JSON parse is all that's needed for OpenAI-compatible streams

### For Future Sessions
- Streaming.ts handles `chunk.error` but could be extended for provider-specific error shapes
- ModelRouter could support tier labels as keys in future (e.g. `router.getProvider("fast-builder")` → routes to Ollama/DeepSeek)
- OpenAICompatibleProvider accepts `tools` in ProviderRequest but doesn't do tool-call-specific SSE parsing yet (Phase 1F will handle tool_request StreamEvents from provider responses)
- The `data: [DONE]` sentinel is OpenAI-specific — if we ever need DeepSeek-native or Anthropic-native, those adapters will need their own streaming modules

---

**Report Generated**: 2026-06-02T04:38:00Z  
**Author**: Cyony (Hermes Agent)  
**Review Status**: Pending (Eddie + Tripp)
