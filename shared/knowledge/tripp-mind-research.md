# Tripp.Mind: Knowledge Management System Research

## The Big Find

**Obsidian is great for humans but terrible for agents.** No API, no server mode, no real-time collaboration, no structured query layer.

**SiYuan is the best foundation.** It's essentially "Obsidian but with an API." Block-level addressing, SQL queries, self-hosted, active development (23k+ GitHub stars).

## Why SiYuan Wins

| Feature | Obsidian | SiYuan |
|---------|----------|--------|
| API Server | ❌ None | ✅ Built-in (port 6806) |
| Self-hosted | ❌ Desktop only | ✅ Docker |
| SQL queries | ❌ Dataview only | ✅ POST /api/query/sql |
| Block-level addressing | ❌ Note-level | ✅ Every paragraph has an ID |
| Web client | ❌ Desktop/mobile | ✅ Browser-based |
| Real-time sync | 💰 Paid | ✅ WebSocket |
| Plugin system | ✅ 1500+ | ✅ Growing |

## Recommended Stack

- **Base**: SiYuan (Docker)
- **Vector DB**: LanceDB (embeddings, local, no server)
- **Search**: Meilisearch (fast full-text)
- **Frontend**: Next.js (extend SideQuestHQ)
- **API**: REST + WebSocket + SSE
- **Embeddings**: Ollama (local) or OpenAI (fallback)
- **Auth**: API keys per agent
- **Storage**: Markdown + YAML frontmatter

## Dual-Mode Principle

Every piece of content has TWO representations:
1. **Human Mode**: Readable markdown with prose
2. **Agent Mode**: Structured data with schemas, typed fields

## Integration Points

```
Tripp.Mind Core (SiYuan, port 6806)
    ├── Next.js Web App (SideQuestHQ) — graph view, editor, search
    ├── Telegram Bot — store conversation memories
    ├── Discord Bot — bidirectional sync, protocol notifications
    ├── Hermes Agents — skill for read/write/context retrieval
    └── Shared Filesystem — /root/agents/shared/tripp-mind/
```

## Implementation Phases

1. **Foundation** (Week 1-2): Deploy SiYuan, API proxy, vault structure, schema templates
2. **Agent Integration** (Week 2-3): Auth, Telegram/Discord hooks, embedding pipeline, context retrieval
3. **Intelligence Layer** (Week 3-4): Auto-tagging, staleness detection, graph analytics, semantic search
4. **Web UI** (Week 4-5): Graph view, note editor, search, dashboard

## API Design

```
GET/POST/PUT/DELETE  /api/notes           — CRUD
GET                  /api/notes/:id/backlinks
GET                  /api/graph           — Full knowledge graph
POST                 /api/query/sql       — Direct SQL
POST                 /api/query/search    — Full-text
POST                 /api/query/semantic  — Vector similarity
GET                  /api/changes/stream  — SSE event stream
POST                 /api/agents/:id/context — Agent context builder
```

## What We Already Have vs What Tripp.Mind Adds

| Existing System | What It Does | Tripp.Mind Adds |
|----------------|--------------|-----------------|
| Hermes memory | Per-agent key-value | Shared graph, relationships, semantic search |
| Shared filesystem | Flat markdown files | API layer, indexing, real-time sync |
| SideQuestHQ | Web app shell | Knowledge graph UI, note editor |
| Telegram/Discord bots | Communication | Auto-store conversations as memories |

## Key Decision: Build vs Extend

**Recommendation: Start with SiYuan, extend with custom plugins.** Don't reinvent the wheel. SiYuan gives us 80% of what we need out of the box. Custom plugins handle the TrippCore-specific stuff (agent auth, auto-tagging, cross-system sync).
