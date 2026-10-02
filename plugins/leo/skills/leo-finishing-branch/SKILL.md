---
name: leo-finishing-branch
description: Use when implementation is complete and checks pass, to choose how to integrate the work. Offers merge, pull request, keep, or discard. A pull request needs a passing leo-gauntlet report for the current tree.
---

# Leo Finishing Branch

**Adapted from:** Superpowers `finishing-a-development-branch` (MIT, https://github.com/obra/superpowers).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Overview

**Core principle:** Verify tests → Detect environment → Present options → Confirm the action → Execute → Clean up.

**Announce at start:** "I'm using leo-finishing-branch to complete this work."

**Every push, merge, or PR asks the user first.** Choosing an option from the menu selects it; it is not the yes. Before running the action, state exactly what will run (commands, remote, branch, target) and wait for an explicit yes. A later push to the same branch asks again.

**Under `leo-mode`.** Skip the menu. Run everything up to the push yourself, then raise exactly one gate.

- Step 1: a blank `test` field goes to `gates.md`. Failing checks still stop the run.
- Step 3: a blank or doubtful base is a ruling on your best guess, written into the gate below.
- Option 2, steps 1 and 3: commit the gauntlet's edits locally yourself, with a message per `leo-writing`, and log the ruling. A local commit is reversible.
- The one gate is "push `<branch>` to `origin` and open a PR against `<base-branch>`". It shows the exact commands, the gauntlet verdict, and the PR title and description. Nothing is pushed until the user says yes.
- Never choose merge or discard yourself. Those stay menu choices for the user, with their confirmations unchanged.

## Step 1: Verify Tests

Run the `test` command from `.agents/leo.md` in full, plus `typecheck` and `lint` when set, on the tree you are about to integrate; an earlier green run does not count. If `test` is blank, ask the user for the command.

**If anything fails**, report the failures and stop. The menu comes after a green run:

```
Checks failing (<N> failures). Must fix before completing:

[Show failures]
```

**If everything passes:** continue to Step 2.

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

This determines which menu to show and how cleanup works:

| State | Menu | Cleanup |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON` (normal repo) | Standard 4 options | No worktree to clean up |
| `GIT_DIR != GIT_COMMON`, named branch | Standard 4 options | Provenance-based (see Step 6) |
| `GIT_DIR != GIT_COMMON`, detached HEAD | Reduced 2 options (no merge, no discard) | Externally managed: leave in place |

## Step 3: Determine Base Branch

Use `base-branch` from `.agents/leo.md`. If it is blank, or the branch clearly split from another (the plan, the conversation, or the upstream says so), ask: "This branch split from <your best guess> — is that correct?" Confirm before merging: merging into the wrong base is expensive to undo.

## Step 4: Present Options

**Normal repo and named-branch worktree — present exactly these 4 options:**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Detached HEAD — present exactly these 2 options:**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)

Which option?
```

Present the menu exactly as written and wait for the answer. The integration decision is the user's. Option 4 never proceeds on the menu answer alone; see Discard.

## Step 5: Execute Choice

### Option 1: Merge Locally

Confirm first (see the rule above). Then:

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify on the merged result: run `test` from .agents/leo.md
```

Merge is not gated on a gauntlet report. Run the gate check from Option 2 and say in the confirmation whether a passing report exists for this tree.

If tests fail on the merged result (even if the failure looks flaky): stop, leave the worktree and branch in place, and investigate. Nothing has been pushed, so the merge is local and recoverable.

Once the merged result is green: clean up the worktree (Step 6), then delete the branch:

```bash
git branch -d <feature-branch>
```

### Option 2: Push and Create PR

**Gate: no PR without a passing gauntlet report for this exact tree.** The gate has no size exemption. On a detached HEAD the PR is menu option 1; the same gate applies.

1. The tree must be clean:

    ```bash
    git status --porcelain
    ```

    Any output means uncommitted or untracked files. Stop, list them, and ask the user whether to commit them. Do not continue on a dirty tree; the report key below would not match what gets pushed.

2. Compute the tree hash and validate the report for it:

    ```bash
    tree="$(git rev-parse 'HEAD^{tree}')"
    report=".agents/gauntlet/$tree.md"
    if [ -f "$report" ] \
        && [ "$(grep -m1 '^tree: ' "$report")" = "tree: $tree" ] \
        && [ "$(grep -m1 '^result: ' "$report")" = 'result: pass' ]; then
        echo "gauntlet gate: pass ($tree)"
    else
        echo "gauntlet gate: MISSING OR NOT PASSING ($tree)"
    fi
    ```

    On a clean tree, `HEAD^{tree}` is the same hash `leo-gauntlet` keys its report on (a temp index holding HEAD plus all working-tree changes), so a report made before its fixes were committed matches after the commit.

3. If the gate is not `pass`, run `leo-gauntlet`. Do not open a PR until it passes. `leo-gauntlet` never commits, so if it edited files, the tree is dirty again: show the user the edits and ask to commit them, then repeat from 1. A `result: fail` report, or a report for a different tree, never satisfies the gate. When the gauntlet cannot get to `result: pass`, stop and report its open findings; the PR option stays closed.

4. When the gate passes, confirm the push (see the rule above), then:

    ```bash
    git push -u origin <feature-branch>
    # From a detached HEAD, name the new branch on the remote:
    # git push origin HEAD:refs/heads/<new-branch>
    ```

    Then create the pull/merge request against `<base-branch>` with the forge's tooling (its CLI if one is available, or the creation URL most forges print when you push), following the repo's PR template and conventions if present. Put the gauntlet report's verdict and per-stage status in the description, and write the description per `leo-writing`. When `tracker` in `.agents/leo.md` is set and the branch or plan names an id matching `id-pattern`, link that issue. Report the URL to the user.

    If the push is rejected, the remote moved: investigate. Force-push only on the user's explicit request.

Keep the worktree: the user iterates on PR feedback there.

### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

### Option 4: Discard

Confirm first:

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for that exact word. "Yes", "go ahead", and "get rid of it" are not confirmation. When it arrives:

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

Then clean up the worktree (Step 6) and force-delete the branch:

```bash
git branch -D <feature-branch>
```

## Step 6: Cleanup Workspace

**Runs for Option 1 and confirmed discards.** Options 2 and 3 always preserve the worktree. Both callers have already changed directory to the main repo root (worktree removal must run from outside the worktree) and use the `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` values captured in Step 2, from before that directory change.

**If `GIT_DIR == GIT_COMMON`:** normal repo, no worktree to clean up. Done.

**If `WORKTREE_PATH` is under `worktree-dir` from `.agents/leo.md`** (default `.worktrees/`): `leo-worktrees` created this worktree, so we own cleanup:

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**If removal is refused** (`contains modified or untracked files`): the worktree holds files that exist nowhere else: uncommitted plans, notes, or scratch work. Never `--force` on your own initiative. Show the user what is at stake and ask:

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
Worktree removal refused — these files were never committed:

<file list>

1. Commit them to <branch> before cleanup
2. Move them into <main repo root>
3. Delete them (unrecoverable)

Which?
```

Carry out the choice, then remove the worktree.

**Otherwise:** the host environment owns this workspace. Leave it in place. Never clean up a worktree outside `worktree-dir`, even one that looks stale. If your platform provides a workspace-exit tool, use it.
