# Tripp.Reason × Tripp.Forge × Skill Tree Router — Full Architecture Blueprint
> **Status:** Planning / 4-Way Collab Review  
> **Date:** 2025-06-16  
> **Participants:** Eddie (operator), Cyony (builder), Kimi (review), Codex (review), +1 AI (review)  
> **Target:** Evolve Tripp.Reason into a mode-aware harness that drives local LLMs (Qwen 3.6 27B Q2) reliably AND scales to cloud models (DeepSeek-V4, Claude, GPT-5).

---

## SECTION 1: THE THREE PILLARS

```
┌──────────────────────────────────────────────────────────────────┐
│                      TRIPP.REASON HARNESS                          │
│                                                                   │
│  PILLAR 1                  PILLAR 2                  PILLAR 3     │
│  SKILL TREE ROUTER         GATE SYSTEM               TRIPP.FORGE  │
│  ────────────────          ───────────               ───────────  │
│  "What to do"              "How to know it's done"    "Our TS     │
│  Intent → decompose →      Command must exit 0.       Forge —     │
│  phases → skill sets       Harness is authority.      the coercion│
│                                                       engine"     │
│  ┌─────────────────┐      ┌─────────────────┐      ┌───────────┐ │
│  │ Terrain: new/fix │      │ cargo test      │      │ TTSR       │ │
│  │ Intent: why build│      │ cargo clippy    │      │ WriteGuard │ │
│  │ 10-facet scan    │      │ rustfmt --check │      │ AutoFixes  │ │
│  │ Rival frames     │      │ custom oracles  │      │ InputRepair│ │
│  │ Binding constraint│     │                 │      │ BlastRadius│ │
│  │ Uncertainty reg. │      │ GREEN → polish  │      │ PolishGreen│ │
│  │ Skill vs SkillSet│      │ RED → feed back │      │ Learning   │ │
│  │ Phase chain      │      │ 3 loops → ask   │      │ Adaptive   │ │
│  └─────────────────┘      └─────────────────┘      └───────────┘ │
│                                                                   │
│  MODES: /mode general | /mode code-build | /mode code-chat | plan │
└──────────────────────────────────────────────────────────────────┘
```

---

## SECTION 2: SKILL TREE ROUTER (Pillar 1)

### 2.1 The Problem — Why Flat Skills Fail

- Flat skill lists (118 skills) bloat every system prompt (~6K tokens)
- Keyword matching loads irrelevant skills ("test" triggers 4 different skills)
- No phase awareness — every turn is standalone
- 500 disconnected skills from GitHub = no context, no customization, no coordination

### 2.2 The Solution — Intent-Gated Routing Tree

The router doesn't match keywords. It captures **problem intent** and builds a **phase chain** from it.

```
USER INPUT: "Build a finance tracker. React + Tailwind + SQLite. Dark theme. PWA. Local only."
     │
     ▼
GATE 0: TERRAIN — "Greenfield? Existing? Broken? Legacy? Extend? Retool? Fork?"
     └─ Detected: GREENFIELD (no existing code)
     │
     ▼
GATE 1: STACK DETECTION — "React + Tailwind + SQLite"
     └─ Pulls: scaffold tools (pnpm, vite, tailwind), governance (git, secrets)
     │
     ▼
GATE 2: PROBLEM DECOMPOSITION (see Section 2.3)
     └─ 10-facet scan → which dimensions are active?
     └─ Rival frames → alternative views of the problem
     └─ Binding constraint tournament → what unlocks everything else?
     └─ Uncertainty register → what don't we know?
     └─ Confidence assessment → are we ready to build?
     │
     ▼
GATE 3: SKILL vs SKILL SET DECISION
     ├─ Single facet, simple → one SKILL
     └─ Multi-facet, cross-domain → SKILL SET (plugin)
     │
     ▼
GATE 4: PHASE CHAIN BUILT
     │
     ├── Phase 1: SCAFFOLD    → [pnpm, vite, tailwind, writing-plans]
     │   ⚠ BLOCKER: SQLite in browser → use better-sqlite3, not sql.js
     │
     ├── Phase 2: GOVERNANCE  → [git-workflow, secret-safety]
     │
     ├── Phase 3: BACKEND     → [api-tester, drizzle ORM]
     │   ⚠ BLOCKER: local-only auth → skip JWT, use device PIN
     │
     ├── Phase 4: FRONTEND    → [sketch, claude-design, popular-web-designs]
     │   ⚠ BLOCKER: dark theme contrast → WCAG AA check
     │
     ├── Phase 5: MOBILE      → [pwa-checklist, viewport audit]
     │   ⚠ BLOCKER: responsive breakpoints → test sm/md/lg
     │
     ├── Phase 6: AUDIT       → [code-reviewer, security-engineer]
     │
     └── Phase 7: DELIVER     → [github-pr, phase-report-delivery]
```

