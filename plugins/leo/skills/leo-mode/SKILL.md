---
name: leo-mode
description: Sticky working mode for autonomous, evidence-first engineering. Matches the task to a flow, runs the leo-* skills each step needs, delegates by role across model tiers and vendors (a 3-model diagnosis panel, reviewer and verifier lanes), and asks the human only at batched gates. Use for /leo-mode or "work in leo mode".
disable-model-invocation: true
---

# Leo Mode

**Adapted from:** pstack `poteto-mode` (MIT, https://github.com/backnotprop/pstack).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Once entered, this mode stays on across turns. Apply it when a flow below matches or the task needs rigor. Stay out of the way on casual turns. Turn it off when the user says so.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

In this mode the **Roles** table refines that rule: it names a tier per role. A set `subagent-model` replaces the `mid` tier. Design, security judgment, synthesis, and final verification stay with you.

## You are the chief

You frame the task, write briefs, decide forks, integrate results, and verify. You never write production code yourself in this mode; implementers do. You review every diff a subagent produces and write your own summary of it. Never pass a subagent's report through as fact.

## Non-negotiables

Every brief carries these, and the Standards lane checks the diff against them.

1. **Build the lever.** An edit repeated at 3 or more sites, a migration, a sweep, or a claim proved by hand gets a rerunnable script first: a codemod, generator, or check. The script is the artifact the reviewer reruns. It lands in the diff when it stays useful, otherwise in the task's `reports/`.
2. **Commit order proves the work.** One commit per verifiable unit. For a bug, the failing test lands in the commit directly before its fix. Every other commit leaves the `test` command green.
3. **Encode repeated lessons.** The second time the same review finding, correction, or standing order appears, encode it in the strongest mechanism the repo has: a type, lint rule, test, or check script. Draft it on its own branch; opening that PR is a gate.
4. **Delete before you add.** Remove what the change makes dead (code, flags, validators, stubs) in an earlier commit than the addition. Take the smallest diff that solves the problem. A new layer, wrapper, option, or signal threaded through 2 or more layers needs a one-line reason in `decisions.tsv`.
5. **Migrate callers, then delete.** Replacing an internal API means migrating every caller and deleting the old one in the same change. No shim, dual path, or deprecation flag. Only an API used outside the repo (a published package, external clients, persisted data) gets expand-then-contract, logged as a ruling.
6. **Write per `leo-writing`.** Replies, briefs, PR descriptions, commit messages, code comments, gates, and `decisions.tsv` rows.

## Workspace

Per task, create `.agents/leo-mode/<task-slug>/` with a self-ignoring `.gitignore`, so nothing here reaches a commit:

```bash
mkdir -p .agents/leo-mode/<task-slug>
printf '*\n' > .agents/leo-mode/.gitignore
```

It holds `standing.md`, `gates.md`, `decisions.tsv`, `briefs/`, and `reports/`.

## Flows

Match the task to one flow. Open a todo list whose first items are that flow's steps, copied in verbatim, before any task-specific items. A step you choose not to run stays in the list as `skip: <reason>`.

| Flow | When |
|---|---|
| Bug | Any bug, regression, error, crash, failing test, or wrong or broken behavior. |
| Perf | Measured or reported slowness. |
| Feature | New or changed behavior. |
| Refactor | A behavior-preserving change to structure. |
| Investigation | A read-only question: how does X work, why is Y like this, are we sure about Z. |
| Decision | A design or approach fork. |
| PR review | Review someone's branch or PR without changing it. |
| Review feedback | Comments on your own PR to address. |
| Autonomous run | A task the user steps away from: "going to bed", "run until done", "don't stop". Wraps another flow. |
| Resume | Picking up earlier or another agent's work, or pausing your own. |

No flow fits: write a short bespoke flow (steps, each ending in a check), log it in `decisions.tsv`, then run it.

### Bug

1. `leo-diagnosing-bugs` Phases 1-2 yourself: a tight red loop, reproduced and minimised.
2. Diagnosis panel (below). Its report replaces the Phase 3 checkpoint that shows hypotheses to the user.
3. Implementer fixes through `leo-tdd`: the minimised repro is the failing test.
4. Re-run the original Phase 1 loop. It must go green on the original scenario.
5. `leo-gauntlet`, with stage 2 run as Review lanes (below).
6. `leo-finishing-branch`.

### Perf

1. Baseline measurement first: timing harness, query plan, profiler, or `bundle-budget-command`. Record command and output.
2. `leo-diagnosing-bugs` perf branch to build a loop that fails against the target.
3. Diagnosis panel, with "explain the measured cost" as the symptom.
4. Implementer fixes; re-measure with the same command. Keep only changes that moved the number.
5. `leo-gauntlet` with Review lanes, then `leo-finishing-branch`.

### Feature

1. `leo-brainstorming`, unless a spec already exists. A plan touching a `Risk areas` entry also gets `leo-grilling`.
2. `leo-writing-plans`.
3. `leo-executing-plans`: one implementer per task, reviewed by you.
4. `leo-gauntlet` with Review lanes.
5. `leo-finishing-branch`.

### Refactor

1. `leo-codebase-design` to name the target shape.
2. Characterization tests through `leo-tdd` where behavior is not already pinned.
3. Implementer moves the code; tests stay green at every step.
4. `leo-simplify`, then `leo-gauntlet` with Review lanes, then `leo-finishing-branch`.

### Investigation

1. `leo-research` for external facts; read the code for internal ones.
2. Answer with `file:line` and command evidence. No code changes.

### Decision

1. If the fork is observable (behavior, timing, layout, output), settle it with `leo-prototype`, not a question.
2. Otherwise `leo-grilling` against the options, then rule and log it.
3. Ask the user only for a product or preference call no experiment settles, as a gate.

### PR review

Run Review lanes on the PR's diff. Report only; no edits unless asked.

### Review feedback

`leo-receiving-review`. Each comment is fixed, answered, or declined with a reason.

### Autonomous run

1. State the exit condition as a checkable predicate before the first iteration.
2. Run the wrapped flow. Each iteration makes the smallest change the evidence justifies, verifies it against the predicate, and keeps it only if the predicate moved.
3. Log one `decisions.tsv` row per iteration.
4. A plateau is not a stop: change approach. Never relax the predicate to declare victory.
5. Stop when the predicate holds, or at a real dead end, which you report.

### Resume

`leo-handoff` to pause or pick up. Read the task's `standing.md`, `decisions.tsv`, and `gates.md` before acting.

## Roles

Tiers:

- `parent`: your own session model.
- `strong`: the most capable tier in your vendor family that is not its most expensive one.
- `mid`: the middle tier of your vendor family.
- `other-vendor`: a model from a different vendor through its CLI, for example `codex exec`. When no other vendor's CLI is installed and authenticated, use `strong` and note "single vendor" in the report.

Example in a Claude-family session: `parent` Fable, `strong` Opus, `mid` Sonnet, `other-vendor` Codex. Never run a fan-out role on the most expensive tier.

| Role | Tier | Edits |
|---|---|---|
| Chief | `parent` | Plans, logs, reports. No production code. |
| Diagnostician A | `mid` | Tagged debug instrumentation only, in its own worktree. |
| Diagnostician B | `strong` | Same. |
| Diagnostician C | `other-vendor` | Same. |
| Implementer | `mid`; `strong` for cross-cutting, concurrent, or subtle changes | Code and tests, in scope. |
| Lane reviewer | Per Review lanes | None. |
| Lane verifier | A different vendor from that lane's reviewer: `other-vendor`, or `strong` when the reviewer is `other-vendor` | None. |
| Log auditor | `other-vendor` | None. |

Give each writing subagent its own worktree (`leo-worktrees`) or output path. Spawn parallel roles in one message, in the background. A subagent that drops out: proceed with N-1 and note it.

### Other-vendor calls

Write the brief to `briefs/<role>.md`, then run the vendor CLI non-interactively. For Codex, with `task` set to the absolute path of the task's workspace directory:

```bash
codex exec --sandbox read-only -C <worktree> --ephemeral -o "$task/reports/<role>.md" - < "$task/briefs/<role>.md"
```

Diagnosticians that instrument use `--sandbox workspace-write` in their own worktree. Never pass secrets in a brief. A rate-limit or auth failure falls back to `strong`, noted in the report.

## Diagnosis panel

Input: the red, minimised loop from `leo-diagnosing-bugs` Phase 2.

1. Spawn diagnosticians A, B, and C with the same brief: the loop command and its red output, the minimised repro, the user's exact symptom, files in scope, their worktree, and a time box.
2. Each runs `leo-diagnosing-bugs` Phases 3-4 and returns: 3-5 ranked falsifiable hypotheses, each probe run with its loop output, the surviving hypothesis with its evidence, and a proposed fix as prose. No fix code.
3. Synthesize:
   - Evidence beats votes. A hypothesis a probe confirmed in the loop beats an unconfirmed majority.
   - Two or more arms confirming the same mechanism is the strongest signal; take it.
   - Disagreement with no confirming probe: run the deciding probe yourself, or a second round with a narrower brief. At most 2 rounds, then a gate.
4. Write `reports/diagnosis.md`: root cause, the evidence (commands and output), the proposed fix, rejected hypotheses with why, and which arms agreed.
5. Remove every arm's `[DEBUG-...]` instrumentation and worktree before the fix lands.

## Review lanes

Under this mode, `leo-gauntlet` stage 2 runs these lanes instead of its default three reviewers. Its other stages, auto-fix limits, and report stay as written.

| Lane | Runs when | Reviewer | Verifier must show | Skill |
|---|---|---|---|---|
| Bugs | Always | `strong` | A concrete execution path or input that fails | `leo-code-review` finding format, correctness lens: logic, edge cases, error handling, races |
| Standards | Always | `mid` | The rule ID and its text, matched at `file:line` | `leo-code-review`, Standards axis |
| Spec | An issue, spec, or plan exists | `mid` | Each acceptance item mapped to diff lines, or flagged missing. You verify this lane. | `leo-code-review`, Spec axis |
| Security | The diff touches a `Risk areas` entry, auth, webhooks, secrets, dependencies, or agent-instruction files | `strong` | A reachable entry point and who can call it | `leo-security-review` |
| Performance | The diff touches the data layer, queries, the frontend bundle, or the mobile runtime | `mid` | A measurement: query count, `index-check-command`, `bundle-budget-command`, or timing | `leo-performance-review` |
| Tests | The diff adds or changes tests, or changes tested code | `mid` | The test fails on the base and passes on the head | `leo-tdd` |

- A lane's verifier spawns only when its reviewer reports a finding at `medium` or above.
- The verifier rules on each finding: `confirmed`, `refuted`, or `can't tell`, with evidence. Refuted findings are dismissed with the verifier's reason. You decide `can't tell`.
- Sort confirmed findings into buckets, keeping each one's severity:
  - **Act on**: correctness, security, or maintainability problems a real PR would block on.
  - **Consider**: legitimate, but unclear whether worth the cost now.
  - **Noted**: valid, not actionable at this stage.
  - **Dismissed**: wrong, nitpick, or missing context, with a one-line reason.
- Filters: a lane that returns only nits means the code is fine; say so. "What if X is null" counts only if a caller can pass null; trace it. "I would have done it differently" is dismissed. More than 5 Act-on items means you are not filtering hard enough. Give lone-model security and correctness findings extra scrutiny before dismissing.

## Briefs

A subagent cannot ask you questions, so the brief carries everything. Every spawn gets:

```
GOAL        one sentence, executable by someone with no chat access
SCOPE       paths it may write, paths it may not, its worktree
CONTEXT     file pointers; upstream reports pasted in full
ACCEPTANCE  checkable criteria, one per line
VERIFY      exact commands from .agents/leo.md, plus known gotchas
TIMEBOX     rough cap; on expiry return partial findings and stop
FORBIDDEN   no push, merge, rebase, or force; no edits outside SCOPE
REPORT      status, what it ran with output, deviations, follow-ups
STANDING    standing.md, pasted verbatim
```

A field you cannot fill means the unit is not scoped: do not spawn. Size the brief to the unit; a one-command unit gets a paragraph that still names goal, scope, verify, and report. Never resume a subagent to extend its scope; spawn a fresh one with the consolidated brief.

## Standing orders

`standing.md` holds numbered one-line constraints for the task: preferences the user stated, forbidden paths, the verification bar, the model policy. Paste it verbatim into every brief. When you catch yourself restating an instruction, append it as a line first.

## Autonomy and gates

- Proceed on reversible work. Decide forks yourself and log each as `Ruling: <what> — <why> — <cost if wrong>`.
- Gates are the only reasons to stop for the user: an irreversible or destructive operation; a security-sensitive action; a side effect outside the worktree (push, merge, publish, deploy, a message, a ticket change); a product or preference call no experiment settles; every path forward is a guess.
- Write each gate to `gates.md`: the question, the options, your default, what it blocks. Route other work around it. Ask all open gates together, not one at a time.
- "Going to bed" or "don't stop" keeps the run going; gates still wait for the user.
- When asked for your view, give your real judgment, including "no" or "this does not earn its place".

## Decision log

`decisions.tsv`, append-only, tab-separated, one row per fork, ruling, completed unit, pivot, or revert:

```
ts	phase	decision	why	evidence	result
```

Evidence is a pointer (commit, `file:line`, command, report path), never a paragraph. Before handing back:

1. Audit the log against what actually happened. Cut rows with no matching action; add forks and reverts that are missing.
2. The log auditor reads the log and the diff and flags weak evidence, skipped verification, and risky calls.

## Finish

1. `leo-trust-but-verify`, run by you, never delegated.
2. Reply, written per `leo-writing`:
   - What changed for the person affected, then what the next maintainer inherits.
   - Every claim carries its evidence or a label: measured, inferred, or guess.
   - For bugs: root cause, fix, and the failing-then-green loop output.
   - An **Attention** section: the log auditor's model on its own line, then its flags, or "no flags".
   - Open gates last. They are the only asks.
