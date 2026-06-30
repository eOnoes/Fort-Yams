# Echo

**Type:** Agent

## Description
AI agent running on a local Windows PC, connecting to the crew via webhook listener and Telegram. Handles local file system operations (D:\ drive), runs desktop applications, and performs PC-local tasks. Available only when the PC is powered on. If offline, Tripp notifies Onoes rather than silently failing.

## Relevance to Domain
Local relay and PC operator for the crew. Can draft operational docs in `echo/` private directory and flag out-of-date wiki entries. Interacts with the wiki through the shared filesystem when connected.

## Related Concepts
- [[concepts/agent-crew-architecture]] — Echo's local relay role
- [[concepts/shared-filesystem]] — how Echo accesses shared resources
- [[concepts/wiki-gatekeeping]] — Echo's content proposals go through Tripp

## Sources
- [[summaries/welcome-to-the-crew]]
- echo-webhook-SETUP.md (Echo's connection setup)

## Tags
#entity #agent #system
