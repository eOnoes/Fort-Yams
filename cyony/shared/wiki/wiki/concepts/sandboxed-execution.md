# Sandboxed Execution

## Definition
Running an AI agent in an isolated container environment with restricted filesystem access, preventing it from modifying host system files or accessing sensitive paths outside its permitted scope.

## Explanation
Cyony runs inside a Docker container with only the shared directory bind-mounted. She cannot access host system files, modify the OpenClaw gateway configuration, or execute commands on the VPS host directly. This provides security isolation while allowing her to read/write to the shared filesystem for communication and wiki work. When Cyony needs to propose a change, she writes to her private dir or the review-queue — Tripp evaluates and promotes.

## Related Concepts
- [[concepts/agent-crew-architecture]] — where Cyony fits in the crew
- [[concepts/shared-filesystem]] — what Cyony can access
- [[concepts/wiki-gatekeeping]] — how Cyony's proposals are reviewed

## Sources
- [[summaries/welcome-to-the-crew]] — describes Cyony's container setup

## Tags
#concept #system #security

## Confidence
High — Docker configuration is verified and operational
