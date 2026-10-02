---
name: leo-simplify
description: Code simplification with preserve-functionality rules. Use when code is complex, hard to read, or has unnecessary abstraction.
---

# Simplify

**Adapted from:** Claude Code built-in `/simplify` intent.

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Overview

Simplify code while preserving exact behavior. No behavior changes — only clarity improvements.

**Core principle:** If a function needs a comment to explain its middle section, that section wants to be its own well-named function.

## Rules (clarity over cleverness)

1. **Descriptive names.** `pendingRenewals`, not `list`; `hasExpiredTrial(account)`, not `check(c)`.
2. **Simplest thing that works.** No indirection, generics, or configurability for cases that don't exist.
3. **Small, single-purpose units.** Extract middle sections to well-named functions.
4. **Comments follow `leo-writing`.**

## Preserve-Functionality Rules

- **No behavior change** — tests must pass before and after
- **No API change** — public interfaces identical
- **No performance regression** — verify with benchmarks if critical
- **One change at a time** — each simplification verified independently
- **Check before removing, extracting, or renaming.** "unused" code may be a feature flag, a new file can create circular imports, and a rename needs a codebase-wide grep for callers

## Simplification Patterns

| Pattern | Before | After |
|---------|--------|-------|
| **Long function** | 100+ lines, multiple responsibilities | Extract to `calculateX`, `validateY`, `formatZ` |
| **Deep nesting** | `if (a) { if (b) { if (c) { ... } } }` | Early returns, guard clauses |
| **Primitive obsession** | `string` for email, phone, ID | `Email`, `PhoneNumber`, `OrderId` types |
| **Data clumps** | `(accountId, userId, role)` everywhere | `RequestContext` object |
| **Speculative generality** | `interface Config { retry?: ..., timeout?: ..., ... }` | Remove unused options; add when needed |
| **Duplicate logic** | Same validation in 3 places | Extract to `validateInput()` |

## Process

1. **Identify target** — file/function with complexity smell
2. **Run the target's tests** — confirm baseline with the test files that cover the target,
   using the `test` command from `.agents/leo.md`
3. **Apply one simplification** — smallest meaningful change
4. **Run the target's tests** — verify they still pass
5. **Repeat** — one simplification per cycle
6. **Run the scoped check once** — after the last cycle, before reporting

The scoped check runs the `test` and `typecheck` commands from `.agents/leo.md`: in a subagent, scoped to the target's package when the runner supports scoping; in the main thread, the full commands.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## Standards

When `standards-router` in `.agents/leo.md` is set, read it, load only the files it routes to for this task, and cite rule IDs per `rule-id-convention` in findings and in the PR description. A deviation from a MUST rule names the rule and the reason where the deviation lives.

## Integration

- Use **in** `leo-code-review` for complexity findings
- Use **standalone**: "Simplify this file/module"
- Complements `leo-tdd` (tests verify preservation)
