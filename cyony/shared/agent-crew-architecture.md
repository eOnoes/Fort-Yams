# Agent Crew Architecture

## Definition
A multi-agent system where multiple AI agents with different roles and capabilities operate under a single human principal, communicating through shared infrastructure.

## Explanation
The crew follows a hub-and-spoke model. Tripp leads and gatekeeps. Cyony builds in a sandboxed environment. Echo handles local PC operations. The human (Onoes) sets direction. Communication happens through shared filesystem queues, Telegram messaging, and webhook calls. This architecture provides role separation (each agent has specific powers and restrictions) while maintaining a unified knowledge base.

## Related Concepts
- [[concepts/shared-filesystem]] — how the shared directory enables agent communication
- [[concepts/wiki-gatekeeping]] — Tripp's curation role
- [[concepts/sandboxed-execution]] — Cyony's isolation model

## Sources
- [[summaries/welcome-to-the-crew]] — the crew structure overview

## Tags
#concept #system #workflow

## Confidence
High — primary source document defines these roles explicitly
