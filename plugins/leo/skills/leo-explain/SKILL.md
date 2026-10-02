---
name: leo-explain
description: Use for "how does X work", "why is Y built this way", "where should this live", a walkthrough before changing a subsystem, or the history behind a regression. Explains runtime flow and design rationale with cited evidence and confidence labels, and ends with what a change must preserve.
---

# Leo Explain

**Adapted from:** pstack `how` and `why` (MIT, https://github.com/backnotprop/pstack).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Answer at the level of a senior engineer onboarding onto the subsystem: enough to build a working mental model, not annotated source. `how` questions ask what the code does. `why` questions ask what forces gave it this shape. Most real questions need both.

If the target is vague, state your interpretation in one line and proceed. The user can redirect.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## 1. Size the question

- **Simple**: one module, one function, one narrow question. Explore and explain yourself, in one pass.
- **Complex**: a subsystem across files or services, a cross-cutting feature, an architecture overview. Split it into 2 to 4 angles, each a distinct slice, and spawn one read-only explorer subagent per angle in one message. Each returns entry points, the flow it traced with `file:line`, and open questions. You write the explanation from their findings.

When in doubt, take the simple path.

## 2. Anchor in code

Before explaining, pin the target down:

- The files, line ranges, and key symbols.
- For a why question, the history: `git blame -L <start>,<end> <file>`, `git log --follow -- <file>`, and the PR numbers in merge subjects.
- PR bodies and review discussion through the forge CLI when one is available.
- When `tracker` is set, the issues linked from those PRs or matching `id-pattern`.
- Records in `adr-dir` and terms in `domain-terms` that cover the area.

## 3. Label every claim

- **Found**: you read it in code, a commit, a PR, an issue, or an ADR. Cite it.
- **Inferred**: it follows from what you found. Say what it follows from.
- **Unknown**: nothing you found settles it. Say so, and name where the answer would live.

A search that finds nothing is still an answer: report it. Never invent a caller, an API, a PR, or a motive.

## Output

Drop sections that do not apply.

- **Overview**: two or three sentences on what the subsystem is for.
- **Key concepts**: the terms a reader must hold, using `domain-terms` names.
- **How it works**: the runtime flow in order, with `file:line` at each step.
- **Where things live**: modules, owners, and boundaries.
- **Why it is this way**: decisions, constraints, and rejected alternatives, each labelled found, inferred, or unknown, with its source.
- **Gotchas**: behavior that surprises a newcomer.
- **Before you change it**, when the question leads to a change:
  - **Preserve**: invariants and behavior callers depend on.
  - **Change**: what the request actually needs to move.
  - **Avoid**: approaches the history shows were tried and rejected.
  - **Risk**: what could break outside the diff, and the cheapest check for it.

Write it per `leo-writing`.
