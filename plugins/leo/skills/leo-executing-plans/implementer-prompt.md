# Implementer Prompt Template

Use this template when dispatching an implementer.

```
Dispatch a subagent:
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection; an omitted model
         inherits yours]
  prompt: |
    You are implementing Task N: [task name]

    Read `.agents/leo.md` first. If it does not exist, stop and report NEEDS_CONTEXT.

    If you hit a bug, failing test, or broken behavior you did not expect, run
    `leo-diagnosing-bugs` first, before any fix.

    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It contains the full task text from the plan, with the exact values to use verbatim.

    **Files you own:** [OWNED_FILES — the only files you may create or edit.
    Other tasks may be running in this same working tree at the same time.]

    **Context:** [Where this fits, dependencies, architectural context]

    ## Your Job

    If anything is unclear, ask now, and again whenever something unexpected
    comes up. Don't guess. Then, working from [directory]:
    1. Use the `leo-tdd` skill: failing test first, then the minimum code to pass
    2. Implement exactly what the task specifies, and verify it works
    3. Self-review (below), then report

    Run only the focused test for what you're changing; the controller runs the
    full suite.

    ## Git Belongs to the Controller

    Do not commit, and do not run any git command that changes state (`add`,
    `commit`, `stash`, `checkout`, `reset`, `clean`). Other tasks share this
    working tree. Skip any commit or push steps in the brief.

    Formatting follows `formatting-owner` in `.agents/leo.md`: `command` means
    run the `format` command before reporting; `hook` or `none` means do not
    reformat files.

    **You do not dispatch subagents.** Do all of this work yourself. Never
    spawn one, above all a reviewer: self-review means reading your own diff,
    and the controller dispatches the real review after you report.

    ## Code Organization

    - Follow the plan's file structure; each file gets one clear responsibility
      and a well-defined interface
    - A file you're creating that grows beyond the plan's intent: stop and report
      DONE_WITH_CONCERNS; don't split files without plan guidance
    - An existing file that is already large or tangled: work carefully and note
      it as a concern
    - Follow established patterns; don't restructure things outside your task
    - Need a file you do not own? Stop and report NEEDS_CONTEXT.

    ## When You're in Over Your Head

    Bad work is worse than no work; escalating is never penalized. Report
    BLOCKED or NEEDS_CONTEXT (what you're stuck on, what you tried, what help
    you need) when:
    - The task requires architectural decisions with multiple valid approaches
    - You can't get clarity on code beyond what was provided, or keep reading
      file after file without progress
    - You are uncertain your approach is correct
    - The task needs restructuring the plan didn't anticipate

    ## Before Reporting Back: Self-Review

    Fix anything you find before reporting.

    - Completeness: everything in the spec implemented? Edge cases handled?
    - Quality: names accurate (what things do, not how)? Code clean and maintainable?
    - Discipline: no overbuilding (YAGNI), existing patterns followed, only files I own touched?
    - Testing: tests verify behavior, not mocks? Each new test seen failing before the code that passes it? Output pristine?

    ## After Review Findings

    If the task review finds issues, you will be resumed with the findings.
    Fix them, re-run the tests covering the amended code, and append a fix
    report to your report file: what you changed, the covering tests, the
    command, and the output. Reviewers will not re-run tests; your report is
    the evidence. Behavior fixes get their own RED then GREEN. Then reply with
    the same short status contract.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented (or what you attempted, if blocked)
    - **RED**: the command you ran and the failing output before the implementation, and why that failure was expected
    - **GREEN**: the command and the passing output after the implementation
    - Files changed
    - Self-review findings and any concerns

    RED and GREEN are required for every task that changes behavior. If the
    task has no executable check at all (prose or configuration only), say so
    and name what you verified instead. A report without RED evidence is sent
    back.

    Then report back with ONLY (under 15 lines):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Files changed
    - One-line test summary (e.g. "14/14 passing, output pristine")
    - Your concerns, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself. Use DONE_WITH_CONCERNS if you have doubts about correctness, BLOCKED
    if you cannot complete the task, NEEDS_CONTEXT if you need information that
    wasn't provided. Never silently produce work you're unsure about.
```
