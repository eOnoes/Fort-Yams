---
name: tripp-reason-testing
description: Recurring patterns for writing and debugging tests in the Tripp.Reason monorepo — path resolution, regex pitfalls, concurrent I/O races, and validation commands.
---

# Tripp.Reason Testing Patterns

Recurring patterns for writing and debugging tests in the Tripp.Reason monorepo (pnpm workspace, vitest, 13+ packages).

## Trigger

Load when writing, debugging, or fixing tests in the Tripp.Reason workspace at `/opt/data/shared/Tripp.Reason`. Also load when a test failure involves path resolution, regex matching, or concurrent file I/O in this repo.

## Key Paths

- Repo root: `/opt/data/shared/Tripp.Reason`
- CLI tests: `packages/cli/src/__tests__/`
- CLI source: `packages/cli/src/`
- pnpm: `npx --yes pnpm@9` (NOT globally installed pnpm)
- Test runner: `vitest run` (per package via `pnpm --filter @tripp-reason/cli run test`)

## Pitfall 1: Vitest cwd Path Resolution

**Problem:** Vitest runs from the **package directory**, not the repo root. `process.cwd()` returns `packages/cli/`, not the monorepo root.

**Wrong:**
```ts
// Double-nested — resolves to packages/cli/packages/cli/src/... (doesn't exist)
path.resolve(process.cwd(), "packages/cli/src/fakeManualHandoffBundle.ts")
```

**Correct:**
```ts
// Resolves to packages/cli/src/fakeManualHandoffBundle.ts
path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts")
```

**When this hits:** Tests that read source files to check boundaries (imports, forbidden terms). The test fails with `ENOENT: no such file or directory`.

## Pitfall 2: Invalid Regex in `.not.toMatch()`

**Problem:** The regex `/***/` is invalid JavaScript — three consecutive `*` quantifiers with nothing to quantify the first one. TypeScript/vitest may silently accept it but the match never works as expected, or it produces `Expected 1 arguments, but got 0` typecheck errors.

**Wrong:**
```ts
expect(content).not.toMatch(/***/);  // invalid regex, unexpected behavior
```

**Correct:**
```ts
expect(content).not.toMatch(/sk-[a-zA-Z0-9]{5}/);  // specific, valid pattern
```

**When this hits:** Tests checking for absence of secrets or sensitive patterns. Use specific valid regex patterns, never bare wildcards.

## Pitfall 3: Concurrent Promise.all with Shared Filesystem

**Problem:** When multiple test scenarios call `packageHandoffBundle()` (or any file-writing function) with the same `workdir`, concurrent execution via `Promise.all` causes race conditions. Files get truncated, `JSON.parse` fails with "Unexpected end of JSON input", or scenarios clobber each other's output.

**Wrong:**
```ts
const results = await Promise.all([
  scenarioA(tmpDir),  // writes to tmpDir/.tripp/agents/handoff/...
  scenarioB(tmpDir),  // same tmpDir — collision!
]);
```

**Correct (isolated subdirectories):**
```ts
async function scenarioA(parentDir: string) {
  const workdir = path.join(parentDir, "scenario-a");
  await fs.mkdir(workdir, { recursive: true });
  const pkg = await packageHandoffBundle(snapshot, workdir); // isolated
  ...
}
```

**Correct (sequential execution):**
```ts
const results = [
  await scenarioA(tmpDir),
  await scenarioB(tmpDir),
];
```

**When this hits:** Any test that generates handoff bundles, manifests, or other file artifacts concurrently. The `generated_at` timestamp in `ManifestSnapshot` is used as a directory name — same timestamp → same directory → collision.

## Validation Commands

```bash
# Full typecheck (all packages)
cd /opt/data/shared/Tripp.Reason && npx --yes pnpm@9 -r run typecheck

# Full test suite
cd /opt/data/shared/Tripp.Reason && npx --yes pnpm@9 -r run test

# CLI tests only
cd /opt/data/shared/Tripp.Reason && npx --yes pnpm@9 --filter @tripp-reason/cli run test

# Single test (by name pattern)
cd /opt/data/shared/Tripp.Reason && npx --yes pnpm@9 --filter @tripp-reason/cli run test -- -t "pattern"
```

## Test File Conventions

- Fixture tests use temp directories: `os.tmpdir()/<prefix>-<Date.now()>/`
- Cleanup: `afterEach → fs.rm(tmpDir, { recursive: true, force: true })`
- Event builders use `randomUUID()` for unique IDs
- Boundary tests read source files from `process.cwd() + "src/..."` NOT `"packages/cli/src/..."`

## Package Test Matrix

| Package | Tests | Command |
|---------|-------|---------|
| contracts | 17 | `pnpm --filter @tripp-os/contracts run test` |
| agent-bus | 79 | `pnpm --filter @tripp-os/agent-bus run test` |
| external-agents | 68 | `pnpm --filter @tripp-reason/external-agents run test` |
| CLI | varies | `pnpm --filter @tripp-reason/cli run test` |

## References

- `references/testing-pitfalls-transcripts.md` — error transcripts and reproduction recipes for each pitfall
