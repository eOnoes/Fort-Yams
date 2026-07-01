# Tripp.Mind Deep Dive: SiYuan Note
## Evaluation for TrippCore Knowledge Management System
**Date:** 2026-07-01 | **Research:** Kimi AI | **Audit:** Pending (Echo)

---

## Executive Summary

**SiYuan (siyuan-note/siyuan)** is the recommended foundation for Tripp.Mind. It's an open-source, self-hosted knowledge management system with a Go backend and TypeScript frontend. Its killer feature: a **comprehensive REST API (50+ endpoints)** with **direct SQL query capability** — making it the only knowledge management tool that's truly agent-friendly.

**Rating: ⭐⭐⭐⭐⭐ for AI Agent Integration**

---

## Why SiYuan Over Obsidian

| Feature | SiYuan | Obsidian |
|---------|--------|----------|
| REST API | ✅ 50+ endpoints | ❌ None |
| SQL Queries | ✅ Full SQLite | ❌ None |
| Block-level addressing | ✅ Every block has unique ID | ❌ File-level only |
| Custom metadata | ✅ Arbitrary key-value attrs | ⚠️ YAML frontmatter only |
| Self-hosted | ✅ Docker official image | ❌ Desktop only |
| Database views | ✅ Built-in (Notion-style) | ❌ Dataview plugin only |
| Agent-friendliness | ⭐⭐⭐⭐⭐ | ⭐ |

---

## Architecture

- **Backend:** Go (Golang) — single binary
- **Frontend:** TypeScript + Svelte
- **Database:** SQLite with FTS5 full-text search
- **Block storage:** Every paragraph, heading, list item gets a 22-character ID
- **Block types:** document, heading, list, list item, table, blockquote, code block, paragraph, etc.
- **ID format:** `YYYYMMDDHHMMSSMMM_RandomHex`

---

## API Overview (Key Endpoints)

### Documents (CRUD)
- `POST /api/filetree/createDocWithMd` — Create doc from Markdown
- `POST /api/filetree/getDoc` — Get document content
- `POST /api/filetree/removeDoc` — Delete document
- `POST /api/filetree/listDocsByPath` — List documents in path
- `POST /api/filetree/getRecentDocs` — Recent documents

### Block Operations
- `POST /api/block/getBlockInfo` — Get block metadata
- `POST /api/block/updateBlock` — Update block content
- `POST /api/block/insertBlock` — Insert at position
- `POST /api/block/batchInsertBlock` — Bulk insert
- `POST /api/block/getChildBlocks` — Get children

### SQL Queries (KILLER FEATURE)
- `POST /api/query/sql` — Execute raw SQLite SQL
- Supports JOINs, FTS5 full-text search, subqueries, window functions
- Cross-notebook queries

### Search
- `POST /api/search/fullTextSearchBlock` — Full-text search
- `POST /api/search/searchTagBlock` — Search by tag
- `POST /api/search/searchAttribute` — Search by attribute

### Graph/Backlinks
- `POST /api/graph/getGraph` — Full knowledge graph
- `POST /api/graph/getLocalGraph` — Local backlinks
- `POST /api/graph/getBacklink` — Backlinks for a block

### Custom Attributes (Agent Metadata)
- `POST /api/attr/setBlockAttrs` — Set arbitrary key-value metadata on any block
- `POST /api/attr/getBlockAttrs` — Read metadata

### Auth
- Token-based: `SIYUAN_ACCESS_AUTH_CODE` env var
- Pass as header: `Authorization: Token {token}`

---

## Docker Deployment

```yaml
version: '3.8'
services:
  siyuan:
    image: b3log/siyuan
    container_name: tripp-mind
    restart: unless-stopped
    ports:
      - "6806:6806"
    volumes:
      - ./siyuan-workspace:/siyuan/workspace
    environment:
      - TZ=UTC
      - LANG=en_US.UTF-8
      - SIYUAN_ACCESS_AUTH_CODE=YOUR_SECRET
      - SIYUAN_WORKSPACE=/siyuan/workspace
    deploy:
      resources:
        limits:
          memory: 4G
```

---

## What We Need to Build

1. **API Gateway** — Per-agent JWT tokens, rate limiting, request routing
2. **Write Queue** — Redis-based queue for concurrent agent writes (SQLite is single-writer)
3. **Event Bridge** — SiYuan ↔ TrippCore message bus integration
4. **Sync Daemon** — Filesystem ↔ SiYuan bidirectional sync
5. **Agent SDK** — Python/TypeScript wrapper for SiYuan API calls
6. **Dashboard Plugin** — Custom SiYuan plugin for Tripp.Mind overview
7. **Backup Automation** — Scheduled SQLite backups

---

## Integration Points

```
Tripp.Mind (SiYuan, port 6806)
    ├── SideQuestHQ (Next.js) — Graph view, editor, search
    ├── Telegram Bot — Store/search knowledge via commands
    ├── Discord Bot — Slash commands for knowledge ops
    ├── Hermes Agents — Per-agent tokens, read/write via API
    ├── Shared Filesystem — /root/agents/shared/siyuan-workspace/
    └── TrippCore — Event bridge to Tripp.Control, Tripp.OS
```

---

## Limitations

1. **Single-user by design** — No multi-user auth, no roles (need API gateway)
2. **SQLite single-writer** — Concurrent writes need queuing
3. **No built-in webhooks** — Must poll or use WebSocket
4. **Smaller community than Obsidian** — But API advantage outweighs this
5. **Some UI/docs Chinese-first** — English support exists but not complete

---

## Key Decision: Build vs Extend

**Start with SiYuan, extend with custom plugins.** SiYuan gives us 80% out of the box.

We build the 20%:
- 🔨 API gateway for multi-agent auth
- 🔨 Write queue for concurrency
- 🔨 Event bridge to TrippCore
- 🔨 Custom plugins for crew-specific features

---

## Audit Checklist for Echo

- [ ] How does this overlap with Tripp.Control's existing data layer?
- [ ] Can Tripp.OS filesystem patterns coexist with SiYuan workspace?
- [ ] What shared libraries/utilities already exist that we can reuse?
- [ ] Does the write queue conflict with any existing message bus?
- [ ] How should backup strategy integrate with existing VPS backups?
- [ ] What agent authentication patterns already exist in TrippCore?
- [ ] Can the API gateway be built as a TrippCore module?

---

*Research compiled by Cyony via Kimi AI. Ready for Echo's audit.*
