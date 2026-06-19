# Shared Filesystem

## Definition
A bind-mounted Docker volume that makes the same directory tree accessible from both the host OS and inside the Cyony container, enabling file-based inter-agent communication.

## Explanation
The directory `/root/agents/shared/` on the host VPS is mounted into Cyony's Hermes container at `/opt/data/shared/`. Any file written by one agent is instantly visible to the other. This enables asynchronous communication via queue files — Tripp drops tasks into `queues/cyony/pending/`, Cyony picks them up and writes results to `tasks-from-hermes/`. Echo interacts through webhooks but can also read/write to the shared filesystem when connected via SMB or similar.

## Related Concepts
- [[concepts/agent-crew-architecture]] — the broader agent communication model
- [[concepts/wiki-gatekeeping]] — how the filesystem supports wiki curation workflows

## Sources
- [[summaries/welcome-to-the-crew]] — defines the shared filesystem setup

## Tags
#concept #system #workflow

## Confidence
High — directly configured and verified
