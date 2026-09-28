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

    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It contains the full task text from the plan, with the exact values to use verbatim.

    ## Files You Own

    [OWNED_FILES — the only files you may create or edit. Other tasks may be
    running in this same working tree at the same time.]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task description

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Use the `leo-tdd` skill: failing test first, then the minimum code to pass
    2. Implement exactly what the task specifies
    3. Verify it works
    4. Self-review (see below)
    5. Report back

    Work from: [directory]

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    While iterating, run the focused test for what you're changing. Do not run
    the full suite; the controller runs it.

    ## Git Belongs to the Controller

    Do not commit, and do not run any git command that changes state (`add`,
    `commit`, `stash`, `checkout`, `reset`, `clean`). Other tasks share this
    working tree. If the brief lists commit or push steps, skip them. The
    controller reviews your diff and commits.

    Formatting follows `formatting-owner` in `.agents/leo.md`: `command` means
    run the `format` command before reporting; `hook` or `none` means do not
    reformat files.

    ## You Do Not Dispatch Subagents

    Do all of this task's work yourself. Never spawn a subagent to
    implement part of the task, and above all never spawn a reviewer to
    check your work. Self-review (below) means reading your own diff.
    Review is the controller's job: after you report, it dispatches a
    fresh reviewer against your diff. A reviewer you spawn duplicates
    that review at full cost, and its approval counts for nothing in
    the process. If you catch yourself thinking "an independent review
    would strengthen my report" — that review is already scheduled.
    Report instead.

    ## Code Organization

    You reason best about code you can hold in context at once, and your edits are more
    reliable when files are focused. Keep this in mind:
    - Follow the file structure defined in the plan
    - Each file should have one clear responsibility with a well-defined interface
    - If a file you're creating is growing beyond the plan's intent, stop and report
      it as DONE_WITH_CONCERNS — don't split files on your own without plan guidance
    - If an existing file you're modifying is already large or tangled, work carefully
      and note it as a concern in your report
    - In existing codebases, follow established patterns. Improve code you're touching
      the way a good developer would, but don't restructure things outside your task.
    - Need a file you do not own? Stop and report NEEDS_CONTEXT.

    ## When You're in Over Your Head

    It is always OK to stop and say "this is too hard for me." Bad work is worse than
    no work. You will not be penalized for escalating.

    **STOP and escalate when:**
    - The task requires architectural decisions with multiple valid approaches
    - You need to understand code beyond what was provided and can't find clarity
    - You feel uncertain about whether your approach is correct
    - The task involves restructuring existing code in ways the plan didn't anticipate
    - You've been reading file after file trying to understand the system without progress

    **How to escalate:** Report back with status BLOCKED or NEEDS_CONTEXT. Describe
    specifically what you're stuck on, what you've tried, and what kind of help you need.
    The controller can provide more context, re-dispatch on a more capable model,
    or break the task into smaller pieces.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?
    - Did I touch only the files I own?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I see each new test fail before I wrote the code that makes it pass?
    - Are tests comprehensive?
    - Is the test output pristine (no stray warnings or noise)?

    If you find issues during self-review, fix them now before reporting.

    ## After Review Findings

    If the task review finds issues, you will be resumed with the findings.
    Fix them, re-run the tests that cover the amended code, and append a fix
    report to your report file: what you changed, the covering tests you
    ran, the command, and the output. Reviewers will not re-run tests for
    you — your report is the test evidence. Behavior fixes get their own
    RED then GREEN. Then reply with the same short status contract as your
    first report.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented (or what you attempted, if blocked)
    - **RED**: the command you ran and the failing output before the implementation, and why that failure was expected
    - **GREEN**: the command and the passing output after the implementation
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns

    RED and GREEN are required for every task that changes behavior. If the
    task has no executable check at all (prose or configuration only), say so
    and name what you verified instead. A report without RED evidence is sent
    back.

    Then report back with ONLY (under 15 lines — the detail lives in the
    report file):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Files changed
    - One-line test summary (e.g. "14/14 passing, output pristine")
    - Your concerns, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself — the controller acts on it directly.

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the task. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```
