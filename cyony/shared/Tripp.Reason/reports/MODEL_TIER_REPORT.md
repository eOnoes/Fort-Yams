# Model Tier Report

## PHASE
Model System Update — Tripp.Reason Build Tier Routing

## STATUS
PASS

## FILES CREATED OR UPDATED

| # | File | Path | Action |
|---|------|------|--------|
| 1 | MODEL_TIERS.md | `/opt/data/shared/Tripp.Reason/docs/MODEL_TIERS.md` | Created |
| 2 | This report | `/opt/data/shared/Tripp.Reason/reports/MODEL_TIER_REPORT.md` | Created |

**Total new files:** 2
**Total source files:** 0
**Total packages created:** 0
**Total dependencies installed:** 0

## MODEL TIERS CREATED

| # | Tier | Purpose | Preferred Models |
|---|------|---------|-----------------|
| 1 | Heavy Technical Thinking | Architecture, contracts, hard bugs | qwen3.5:397b:cloud, deepseek-v4-pro, qwen3.7-max |
| 2 | Fast Technical Builder | TypeScript scaffolds, wiring, implementation | deepseek-v4-flash, qwen3.6-plus, kimi-k2.6 |
| 3 | Creative Architecture Scout | Exploration, alternate designs, Hermes sandbox | kimi-k2.6, kimi-k2-thinking, grok-build-0.1 |
| 4 | Budget Daily Driver | Doc edits, small patches, routine work | minimax-m3, deepseek-v4-flash, qwen3.6-plus |
| 5 | Code Review / Warden Pass | Drift checks, doctrine compliance, security | deepseek-v4-pro, qwen3.7-max, nemotron-3-super |
| 6 | Vision / Image Analysis | Screenshots, diagrams, visual review | gemini-2.5-flash, gemini-3-flash-preview |
| 7 | Research / Search Assist | External info, X search, discovery | grok-4.20-reasoning |
| 8 | Direct API Fallback | Provider failure, fallback testing | deepseek-reasoner, deepseek-chat, kimi-k2.6 |

## REGISTRATION RECOMMENDATIONS

| Model | Status | Action Required |
|-------|--------|-----------------|
| `minimax-m3:cloud` | ✅ ALREADY REGISTERED | Config patched 2026-06-02 by Cyony |
| `qwen3.5:397b:cloud` | ✅ ALREADY REGISTERED | Config patched 2026-06-02 by Cyony |
| `gemini-3-flash-preview:cloud` | ✅ ALREADY REGISTERED | Config patched 2026-06-02 by Cyony |

All 7 Ollama Cloud models are now registered in `/opt/data/config.yaml` under the `ollama` provider block. Registration was completed in the previous turn before this doctrine update.

**Remaining gap:** DeepSeek direct API and Kimi/Moonshot direct API keys exist in `/opt/data/.env` but are not registered as Hermes providers. These are callable via curl/Python but not routable through Hermes. Recommended: leave as-is for Phase 1; register only when Direct API Fallback tier is actually needed in practice.

## SCOPE COMPLIANCE

✅ No `packages/` directory exists
✅ No `package.json` created
✅ No `pnpm-workspace.yaml` created
✅ No `tsconfig` files created
✅ No source code files created
✅ No `node_modules/` or dependency installs
✅ No server, cli, provider, MCP, swarm, or UI stubs

Clean-room boundary intact — `/opt/data/shared/Tripp.Reason/` contains only docs and reports.

### Clean-Room Contents Verification
```
Tripp.Reason/
├── docs/
│   ├── DOCTRINE.md
│   ├── ARCHITECTURE.md           (patched Step 0A)
│   ├── ROADMAP.md                (patched Step 0A)
│   ├── MODEL_TIERS.md            (NEW)
│   └── STEP_0_ALL_FILES.txt      (combined output)
├── reports/
│   ├── STEP_0_DOCTRINE_REPORT.md (patched Step 0A)
│   └── MODEL_TIER_REPORT.md      (NEW)
└── STEP_0A_ALL_FILES_PATCHED.txt (combined output)
```

## OPEN QUESTIONS

| # | Question | Risk | Resolution |
|---|----------|------|------------|
| 1 | Should Hermes switch models mid-phase if a cheaper one works? | Low | Yes — doctrine says "use cheapest capable tier" |
| 2 | Should DeepSeek direct API be registered as a full Hermes provider? | Low | Defer until actually needed; curl fallback suffices |
| 3 | Should Warden Pass be automated (scripted) or manual model selection? | Medium | Manual selection for Phase 1; automate in Phase 3+ |

## INTEGRATION WITH STEP 0 DOCTRINE

MODEL_TIERS.md does not conflict with existing doctrine:

- ✅ DOCTRINE.md: No conflict (provider-bloat rule allows selecting within registered inventory)
- ✅ ARCHITECTURE.md: No conflict (providers package uses OpenAI-compatible adapter; tier selection happens at the Hermes/Cyony level, not inside Tripp.Reason core)
- ✅ ROADMAP.md: No conflict (Phase 1 allows "Provider config: Ollama Cloud via openai-compatible adapter")

**Note:** This tier system governs **Cyony's own model selection** during the Tripp.Reason build. It does not dictate which models Tripp.Reason itself will use or route to at runtime — that's governed by ARCHITECTURE.md's provider adapter contract.

## NEXT STEP

**Phase 1 scaffold can proceed upon Eddie's review of MODEL_TIERS.md.**

Recommended review sequence:
1. ✅ Eddie reviews MODEL_TIERS.md (this file)
2. ✅ Eddie confirms tier labels match his mental model
3. ✅ Phase 1 scaffold begins with `packages/shared/` (Zod schemas + contracts)

**Blocks remaining:**
- None from doctrine/architecture/roadmap/model tiers
- Eddie's explicit greenlight is the only remaining gate

---

*Model System Update complete. Clean-room boundary intact. No code exists. Waiting for review.*
