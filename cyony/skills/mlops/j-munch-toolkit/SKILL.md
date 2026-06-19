---
name: j-munch-toolkit
description: "J-Munch MCP toolkit: jCodeMunch (AST code indexing), jDocMunch (doc section indexing), jDataMunch (tabular data). 177 tools for 95%+ token savings on code/doc/data retrieval. Use before any code review, doc exploration, or CSV/Excel analysis."
version: 1.0.0
author: Cyony
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [mcp, token-optimization, code-indexing, ast, docs, data]
    related: [native-mcp, requesting-code-review]
trigger_conditions:
  - "Reviewing or exploring a codebase (use jCodeMunch first, index once, query symbols)"
  - "Reading large documentation sets (use jDocMunch, index by section)"
  - "Analyzing CSV/Excel/parquet data files (use jDataMunch, aggregate server-side)"
  - "Any task where brute-reading whole files would burn excessive tokens"
---

# J-Munch Toolkit (MCP)

Token-efficient retrieval for code, docs, and data via MCP servers. Index assets once per session, then query precisely — avoids loading entire files into context.

## Quick Answer (for "what does TokenMunch do?")

**TokenMunch indexes your code, docs, and data into searchable databases. Instead of loading entire files into context (burning 100K+ tokens), you query for exactly what you need (2-5K tokens). It's like having a search engine for your codebase instead of opening every file.**

Three tools:
- **jCodeMunch** — indexes code repos, query functions/classes by name
- **jDocMunch** — indexes markdown/docs, search by section
- **jDataMunch** — indexes CSV/Excel/JSON, aggregate/filter server-side

**Result:** 95%+ token savings on most tasks.

## When to Use (Decision Matrix)

| Task | Tool | Savings |
|------|------|---------|
| Code review / symbol lookup / dependency tracing | jCodeMunch | ~98% |
| Explaining docs / config files / READMEs | jDocMunch | ~97% |
| Aggregating CSV / Excel / querying tabular data | jDataMunch | 25,000×+ |
| General repo exploration with many files | jCodeMunch + jDocMunch together | 95%+ |

**Rule of thumb:** if you'd read more than 3 files to answer a question, index first.

## Components

| Tool | Version (2026-06) | Tools Registered | Install |
|------|-------------------|------------------|---------|
| jCodeMunch | 1.108.27 | 82 | `curl -LsSf https://jcodemunch.pages.dev/install.sh \| sh` |
| jDocMunch | 1.66.3 | 60 | `curl -LsSf https://jdocmunch.pages.dev/install.sh \| sh` |
| jDataMunch | 1.12.2 | 35 | `curl -LsSf https://jdatamunch.pages.dev/install.sh \| sh` |

All three install via `uv` to `~/.local/bin/`. Verify with `which jCodeMunch`, `which jDocMunch`, `which jDataMunch`.

## Installation in Hermes

After CLI install, register as MCP servers in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  jcodemunch:
    command: "jCodeMunch"
    args: ["mcp"]
  jdocmunch:
    command: "jDocMunch"
    args: ["mcp"]
  jdatamunch:
    command: "jDataMunch"
    args: ["mcp"]