### 2.3 Problem Decomposition Layer (From Video Transcript)

Before classifying intent, the router performs a deep problem decomposition:

| Step | Tool | What It Does |
|------|------|-------------|
| 1. Intent Capture | `INTENT.md` | "Legislative intent" — why are we building? Who for? What's in/out of scope? |
| 2. 10-Facet Scan | `problem-decomposer` | Scans 10 dimensions: knowledge, skill, emotional, structural, systemic, resource, perception, relational, temporal, environmental. Marks each active/inactive with severity. |
| 3. Rival Problem Frames | `frame-analyzer` | Presents 3+ alternative problem frames. Each frame: what it assumes, what it highlights, what it hides, risk if accepted too early. |
| 4. Binding Constraint Tournament | `constraint-tournament` | "Which facet, if unblocked, unlocks the most others?" Finds the keystone problem. |
| 5. Interaction & Propagation Matrix | `interaction-matrix` | How problems hide each other, amplify each other, or drive downstream outcomes. |
| 6. Decomposition — Root Causes | `root-cause` | Each facet broken down to specific root causes with evidence for/against. |
| 7. Architecture Translation | `arch-translator` | Converts diagnosis → component count, dependency order, keystone, lean vs full architecture with tradeoffs. |
| 8. Uncertainty Register | `uncertainty-register` | Every unresolved unknown, why it matters, what resolves it, whether it blocks action or lowers confidence. |
| 9. Exhaustion Check | `exhaustion-check` | Final sweep for missed dimensions, weakest evidence, near-drops, wrong frame risk. |
| 10. Confidence Assessment | `confidence` | Honest grade on the decomposition + what would raise/lower it. |

### 2.4 Skill vs Skill Set vs Skill Tree

| Level | Definition | Example |
|-------|-----------|---------|
| **SKILL** | One repeatable workflow. Logic + library. | "Edit this video transcript" |
| **SKILL SET** | Several skills working together for one purpose. Has coordination, shared context, output handoffs. | "Course Builder" — 18+ skills: commoditization diagnosis → differentiation → canvas analysis → premium positioning → ... |
| **SKILL TREE** | Multiple skill sets coordinated across an account. Each knows about the others. Outputs flow downstream. | Founder OS → Audience OS → Offer OS → Course OS → Clarity OS → Content OS → Distribution agents |

**Key insight:** Most real problems are skill set problems, not skill problems. Single-skill solutions only work for simple, single-facet tasks. Everything else needs coordinated skill sets.

### 2.5 Progressive Disclosure (Token Budget)

```
TURN 1: User says "build an app..."
        Loads: Router dispatch (400) + Phase chain template (150) + Scaffold skills (1K)
        = ~1.5K tokens

TURN 2: Scaffold done, governance begins
        Loads: Governance skills (800) + Blocker footnotes (300)
        Previous phase skills drop out
        = ~1.1K new tokens

TURNS 3-7: Each phase loads only its 1-3 skills
        ~1K new tokens per phase

TOTAL: ~8K for entire build chain
vs. CURRENT: ~14K baseline (118 skills in every prompt)
```

