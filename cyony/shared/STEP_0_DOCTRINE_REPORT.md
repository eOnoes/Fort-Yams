# Step 0 Doctrine Report

## PHASE
Step 0 — Doctrine / Architecture / Roadmap Lock

## STATUS
PATCHED PASS

## FILES CREATED

| # | File | Path |
|---|------|------|
| 1 | DOCTRINE.md | `/opt/data/shared/Tripp.Reason/docs/DOCTRINE.md` |
| 2 | ARCHITECTURE.md | `/opt/data/shared/Tripp.Reason/docs/ARCHITECTURE.md` |
| 3 | ROADMAP.md | `/opt/data/shared/Tripp.Reason/docs/ROADMAP.md` |
| 4 | This report | `/opt/data/shared/Tripp.Reason/reports/STEP_0_DOCTRINE_REPORT.md` |

**Total files in clean-room repo:** 4
**Total source files:** 0
**Total packages created:** 0
**Total dependencies installed:** 0

## SCOPE COMPLIANCE

✅ No implementation scaffold created
✅ No `packages/` directory exists
✅ No `package.json` created
✅ No `pnpm-workspace.yaml` created
✅ No `tsconfig` files created
✅ No source code files created
✅ No `node_modules/` or dependency installs
✅ No server, CLI, provider, MCP, swarm, or UI stubs

The clean-room repo contains only `docs/` and `reports/` with Markdown files.

## CLEAN-ROOM COMPLIANCE

✅ Goose audit used only as requirements extraction reference
✅ No Goose source code copied
✅ No Goose branding preserved
✅ No Goose folder structure replicated
✅ Tripp.Reason defined as its own system with its own contracts

**Reference materials consulted (read-only):**
- Goose deep audit (FINAL-AUDIT-REPORT.md, lean-harness-plan.md)
- Legacy fork at `/opt/data/shared/Tripp.Reason.Legacy/`
- Eddie's overhaul document (Tripp.Reason Overhaul.txt)
- Provider tier analysis for Ollama Cloud models

## BOUNDARIES LOCKED

### Identity Boundaries
- Tripp.Reason is a coordinator/runtime, not a worker or chatbot
- Not Goose, not a fork, not a provider zoo
- Amplifies OpenClaw/Hermes, does not replace them

### Architectural Boundaries
- 9 packages, strict dependency direction (shared is leaf, core depends only on shared via interfaces)
- **All cross-package contracts live in `packages/shared`** (ProviderAdapter, Tool, ToolDispatcher, Approver, ApprovalRequest, ApprovalResult, ProviderRequest, ProviderResponse, StreamEvent). Core and other packages import them — never redefine them.
- Core knows nothing about specific providers, tools, or approvers
- SQLite is the single persistence layer
- Every run produces a Markdown report — not optional

### Phase 1 Scope Boundaries
- One provider: openai-compatible only
- Active tools: list_dir, read_file, search (read-only)
- Gated tools: write_file, edit_file, shell (contract-only)
- `packages/cli/` exists with `tripp run "<prompt>"` only — single-shot, talks to core directly, no HTTP
- No swarm, no MCP, no UI, no server, no external agent adapters
- **Streaming distinction:** internal provider `AsyncIterable<StreamEvent>` allowed in ReasonLoop. HTTP/SSE server streaming forbidden. Network-exposed streaming enters in Phase 3.
- Success condition: `tripp run` → stream → events → session → report.md

### Provider Boundaries
- Max 5 providers ever, 1 in Phase 1
- OpenAI-compatible covers Ollama Cloud, OpenRouter, any OpenAI-shaped endpoint
- Explicit list of providers that will never be added

### Swarm Boundaries
- Default: 1 worker (solo)
- Max: 25 workers (requires manual approval)
- Workers role-bounded, return structured packets
- Not available until Phase 5

### Approval Boundaries
- Two classes: safe (no approval) vs gated (requires approval)
- All mutation gated by default
- Approver contract lives in shared; implemented by `CliApprover` (packages/cli) in Phase 1 and `ApiApprover` (packages/server) in Phase 3+

### Repo Boundaries
- No full-repo rewrites
- No destructive shell without approval
- All file touches logged
- Workdir boundary enforced

### Clean-Room Boundary
- Legacy fork is read-only reference at `/opt/data/shared/Tripp.Reason.Legacy/`
- New repo at `/opt/data/shared/Tripp.Reason/`
- No copying Goose code, only extracting patterns

## OPEN QUESTIONS

