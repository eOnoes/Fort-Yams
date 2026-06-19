# Monorepo Smoke Tests — Quick & Dirty Patterns

## The Problem
pnpm workspace packages resolve via symlinks in `node_modules/`. Running a `.mjs` file from the repo root with `import { x } from '@tripp-reason/tools'` fails with `ERR_MODULE_NOT_FOUND` because the test file isn't inside any workspace package — Node's module resolution can't find the workspace alias.

## Technique: Relative dist Imports
Instead of:
```js
// BROKEN from repo root
import { gitStatusTool } from "@tripp-reason/tools";
```

Use:
```js
// WORKS from repo root
import { gitStatusTool } from "./packages/tools/dist/index.js";
```

Run with `node -e "..."` inline or a `.mjs` file from the repo root.

## Pitfalls
1. **Type imports forbidden**: `.mjs` files cannot use `import type { X } from "..."` — that's TypeScript syntax. Use plain `import { X }` and treat types as runtime values (or skip type annotations entirely in inline `-e` scripts).
2. **write_file line-number doubling**: If you read a file with `read_file` (returns `NUM|CONTENT` format) and feed that content into `write_file`, the output file gets double-numbered. Always strip line numbers from read_file output before writing.
3. **Workspace aliases from root**: `@tripp-reason/*` only resolves inside packages that declare it in dependencies. Root-level `.mjs` scripts are outside the workspace graph. Use relative paths to `./packages/<pkg>/dist/`.
4. **No .ts smoke tests without tsx**: Can't run TypeScript directly. Options: (a) inline JS via `node -e`, (b) `.mjs` file, (c) compile to `.js` first. Inline `-e` is fastest for throwaway validation.
5. **Cleanup**: Always remove smoke test files after validation. Don't commit them to the repo.

## Pattern: Inline node -e for Quick Validation
```bash
cd /opt/data/shared/Tripp.Reason && node -e "
import { tool } from './packages/tools/dist/index.js';
const result = await tool.execute({}, { workdir: '.' });
console.log(result.status);
"
```
This avoids file creation entirely. Good for 1-3 quick assertions. For 5+ tests, use a .mjs file (remember to delete after).

## Pattern: Phase 2D Validation (Command Safety Tools)
When testing command safety modules (allowlist/denylist/chaining):
- Test rejection with `assert(r.status === 'error')` — NOT by running real dangerous commands
- Test timeout with real long-running command: `node -e "for(;;);"` with `timeoutMs: 1500`
- Test output cap with: `node -e "console.log('x'.repeat(200000))"` with `maxOutputBytes: 500`
- Test path safety with: `cwd: '/etc'` and `path: '../../../etc'`
- Always use temp workdir: `join(tmpdir(), 'tripp-smoke-' + Date.now())` and clean up with `rmSync`

## Build Order Gotcha (Phase 2C/2D discovered)
When adding new exports to a tools package that CLI imports from:
1. `pnpm --filter @tripp-reason/tools build` FIRST (rebuilds dist/)
2. THEN `pnpm typecheck` (CLI reads from rebuilt dist)
3. THEN `pnpm build` (full workspace build)

If you skip step 1, CLI typecheck fails with "no exported member" for new exports that exist in src/ but not in dist/. This is because pnpm typecheck runs all packages simultaneously and CLI reads the stale dist/ from tools.