### 2.6 Blocker Registry

Each stack combo has a registry of known potholes + proven solutions, loaded alongside scaffold skills. The router doesn't wait for the problem — it pre-loads the workaround.

---

## SECTION 3: GATE SYSTEM — TRIPP.FORGE (Pillar 2 & 3)

### 3.1 Core Philosophy

> "The gate is the only authority on 'done.'"

- **RED-first:** Confirm the gate is RED (broken) before starting.
- **Deterministic correctness:** The model writes code. The harness checks it mechanically. The model repairs.
- **Coercive engineering:** Constrain the model's decision surface so heavily it can't help but succeed.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRIPP.FORGE — GATE LOOP                      │
│                                                                  │
│  For each turn (up to maxTurns):                                │
│                                                                  │
│  1. Ask model (with tools, adaptive thinking, TTSR watcher)    │
│     │                                                            │
│  2. If TTSR fired → inject corrective guidance, skip gate      │
│     │                                                            │
│  3. If degeneration (repetition loop) → STUCK (terminal)       │
│     │                                                            │
│  4. Run tool calls (execute each, feed results back)           │
│     │                                                            │
│  5. If tools touched editable files → WRITE GUARD              │
│     └─ cargo check + rustfmt on affected file immediately      │
│     └─ Model sees compiler output before next turn             │
│     │                                                            │
│  6. If model stopped OR edited files → SETTLE GATE             │
│     │                                                            │
│     ├─ a. APPLY AUTO-FIXES                                     │
│     │     └─ rustfmt, cargo fix, cargo clippy --fix,           │
│     │        auto-import, organize imports                     │
│     │     └─ Model is told: "Never hand-fix formatting"        │
│     │                                                            │
│     ├─ b. RUN GATE                                             │
│     │     └─ cargo test --lib && cargo clippy -- -D warnings   │
│     │     └─ Custom per-project: ~/.config/goose/config.yaml   │
│     │                                                            │
│     ├─ c. IF GREEN → POLISH ON GREEN                           │
│     │     └─ Safe structural rewrites                          │
│     │     └─ Re-gate, revert if regressed                      │
│     │     └─ DONE ✓                                             │
│     │                                                            │
│     └─ d. IF RED → FEED ERRORS BACK                            │
│           └─ Track error ages (samePersist)                    │
│           └─ Check gateNoProgress → STUCK                      │
│           └─ Feed parsed errors to model, continue             │
│                                                                  │
│  7. If model stopped with no tool calls while RED             │
│     └─ NO_TOOL_CALL_NUDGE → force action                      │
│                                                                  │
│  8. 3-LOOP SAFETY VALVE                                         │
│     └─ Same error persists 3 consecutive gates                 │
│     └─ STOP. Present to operator:                              │
│        "3 attempts exhausted. Unresolved: [X, Y, Z].            │
│         Continue? Skip? Escalate to heavier model?"            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Innovations (14 Priorities)

#### P1: Deterministic Gate
- Shell command must exit 0. Not the model's self-declaration.
- Default: `cargo test --lib && cargo clippy -- -D warnings`
- Per-project overrides in `~/.config/goose/config.yaml`
- Optional oracles: coverage %, boot smoke test, property tests
- `gate_stuck_repeats` detection: same total error set N times → STUCK

#### P2: Write-Time Guard
- Every file edit triggers immediate `cargo check` + `rustfmt` on that file
- Model sees compiler output BEFORE next turn
- Converts failure mode from "write 8 files → 40 errors" to "write 1 file → 2 errors → fix now"

#### P3: Deterministic Auto-Fixes
- `rustfmt` (all changed files)
- `cargo fix --allow-dirty` (unused imports, missing mut)
- `cargo clippy --fix --allow-dirty` (safe lint fixes)
- Auto-import via rust-analyzer or cargo check suggestions
- System prompt directive: "Never hand-fix formatting or mechanical issues. The harness does this."

#### P4: TTSR — Test-Time Safety Rules
- Rolling regex buffer on SSE stream (content + tool-args channels)
- Built-in Rust rules:

