# Dispatcher vs Harness — When to Build Multi-Agent Coordination

## Two Patterns People Conflate

These are structurally similar but UX-distinct. Keep the distinction sharp when someone asks about "harness-style" or "orchestration" workflows.

**Dispatcher pattern** (what Kanban/Hermes videos show):
- Agents coordinate via shared state (cards, tickets, SQLite bus)
- Each agent reads the board, claims a task, writes results, moves on
- A dispatcher loop is visible — it spawns workers and monitors
- Human may approve at one gate; everything else is agent-to-agent
- The board IS the source of truth

**Harness pattern** (what Eddie and many users actually want):
- User drops input at ONE entry point (e.g., an orchestrator agent)
- Crew internally routes/validates/builds — user never sees the handoffs
- User receives output once, approves/rejects, done
- Two human touchpoints total: idea approval + deliverable sign-off
- The dispatcher is **invisible** to the user

Harness is a dispatcher where the dispatcher is the user-facing interface. Same internals, different UX contract. The user's mental model: "I hand it to X, X coordinates, I get it back."

## When NOT to Build This

Strong anti-patterns — building either pattern for these reasons is scope creep:

- **Small crew (3-4 agents) with human in the loop.** Human velocity matches agent output.
- **Visibility problem, not coordination problem.** "I can't see what the other agent is doing" → the fix is sharing context directly (files, bus messages, docs), not building a dispatcher on top.
- **You're trying to "unlock parallelism" but the bottleneck is human approval.** Adding dispatchers doesn't speed up approval gates.
- **You're copying a demo video verbatim.** Demo videos optimize for impressive 18-agent fan-outs. Real work usually doesn't hit that scale.

## When You DO Need It

- Multiple agents running in parallel *with no human bottleneck in the critical path*
- Fan-out/fan-in workloads (parallel research, parallel testing, parallel code generation)
- Auto-promotion of dependent tasks (task B becomes ready when task A finishes)
- Self-healing dead/crashed tasks (dispatcher re claims stale claims, respawns)

**The threshold question:** "If I don't build this, will agents actually be idle waiting for coordination, or will they just be working on fewer things in parallel?" If the latter is fine, don't build it.

## Hermes Constraints

- Crons have a 1-minute minimum (no sub-minute schedules). Adaptive timing below 1 min is impossible in current Hermes.
- `delegate_task` caps at ~3 concurrent children by default (configurable via `delegation.max_concurrent_children`).
- Subagents are ephemeral (die when parent finishes) and synchronous (block parent).

If your fan-out exceeds these, consider the full Kanban dispatcher (SQLite-backed, persistent, async) as implemented in `hermes kanban` — but only when the simpler patterns genuinely fail.

## Practical Default: Don't Build, Share Context

For 99% of current crew work:
- Eddie shares context directly with each agent during 1-on-1 work
- Agents coordinate via shared files (bus, docs) on the filesystem
- No dispatcher needed, no kanban needed

Build a dispatcher only when you can articulate the concrete bottleneck it fixes, not as a general-purpose "multi-agent setup."

## Reference

- Hermes multi-agent workflow video (Toby Studio) — shows full-stack SQLite + dispatcher daemon with 18 parallel researchers
- The harness metaphor comes from test harnesses: user provides inputs, harness runs the suite, user reads results. Invisible internals are the feature.
