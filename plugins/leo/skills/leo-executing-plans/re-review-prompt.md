# Scoped Re-Review Prompt Template

Use this template when dispatching a re-review after a fix round. The
re-reviewer verifies each finding from the previous review was addressed and
checks the fix diff for new breakage. It is not a fresh review.

```
Dispatch a subagent:
  description: "Re-review Task N fix round R"
  model: [MODEL — REQUIRED: per SKILL.md Model Selection; an omitted model
         inherits yours]
  prompt: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer has attempted to fix them. Verdict each finding
    and inspect the fix diff, nothing else.

    ## The Task and Findings

    Read the task brief: [BRIEF_FILE]

    Findings under verification:
    [FINDINGS]

    ## The Fix

    Read the implementer's report (fix reports are appended at the end):
    [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once (fix commits, stat, fix diff with context). Do not
    re-run git commands. If it is missing, fetch the diff yourself:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    **You do not dispatch subagents.** Do all of this review yourself. Never
    spawn a subagent or a second reviewer; if the diff is large, review it in
    passes and say so.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: an issue entirely outside the fix
    diff goes under Out-of-Scope Observations and does not block this task or
    extend the loop.

    ## Tests

    The report's appended fix section is unverified claims: confirm it names
    the covering tests and shows their output, and verify against the diff. Do
    not re-run the suite. Run a test only when reading the code raises a
    specific doubt no existing run answers, and then a focused test only.

    ## Output Format

    Your final message is the report: begin with the first verdict. Every line
    is a verdict, a finding with file:line, or a check you ran.

    ### Finding Verdicts

    For each finding, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the specific defect must no
      longer exist.

    ### New Breakage in the Fix Diff
    What the fix itself broke or introduced, with severity (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations
    Issues entirely outside the fix diff. Non-blocking; the controller ledgers them. "None" if none.

    ### Verdict
    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:**
- `[MODEL]`: required, per SKILL.md Model Selection
- `[BRIEF_FILE]`, `[REPORT_FILE]`: the task brief and the implementer's report (fix reports appended)
- `[FINDINGS]`: the Critical/Important findings and spec gaps from the previous review, verbatim, one per bullet
- `[FIX_BASE_SHA]`: the head the previous review saw; `[HEAD_SHA]`: current commit
- `[DIFF_FILE]`: the path `bash scripts/review-package PLAN_FILE FIX_BASE HEAD PATH...` printed
