# Tripp.Reason Testing Pitfalls — Error Transcripts

## Pitfall 1: Vitest cwd Path Resolution

### Error (Stage 6O)
```
ENOENT: no such file or directory, open '/opt/data/shared/Tripp.Reason/packages/cli/packages/cli/src/fakeManualHandoffBundle.ts'
```

### Root cause
`path.resolve(process.cwd(), "packages/cli/src/fakeManualHandoffBundle.ts")` where `process.cwd()` = `packages/cli/`. Result: `packages/cli/packages/cli/src/...`

### Fix
Change to `path.resolve(process.cwd(), "src/fakeManualHandoffBundle.ts")`

### Stage where this occurred
Stage 6O (5 boundary tests in `fakeManualHandoffBundle.test.ts`)

---

## Pitfall 2: Invalid Regex in `.not.toMatch()`

### Error (Stage 6Q, line 391)
```
error TS2554: Expected 1 arguments, but got 0
```

### Error (Stage 6S, line 324)
Same pattern — `.not.toMatch(/***/)` produces zero-argument call.

### Root cause
The regex `/***/` is syntactically problematic in JavaScript. While some engines accept it, vitest/tsc may reject it as having zero arguments or unexpected behavior.

### Fix
Replace with a specific valid pattern:
```ts
// Instead of: expect(summary).not.toMatch(/***/);
// Use:       expect(summary).not.toMatch(/sk-[a-zA-Z0-9]{5}/);
```

### Stages where this occurred
Stage 6Q (line 391), Stage 6S (line 324)

---

## Pitfall 3: `expect().toContain() || expect().toContain()` void expression

### Error (Stage 6Q, line 580)
```
error TS1345: An expression of type 'void' cannot be tested for truthiness.
```

### Root cause
`expect().toContain("x")` returns `void`. Using `||` between two void expressions is invalid TypeScript.

### Wrong
```ts
expect(content).toContain("x")
  || expect(content).toContain("y")
  || expect(content).toContain("z");
```

### Correct
```ts
const hasMatch = content.includes("x") || content.includes("y") || content.includes("z");
expect(hasMatch).toBe(true);
```

---

## Pitfall 4: Manifest field name mismatch (`confidence_summary` vs `confidence_level`)

### Error (Stage 6Q)
```
AssertionError: expected 'undefined' to be 'object'
  at expect(typeof parsed.confidence_summary).toBe("object")
```

### Root cause
`ManifestSnapshot` has `confidence_level` (string), not `confidence_summary` (object). `confidence_summary` exists on `HandoffMetadata`, not on `ManifestSnapshot`.

### Fix
```ts
// Wrong:  expect(typeof parsed.confidence_summary).toBe("object");
// Correct: expect(typeof parsed.confidence_level).toBe("string");
```

---

## Pitfall 5: Concurrent Promise.all file I/O race

### Error (Stage 6U)
```
SyntaxError: Unexpected end of JSON input
  at scenarioLimited → JSON.parse(await fs.readFile(path.join(pkg.bundleDir, "handoff-metadata.json"), "utf-8"))
```

### Root cause
Four scenario functions called concurrently in `Promise.all` all write to the same `tmpDir/.tripp/agents/handoff/`. When `generated_at` timestamps match, they share the same bundle directory and clobber each other's files.

### Fix
Give each scenario a unique subdirectory within `tmpDir`:
```ts
const workdir = path.join(tmpDir, "scenario-name");
await fs.mkdir(workdir, { recursive: true });
const pkg = await packageHandoffBundle(snapshot, workdir);
```

---

## Pitfall 6: Secret pattern format for regex matching

### Context
When testing that secrets are absent, use regex patterns that match the actual secret format:

| Secret type | Pattern |
|-------------|---------|
| OpenAI API key | `sk-[a-zA-Z0-9]{20,}` |
| GitHub token | `ghp_[a-zA-Z0-9]{20,}` |
| Bearer token | `Bearer\s+[a-zA-Z0-9_-]{20,}` |

### Wrong
```ts
// Using a pattern that doesn't match the actual secret format
await fs.writeFile(mdPath, md + "\nsk-proj-abcdefghijklmnopqrstuvwxyz123456\n", "utf-8");
// Regex /sk-[a-zA-Z0-9]{20,}/ won't match because "proj-" contains hyphens
```

### Correct
```ts
await fs.writeFile(mdPath, md + "\nsk-abcdefghijklmnopqrstuvwxyz\n", "utf-8");
// Regex /sk-[a-zA-Z0-9]{20,}/ matches — all alphanumeric after "sk-"
```
