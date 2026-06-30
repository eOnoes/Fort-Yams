# Tripp.Reason Build Model Tiers

> Model routing doctrine for the Tripp.Reason clean-room rebuild.
> Hermes (Cyony) uses tier labels to select models without per-request operator input.
> All selections must remain within Eddie's budget-controlled allowed inventory.

---

## Tier Labels

Use these labels in build prompts instead of hardcoded model names:

| Tier | Label | Trigger |
|------|-------|---------|
| 1 | **Heavy Technical Thinking** | Architecture, contracts, hard bugs, high-risk changes |
| 2 | **Fast Technical Builder** | TypeScript scaffolds, wiring, straightforward implementation |
| 3 | **Creative Architecture Scout** | Exploration, alternate designs, Hermes sandbox work |
| 4 | **Budget Daily Driver** | Doc edits, small patches, routine reviews, cleanup |
| 5 | **Code Review / Warden Pass** | Drift checks, doctrine compliance, security review |
| 6 | **Vision / Image Analysis** | Screenshots, diagrams, visual UI review |
| 7 | **Research / Search Assist** | External information, discovery, outside-context checks |
| 8 | **Direct API Fallback** | Provider failure, fallback testing, isolated API tests |

---

## Tier Definitions

### 1. Heavy Technical Thinking

**Use for:**
- Architecture locks
- Schema contracts
- Provider adapter design
- Event model decisions
- Concurrency design
- ApprovalGate logic
- Swarm orchestration logic
- Difficult debugging and root cause analysis

**Preferred models (pick best fit):**
- `qwen3.5:397b:cloud` — S-Tier coding king, deep code understanding
- `ollama/deepseek-v4-pro` — S-Tier reasoning, logic-heavy work
- `qwen/qwen3.7-max` — OpenRouter primary, strong general reasoning

**Escalation rule:** Only use this tier for architecture, contracts, hard bugs, or high-risk changes. Routine work stays in Budget Daily Driver.

---

### 2. Fast Technical Builder

**Use for:**
- TypeScript scaffolds
- Package wiring
- CLI implementation
- Straightforward implementation tasks
- Small-to-medium code patches
- Routine code generation

**Preferred models (pick best fit):**
- `ollama/deepseek-v4-flash` — A-Tier, fast and cheap, default for code work
- `qwen/qwen3.6-plus` — OpenRouter, strong coding capability
- `ollama/kimi-k2.6` — A-Tier, balanced coding agent

**Default pick:** `ollama/deepseek-v4-flash` for most implementation work.

---

### 3. Creative Architecture Scout

**Use for:**
- Hermes exploration tasks
- Alternate design proposals
- UX/workflow concepts
- Doctrine evolution ideas
- New agent-role concepts
- "What if we tried..." scenarios

**Preferred models (pick best fit):**
- `moonshotai/kimi-k2.6` — OpenRouter, strong creative + coding
- `ollama/kimi-k2-thinking` — Extended reasoning for exploration
- `x-ai/grok-build-0.1` — Fresh perspective, non-default thinking patterns

**Sandbox rule:** Creative scout work should propose, not implement. Proposals go through Warden Pass before being built.

---

### 4. Budget Daily Driver

**Use for:**
- Doc edits and reviews
- Small patches
- Report cleanup
- Routine file operations
- Low-risk refactors
- Status checks, summaries, routing decisions

**Preferred models (pick best fit):**
- `ollama/minimax-m3` — A-Tier daily driver, balanced cost/quality
- `ollama/deepseek-v4-flash` — A-Tier, fast and cheap
- `qwen/qwen3.6-plus` — OpenRouter, solid general purpose

**Rule:** Default tier for 80% of work. If a task fits here, it belongs here. Don't escalate unnecessarily.

---

### 5. Code Review / Warden Pass

**Use for:**
- Drift checks against doctrine
- Scope enforcement
- Doctrine compliance review
- Consistency review across packages
- Security and safety review
- Every major phase report before proceeding

**Preferred models (pick best fit):**
- `ollama/deepseek-v4-pro` — S-Tier reasoning for critical review
- `qwen/qwen3.7-max` — OpenRouter primary, strong oversight
- `nvidia/nemotron-3-super-120b-a12b` — OpenRouter, strong structured review

**Mandatory use:** Every phase report must pass through this tier before proceeding to the next phase. No exceptions.

---

### 6. Vision / Image Analysis

**Use for:**
- Screenshot analysis
- Diagram review
- Visual UI component review
- Image-based debugging
- Architecture diagram validation

**Preferred models (pick best fit):**
- `google/gemini-2.5-flash` — Hermes vision auxiliary, reliable image understanding
- `ollama/gemini-3-flash-preview` — B-Tier visual/light processing

**Note:** Hermes vision subsystem defaults to `google/gemini-2.5-flash` via OpenRouter.

---

### 7. Research / Search Assist

**Use for:**
- Current external information lookup
- X/Twitter search for project discovery
- Outside-context validation
- Real-time data needs

**Preferred models:**
- `grok-4.20-reasoning` — X search model, external discovery

**Note:** This tier is for external information gathering, not internal codebase work.

---

### 8. Direct API Fallback

**Use for:**
- Provider failure recovery
- Fallback testing
- Direct model comparison
- Isolated API tests
- When primary providers are unavailable

**Available via direct API (not through Hermes routing):**
- `deepseek-reasoner` — DeepSeek direct API
- `deepseek-chat` — DeepSeek direct API
- `kimi-k2.6` — Moonshot direct API
- `moonshot-v1-128k` — Moonshot direct API (extended context)

**Access note:** These models require direct API calls (curl/Python) using credentials in `/opt/data/.env`. They are not routable through Hermes's provider system without additional configuration.

---

## Routing Rules

1. **Hermes selects freely within a tier** — no per-request operator input needed.
2. **Prefer tier labels over hardcoded model names** in build prompts.
3. **Use the cheapest capable tier** for routine work.
4. **Escalate deliberately** — Heavy Technical Thinking is reserved, not default.
5. **Warden Pass is mandatory** for every major phase report before proceeding.
6. **No budget bypass** — never select arbitrary OpenRouter catalog models outside the allowed list.
7. **Registration required** before using a model not currently in Hermes config.
8. **Fallback chain:** If a tier's preferred model fails → try next model in that tier → try Budget Daily Driver → try Direct API Fallback.

---

## Model Inventory Reference

Current inventory as of 2026-06-02:

**OpenRouter (Primary):**
- `qwen/qwen3.7-max` (default)
- `deepseek/deepseek-v4-pro` (fallback)
- `nvidia/nemotron-3-super-120b-a12b`
- `qwen/qwen3.6-plus`
- `x-ai/grok-build-0.1`
- `moonshotai/kimi-k2.6`

**Ollama Cloud (Registered):**
- `kimi-k2.6`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2-thinking`
- `minimax-m3` (registered 2026-06-02)
- `qwen3.5:397b` (registered 2026-06-02)
- `gemini-3-flash-preview` (registered 2026-06-02)

**Vision:**
- `google/gemini-2.5-flash` (OpenRouter auxiliary)

**Direct API (not Hermes-routable):**
- DeepSeek: `deepseek-chat`, `deepseek-reasoner`
- Kimi/Moonshot: `kimi-k2.6`, `moonshot-v1-8k`, `moonshot-v1-32k`, `moonshot-v1-128k`

**X Search:**
- `grok-4.20-reasoning`

---

*This doctrine governs model selection for the Tripp.Reason build. Update as inventory changes.*
