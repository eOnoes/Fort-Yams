# OpenClaw Crestodian — Warden Boundary Enforcement

## The Crestodian Decision Type

```typescript
type CrestodianRescueDecision =
  | {
      allowed: true;
      enabled: true;
      ownerDmOnly: boolean;
      pendingTtlMinutes: number;
      yolo: true;           // YOLO mode = full auto-approve
      sandboxActive: false;
    }
  | {
      allowed: false;
      enabled: boolean;
      ownerDmOnly: boolean;
      pendingTtlMinutes: number;
      yolo: boolean;
      sandboxActive: boolean;
      reason: "disabled" | "sandbox-active" | "not-yolo" | "not-owner" | "not-direct-message";
      message: string;       // Human-readable denial explanation
    };
```

## Five Denial Reasons

| Reason | Trigger | Use Case |
|--------|---------|----------|
| `"disabled"` | Tool execution globally disabled | Kill switch for emergencies |
| `"sandbox-active"` | Agent in sandbox mode | Restricted environment, limited tools |
| `"not-yolo"` | Security posture requires approval | Normal mode, ask before executing |
| `"not-owner"` | Sender not configured owner | Multi-user systems, only owner can approve |
| `"not-direct-message"` | Request in group, not DM | Privacy-sensitive ops only in DM |

**Critical design principle:** Denials propagate **with reasons**, not silent blocks. Agents need to know WHY they were blocked to retry intelligently or escalate appropriately.

## Security Posture Levels

```typescript
function isYoloHostPosture(cfg: OpenClawConfig, agentId?: string): boolean {
    const scopedExec = resolveScopedExecConfig(cfg, agentId);
    const globalExec = cfg.tools?.exec;
    const security = scopedExec?.security ?? globalExec?.security ?? "full";
    // "full" = ask for everything
    // "yolo" = auto-approve safe operations
    // Scoped per-agent via agents.list[].tools.exec.security
}
```

**Per-agent scoping:** Each agent can have its own security level:
```yaml
agents:
  defaults:
    tools:
      exec:
        security: "full"
  list:
    - id: "cyony"
      tools:
        exec:
          security: "yolo"  # Cyony gets more freedom
    - id: "echo"
      tools:
        exec:
          security: "full"  # Echo still restricted
```

## Sandbox Modes

```typescript
function resolveScopedSandboxMode(cfg: OpenClawConfig, agentId?: string): "off" | "non-main" | "all" {
    return (
        resolveAgentEntry(cfg, agentId)?.sandbox?.mode ??
        cfg.agents?.defaults?.sandbox?.mode ??
        "off"
    );
}
```

- `"off"` — No sandboxing
- `"non-main"` — Only non-main agents sandboxed (useful for spawned subagents)
- `"all"` — All agents sandboxed (maximum restriction)

## External Approval via Unix Socket

```sql
CREATE TABLE IF NOT EXISTS exec_approvals_config (
    config_key TEXT NOT NULL PRIMARY KEY,
    raw_json TEXT NOT NULL,              -- Full config JSON
    socket_path TEXT,                     -- Unix socket for external approver
    has_socket_token INTEGER NOT NULL,    -- Socket auth enabled?
    default_security TEXT,                -- "full" or "yolo"
    default_ask TEXT,                     -- Default ask behavior
    default_ask_fallback TEXT             -- Fallback when ask fails
);
```

This allows **external approval servers** — connect OpenClaw to enterprise approval workflows via Unix socket. Useful for:
- Human-in-the-loop approval queues
- Multi-tier approval (auto → team lead → CTO)
- Integration with ticketing systems (Jira, Linear)

## The "Rescue" System

When agents get stuck (repeated denials, no human response), the Crestodian has a rescue mechanism:

**Core files:**
- `rescue-channel.ts` — creates side-channel for human intervention
- `rescue-message.ts` — formats rescue requests
- `rescue-policy.ts` — defines when rescue is triggered
- `rescue-policy.test.ts` — `pendingTtlMinutes` bounds how long rescue approval waits

**Rescue flow:**
1. Agent repeatedly denied or waiting for approval
2. After timeout (`pendingTtlMinutes`), rescue triggered
3. Side-channel notification sent to human (email, SMS, Discord ping)
4. Human approves/rejects via side-channel
5. Agent continues with decision

## Approval Flow Propagation

When a tool call is blocked:

1. **Crestodian evaluates** request against policy → produces `CrestodianRescueDecision`
2. If `allowed: false`, **denial reason recorded** in `command_log_entries`
3. **User notified** via their channel (DM, thread) with the `message`
4. **Plugin hooks fire** — `permission_denied` hooks can observe
5. **Agent receives** tool error response explaining the denial
6. **Agent can retry** with modified parameters or ask for escalation

## For Tripp.Control Integration

Tripp.Control's escalation guard (LOCK 005) should adopt this pattern:

```javascript
// Escalation decision with structured reason
{
  "decision": "escalate",
  "reason": "attempts_exceeded",
  "message": "Agent exceeded 3 attempts with same model. Escalating to next model in chain.",
  "details": {
    "total_attempts": 3,
    "model": "qwen-max",
    "error_pattern": "validation_failure",
    "recommended_next": "claude-sonnet-4"
  }
}
```

**Always propagate reasons** so downstream consumers (Tripp, Echo, Cyony) understand the context without re-analyzing the full attempt history.

## Audit Trail Integration

All Crestodian decisions logged to three places:

1. **command_log_entries** (SQLite) — primary audit trail
2. **Trajectory files** (`~/.openclaw/trajectory/{sessionId}/`) — per-session captures
3. **diagnostic_events** (SQLite) — security audits

Size limits enforced:
- 32,768 chars per string field
- 64 items per array field
- Max file/event capture sizes

**Redaction:** All secrets redacted via `redactSecrets()` before persistence.

## Key Takeaway for Crew Governance

**Structured denials > silent blocks.** When Tripp denies Cyony's Forge candidate or escalation request, the denial should include:
- Reason enum (why it was denied)
- Context (what was checked)
- Guidance (what to do next)

This matches the Crestodian pattern and makes the governance chain transparent and debuggable.