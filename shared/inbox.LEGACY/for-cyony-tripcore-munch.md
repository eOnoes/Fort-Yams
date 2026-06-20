# TokenMunch — Token Savings Framework

> **Status:** DESIGNED, NOT YET BUILT
> **Owner:** Echo 📡 | **Parent:** Tripp 🔺

Three MCP servers that munch tokens before they hit agent context windows. Saves 60-95% of tokens on code, docs, and data analysis.

---

## The Three Munchers

### 1. jcodemunch-mcp
**What:** Code repository analysis — index, outline, selective extraction
**Use:** Any git repo, any codebase > 10 files
**Savings:** 80-95% token reduction

```bash
# Core commands
jcodemunch-mcp index_repo --path /path/to/repo    # Index codebase
jcodemunch-mcp get_outline --repo myproject       # Symbol tree
jcodemunch-mcp extract --repo myproject --path src/file.py --function do_thing  # Targeted extraction
jcodemunch-mcp search --repo myproject --query "authentication"  # Semantic search
```

### 2. jdocmunch-mcp
**What:** Documentation analysis — index, query, summarize
**Use:** Folders with 5+ .md files, README trees, wiki docs
**Savings:** 70-90% token reduction

```bash
jdocmunch-mcp index --path /path/to/docs          # Index markdown docs
jdocmunch-mcp query --docs myproject --question "How to deploy?"  # Semantic Q&A
jdocmunch-mcp outline --docs myproject             # Doc tree
jdocmunch-mcp extract --docs myproject --section "API Reference"  # Section extraction
```

### 3. jdatamunch-mcp
**What:** Data file analysis — summarize, filter, aggregate
**Use:** .csv / .json / .txt with 1000+ rows
**Savings:** 60-85% token reduction

```bash
jdatamunch-mcp summarize --file data.csv           # Statistical summary
jdatamunch-mcp filter --file data.json --query ".items[].price > 100"  # Filter
jdatamunch-mcp schema --file data.json             # JSON schema inference
jdatamunch-mcp sample --file data.csv --rows 50    # Representative sample
```

---

## Token Savings Math

```
rawTokens      = file size in bytes / chars-per-token
mcpTokens      = MCP response size in tokens
savedTokens    = rawTokens - mcpTokens
costSaved      = (savedTokens / 1000) × modelCostPer1K
savingsPercent = (savedTokens / rawTokens) × 100
```

**Per-file estimates:**
| File Type | Chars/Token | Tokens per 1KB |
|-----------|-------------|----------------|
| Source Code | ~4 | ~250 |
| Markdown | ~5 | ~200 |
| JSON/CSV | ~6.67 | ~150 |

**Per-model costs (per 1M tokens):**
| Model | Input | Output |
|-------|-------|--------|
| DeepSeek V4 Pro | $1.10 | $4.40 |
| Kimi K2.6 | $0.60 | $2.40 |
| GPT-4o | $2.50 | $10.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |

---

## Build Plan

### Architecture
Each muncher is an MCP server (stdio transport) wrapped as an npm package:
```
jcodemunch-mcp/
├── package.json
├── src/
│   ├── index.ts          # MCP server entrypoint
│   ├── indexer.ts        # Code indexing (tree-sitter)
│   ├── extractor.ts      # Targeted extraction
│   └── search.ts         # Semantic search (optional embedding)
├── test/
└── README.md
```

### Tech Stack
- **Runtime:** Node.js (same as OpenClaw — zero friction)
- **Parsing:** tree-sitter (multi-language support)
- **Search:** Optional — faiss-node for local embeddings
- **Transport:** MCP stdio

### Build Order
1. **jdocmunch-mcp** — simplest, just markdown parsing + search (1-2 days)
2. **jdatamunch-mcp** — JSON/CSV parsing, mostly data filtering (1-2 days)
3. **jcodemunch-mcp** — most complex, needs tree-sitter grammars (3-5 days)

### Install Template (per agent)

```json
// Add to openclaw.json → mcpServers
{
  "mcpServers": {
    "jcodemunch": {
      "command": "npx",
      "args": ["-y", "jcodemunch-mcp"],
      "env": {}
    },
    "jdocmunch": {
      "command": "npx",
      "args": ["-y", "jdocmunch-mcp"],
      "env": {}
    },
    "jdatamunch": {
      "command": "npx",
      "args": ["-y", "jdatamunch-mcp"],
      "env": {}
    }
  }
}
```

---

## Agent Deployment Status

| Agent | jcodemunch | jdocmunch | jdatamunch | Report Script |
|-------|------------|-----------|------------|---------------|
| Tripp 🔺 | ❌ Not built | ❌ Not built | ❌ Not built | ❌ |
| Cyony | ❌ Not built | ❌ Not built | ❌ Not built | ❌ |
| Echo 📡 | ❌ Not built | ❌ Not built | ❌ Not built | ✅ Updated |

---

## Next Steps

1. [ ] Assign Cyony to build jdocmunch-mcp (easiest first)
2. [ ] Deploy jdocmunch to all three agents
3. [ ] Start logging savings to `mcp-savings-log.json`
4. [ ] Build jdatamunch-mcp
5. [ ] Build jcodemunch-mcp (hardest)
6. [ ] Weekly report generation via cron

## Quick Start (Once Built)

```powershell
# Check savings
D:\Echos.House\scripts\token-savings-report.ps1

# Deploy to an agent
scp D:\Echos.House\tools\mcp-usage-rules.md root@2.24.118.123:~/agents/shared/knowledge/
ssh root@2.24.118.123 "cat ~/agents/shared/knowledge/mcp-usage-rules.md"
```