| Rule | Pattern | Action |
|------|---------|--------|
| no-unwrap-without-comment | `\.unwrap\(\)` without `//` comment | Abort: "Use `?` or `.expect(\"reason\")`" |
| no-unsafe-without-allow | `unsafe` block without `// SAFETY:` | Abort: "Document safety invariants" |
| no-todo-without-issue | `todo!()` without issue reference | Abort: "File an issue or implement" |
| no-panic-in-library | `panic!()` in `src/` (not tests) | Abort: "Use Result or Option" |
| no-clone-in-hot-loop | `.clone()` in `for`/`while` | Abort: "Consider borrowing" |
| no-eprintln-in-library | `eprintln!` in `src/` | Abort: "Use log::error! or tracing::error!" |

- Project rules: `.tripp/rules.json`
- Learned rules: `.tripp/learned-rules.json`
- Max 1 fire per session or cooldown

#### P5: Adaptive Thinking
- **Creation phase:** Thinking OFF → fast writing, no reasoning tokens
- **Repair phase:** Thinking ON → debugging, reasoning tokens enabled
- **Recovery phase:** Thinking OFF → single small tool call, no reasoning
- Model-specific:
  - DeepSeek: `thinking: { type: "disabled" }` vs `thinking: { type: "enabled" }`
  - Qwen: `enable_thinking: false` vs `enable_thinking: true` + `thinking_token_budget: 8000`
  - Ollama/vLLM: `repetition_penalty: 1.1` during creation, `1.0` during repair

#### P6: Staged Builds
- **Stage 1 — Design (Types/Contracts):** Write ONLY types, traits, constants. No implementations. Gate: `cargo check --lib`. Max 50 turns.
- **Stage 2 — Implement (Against Contract):** Build against exact type contract. Gate: `cargo test --lib && cargo clippy -- -D warnings`. Max 150 turns.
- **Stage 3 — Polish (Optional):** Post-green cleanup, re-gate, revert if regressed.

#### P7: Mode-Scoped Tool Lists
Four agent modes that collapse the decision surface:

| Mode | Tools Available | Purpose |
|------|----------------|---------|
| **General** | All 50+ MCP tools | Chat, exploration, all capabilities |
| **Code-Build** | read, write, edit, run, search, add_dependency, yield_status | Gate-driven coding, 5-8 tools max |
| **Code-Chat** | read, write, edit, run, search (no create) | Conversational coding assistance |
| **Plan** | read, search only | Read-only exploration, human approval required |

For Code-Build mode with local models: set `tool_choice: "required"` (except DeepSeek which rejects it).

#### P8: Input Repair & Malformed Call Salvage
- Tool argument aliases: `path`/`filename`/`filepath` all map to `file`
- Malformed call extraction: model leaks tool markup as text → parse and convert to proper ToolRequest
- Type coercion: `"true"` → `bool true`, `"5"` → `int 5`
- Partial JSON repair: missing closing brace → attempt completion

#### P9: Blast Radius Detection
- After file edit with signature change: run `cargo check --message-format=json`
- Parse JSON to find OTHER files now broken
- Inject: "Your edit to `foo.rs` broke `bar.rs` and `baz.rs`. Fix the callers."

#### P10: Phantom Error Suppression
- Filter transient errors: `E0433` (module not found for not-yet-created files), `E0425` (value not yet defined), `E0308` (mismatched types for stubs)
- Rule: if error references file created/edited in last 3 turns → suppress in feedback, keep in gate

#### P11: Polish on Green
- After gate passes: safe structural rewrites (clarity, not behavior)
- Re-gate → if regressed, revert entire file set to pre-polish state

#### P12: Learning from Failures
- Mine conversation for failure→fix patterns
- Consolidate into `.tripp/learned-rules.json`
- Inject as TTSR rules on next run