| # | Question | Risk if Unresolved | Recommended Resolution |
|---|----------|-------------------|----------------------|
| 1 | Should Drizzle or raw `better-sqlite3` be used for the store? | Low — both work | Use Drizzle for type safety; raw SQL fallback if perf needed |
| 2 | Should events be persisted before or after emission? | Medium — affects crash recovery | Persist before emit (no events lost); implement in Phase 1 |
| 3 | Should `RunManager` be a class or a set of functions? | Low — style preference | Class for Phase 1; refactor to functions if it stays simple |
| 4 | Should the report template be configurable or fixed? | Low | Fixed in Phase 1; configurable in Phase 3+ |
| 5 | ApprovalGate timeout — how long before auto-deny? | Medium | Default 5min timeout, configurable |
| 6 | Should the Ollama Cloud API key live in `.env` or in config.yaml? | Low | `.env` for runtime, config.yaml references env var |

**None of these block Phase 1 scaffold.** They can be resolved during implementation.

## PATCHES APPLIED

The following surgical corrections were applied during Step 0A:

1. **Shared contract ownership clarified**
   - `packages/shared` is now explicitly the single source of all cross-package contracts: `ProviderAdapter`, `Tool`, `ToolDispatcher`, `Approver`, `ApprovalRequest`, `ApprovalResult`, `ProviderRequest`, `ProviderResponse`, `StreamEvent`, plus all Zod schemas.
   - ARCHITECTURE.md previously implied `ProviderAdapter` was defined in either `core` or `providers`. Corrected: both packages only _implement_ or _consume_ the contract defined in `shared`.
   - Added explicit import rule: no package defines its own duplicate of a shared contract.
   - ApprovalGate and Provider Adapter contract sections now have ownership callouts and package-level implementation notes (`CliApprover` in `packages/cli`, `ApiApprover` in `packages/server`, `OpenAICompatibleProvider` in `packages/providers`).

2. **Phase 1 CLI scope clarified**
   - `packages/cli/` is now explicitly in Phase 1 with `tripp run "<prompt>"` only — single-shot, talks to core directly, no HTTP.
   - Phase 3 CLI expansion (`tripp chat` and interactive streaming) explicitly called out as Phase 3+.
   - Added explicit forbidden: "`tripp chat` or any interactive/streaming CLI command (that is Phase 3+)".
   - Monorepo layout comment for `cli` updated to reflect the split.

3. **Provider streaming vs HTTP/SSE streaming clarified**
   - Added explicit "Streaming distinction" section in ARCHITECTURE.md after the Minimum Phase 1 Runtime Flow.
   - Phase 1: internal provider async streaming allowed (`AsyncIterable<StreamEvent>`, in-process only).
   - Phase 1: HTTP/SSE server streaming forbidden (no Fastify, no listener, no external consumer).
   - Phase 3: Fastify exposes `/reply` as SSE endpoint, forwarding the internal stream to external clients.
   - ROADMAP.md Phase 1 Forbidden list updated: "HTTP server, SSE endpoints, Fastify, any network-exposed streaming (that is Phase 3)".
   - ROADMAP.md Phase 3 Allowed list updated: server "Forwards internal AsyncIterable<StreamEvent> out as network-visible SSE."

## PHASE 1 READINESS

**Phase 1 scaffold is APPROVED to begin upon Eddie's confirmation.**

All three Step 0 planning artifacts are now internally consistent:

- ✅ Contract ownership has a single source of truth (`packages/shared`)
- ✅ CLI existence in Phase 1 is explicit and scoped
- ✅ Internal streaming vs network streaming is unambiguous
- ✅ Phase 1 success condition is achievable within declared scope
- ✅ No forbidden work is implied by any allowed work
- ✅ Clean-room boundary remains intact (no code exists)

**Blocks remaining before scaffold:**
- None from doctrine/architecture/roadmap.
- Eddie's explicit greenlight is the only remaining gate.

**Recommended action on greenlight:**
Begin Phase 1 with `packages/shared/` — Zod schemas + all cross-package type/interface exports — as commit #1, per the commit sequence in NEXT STEP.

## NEXT STEP

### Recommended: Human + Tripp review of the three doctrine docs

**Review criteria (per Eddie):**
> "Would these docs stop an eager agent from accidentally rebuilding Goose with a new logo?"

**After approval:**
1. Phase 1 scaffold begins
2. First commit: monorepo skeleton + `packages/shared/` with Zod schemas
3. Second commit: `packages/store/` with SQLite schema
4. Third commit: `packages/providers/` with OpenAICompatibleProvider
5. Fourth commit: `packages/core/` with ReasonLoop
6. Fifth commit: `packages/tools/` with read-only tools
7. Sixth commit: CLI wiring + first successful `tripp run`

**Before Phase 1 begins, Eddie should confirm:**
- [ ] DOCTRINE.md reviewed and approved
- [ ] ARCHITECTURE.md reviewed and approved
- [ ] ROADMAP.md reviewed and approved
- [ ] Provider choice confirmed (openai-compatible first)
- [ ] Report template confirmed

---

*Step 0 complete. Clean-room boundary intact. No code exists. Waiting for review.*