```

Requires `/new` (new session) to load tools. Verify with `hermes tools | grep mcp_` — expect 177 tools prefixed `mcp_jcode*`, `mcp_jdoc*`, `mcp_jdata*`.

## Core Workflows

### Code Review with jCodeMunch
1. `mcp_jcodemunch_init` on the repo path (runs once, builds AST index)
2. `mcp_jcodemunch_search_symbols` — find definitions by name/pattern
3. `mcp_jcodemunch_get_blast_radius` — trace import chains, find callers
4. `mcp_jcodemunch_get_symbol` — pull just the function/class body, not the whole file

**Pitfall:** always index before querying. A query on an unindexed path returns nothing or partial results.

### Doc Exploration with jDocMunch
1. `mcp_jdocmunch_add_documents` on the doc directory
2. `mcp_jdocmunch_get_section` — retrieve a specific section by heading
3. `mcp_jdocmunch_list_sections` — scan structure without loading content
4. `mcp_jdocmunch_search` — semantic/keyword search within indexed docs

### Data Analysis with jDataMunch
1. `mcp_jdatamunch_index_file` on CSV/Excel (builds column summaries)
2. `mcp_jdatamunch_aggregate` — SQL-like server-side aggregation (no data in context)
3. `mcp_jdatamunch_query` — filtered row retrieval with pagination
4. `mcp_jdatamunch_describe` — schema + stats without loading rows

## Agent Hooks (ANTHROPIC Agents Integration)

Each tool ships with `AGENT_HOOKS.md` — PreToolUse interceptors that auto-redirect Read calls to the indexed version:

- `jCodeMunch` intercepts Read on .py/.js/.ts/.go files → redirects to `search_symbols` / `get_symbol`
- `jDocMunch` intercepts Read on .md/.rst/.txt → redirects to `get_section`
- `jDataMunch` intercepts Read on .csv/.xlsx/.parquet → redirects to `aggregate` / `query`

To activate hooks, run each tool's `init` command which copies AGENT_HOOKS.md + AGENTS.md policy files into your workspace root (or `.claude/` if using ANTHROPIC agents). The policy snippets are embedded in the MCP server's CLAUDE.md / AGENTS.md files.

## Naming Disclaimer

"TokenMunch" in crew context refers to TWO things that got conflated:
1. **The J-Munch toolkit** (this skill) — the three MCP servers for token-efficient retrieval
2. **The TokenMunch tracking protocol** — the crew's token-usage logging system (documented in `multi-agent-crew-ops` skill under "Token Tracking Protocol")

They're complementary but separate. The toolkit reduces tokens burned per task; the tracking protocol logs what was spent for crew-wide analysis. Both matter.

## jMRI Protocol

"jMRI" is a feature badge/protocol these tools all support (they ship with `jMRI-Full` badges in their docs). It's the prompt engineering + agent hook layer that wires the tools into agent behavior reflexively — not a separate tool. The three J-Munch tools internally handle jMRI; no additional config needed beyond installing and indexing.

**TripCore.munch** (homegrown, MJRI-based) is the 4th piece — separate from the J-Munch trio. Awaiting specs from Tripp (OpenClaw). Status: blocked on docs.

## Benchmarks (from tool docs, 2026-06)

- **Express.js full repo:** 73,838 baseline tokens → ~1,300 avg with jCodeMunch = **98.4% reduction**
- **1M-row crime dataset:** 111M tokens → 3,849 tokens = **25,333× reduction**
- **12K-token config file:** → ~400 tokens with jDocMunch section lookup

## Pitfalls

0. **LOAD THIS SKILL when asked about TokenMunch or jMunch.** If user asks "what does TokenMunch do", "what's jMunch", or any question about this toolkit — load this skill IMMEDIATELY before answering. Do NOT improvise vague answers. The skill has the Quick Answer section ready to go. This applies to any question about installed tools — load the relevant skill first, answer second.

1. **Be direct when asked "what does X do."** Give a 3-sentence factual answer, not a hedging essay. User called this out explicitly: "why are you being verbose", "why are you being vague", "you are not using your skills right." If you have the answer, deliver it. If you're unsure, say so and load the skill — don't waffle.

2. **Indexing is ephemeral per session.** MCP servers restart with each Hermes session. Re-index at session start if you'll do sustained work on a repo/docset. For daily-drive repos, consider a session-start script that auto-indexes.
3. **Don't brute-read after indexing.** It defeats the purpose. If you've indexed, use search/query tools exclusively. Falling back to Read on indexed files is wasteful.
4. **Token savings only realize if you use the tool reflexively.** The agent hooks redirect helps, but if you're using standard `read_file` directly, the hooks can't intercept. Use the indexed MCP tools as your primary retrieval.
5. **Large repos: index selectively if you know the scope.** Indexing a monorepo takes time and builds a large AST. If you only need `/packages/foo`, point the index there.
6. **Data files must be local or accessible.** jDataMunch indexes from a file path — it can't fetch from URLs directly. Download first if remote.

## TripCore.munch (pending)

Homegrown 4th piece of the kit. Status: awaiting Tripp's docs. Unknown whether it's a standalone MCP server, a CLI orchestrator wrapping the trio, or prompt engineering patterns applied on top. Will update this skill when details land.