#### P13: Model-Specific Dialects
| Dialect | Tool Choice Required | Thinking | Repetition Penalty | Notes |
|---------|---------------------|----------|-------------------|-------|
| deepseek | ❌ Rejects it | `thinking: { type }` | None | Use `tool_choice: "auto"` + nudge |
| qwen | ✅ | `enable_thinking` + budget | None | Budget controls depth |
| ollama | ✅ | None | 1.0 default, 1.1 for local | Add repetition_penalty |
| vllm | ✅ | None | 1.0 default, 1.1 for local | guided_decoding |
| openai | ✅ | `reasoning_effort` | None | o-series: omit temperature |
| anthropic | ✅ | None | None | No special handling |

#### P14: New Prompt Templates
| Template | Purpose |
|----------|---------|
| `code_build_system.md` | Gate-driven coding — "Harness auto-runs gate. Auto-fixes formatting. Focus on semantic correctness." |
| `code_chat_system.md` | Conversational coding — "Investigate with tools, then ANSWER or ACT and STOP." |
| `plan_system.md` | Read-only exploration — "Explore, ask, propose plan under ## Plan. Tools locked until human approval." |
| `local_model_system.md` | Small model optimization — "More explicit, shorter sentences, forced tool calls." |
| `deepseek_system.md` | DeepSeek-specific — thinking tag handling, no tool_choice: "required" |
| `compaction_code.md` | Code-aware compaction — preserve type signatures, gate errors, test names |

---

## SECTION 4: FULL INTEGRATION FLOW

```
USER: "Build a finance tracker. React + Tailwind. PWA. Dark. Local."
     │
     ▼
ROUTER: Terrain = greenfield
ROUTER: Stack = React + Tailwind + SQLite + PWA
ROUTER: Problem decomposition → multi-facet → SKILL SET
     │
     ▼
ROUTER OUTPUT:
  Phase 1: SCAFFOLD    [pnpm, vite, tailwind, writing-plans]
  Phase 2: GOVERNANCE  [git-workflow, secret-safety]
  Phase 3: BACKEND     [api-tester, drizzle]
  Phase 4: FRONTEND    [sketch, claude-design, popular-web-designs]
  Phase 5: MOBILE      [pwa-checklist, viewport]
  Phase 6: AUDIT       [code-reviewer, security-engineer]
  Phase 7: DELIVER     [github-pr, phase-report-delivery]
     │
     ▼
MODE: /mode code-build (5 tools scoped)
     │
     ▼
GATE: cargo test && cargo build --release
     │
     ▼
PHASE 1: SCAFFOLD → Gate: cargo check
  ├── WriteGuard on every file → immediate feedback
  ├── AutoFixes: rustfmt, cargo fix, clippy --fix
  ├── TTSR: abort unwrap/unsafe/todo mid-stream
  ├── Thinking OFF during creation
  ├── Gate GREEN? → NEXT PHASE
  └── Gate RED? → Feed errors → Loop (max 3) → ask operator
     │
     ▼
... repeat for Phases 2-7 ...
     │
     ▼
FINAL: All phases ✅ All gates ✅ PR opened ✅ Report delivered ✅
```

---

## SECTION 5: CYONY'S ASSESSMENT

### 5.1 What's Worth It (Build First)

| Priority | Why |
|----------|-----|
| **P1 Gate System** | Foundation. Without this, local models hallucinate completion. |
| **P2 Write-Time Guard** | Single biggest failure mode fixer. Prevents 8-files-40-errors cascade. |
| **P3 Auto-Fixes** | Saves 3-5 turns per build. Model should never hand-fix formatting. |
| **P4 TTSR** | Cheap to implement (regex buffer). High impact per token. Configurable per-project. |
| **P5 Adaptive Thinking** | Measured: thinking-on repair converges. Qwen/DeepSeek local need this. |
| **P7 Mode-Scoped Tools** | Critical for local models. 50 tools → 50% failure. 5 tools → success. |
| **P8 Input Repair** | Cheap, high-impact. Local models struggle with exact JSON. Aliases save them. |
| **P13 Model Dialects** | Already half-done in provider system. Just formalize it. |
| **P14 New Prompts** | Complementary to all above. Template-based, no code risk. |

