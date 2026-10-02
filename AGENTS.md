# AGENTS.md — leo-skills

This repo is a skill suite, not an app. Skills live in `plugins/leo/skills/leo-<name>/SKILL.md`.

## Rules for editing this repo

- Every project fact a skill needs comes from `.agents/leo.md` in the consuming repo (template: the `## Template` section of `plugins/leo/skills/leo-setup/SKILL.md`). Never hard-code a command, branch, path, vendor, or tracker.
- A skill adapted from upstream carries one attribution line and its upstream appears in `THIRD_PARTY_NOTICES.md`.
- Every skill that delegates to subagents carries this block verbatim; `scripts/check.mjs` fails if any copy differs:

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

- Before committing: `node scripts/check.mjs && node --test 'tests/*.test.mjs' 'ci/pr-review/*.test.mjs' && shellcheck install.sh plugins/leo/skills/*/scripts/*`.

## Which skill when

| Trigger | Skill |
|---|---|
| First use in a repo, or `.agents/leo.md` missing | `leo-setup` |
| User invokes `/leo-mode` for autonomous, multi-agent work | `leo-mode` |
| How something works or why it was built this way, before changing it | `leo-explain` |
| No scripted way to drive the app, or its verify skill drifted | `leo-verification-skill` |
| Before a feature, behavior change, or UI | `leo-brainstorming` |
| Stress-testing a plan or decision | `leo-grilling` |
| Spec exists, multi-step work ahead | `leo-writing-plans` |
| Plan exists, execute it | `leo-executing-plans` |
| Writing or changing code | `leo-tdd` |
| Any bug, regression, error, failing test, or broken or slow behavior | `leo-diagnosing-bugs` (first, always) |
| Before opening a PR | `leo-gauntlet` |
| Before claiming done | `leo-trust-but-verify` |
| Wrapping up a branch | `leo-finishing-branch` |
| Writing a reply, PR description, commit message, doc, or code comment | `leo-writing` |
