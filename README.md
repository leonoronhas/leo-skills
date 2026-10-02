# leo-skills

Evidence-first engineering skills for coding agents. Install, run `leo-setup` once per repo, then use the skills.

## Skills

<!-- leo:roster -->
| Phase | Skills |
|---|---|
| Setup | `leo-setup` |
| Mode | `leo-mode` |
| Think | `leo-brainstorming`, `leo-grilling`, `leo-domain-modeling`, `leo-codebase-design`, `leo-prototype`, `leo-research` |
| Plan | `leo-writing-plans` |
| Build | `leo-executing-plans`, `leo-tdd`, `leo-diagnosing-bugs`, `leo-simplify`, `leo-worktrees`, `leo-resolving-merge-conflicts` |
| Review | `leo-gauntlet`, `leo-code-review`, `leo-security-review`, `leo-performance-review`, `leo-live-check`, `leo-receiving-review`, `leo-pr-review` |
| Verify | `leo-trust-but-verify` |
| Ship | `leo-finishing-branch`, `leo-handoff` |
| Write | `leo-writing` |
<!-- /leo:roster -->

## Install

### Claude Code plugin

```bash
/plugin marketplace add leonoronhas/leo-skills
/plugin install leo@leo-skills
```

Skills are invoked as `leo:leo-<name>`.

### install.sh

```bash
git clone https://github.com/leonoronhas/leo-skills && cd leo-skills
./install.sh --target <claude|codex|agents> [--project DIR] [--link]
```

