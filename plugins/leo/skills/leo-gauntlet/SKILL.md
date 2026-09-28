---
name: leo-gauntlet
description: Use before opening a pull request, or any time you want the full pre-merge gate. Runs simplify, code, security and performance review, a live check for customer-facing changes, and a final verification, auto-fixes confirmed findings, and writes a pass/fail report keyed to the working tree.
---

# Leo Gauntlet

**Original.**

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Thin orchestrator. It holds no review logic; each stage is its own skill. Run from the repo root. `base-branch` must be set.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## Setup

Create the report directory and git-exclude it, so reports never enter the tree hash or a commit:

```bash
mkdir -p .agents/gauntlet
grep -qxF '.agents/gauntlet/' "$(git rev-parse --git-path info/exclude)" || echo '.agents/gauntlet/' >> "$(git rev-parse --git-path info/exclude)"
```

## Stages

Run in this order. Do not reorder; reviews must see final code.

| # | Stage | Notes |
|---|---|---|
| 1 | `leo-simplify` | First. Its edits go in the edit list. |
| 2 | `leo-code-review`, `leo-security-review`, `leo-performance-review` | One subagent each, in parallel, same diff (`git diff $(git merge-base <base-branch> HEAD)` plus untracked files). Model per the rule above. Each returns findings with severity `blocker`, `high`, `medium` or `low`; map any other scale onto these. |
| 3 | `leo-live-check` | Conditional; see below. |
| 4 | `leo-trust-but-verify` | Last. It reruns the checks itself and returns the verdict. Never reuse an earlier verdict. |

A stage that cannot run is reported `not run: <reason>` and makes the result `fail`. Only stage 3 may be skipped.

### Live-check skip conditions

Skip `leo-live-check` only when one holds, and record which:

- No changed path matches a `customer-facing` glob and you judge that nothing customer-facing changed (no behavior a customer sees or receives).
- A line `live-check fingerprint: <hash> result: pass` appears earlier in this session and `<hash>` equals the current fingerprint. Cite that run in the report.

Current fingerprint, exactly as `leo-live-check` computes it (`<customer-facing globs>` are the `customer-facing` entries, quoted):

```bash
tmp="$(mktemp -d)/index"
GIT_INDEX_FILE="$tmp" git read-tree HEAD
GIT_INDEX_FILE="$tmp" git add -A
GIT_INDEX_FILE="$tmp" git diff --cached "$(git merge-base <base-branch> HEAD)" -- <customer-facing globs> | git hash-object --stdin
```

Any customer-facing edit since that run, including an auto-fix, changes the fingerprint and the stage runs again. A `result: fail` line never allows a skip.

## Auto-fix loop

After stages 1-4:

1. Confirm each finding yourself: read the code and reproduce or trace it. Fix only confirmed findings.
2. Judgment calls (design choice, security tradeoff, behavior change, ambiguous requirement) are reported, never auto-fixed.
3. Behavior fixes go through `leo-tdd`: failing test first. Simplify and style fixes do not need a new test.
4. Rerun the stages the fixes touched, then `leo-trust-but-verify` in full.
5. At most 2 rounds. Findings still open after round 2 go in the report.

Never commit, push, or stage. Every edit is listed in the report.

## Report

Compute the tree hash last, after the final edit, from the repo root:

```bash
tmp="$(mktemp -d)/index"
GIT_INDEX_FILE="$tmp" git read-tree HEAD
GIT_INDEX_FILE="$tmp" git add -A
GIT_INDEX_FILE="$tmp" git write-tree
```

Write `.agents/gauntlet/<tree hash>.md`. The first three lines are exactly:

```
tree: <hash>
verdict: PROVEN|NOT YET|CAN'T PROVE
result: pass|fail
```

`verdict` is from the final `leo-trust-but-verify` run. Then:

1. Findings table, merged across stages, deduplicated, ranked by severity: `severity | stage | file:line | finding | status` (`fixed`, `open`, `judgment call`).
2. Per-stage status: `ran`, `skipped: <reason>` (cite the earlier run for a fingerprint skip), or `not run: <reason>`, plus the count fixed.
3. Edit list: every file changed by the gauntlet and why.

`result: pass` requires verdict `PROVEN` and no open finding at `high` or `blocker`. Otherwise `fail`.

Any edit after the report changes the tree hash and invalidates it. Rerun the gauntlet.

Finish with the report path, the three header lines, and the open findings. Do not claim the branch is ready unless `result: pass`.
