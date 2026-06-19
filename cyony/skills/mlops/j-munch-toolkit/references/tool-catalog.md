# J-Munch Tool Catalog — Key Tools Reference

Quick lookup for the most-used tools across all three servers. Full list: 177 tools (82 + 60 + 35).

## jCodeMunch (82 tools) — Code Indexing via AST

### Must-Know Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `init` / `index` | Build AST index for a repo path | Session start or new repo |
| `search_symbols` | Find symbols by name/glob/regex | "where is X defined?" |
| `get_symbol` | Pull a specific function/class body | Read one symbol, not whole file |
| `get_blast_radius` | Trace import/dependency chains | "what calls this function?" |
| `list_files` | Show indexed files | Understand repo structure |
| `get_file_summary` | High-level file description | Before diving into a file |
| `search_references` | Find all usages of a symbol | "who imports/uses this?" |
| `get_call_graph` | Visualize call relationships | Architecture understanding |

### Advanced Tools
- `detect_duplicates` — find copy-paste patterns
- `complexity_analysis` — cyclomatic complexity per function
- `dependency_graph` — module-level dependency map
- `find_dead_code` — unreferenced symbols
- `diff_index` — re-index only changed files (faster for active repos)

---

## jDocMunch (60 tools) — Document Indexing by Section

### Must-Know Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `add_documents` | Index a doc directory/file | Session start or new docs |
| `list_sections` | Show all sections without content | Navigate structure |
| `get_section` | Retrieve one section by heading/path | "what does the README say about X?" |
| `search` | Keyword/semantic search across docs | "find mentions of Y across all docs" |
| `get_outline` | Table of contents for a doc | Before diving into large docs |

### Advanced Tools
- `compare_sections` — diff between versions of a section
- `extract_links` — all URLs/references from a doc
- `summarize_section` — AI summary of a section (uses LLM)
- `get_metadata` — dates, authors, tags from doc headers

---

## jDataMunch (35 tools) — Tabular Data Analysis

### Must-Know Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `index_file` | Index CSV/Excel/Parquet file | Before any data analysis |
| `describe` | Schema + column stats (no row data) | Understand shape of data |
| `aggregate` | SQL-like GROUP BY / aggregate | "average of X grouped by Y" |
| `query` | Filtered row retrieval with LIMIT/OFFSET | "show me rows where Z > 5" |
| `get_sample` | Random sample of N rows | Quick look at data shape |

### Advanced Tools
- `histogram` — distribution of a column
- `correlation` — pairwise column correlations
- `export_filtered` — write query results to file
- `validate_schema` — check for type mismatches, nulls
- `join` — combine two indexed files on a key (if multi-file support)

---

## Cross-Tool Patterns

### Session Startup Sequence
```
1. Index target repo:     mcp_jcodemunch_init(path="/path/to/repo")
2. Index target docs:     mcp_jdocmunch_add_documents(path="/path/to/docs")
3. Index data files:      mcp_jdatamunch_index_file(path="/path/to/data.csv")
4. Begin queries using indexed tools
```

### Code Review Pattern
```
1. index_code(repo_path)
2. search_symbols(query="handler")    → find relevant functions
3. get_symbol(id=...)                  → read specific function
4. get_blast_radius(symbol_id=...)    → trace callers/callees
5. search_references(symbol_id=...)   → find all usages
```

### Documentation Pattern
```
1. add_documents(path)
2. list_sections(doc_id)              → browse structure
3. get_section(section_id)            → read specific section
4. search(query="authentication")     → find all mentions
```

### Data Analysis Pattern
```
1. index_file(path)
2. describe()                         → understand schema
3. aggregate(group_by="x", agg="mean", col="y")  → summary stats
4. query(where="col > 5", limit=100)  → specific rows
```

---

## Version History

| Date | Change |
|------|--------|
| 2026-06-01 | Initial install: jCodeMunch 1.108.27 (82 tools), jDocMunch 1.66.3 (60 tools), jDataMunch 1.12.2 (35 tools) |
