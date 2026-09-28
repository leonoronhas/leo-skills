---
name: leo-resolving-merge-conflicts
description: Resolve an in-progress git merge or rebase conflict. Use when `git status` shows unmerged paths, a rebase onto the base branch stopped on a conflict, or a stacked PR shows conflicts after its base moved.
---

# Resolving Merge Conflicts

**Adapted from:** MattPocock `resolving-merge-conflicts` (MIT, https://github.com/mattpocock/skills).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

1. **See the current state.** `git status`, `git log --oneline -15 --left-right HEAD...<other>`, and every conflicting file. Name which branch is "ours" and which is "theirs" before touching a hunk; a rebase swaps them.

2. **Find the primary sources** for each conflict. Read both sides' commit messages, the PR, and the issue (see `tracker`). Understand why each change was made, not just what it changed.

3. **Resolve each hunk.** Preserve both intents where possible. Where they are incompatible, pick the one matching the merge's stated goal and note the trade-off in the commit body. Do not invent new behaviour. Always resolve; never `--abort`.

    - **Generated files are never hand-merged.** Take either side, regenerate with the project's generator, and commit the output. Lockfiles: regenerate via the package manager's install.
    - **Migrations:** two new files with the same version prefix is a conflict even when git shows none. Renumber the later one and re-check the migration tool's list.
    - **Stacked PR whose base moved:** the "conflict" is usually the base's commits being replayed. Fix it with `git rebase --onto <new-base> <old-base> <branch>`, not by resolving hunks. The new base is usually `base-branch`.

4. **Run the checks the merge could have broken**, in order: `typecheck`, then the affected package's `test`, then `lint`, using the commands in `.agents/leo.md`. Run the formatter only when `formatting-owner` is `command`; when it is `hook`, the hook does it. Fix what the merge broke and nothing else.

5. **Finish.** Stage everything and commit, or `git rebase --continue` until every commit is replayed. Then use `leo-trust-but-verify` before reporting the branch as level.
