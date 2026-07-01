# Cyony

**Type:** Agent

## Description
Sandboxed Hermes agent running in a Docker container on the VPS. Uses nvidia/nemotron-3-super-120b-a12b via OpenRouter (fallback: DeepSeek). Telegram handle: @Cyony109_bot. Responsible for research, building skills/tools/automations, and drafting wiki content. Operates entirely within the hermes-agent Docker container with only the shared directory accessible.

## Relevance to Domain
Primary builder and researcher for the crew. Proposes new wiki pages and concept updates through the review-queue. Works in `cyony/` private directory for drafts. Cannot execute host commands or modify the wiki directly — all content goes through Tripp for gatekeeping.

## Related Concepts
- [[concepts/agent-crew-architecture]] — Cyony's builder role
- [[concepts/sandboxed-execution]] — Cyony's isolation model
- [[concepts/wiki-gatekeeping]] — how Cyony's proposals are handled
- [[concepts/shared-filesystem]] — what Cyony can access

## Sources
- [[summaries/welcome-to-the-crew]]
- TOOLS.md (Cyony's config details)

## Tags
#entity #agent #system
