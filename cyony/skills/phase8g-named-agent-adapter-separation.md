# Phase 8G — Named-Agent / Adapter Separation Pattern

## Problem
Provider-specific role keys (`openclaw_tripp`, `hermes_echo`) conflate named agent identity with backing runtime. Every agent migration requires schema changes, safety rule updates, and CLI default changes.

## Solution
Separate into three independent concepts:

### NamedAgent (provider-agnostic identity)
```typescript
export const NamedAgentSchema = z.enum(["tripp", "cyony", "echo"]);
```
Stable identity. Does NOT encode provider/runtime. Never changes when backing adapter changes.

### BackingAdapter (provider/runtime)
```typescript
export const BackingAdapterSchema = z.enum([
  "fake", "manual", "hermes", "openclaw",
  "local_process_experimental", "cloud_http_experimental",
]);
```
May change over time without affecting agent identity or authority.

### AgentIdentity (resolved view)
```typescript
export const AgentIdentitySchema = z.object({
  namedAgent: NamedAgentSchema,
  assignedRole: z.string().optional(),
  backingAdapter: BackingAdapterSchema,
  compatibilityAlias: ExternalAgentRoleSchema.optional(),
});
```

## Normalization Map
```
openclaw_tripp → { namedAgent: "tripp",   backingAdapter: "openclaw", role: "controller/supervisor" }
hermes_cyony   → { namedAgent: "cyony",    backingAdapter: "hermes",   role: "builder/creative" }
openclaw_echo  → { namedAgent: "echo",     backingAdapter: "openclaw", role: "warden/auditor/trace" }
hermes_echo    → { namedAgent: "echo",     backingAdapter: "hermes",   role: "warden/auditor/trace" }
```

## Key Properties
- Echo's Warden role does NOT change when backing switches from OpenClaw to Hermes
- Authority rules attach to `assignedRole` (warden/auditor/trace), not provider
- Safety rules check trust zones (`local_audit_warden`), not provider-specific role strings
- Provider-specific keys remain as compatibility aliases — never removed, never expanded
