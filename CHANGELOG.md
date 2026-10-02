# Changelog

Every change to `plugins/` bumps the version in `plugins/leo/.claude-plugin/plugin.json` and adds an entry here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Before 1.0.0, a minor bump may remove or rename skills.

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
