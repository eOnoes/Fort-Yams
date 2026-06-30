# Cross-Package Assembly Pattern

Used when building a CLI, server, or any "wiring layer" that imports from multiple internal packages.

## The Trap
You know the *concepts* you need (provider, dispatcher, approver, store) because the architecture doc describes them. You don't know the *actual export names* without reading. Intuitive guesses fail:

| What you guess | What actually exists |
|---|---|
| `createEventManager` | `createEventStream` |
| `initSqliteStore` | `initDb` |
| `createToolDispatcher` | `createDispatcher` |
| `ProviderConfig.model` | `ProviderConfig.defaultModel` |
| `Approver.approve()` returning `boolean` | `Approver.requestApproval()` returning `ApprovalResult` discriminated union |

## The Ritual (do this before writing ANY wiring code)
```bash
cd /path/to/monorepo
for pkg in shared store core providers tools; do
  echo "=== $pkg ==="
  cat packages/$pkg/src/index.ts
done
```

Capture the actual barrel exports. Then write the CLI from the captured surface, not from memory.

## Why this is worth a ritual
- Phase 1G hit 8 simultaneous TS errors from wrong import names in first attempt
- Each error revealed another wrong name → 3-strike loop
- A single 30-second barrel read would have prevented all of it
- This isn't a model capability gap — no model knows the names without reading

## When to apply
- Writing a CLI command, server endpoint, or integration test
- Any code that imports from 2+ sibling packages
- Specifically when the code instantiates objects from multiple packages

## Capture Template
```bash
# Capture all public API surfaces to a scratch file
for pkg in shared store core providers tools cli; do
  echo "=== $pkg ===" >> /tmp/barrels.txt
  cat packages/$pkg/src/index.ts >> /tmp/barrels.txt
  echo "" >> /tmp/barrels.txt
done
```

Review `/tmp/barrels.txt` once, then write the wiring code. Delete after.

## Anti-signals (when you're about to hit this trap)
Phrases like "I know what I need, it's roughly..." or "the natural name would be..." in your thinking — those are signs you're guessing. Stop and read.
