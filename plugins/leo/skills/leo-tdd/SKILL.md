---
name: leo-tdd
description: Use before writing or changing any source code, and before creating or editing any test file, for a feature, bug fix, refactor, call-site sweep, or plan task. Test-driven development with Iron Law enforcement (failing test first, minimum code to green, one slice per cycle). Combines Superpowers TDD rigor with MattPocock seam/vertical-slice guidance.
---

# Test-Driven Development (TDD)

**Adapted from:** Superpowers `test-driven-development` (MIT, https://github.com/obra/superpowers) + MattPocock `tdd` (MIT, https://github.com/mattpocock/skills).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

A bug fix starts with `leo-diagnosing-bugs`; come here for its fix and regression test.

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always:** new features, bug fixes, refactoring, behavior changes.

**Exceptions (ask the user; under `leo-mode`, log a ruling that names the substitute check instead):**
- Throwaway prototypes
- Generated code
- Configuration files

## Before The First Edit

Read the files in `rules-files` and `standards-router` from `.agents/leo.md`. Do this once per
session, before the first RED test is written. On each GREEN, record the rules the slice
applied, named by `rule-id-convention` when one is set (for example `<PREFIX>-NNN`). A deviation is named inline where it
happens, with its reason.

`formatting-owner` says who formats. `hook`: never run a formatter or an auto-fix (the `format`
and `lint-fix` commands); a format or lint error in code you wrote is fixed by hand, so the fix
is reviewed like any other edit. `command`: run the `format` command. `none`: match the
surrounding style by hand.

## Standards

When `standards-router` in `.agents/leo.md` is set, read it, load only the files it routes to for this task, and cite rule IDs per `rule-id-convention` in findings and in the PR description. A deviation from a MUST rule names the rule and the reason where the deviation lives.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. No exceptions without the user's permission.

## Seams: Where Tests Go (MattPocock)

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. Under `leo-mode`, record the seams and why as a ruling in `decisions.tsv` instead of asking; the Tests lane reviews them. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?"

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), invoke `leo-codebase-design` for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter, leverage and locality terms.

## Anti-patterns

| Pattern | Description |
|---------|-------------|
| **Implementation-coupled** | Mocks internal collaborators, tests private methods, or verifies through a side channel (querying DB instead of interface). Tell: test breaks when you refactor but behavior hasn't changed. |
| **Tautological** | Assertion recomputes expected value the way code does (`expect(add(a,b)).toBe(a+b)`). Passes by construction, never disagrees. Expected values must come from independent source: known-good literal, worked example, spec. |
| **Horizontal slicing** | Writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior. Work in **vertical slices** instead: one test → one implementation → repeat. |

When writing or changing any test, read [writing-good-tests.md](writing-good-tests.md) for the rules that keep tests honest:
- Name the production change that would make the test fail, before writing it
- Assert on real behavior, never on mock behavior
- Keep test-only code in test utilities, out of production classes
- Understand a dependency's side effects before mocking it

## Rules of the Loop

| Rule | Meaning |
|------|---------|
| **Red before green** | Failing test exists first, then only enough code to pass it. Nothing speculative. |
| **One slice at a time** | One seam, one test, one minimal implementation per cycle. Two behaviors in one RED test is a batch: split it, run the cycle twice. |
| **Refactoring is not part of the loop** | Cleanup happens after the slices are green (`leo-simplify`). Reshaping mid-cycle mixes a behavior change with a structural one; neither gets watched failing. |

## Red-Green

### RED - Write Failing Test

Write one minimal test showing what should happen.

```typescript
// Good: clear name, real behavior, one thing
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  expect(await retryOperation(operation)).toBe('success');
  expect(attempts).toBe(3);
});

// Bad: vague name, asserts on the mock instead of the code
test('retry works', async () => {
  const mock = jest.fn().mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(1);
});
```

**Requirements:**
- One behavior. "and" in the name? Split it.
- Name describes the behavior and shows the intended API
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail (MANDATORY. Never skip.)

Run the one test file with the `test` command from `.agents/leo.md`, narrowed to that file, never the whole suite.

```bash
<test command> path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code (Vertical Slice)

Write simplest code to pass the test. Don't add features (options, backoff, config for a retry that only needs "3 times"), refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass (MANDATORY.)

Same single-file command as RED. Confirm:
- Test passes
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

The `test` suite scoped to the affected package and the `typecheck` command run once, after the last slice, before reporting. Run whichever of the two the affected package defines. A change with neither runs the check the task names.

**Other tests fail?** Fix now. The full-repo run (`test`, `typecheck`, `lint`) belongs to whoever integrates the work, after integration, not to a delegated task.

### Repeat

Next failing test for next slice. Not a batch collected in advance. Every new function/method gets a test; cover edge cases and errors.

## After The Slices Are Green

Cleanup belongs here, on the whole diff, never inside a cycle:

- Remove duplication
- Improve names
- Extract helpers

Tests stay green; no behavior a test does not already cover. This is `leo-simplify`, then `leo-trust-but-verify` before any claim of done.

## Stop signs

Any of these means: delete the code, start over with TDD.

- Code written before its test, or a test "added later" or after the implementation. Tests-after pass immediately and prove nothing; they answer "what does this do?", not "what should this do?".
- A test that passes immediately, or a failure you cannot explain. Return to RED.
- "Too simple to test", "just this once", "this is different because...". Simple code breaks; the test takes 30 seconds.
- "I already tested it manually" or "manual is faster". Manual testing leaves no record, cannot re-run, and misses edge cases.
- "Deleting X hours of work is wasteful". Sunk cost; keeping code you cannot trust is the waste.
- "Keep it as reference" or "adapt existing code". That is testing after. Delete means delete.
- "Tests after achieve the same goals", "spirit not ritual", "TDD is dogmatic, I'm being pragmatic". Test-first is the pragmatic path: it finds bugs before commit and prevents regressions.
- "Need to explore first". Fine; throw the exploration away, then start with TDD.
- "Test is hard to write" or "TDD will slow me down". Hard to test means hard to use; listen to it. Debugging later is slower.
- "Existing code has no tests". You are changing it, so add tests for it.
- Cannot confirm all of: every new function has a test, each test watched failing for the expected reason, minimal code, all tests pass with pristine output, real code over mocks, edge cases and errors covered, confirmed seams, vertical slices, refactoring only after the slices. You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask the user, or under `leo-mode` raise a gate. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Debugging Integration

Bug found? Run `leo-diagnosing-bugs` first; its minimised repro becomes the failing test. Follow TDD cycle. Test proves fix and prevents regression.

Never fix bugs without a test.
