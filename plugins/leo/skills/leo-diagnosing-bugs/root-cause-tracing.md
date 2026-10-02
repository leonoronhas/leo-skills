# Root cause tracing

**Adapted from:** Superpowers `systematic-debugging` (MIT, https://github.com/obra/superpowers).

Use this when the error appears deep in the call stack and it is unclear where the bad value came from. The place an error shows up is rarely where it starts. Fix at the source, never only where the error appears.

## Trace backward

1. **Observe the symptom.** `Error: git init failed in ~/project/packages/core`
2. **Find the immediate cause.** The code that directly fails: `execFileAsync('git', ['init'], { cwd: projectDir })`.
3. **Ask what called it, and with what value.** `createSessionWorktree(projectDir)` ← `Session.initializeWorkspace()` ← `Session.create()` ← a test. `projectDir` was `''`, and an empty `cwd` resolves to `process.cwd()`.
4. **Keep going up until you reach the origin.** The test read `context.tempDir` before `beforeEach` set it.
5. **Fix there.** Make `tempDir` a getter that throws when read too early. Then add guards at the layers in between only where a bad value could arrive from outside, so the bug cannot recur.

## When you cannot trace by reading

Log just before the failing operation, with a tagged prefix (Phase 4 of `leo-diagnosing-bugs`):

```typescript
console.error('[DEBUG-a4f2] git init', { directory, cwd: process.cwd(), stack: new Error().stack })
```

- In tests, write to stderr directly. A logger may be silenced.
- Log before the operation, not after it fails.
- Include the directory, working directory, relevant environment variables, and the stack.
- Run the `test` command, filter the output for the prefix, and read the stack for the test file and line that triggered the call.

## Which test pollutes

When a file or state appears during the suite and you don't know which test creates it, bisect with `scripts/find-polluter.sh`:

```bash
bash scripts/find-polluter.sh '<path that appears>' '<test file glob>' '<test command from .agents/leo.md>'
```

It runs each test file alone and stops at the first one that creates the path.
