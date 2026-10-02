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

Create the report directory with a self-ignoring `.gitignore`, so reports never enter the tree hash or a commit, and nothing under `.git/` is written:

```bash
mkdir -p .agents/gauntlet
printf '*\n' > .agents/gauntlet/.gitignore
```

## Stages

Run in this order. Do not reorder; reviews must see final code.

| # | Stage | Notes |
|---|---|---|
| 1 | `leo-simplify` | First. Its edits go in the edit list. |
| 2 | Review lanes | See below. One subagent per lane, in parallel, on the same diff (`git diff $(git merge-base <base-branch> HEAD)` plus untracked files). |
| 3 | `leo-live-check` | Conditional; see below. |
| 4 | `leo-trust-but-verify` | Last. It reruns the checks itself and returns the verdict. Never reuse an earlier verdict. |

A stage that cannot run is reported `not run: <reason>` and makes the result `fail`. Only stage 3 may be skipped.

### Stage 2: review lanes

Tiers, used here and by `leo-mode`:

- `mid`: `subagent-model` when set, otherwise the middle tier of your vendor family.
- `strong`: the most capable tier in your vendor family that is not its most expensive one.
- `other-vendor`: a model from a different vendor through its CLI (for example `codex exec`; see `leo-mode`), when one is installed and authenticated. Otherwise `strong`, and the report says "single vendor".

| Lane | Runs when | Reviewer | Verifier must show | Skill |
|---|---|---|---|---|
| Bugs | Always | `strong` | A concrete execution path or input that fails | `leo-code-review` finding format, correctness lens: logic, edge cases, error handling, races |
| Standards | Always | `mid` | The rule ID and its text, matched at `file:line` | `leo-code-review`, Standards axis |
| Spec | An issue, spec, or plan exists | `mid` | Each acceptance item mapped to diff lines, or flagged missing. The orchestrator verifies this lane. | `leo-code-review`, Spec axis |
| Security | The diff touches a `Risk areas` entry, auth, webhooks, secrets, dependencies, or agent-instruction files | `strong` | A reachable entry point and who can call it | `leo-security-review` |
| Performance | The diff touches the data layer, queries, the frontend bundle, or the mobile runtime | `mid` | A measurement: query count, `index-check-command`, `bundle-budget-command`, or timing | `leo-performance-review` |
| Tests | The diff adds or changes tests, or changes tested code | `mid` | The test fails on the base and passes on the head: `leo-mode` skill's `scripts/base-head --expect-fix --with <test file> <base-branch> -- <test command>` | `leo-tdd` |

- A lane's verifier spawns only when its reviewer reports a finding at `medium` or above.
- The verifier rules on each finding: `confirmed`, `refuted`, or `can't tell`, with evidence. Refuted findings are dismissed with the verifier's reason. The orchestrator decides `can't tell`.
- Sort confirmed findings into buckets, keeping each one's severity:
  - **Act on**: correctness, security, or maintainability problems a real PR would block on.
  - **Consider**: legitimate, but unclear whether worth the cost now.
  - **Noted**: valid, not actionable at this stage.
  - **Dismissed**: wrong, nitpick, or missing context, with a one-line reason.
- Filters: a lane that returns only nits means the code is fine; say so. "What if X is null" counts only if a caller can pass null; trace it. "I would have done it differently" is dismissed. More than 5 Act-on items means the filter is too loose. Give lone-model security and correctness findings extra scrutiny before dismissing.

- Each lane returns findings with severity `blocker`, `high`, `medium` or `low`; map any other scale onto these.
- A lane's verifier comes from a different vendor than its reviewer: `other-vendor`, or `strong` when the reviewer is `other-vendor`.
- A lane skill run as a lane reviews only its own lens, in one pass, and spawns no subagents of its own.
- Each verdict says how far its evidence got:
  1. Said so.
  2. Pointed at the `file:line`.
  3. Walked the failure step by step and showed whether it reaches.
  4. Ran a script or test against the real code.
  5. Reproduced it in the running app.

  `confirmed` and `refuted` need step 3 or higher. Refuting a security or correctness finding needs step 4.
- Findings below `medium` get no verifier. They are reported and not auto-fixed.
- A lane that does not run is listed with its reason (for example "no data-layer paths changed"). Bugs and Standards always run.

### Live-check skip conditions

Skip `leo-live-check` only when one holds, and record which:

- No changed path matches a `customer-facing` glob and you judge that nothing customer-facing changed (no behavior a customer sees or receives).
- `.agents/gauntlet/live-<fingerprint>.txt` exists for the current fingerprint and its last line is `live-check fingerprint: <hash> result: pass`. Cite that file in the report.

Current fingerprint, exactly as `leo-live-check` computes it, from this skill's directory:

```bash
scripts/live-fingerprint <base-branch> <customer-facing entries, quoted>
```

Any customer-facing edit since that run, including an auto-fix, changes the fingerprint and the stage runs again. A `result: fail` line never allows a skip.

## Auto-fix loop

After stages 1-4:

1. Fix only findings the lane verifier marked `confirmed`, plus `can't tell` findings you confirm yourself by reading the code and reproducing or tracing them.
2. Judgment calls (design choice, security tradeoff, behavior change, ambiguous requirement) are reported, never auto-fixed.
3. Behavior fixes go through `leo-tdd`: failing test first. Simplify and style fixes do not need a new test.
4. Rerun the stages the fixes touched, then `leo-trust-but-verify` in full.
5. At most 2 rounds. Findings still open after round 2 go in the report.

Never commit, push, or stage. Every edit is listed in the report.

## Report

Compute the tree hash last, after the final edit, with `scripts/tree-hash` from this skill's directory. It prints the hash of HEAD plus every working-tree change.

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

After writing the report, run `scripts/gate-check <tree hash>`. It fails when the `result:` line disagrees with the verdict and the findings table; fix the report, not the check.

Any edit after the report changes the tree hash and invalidates it. Rerun the gauntlet.

Finish with the report path, the three header lines, and the open findings. Do not claim the branch is ready unless `result: pass`.
