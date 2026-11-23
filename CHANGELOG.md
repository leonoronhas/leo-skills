# Changelog

Every change to `plugins/` bumps the version in `plugins/leo/.claude-plugin/plugin.json` and adds an entry here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Before 1.0.0, a minor bump may remove or rename skills.

## [0.4.0] - 2026-11-22

### Changed

- `leo-tdd`: the completion check is every new behavior at a confirmed seam, not every new function. New seam rules: no parameter or export that only a test uses, no mock of an internal module path, and shared test support before a new helper. A test added after the code is proven by mutation.
- `leo-code-review`: a "second home" check searches the whole repository for an existing constant, limit, sentence, type, rule, or helper, and flags a check order or message mapping repeated per route or screen. The orphan check now includes what the change left dead outside the diff. A client import from a package root when a narrow entry exists is a finding.
- `leo-simplify`: check before adding, and a smell row for comments that restate the code.
- `leo-executing-plans`: one read-only cross-task pass over the merged result for duplicates that parallel tasks each wrote, before the final review. Worktree implementers use `git -C <path>` and confirm the top level and branch first.
- `leo-gauntlet`: stage 1b runs the adapter's unused-code, cycle, and copy checks, and is skipped with a suggestion when none is configured. With no CI, the gauntlet's own run of the local gate is the gate, and the report carries its output.
- `leo-setup`: the adapter gains `unused-code`, `cycles`, `copies`, `gate`, and `ci-runs-checks`.
- `leo-untangle-codebase`: oracles kept with their reference output and re-run at the end, byte-compare equality, a kept-on-purpose list for reviewers, reviewer findings checked against the base, and a read-only `list` mode.
- `leo-trust-but-verify`: equality claims need a byte compare in the evidence, and "CI will check it" is not evidence without working CI.

## [0.3.0] - 2026-11-22

### Added

- `leo-untangle-codebase`: a user-invoked, whole-codebase refactor. It lists every hidden link, needless link, surplus piece, and special case in a decision log under the `plans` path, redesigns from first principles, lands one fix per commit against a recorded baseline, and repeats with subagent sweeps until nothing worth fixing is left. It can also remove comments that restate code and tests that cannot catch a bug, when the user opts in. Adapted from caldoai `untangle-codebase`.
- `check.mjs` requires a `THIRD_PARTY_NOTICES.md` entry for skills adapted from caldoai.

## [0.2.0] - 2026-10-02

### Added

- `leo-mode`: a sticky mode for autonomous runs. It matches the task to a flow, delegates by role across model tiers and vendors, runs a 3-model diagnosis panel for bugs, and asks the user only through batched gates in `gates.md`. It logs decisions in `decisions.tsv` and carries six non-negotiables: build the lever, commit order proves the work, encode repeated lessons, delete before you add, migrate callers then delete, and write per `leo-writing`.
- `leo-writing`: rules for replies, commits, PR descriptions, docs, and code comments, plus 26 numbered patterns to remove. Adapted from pstack `unslop` and `technical-writing`.
- `leo-explain`: how and why questions answered with `file:line` and history, each claim labelled found, inferred, or unknown.
- `leo-verification-skill`: creates or maintains a project-local `verify-<app>` skill with a feature map.
- Review lanes in `leo-gauntlet` stage 2: bugs, standards, spec, security, performance, and tests, each with a cross-vendor verifier for findings at `medium` or above.
- Scripts: `leo-trust-but-verify/scripts/verify`, `leo-gauntlet/scripts/tree-hash`, `live-fingerprint`, and `gate-check`, `leo-mode/scripts/log`, `audit`, `base-head`, and `commit-proof`, and `leo-writing/scripts/prose-lint`.
- Adapter fields `install` and `verify-skill`.
- `check.mjs` fails on hard-coded project commands, a missing or mismatched `agents/openai.yaml`, and a changelog whose top entry does not match the plugin version.
- `scripts/version-check.mjs` fails a PR that changes `plugins/` without a version bump. A release workflow tags each new version on `main` and publishes its changelog entry.
- `leo-handoff` Pause and Pick up sections. `leo-receiving-review` handles CI and review bots after a PR.

### Changed

- 11 skills that stopped for the user mid-flow now turn the question into a gate or a logged ruling under `leo-mode`. Without `leo-mode`, every confirmation stays as it was.
- `leo-tdd`, `leo-executing-plans`, `leo-receiving-review`, `leo-trust-but-verify`, `leo-simplify`, `leo-worktrees`, and `leo-finishing-branch` lose excuse tables, quick references, flowcharts, and examples that restated their rules. Skill markdown went from 5,108 to 4,159 lines.
- `leo-worktrees` installs dependencies with the `install` adapter field instead of hard-coded package-manager commands.
- `find-polluter.sh` takes the adapter's `test` command instead of running `npm test`.
- PR descriptions use Why, Scope, Tradeoffs, Blast radius, and Verification sections, with Conventional Commits titles.

### Removed

- `leo-systematic-debugging`. Its evidence seeds, boundary logging, backward tracing, and 3-failed-fixes rule moved into `leo-diagnosing-bugs`. Rerun `leo-setup` to drop its row from a repo's routing block.
- The unshipped visual companion in `leo-brainstorming`.

## [0.1.0] - 2026-09-28

### Added

- First release: 25 skills from `leo-brainstorming` to `leo-finishing-branch`, configured per repo by `leo-setup` through `.agents/leo.md`.
- `leo-gauntlet` pre-PR gate with a tree-hash report, `leo-pr-review` for CI review on Codex, and `install.sh` for Claude Code, Codex, and Cursor.
- `check.mjs` for roster, attribution, leak, and subagent-rule checks.
