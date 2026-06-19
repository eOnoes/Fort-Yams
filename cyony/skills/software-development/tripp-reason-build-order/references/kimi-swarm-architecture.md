# Kimi-Style Swarm Architecture

Eddie's deep-dive on the Moonshot/Kimi K2.x swarm architecture. Core doctrine for Phase 5 implementation.

## Core Doctrine: Orchestrator + Frozen Sub-Agents

Not a democracy. A dictatorship with hired contractors.

| Role | What It Does | Trainable? |
|------|-------------|-----------|
| Orchestrator | Analyzes task, decides decomposition, spawns agents, assigns work, synthesizes results | Yes (only trained part) |
| Sub-Agents | Execute specific subtasks in parallel | No (frozen checkpoints) |

**Frozen sub-agents rationale:** When 50 agents run in parallel and one fails, credit assignment is impossible. Freezing sub-agents turns them into "environment observations" rather than learnable decision points, eliminating the credit assignment problem.

## Dynamic Agent Creation (No Predefined Roster)

No predefined personas. The orchestrator uses two tools to instantiate domain-specific agents on the fly:

1. **create_subagent**: `{ name, system_prompt }` — custom prompt defining role/boundaries
2. **assign_task**: `{ agent, prompt }` — dispatches work to created sub-agents

The orchestrator decides: whether to parallelize, when to spawn vs handle itself, each sub-agent's scope and persona, how many to spawn (up to 100 in K2.5/K2.6). This is learned through RL, not hardcoded.

## The Decision Tree

1. **DECOMPOSE**: Can this task be split into independent workstreams? No → sequential. Yes → spawn.
2. **SPAWN**: For each workstream, create_subagent with custom system prompt and unique ID.
3. **DISPATCH**: assign_task to multiple agents concurrently. Each gets 100 max steps. Orchestrator gets 15.
4. **GATHER**: Sub-agents return single message. Orchestrator synthesizes into final output.
5. **CRITICAL PATH**: Runtime = orchestration overhead + max(sub-agent time). If one agent is slow, spawn a helper or re-delegate.

## Reward Function

- 80% task completion quality
- 20% critical path efficiency (wall-clock speed)

## Key Technical Details

| Feature | Implementation |
|---------|---------------|
| Context Management | Proactive context control — orchestrator hides old tool results while keeping reasoning chains |
| MoE Architecture | K2.6: 1T params, 32B active, 384 experts, 8 per token |
| Training | PARL starts small, scales up. Inference ratio dynamically adjusted |
| Latency Metric | Critical Steps: Σ(orchestrator_step + max(subagent_step)) — forces parallelism awareness |

## Translation to Tripp.Reason

| Kimi Concept | Tripp.Reason Implementation |
|-------------|---------------------------|
| create_subagent | SubagentSpec with custom systemPrompt, created per run |
| assign_task | SubagentAssignment binds spec → TaskPacket with wave ordering |
| Frozen sub-agents | frozenBehavior: true enforced for all non-orchestrator roles |
| Critical path | CriticalPathMetrics: Σ(orchestrator + max(wave) + merger + warden) |
| Serial collapse prevention | detectSerialCollapseRisk() flags sequential-on-independent |
| Swarm spam prevention | detectSwarmSpamRisk() flags workers > tasks |
| 100 max steps | SubagentSpec.maxSteps default 100, max 200 |
| Orchestrator 15 steps | Orchestrator kept lean — delegates, doesn't get lost in weeds |
| No predefined roster | SubagentSpecs created dynamically; roles constrain behavior, not identity |

## Bottom Line

One smart router, many dumb workers. The orchestrator creates agents on demand, assigns them, and collects results. It's a factory, not a talent show. Dynamic prompt engineering beats static agent personas. Concurrency must be explicitly trained/prompted for — otherwise defaults to sequential chain-of-thought.
