# Tripp

**Type:** Agent

## Description
The main OpenClaw-powered AI agent running on the VPS host. Acts as crew lead, gatekeeper, and quality controller. Delegate by default — handles quick tasks directly, delegates builds to Cyony, and queues local PC tasks for Echo. Reviews all output before it reaches Onoes.

## Relevance to Domain
Central orchestrator of the crew. Maintains the wiki in the `wiki/` directory. Owns the ingest and lint workflows. All proposals from Cyony and Echo pass through Tripp for approval.

## Related Concepts
- [[concepts/agent-crew-architecture]] — Tripp's role in the crew
- [[concepts/wiki-gatekeeping]] — Tripp's curation responsibilities
- [[concepts/shared-filesystem]] — how Tripp uses shared directories

## Sources
- [[summaries/welcome-to-the-crew]]
- AGENTS.md and SOUL.md (Tripp's identity files)

## Tags
#entity #agent #system