### 5.2 What's Worth It But Later

| Priority | Why Later |
|----------|-----------|
| **P6 Staged Builds** | Powerful for greenfield. Overhead for fixes. Keep as optional. |
| **P9 Blast Radius** | Nice-to-have. `cargo check` JSON parse is reliable but adds complexity. |
| **P11 Polish on Green** | Safety net. Implement after gate is stable. |
| **P12 Learning** | Cool but premature. Get the gate working, then mine patterns. |

### 5.3 What I'd Skip or Simplify

| Priority | Why |
|----------|-----|
| **P10 Phantom Errors** | Dangerous. I'd rather show ALL errors and let the model learn to ignore ghosts than hide something real. |
| **Staged Builds for fixes** | Overhead isn't justified for 3-line changes. Gate-only for repair mode. |

### 5.4 The Integration Sweet Spot

The router handles **what to do.** The gate handles **how to know it's done.** The forge (TTSR + WriteGuard + AutoFixes) handles **keeping the model on rails.** The mode scoping handles **collapsing the decision surface for local models.**

Together, a Qwen 3.6 27B Q2 quant can punch like a much larger model. Not because the model is smarter — because the harness is deterministic about correctness and coercive about process.

### 5.5 Open Questions for Reviewers

1. **Task scope:** Coding-only enhancement, or general harness upgrade (apply gate/TTSR to all tasks)?
2. **Language scope:** Rust-first (cargo gate), or multi-language (pytest, jest, etc.) from day one?
3. **Local model target:** Qwen 3.6 27B Q2 primary? Or DeepSeek local? Both?
4. **What's Tripp.Forge's exact boundary?** Is it the gate loop itself, or the entire coercion engine (TTSR + WriteGuard + AutoFixes)?
5. **Desktop UI priority:** Mode switcher + gate status in Electron, or CLI-first for Phase 1?
6. **Recipe integration:** Should `goose-self-test.yaml` recipes be able to specify `gate:` and `mode:` fields?

---

## SECTION 6: FILE MAP — KEY TOUCHPOINTS IN TRIPP.REASON

| Current Module | What Changes |
|---------------|-------------|
| `crates/goose/src/agents/agent.rs` | Mode-aware dispatch: General vs CodeBuild vs Plan loops |
| `crates/goose/src/providers/` | ProviderDialect registry, adaptive thinking params |
| `crates/goose/src/prompts/` | New: code_build_system.md, local_model_system.md, etc. |
| `crates/goose/src/providers/toolshim.rs` | Input repair: aliases, salvage, type coercion |
| `crates/goose/src/tool_inspection.rs` | Keep all 5 inspectors. Make async + mode-optional. |
| `crates/goose/src/context_mgmt/` | Improve: never drop gate errors, prioritize working set |
| **NEW:** `crates/goose/src/gate/` | Gate struct, GateResult, GateDrivenLoop, settleGate() |
| **NEW:** `crates/goose/src/gate/write_guard.rs` | cargo check + rustfmt on every file edit |
| **NEW:** `crates/goose/src/gate/auto_fix.rs` | rustfmt, cargo fix, clippy --fix, auto-import |
| **NEW:** `crates/goose/src/gate/ttsr.rs` | Rolling regex buffer, built-in + project + learned rules |
| **NEW:** `crates/goose/src/gate/blast_radius.rs` | cargo check JSON parse for downstream breakage |
| **NEW:** `crates/goose/src/gate/polish.rs` | Post-green cleanup with re-gate safety |
| **NEW:** `crates/goose/src/gate/memory.rs` | Failure→fix pattern mining |
| **NEW:** `crates/goose/src/agents/tool_scope.rs` | AgentMode enum, mode-scoped tool filtering |
| **NEW:** CLI `/mode` command | `/mode code-build`, `/mode general`, `/mode plan` |

---

*End of Blueprint. Ready for 4-way review. Cyony out.* 🔧
