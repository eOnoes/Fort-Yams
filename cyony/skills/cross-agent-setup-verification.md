# Cross-Agent Setup Verification Lesson

**Trigger:** Before giving setup/configuration instructions to another agent in the crew.

## The Lesson (2026-06-02 Cyony incident)

Gave Echo (OpenClaw) vision-setup instructions written in **Hermes-style config** (auxiliary.vision shape). Echo's OpenClaw `doctor` tool rejected the shape on every gateway restart and stripped the entire openrouter block, causing a crash loop. Tripp attempted a "fix" that duplicated the same config, which kept getting stripped for the same schema reason.

**Root cause:** I assumed Hermes and OpenClaw share config shapes. They do not.

## The Rule

Before giving setup instructions to another agent, **verify the target agent's config schema first**.

Concrete checklist:
1. Confirm what agent framework the target runs (Hermes, OpenClaw, local CLI, custom)
2. Confirm what config format that framework actually accepts (yaml keys, json shape, env var names)
3. If uncertain, **give investigation steps first**, not instructions-to-apply
4. If the target agent uses a validator/doctor tool on startup, understand what it accepts before recommending fields that might get stripped

## How to Verify the Schema

Ask the target agent (or the human operating them) to share:
- A known-working example of the config file
- The output of `<framework> doctor --verbose` or equivalent
- Any `<framework> config --help` output
- A schema file if one exists (often `.schema.json` in the framework's install directory)

## How to Give the Instructions Anyway

When you must give cross-agent setup guidance without full schema verification:
- Label it clearly: **"UNVERIFIED for <framework> — verify against their schema first"**
- Include the **revert/rollback steps** alongside the installation steps
- Include a **diagnostic command** the target should run to confirm it took effect
- **Never assume** the target's framework matches yours

## Signs You're About to Make This Mistake

- You're writing instructions from memory of YOUR OWN framework
- You're using field names (`auxiliary.vision`, `imageModel.primary`) without checking them
- You're assuming a specific plugin/model-provider shape exists
- The request came with minimal context about the target's actual environment
- You can't point to documentation of the target framework's schema

## When Echo Crashed, Here's What Actually Happened

1. Cyony wrote instructions (correct for Hermes)
2. Echo applied them (correct on disk)
3. OpenClaw gateway restarted, `doctor --fix` ran, **stripped the unrecognized block**
4. Gateway came back "looking broken"
5. Tripp's "fix" re-applied the same config → same strip → loop
6. Eddie had to manually intervene to break the death loop

**The actual fix** was not "change the values" — it was "understand what OpenClaw's schema actually wants." That's a schema-awareness problem, not a config-value problem.

## Applied More Broadly

Same lesson applies when:
- Sending shell commands to another agent who runs on a different OS (Windows vs Linux vs Docker)
- Recommending a package/version without checking what the target has installed
- Giving path-based instructions without checking the target's working directory
- Suggesting env vars without checking how the target loads them (dotfile, systemd, docker-compose, etc.)

**The pattern:** "what works here" ≠ "what works there." Always verify the target's actual environment before assuming your recipe applies.

## For This Crew Specifically

- **Cyony (me):** Hermes in Docker on Linux
- **Tripp:** OpenClaw on VPS host (different config schema, different validator, different plugin model)
- **Echo:** OpenClaw + Hermes hybrid on Windows (different again — NTFS quirks, PowerShell vs bash, different env loading)

Never assume any of us share config format. Always ask or investigate first.