| Target | User-level (no `--project`) | With `--project DIR` | Loaded by |
|---|---|---|---|
| `claude` | `~/.claude/skills` | `DIR/.claude/skills` | Claude Code |
| `codex` | `~/.agents/skills` | `DIR/.agents/skills` | Codex ([docs](https://learn.chatgpt.com/docs/build-skills)); Cursor also reads `~/.agents/skills` |
| `agents` | not supported: needs `--project` | `DIR/.agents/skills` | Cursor ([docs](https://cursor.com/docs/context/skills)) |

- `--link` symlinks instead of copying, so updates follow `git pull`.
- Skills are invoked as `leo-<name>`.
- Reinstalling replaces existing `leo-*` directories. It refuses to replace one that is not a `leo-*` install.

## First run

Run `leo-setup` once per repo. It inspects the repo, shows a field table with each value's source file, asks about what it cannot infer, then writes `.agents/leo.md`. Every other skill reads that file for commands, base branch, paths, rules files, risk areas, and customer-facing globs.

- Always asks for risk areas (names only) and customer-facing globs.
- Never runs the proposed commands; it only checks they resolve.
- Creates `.agents/gauntlet/` with a self-ignoring `.gitignore`, so reports never reach a commit.
- Offers to add a routing block to `AGENTS.md` (and `@AGENTS.md` to `CLAUDE.md`). Say yes: skills fire only when the agent picks them, and without the block an obvious-looking bug gets fixed without `leo-diagnosing-bugs`.
- Does not commit.
- Rerun after project facts change: it diffs against the existing file and asks before overwriting.

**TypeScript repos.** When a `tsconfig.json` exists and the repo has no standards router of its own, `leo-setup` offers to fetch [leonoronhas/typescript-standards](https://github.com/leonoronhas/typescript-standards) into `docs/standards/` at a pinned commit sha. Nothing downloads before a yes. Review and TDD skills then cite its rule IDs.

## Flow

| Step | Skill | Does |
|---|---|---|
| 1 | `leo-brainstorming` | Explores intent, requirements, and design before any build work. |
| 2 | `leo-writing-plans` | Turns a spec into a multi-step plan before code is touched. |
| 3 | `leo-executing-plans` | Dispatches a fresh implementer per task, reviews each diff. |
| 4 | `leo-gauntlet` | Full pre-merge gate; writes a report keyed to the working tree. |
| 5 | `leo-finishing-branch` | Offers merge, pull request, keep, or discard. A PR needs a passing gauntlet report. |

**Bugs come first.** For any bug, regression, error, failing test, or broken or slow behavior, `leo-diagnosing-bugs` runs before anything else. It builds the red feedback loop, finds the root cause, and hands the fix to `leo-tdd`.

Other skills (`leo-tdd`, `leo-grilling`, and so on) are used where they apply; see the roster above.

## Gauntlet

Stages run in this order, so reviews see final code.

| # | Stage | Notes |
|---|---|---|
| 1 | `leo-simplify` | Runs first. |
| 2 | Review lanes: bugs, standards, spec, security, performance, tests | One reviewer per lane, in parallel, on the same diff. A cross-vendor verifier confirms or refutes each finding at `medium` or above. Security, performance, spec, and tests run only when the diff touches their area. |
| 3 | `leo-live-check` | Customer-facing changes only. |
| 4 | `leo-trust-but-verify` | Runs last; reruns the checks itself and returns the verdict. |

A stage that cannot run is reported `not run: <reason>` and fails the result. Only stage 3 may be skipped.

**Auto-fix limits**

- Fixes confirmed findings only: the agent reads the code and reproduces or traces each finding first.
- Judgment calls (design, security tradeoff, behavior change, ambiguous requirement) are reported, never fixed.
- Behavior fixes go through `leo-tdd`: failing test first.
- At most 2 rounds. Findings still open after round 2 go in the report.
- Never commits, pushes, or stages. Every edit is listed in the report.

**Live check**

Runs only when a changed path matches a `customer-facing` glob. It is skipped when nothing customer-facing changed, or when an earlier pass in the same session has an identical fingerprint (a hash of the customer-facing diff). Any customer-facing edit since then, including an auto-fix, changes the fingerprint and the stage runs again. A recorded fail never allows a skip. It never targets production and never types a password.

**PR gate**

The report is written to `.agents/gauntlet/<tree-hash>.md`. Its first lines are `tree:`, `verdict: PROVEN|NOT YET|CAN'T PROVE`, and `result: pass|fail`. `result: pass` needs verdict `PROVEN` and no open `high` or `blocker` finding. The hash covers HEAD plus all working-tree changes, so any later edit invalidates the report. `leo-finishing-branch` refuses to open a PR without a passing report for the current tree; there is no size exemption. Merge is not gated, but the gate result is stated before merging.

**Subagent model.** The adapter's `subagent-model` if set, else one tier below the parent's model in the same vendor family.

## PR review in CI

`leo-pr-review` runs in GitHub Actions on Codex. It checks each PR against the base-commit rules, the standards router, and the linked issue, then posts inline comments on the diff and one status comment. It is advice, never a gate: every step is `continue-on-error`.

Runs on non-draft PRs from the same repo. Skips empty and docs-only diffs, and diffs over 60 files or 3000 lines. Two reviews per PR; the first runs at full depth.

**Setup**

1. Install the skills into the repo and commit them: `./install.sh --target codex --project <repo>` (commit `<repo>/.agents/skills`).
2. Run `leo-setup` and commit `.agents/leo.md` to the base branch. CI reads the base commit.
3. Copy the CI files: `cp -R ci/pr-review <repo>/.github/leo-pr-review`.
4. Move `codex-pr-review.yml` from there to `<repo>/.github/workflows/leo-pr-review.yml` and set its `branches:` to your base branch.
5. In repo settings, add:

    | Kind | Name | Required | Value |
    |---|---|---|---|
    | Variable | `LEO_PR_REVIEW_ENABLED` | yes | `true` |
    | Secret | `OPENAI_API_KEY` | yes | your OpenAI key |
    | Secret | `LINEAR_API_KEY` | no | for Linear issue lookup |
    | Variable | `ISSUE_ID_PATTERN` | no | e.g. `ENG-\d+`, used with Linear |

    Without Linear, `#N` GitHub issues are used through the built-in `GITHUB_TOKEN`.
6. Merge to the base branch. It reviews PRs opened after that.

## Credits

Some skills adapt MIT-licensed work; each adapted `SKILL.md` names its source. Skills marked **Original** are not adapted.

- [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent (MIT)
- [MattPocock skills](https://github.com/mattpocock/skills) by Matt Pocock (MIT)
- [pstack](https://github.com/backnotprop/pstack), mirror of Cursor's pstack by poteto (MIT)

License texts: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

MIT. See [LICENSE](LICENSE).
