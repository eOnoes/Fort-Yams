# LLM Wiki Schema — Tripp & Cyony & Echo

## Purpose
A shared, self-maintaining knowledge base for the crew (Tripp, Cyony, Echo) and our human Onoes. Contains technical knowledge, research notes, system documentation, project learnings, and operational insights. All three agents read and write to this wiki. Tripp is the gatekeeper and linter.

## Canonical Paths

| Agent | wiki path |
|-------|-----------|
| **Tripp** (host) | `/root/agents/shared/wiki/` |
| **Cyony** (container) | `/opt/data/shared/wiki/` |
| **Echo** (local PC) | resolved via webhook or queue |

Shared queue for wiki tasks: `/root/agents/shared/queues/cyony/pending/` and `/root/agents/shared/queues/echo/pending/`

## Directory Structure

```
wiki/
├── CLAUDE.md              # This file — the schema
├── raw/                   # Immutable source documents (any agent can add)
├── wiki/                  # LLM-written pages
│   ├── index.md           # Master catalog of all pages
│   ├── log.md             # Append-only activity log
│   ├── flashcards.md      # Spaced repetition cards
│   ├── summaries/         # One page per source document
│   ├── concepts/          # Concept and framework pages
│   ├── entities/          # People, tools, organizations, systems
│   └── syntheses/         # Cross-cutting analyses and comparisons
├── tripp/                 # Tripp's private drafts and work notes
├── cyony/                 # Cyony's private drafts
└── echo/                  # Echo's private drafts
```

## Roles

| Role | Who | Responsibilities |
|------|-----|-----------------|
| **Gatekeeper** | Tripp | Ingest from raw sources, lint the wiki, approve/reject proposals, maintain CLAUDE.md, update index and log |
| **Builder** | Cyony | Research, propose new pages via review-queue, draft concepts in `cyony/`, suggest relationships |
| **Local Relay** | Echo | Populate from local PC findings, draft operational docs in `echo/`, flag out-of-date entries |
| **Consumer** | Onoes | Ask questions — any agent answers from the wiki with citations |

## Workflows

### Ingest (Tripp only)

1. Source file appears in `raw/` (dropped by any agent or Onoes)
2. Tripp reads the source
3. Creates a summary page in `wiki/summaries/`
4. Creates or updates concept/entity pages in `wiki/concepts/` and `wiki/entities/`
5. Adds cross-links between all related pages
6. Updates `wiki/index.md` and appends to `wiki/log.md`

**Page naming convention:** `kebab-case.md` — lowercase, hyphens for spaces

### Propose (Cyony or Echo)

1. Draft a page in your private directory (`cyony/` or `echo/`)
2. Create a task file in `queues/tripp/pending/` describing what you want to add
3. Tripp reviews, may edit, then promotes to the appropriate `wiki/` subdirectory
4. Tripp updates `index.md` and `log.md`

### Query (anyone)

1. Search the wiki by reading `wiki/index.md` and relevant pages
2. Synthesize an answer with citations (`Source: wiki/concepts/foo.md`)
3. For novel insights, optionally create a synthesis page in `wiki/syntheses/`

### Lint (Tripp only, or triggered by anyone)

1. Read all wiki pages
2. Check for:
   - Orphan pages (not in index)
   - Missing cross-links between related pages
   - Stale or contradictory information
   - Low-confidence claims missing citations
   - Broken internal links
3. Fix what can be fixed automatically
4. Report remaining issues in `wiki/log.md`

## Page Format

### Summary Pages (`wiki/summaries/<source-name>.md`)

```markdown
# <Title of Source>

**Source:** `raw/<filename>`
**Ingested:** <YYYY-MM-DD>
**Ingested by:** <agent>

## Summary
<3-5 paragraph summary of the source>

## Key Points
- <Point 1>
- <Point 2>

## Concepts Referenced
- [[concepts/concept-name]] — <brief relationship>
- [[concepts/another-concept]]

## Entities Referenced
- [[entities/entity-name]] — <relationship>

## Tags
#<tag> #<tag>
```

### Concept Pages (`wiki/concepts/<concept-name>.md`)

```markdown
# <Concept Name>

## Definition
<Clear, concise definition>

## Explanation
<Detailed explanation with examples>

## Related Concepts
- [[concepts/related-concept]] — <relationship>
- [[concepts/another-related]]

## Sources
- [[summaries/source-name]] — <what this source says about the concept>

## Tags
#<tag> #<tag>

## Confidence
<High | Medium | Low> — <brief justification>
```

### Entity Pages (`wiki/entities/<entity-name>.md`)

```markdown
# <Entity Name>

**Type:** <Person | Tool | Organization | System | Location>

## Description
<What this entity is>

## Relevance to Domain
<Why we care>

## Related Concepts
- [[concepts/concept-name]] — <relationship>

## Sources
- [[summaries/source-name]]

## Tags
#<tag> #<tag>
```

### Synthesis Pages (`wiki/syntheses/<topic>.md`)

```markdown
# <Synthesis Title>

## Question / Motivation
<What prompted this synthesis>

## Cross-Cutting Analysis
<Synthesis drawing from multiple sources and concepts>

## Supported By
- [[concepts/concept-a]]
- [[concepts/concept-b]]
- [[summaries/source-name]]

## Open Questions
- <Question 1>
- <Question 2>

## Tags
#synthesis #<tag>
```

## Linking Rules

1. **Every page must be listed in `wiki/index.md`**
2. **Every summary must link to at least one concept**
3. **Every concept must link to at least one source**
4. **Bidirectional links preferred** — if A links to B, B should link to A
5. **Use `[[wiki/concepts/name]]` notation** for internal wiki links
6. **Use `Source: raw/filename.md` notation** for raw source references

## Tagging Taxonomy

Domain tags — replace with actual categories as the wiki grows:

- `#system` — system architecture, configs, infrastructure
- `#knowledge-base` — wiki itself, knowledge management
- `#workflow` — automation, pipelines, agent workflows
- `#concept` — abstract ideas, frameworks
- `#entity` — people, tools, organizations
- `#reference` — documentation, guides, sources
- `#operational` — running things, monitoring, alerts
- `#experimental` — prototypes, tests, sandbox
- `#synthesis` — cross-cutting analysis
- `#fleeting` — rough notes, low confidence
- `#archived` — stale, kept for history

## Confidence Levels

| Level | Meaning |
|-------|---------|
| **High** | Multiple independent sources agree; directly verified |
| **Medium** | Single source, or sources partially agree; reasonable inference |
| **Low** | Speculative, inferred, single unverified source — flag for review |

## Journal Template (`wiki/journal/template.md`)

Use this for research sessions, experiments, or operational notes:

```markdown
# <YYYY-MM-DD> — <Session Title>

**Agent:** <agent>
**Duration:** <time>

## Objective
<What I set out to do>

## What I Did
<Steps taken, experiments run>

## Findings
<What I learned>

## Open Questions
<What remains unclear>

## Related Wiki Pages
- [[concepts/relevant-concept]]
- [[entities/relevant-entity]]

## Tags
#journal #<tag>
```

## Rules

1. **Raw sources are IMMUTABLE** — never modify a file in `raw/`
2. **Tripp gatekeeps** — only Tripp moves pages into `wiki/` from private dirs
3. **Tag every page** — at minimum one domain tag
4. **Cite everything** — every claim needs a source link
5. **Log every write** — append to `wiki/log.md`
6. **Private dirs are scratch space** — content there is not indexed
7. **Confidence matters** — low confidence pages get flagged for review
8. **Cyony and Echo can create pages in `wiki/` syntheses/ and entities/** but should propose larger concept changes through review-queue
