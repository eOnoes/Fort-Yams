---
name: j-munch-when-to-use
description: When to use jCodeMunch/jDocMunch/jDataMunch MCP tools vs standard search/read tools, plus critical language-pack cache bug
trigger: Deciding whether to use J-Munch MCP for code/data analysis, or troubleshooting jcodemunch-mcp symbol extraction
tags: [mcp, code-analysis, indexing, jcodemunch, tripp-reason]
---

# J-Munch MCP: When to Use vs When to Skip

## Installation State

All 3 servers installed via `uv tool install --force git+https://github.com/jgravelle/{jcodemunch,jdocmunch,jdatamunch}-mcp.git`.
Binaries at `~/.local/bin/`. Config in `/opt/data/config.yaml` points to them.

- **jcodemunch-mcp** v1.108.27 — 82 tools (AST, dep graphs, refactor safety)
- **jdocmunch-mcp** v1.27.2 — doc indexing
- **jdatamunch-mcp** v1.27.2 — 35 tools (data indexing, SQL, health radars)

## Critical Bug: Language Pack Cache Invalidation

After installing a new tree-sitter language pack into the tool's venv, `jcodemunch-mcp index` will NOT re-extract symbols — the incremental cache persists the old "no symbols" state.

### Fix

```bash
# 1. Install language pack into jCodeMunch's venv
uv pip install --python /opt/data/home/.local/share/uv/tools/jcodemunch-mcp/bin/python \
  tree-sitter-typescript tree-sitter-javascript

# 2. WIPE the cached index DB
rm -f ~/.code-index/local-*.db

# 3. Re-index
jcodemunch-mcp index /path/to/repo --no-ai-summaries
```

Without step 2, you'll see `language: ''` and `symbols: 0` from `file-risk` even though `parse_file()` directly extracts 24 symbols from `schemas.ts` correctly.

## When TO USE (worth the indexing overhead)

- **Codebase 50+ files** — dependency graphs, blast radius, hotspots
- **Pre-refactor safety** — `check_delete_safe`, `check_rename_safe`, `plan_refactoring`
- **PR risk profiling** — `get_pr_risk_profile` before merges
- **Finding dead code** — `find_dead_code`, `find_unused_paths`
- **Cross-repo deps** — `get_cross_repo_map`, `find_importers` cross-repo
- **Runtime traffic correlation** — OTel traces ingest (future Tripp.Reason)
- **Phase 3+ Tripp.Reason** — when codebase hits 100+ files

## When NOT TO USE (standard tools are faster)

- **Phase 1-2 Tripp.Reason (~12-30 files)** — `search_files` + `read_file` wins
- **Quick patches** — not worth re-indexing after every edit
- **Single-file docs** — `read_file` beats jDocMunch indexing
- **Simple grep** — `search_files` beats `jcodemunch-mcp search_text`
- **Small JSON/CSV** — manual read beats jDataMunch indexing

## Decision Heuristic

```
< 30 files:   Standard tools (search_files, read_file, patch)
30-100 files: J-Munch only for multi-file refactors
> 100 files:  J-Munch always — dep graphs pay for themselves
```

## Example Workflow (Large Refactor)

```bash
# Index once, reuse many times
jcodemunch-mcp index /opt/data/shared/Tripp.Reason --no-ai-summaries

# Before renaming an interface
jcodemunch-mcp check-rename-safe \
  --symbol "@tripp-reason/shared::ProviderAdapter" \
  --new-name "ModelAdapter" \
  --repo local/Tripp.Reason-34b9a7ac

# Blast radius of core symbol
jcodemunch-mcp get-blast-radius ProviderAdapter \
  --repo local/Tripp.Reason-34b9a7ac

# Plan the refactor
jcodemunch-mcp plan-refactoring ProviderAdapter rename ModelAdapter \
  --repo local/Tripp.Reason-34b9a7ac
```

## Pitfalls

- Don't index `node_modules/` or `dist/` — huge and slow, use `--extra-ignore`
- `--no-ai-summaries` saves API credits but loses symbol-level docs
- Index DB persists across sessions — stale indexes mislead if you forget to invalidate
- Python library `parse_file()` works correctly even when CLI index doesn't — use as fallback
- `health` uses 90-day churn window default; fresh repos show N/A on churn axes
- The tool's venv is at `/opt/data/home/.local/share/uv/tools/jcodemunch-mcp/` — direct pip/python access there

## Proof-of-Value Reference

On 2026-06-02, jCodeMunch indexed Tripp.Reason Phase 1A shared contracts (6 .ts files):
- Total symbols extracted: 63
- Health grade: A (93.3/100)
- Language spec confirmed: `interface_declaration`, `type_alias_declaration`, `enum_declaration` all detected
- `parse_file()` on `schemas.ts` alone extracted 24 symbols including `MessageSchema`, `ProviderAdapter`, `StreamEvent` etc.

**Verdict:** Tool works as designed once cache bug is worked around. Not worth it for current 12-file Phase 1, will activate when Phase 3+ hits 100+ files.
