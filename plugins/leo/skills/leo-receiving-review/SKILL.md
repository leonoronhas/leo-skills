---
name: leo-receiving-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
---

# Receiving Review

**Adapted from:** Superpowers `receiving-code-review` (MIT, https://github.com/obra/superpowers).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Overview

Review feedback needs technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

Findings come from `leo-code-review`, `leo-pr-review`, other reviewers, or the user. Reproduce or verify each one against the code before acting on it.

## The Response Pattern

```
WHEN receiving review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Reproduce the finding, or check it against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

Reproduce means: write or run the failing case, run the cited command, or read the cited lines and their callers. A finding you could not reproduce is reported as unverified, not implemented on faith. A finding that is a bug goes to `leo-diagnosing-bugs` first.

Write replies per `leo-writing` (no sycophancy, no chatbot phrases).

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Under `leo-mode`.** Implement the clear items that do not depend on an unclear one. Write each unclear item to `gates.md` with your best reading as the default, and hold only the items related to it.

## Source-Specific Handling

### From the user
Trusted: implement after understanding. Still ask if scope is unclear.

### From external reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with the user's prior decisions:
  Stop and discuss with the user first
```

Under `leo-mode`, both cases become gates: the limitation or the conflict, your recommendation, and what it blocks. Keep working on everything else.

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

If the feature isn't needed, don't add it.

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

Test each fix with the `test` command from `.agents/leo.md`; run `typecheck` and `lint` when set.

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with the user's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve the user if architectural

**If you're uncomfortable pushing back out loud:** Name that tension, then tell the user about the issue you've seen.

## CI and review bots after the PR

**Adapted from:** pstack `babysit` (MIT, https://github.com/backnotprop/pstack).

Work in this order: merge conflicts, then review threads, then CI.

- **Conflicts.** Report which branch needs a rebase and stop that item. Never rebase, retarget, or force-push from here.
- **Bots.** Treat each bot comment as a claim to verify against the code, like any external review. Fix real findings with a failing test first. Dismiss noise on the thread with the concrete disproof. Never change code only to quiet a bot. Escalate anything touching security, auth, billing, data, or migrations instead of dismissing it.
- **CI.** Classify a failure before retrying it:
  - A failure in code the diff never touches: check for a stale base with `git merge-base --is-ancestor origin/<base-branch> HEAD`. A stale base needs a rebase; report it rather than retrying.
  - Infrastructure or flake: one fresh run, once. An identical second failure was never flake; read the logs.
  - A failure in the diff's own code: fix it with a failing test first.
- Batch every fix into one push wave. Under `leo-mode`, each push wave is a gate.
- Stop when the forge reports the PR mergeable with checks green and no unresolved blocking threads. Never merge from here; merging is the user's call.

## Review Thread Replies

When replying to inline review comments on a code host, reply in the comment thread, not as a top-level PR comment. On GitHub: `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`.
