---
name: three-strike-escalation
description: After 3 consecutive failures on a sub-task, stop iterating and either switch to a heavier model tier or decompose the problem
trigger: Repeated build/compile/type errors, type inference rabbit holes, iteration loops where the same approach keeps failing, "this should work but doesn't" situations
tags: [escalation, model-routing, debugging, tripp-reason, build-process]
---

# Three-Strike Escalation Rule

## The Rule
After **3 consecutive failures** on the same sub-task or category of error:
1. **STOP iterating** — don't try a 4th variation of the same approach
2. **Assess** — is this a (a) model capability gap or (b) problem decomposition gap?
3. **Escalate accordingly**

## When to Switch Model
If the problem is **type-level reasoning, inference, or architectural design**:
- Current model likely at tier ceiling
- Switch to next-heavy tier (Fast Builder → Heavy Technical Thinking)
- Re-attempt with the heavier model's better type/abstraction handling
- Example: Drizzle 0.38 nullable inference, generic streaming contracts, discriminated union design

## When to Decompose
If the problem is **integration complexity or too many moving parts**:
- Break the task into 2-3 smaller, independently testable sub-tasks
- Each sub-task should compile/pass in isolation before combining
- Example: "wire provider + store + tool dispatch" → (1) provider stub, (2) store integration, (3) dispatch bridge

## How to Escalate in Telegram
Tell Eddie plainly:
> "Hitting my ceiling on X — recommending a switch to [heavier tier] for this specific step, or breaking it into [smaller parts]. Your call."

Don't silently spin. Don't pretend it's fine. Ask.

## Decomposition Template (preferred over model switch)
When breaking a stuck task into smaller parts:

1. **Identify the stuck point** — what specific sub-problem keeps failing?
2. **Extract it** — can that sub-problem be stubbed/mocked so the rest compiles?
3. **Build around it** — write the surrounding code with the stub, verify it passes
4. **Return to the stuck point** — now with narrower scope and less pressure

Example: Drizzle type inference failing → stub the insert type as `any`, build the repository functions and smoke test around it, revisit type narrowing later.

**Decompose first, switch models second.** Model switching requires config changes and may not be available. Decomposition works regardless.

## Anti-Pattern (what this prevents)
- ❌ 4th attempt at `as any` workaround because tsc keeps complaining
- ❌ Refactoring the same function 3 times without rethinking the abstraction
- ❌ Stack Overflow spelunking when the root cause is model capability gap
- ❌ "Just one more try" loops that eat context window and time

## Tier Reference
- **Fast Technical Builder** (current default): file scaffolding, simple CRUD, docs
- **Heavy Technical Thinking**: schema alignment, generics, streaming contracts, type hierarchies
- **Code Review**: scope validation, boundary checks, warden pass

## Example 1: Phase 1B Drizzle (model switch would have helped)
- Strike 1: `.nullable()` method doesn't exist → tried `nullable: true` param
- Strike 2: `nullable: true` param still wrong → tried omitting the modifier
- Strike 3: Drizzle 0.38 infer mismatch with shared contracts → `as any` workaround worked
- **Should have escalated at strike 3** instead of burning 4 iterations. The `as any` fix was pragmatic, not elegant — heavier model might have produced a cleaner Drizzle-compliant solution.

## Example 2: Phase 1G CLI Wiring (decompose-and-read-first worked better than model switch)
- Strike 1: Wrote full runCommand.ts from memory, got 8 simultaneous tsc errors — all wrong import names (createEventManager doesn't exist, initSqliteStore doesn't exist, createToolDispatcher doesn't exist, ApprovalGate signature mismatch, Provider config field wrong)
- Strike 2: Tried fixing one error at a time — each fix revealed another wrong name
- Strike 3: **STOPPED.** Read every `packages/*/src/index.ts` barrel in one terminal command. Rewrote the whole file from the actual API surface. Clean compile.
- **Lesson**: when all errors are "wrong name/wrong shape" on integration code, the fix isn't a heavier model — it's reading the actual contracts first. Decomposition here meant: "read first, then write once".

## Pitfalls
- Don't escalate on trivial things (typo in import path = just fix it, not a strike)
- Don't escalate model just because you're tired of iterating — diagnose first
- 3 strikes = MAX before stopping. Not 7. Not "maybe one more."
- If Eddie says "keep going with current model" after escalation, decompose instead — respect the constraint, change the approach
- **Integration code is a special case**: when the problem is "I'm guessing at API shapes across 5 packages," the right decomposition is "stop writing, read every barrel file, then write once from actual signatures." A heavier model will make the same wrong guesses — the issue is information, not capability.
- When you hit 3 strikes and the errors are all `TS2305: Module does not export member X` or `TS2345: Argument of type A not assignable to B` across MANY lines simultaneously — that's almost always "wrong API assumptions," not a capability gap. Read the source first.
