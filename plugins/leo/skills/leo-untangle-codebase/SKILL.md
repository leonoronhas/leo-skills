---
name: leo-untangle-codebase
description: Untangle a whole codebase in one pass, so agents working in it read less per change, break less without noticing, and debug faster. Lists every hidden link, needless link, surplus piece, and special case, redesigns from first principles, fixes the list, and repeats until reviewers find nothing worth fixing. Use for /leo-untangle-codebase.
disable-model-invocation: true
argument-hint: "[list] [optional area or concern to focus on]"
---

# Untangle Codebase

**Adapted from:** caldoai `untangle-codebase` (MIT, https://github.com/caldoai/skills).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Start a thorough refactor of this codebase and finish it. Treat it as a goal, not a suggestion. If the user named an area or concern, start there, but follow the links wherever they lead.

**Listing only.** With `list` as the first argument, run step 2 alone: read-only, no changes, no commits. Give it the kept-on-purpose list from the last run as input, so settled items are not raised again. It is cheap enough to run every few features, to see drift early.

Why it is worth doing:

- **Better output:** agents write better code in a well-structured codebase.
- **Cheaper, faster changes:** agents spend fewer tokens searching and more on the problem.
- **Fewer silent breaks:** agents break less without noticing.
- **Faster debugging:** agents find root causes faster.

Use the `leo-codebase-design` vocabulary (module, interface, depth, seam, adapter, leverage, locality) when you name a problem or a fix.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## 0. Set up

- Work on a branch off `base-branch`, in a worktree through `leo-worktrees` when the tree is not clean.
- Record a baseline: run `test`, `typecheck`, `lint`, and `build` from `.agents/leo.md`, and save the results. Every later run is compared against it. A check that was red before you started stays your problem to explain, not to hide.
- Before the first edit of each fix, record what the code does with an oracle: a harness that captures the responses, rendered output, queries, or messages sent for the paths the fix touches. Keep the harness source and its reference output somewhere that outlives the session (a tracked folder or the plans path, never a temp folder), with the exact command to run it. A lost harness cannot be re-run, and a rebuilt one proves less.
- Open the decision log at `<plans>/untangle-<YYYY-MM-DD>.md`, where `<plans>` is the `plans` path. Every list and fix below goes there, so the work survives compaction. Keep a **kept on purpose** list in it: each thing you deliberately did not change, with the reason. Hand that list to every later reviewer and subagent, so settled items are not raised again.

## 1. Ask

Besides untangling the codebase, you may do two other things:

| Addition | What it does |
| --- | --- |
| **Comments** | Remove comments that only restate the code. |
| **Tests** | Remove tests that wouldn't catch a real bug, and fix the ones that fail without one. |

List both, with these exact descriptions, and ask which to do. Then do only those.

**Under `leo-mode`.** Write the question to `gates.md` with the default "neither" and keep working. Pick up the additions only after the user answers.

## 2. List every problem

Change nothing yet.

Go through the codebase asking one thing: **should these pieces change together?** Write down every place the code gets the answer wrong, in the form of the [decision log example](#decision-log-example), each with `file:line`. There are only three ways to get it wrong.

**Hidden links:** pieces that must change together, where the code doesn't show it.

- Copies of logic or values: change one and the others must change too, but nothing says so.
- A module that reads a global or file set by another module: change that module and this one breaks, but nothing shows it (self-contained code).
- A feature split across folders by layer, or related code in different folders: one change needs all of them, but the layout hides that (domain-driven code, colocation).
- A call order or convention callers just have to know: change it and callers break, but nothing warns them (explicit over implicit).

**Needless links:** pieces tied together that change for different reasons.

- Callers that depend on internals: the internals change for their own reasons, and the callers break anyway (encapsulation).
- Stable code that imports something more volatile: the stable code has to change whenever the volatile code does (dependency direction).
- A general function with a parameter only one workflow understands: the function has to change whenever that workflow does (caller vocabulary).
- A shallow module: its interface changes whenever its internals do, so its callers change with it (deep modules).

**Surplus:** pieces with no reason of their own to change.

- Wrappers: they only change when the thing they wrap does (pass-through wrappers).
- Extension points and config for things that never vary: nothing will ever change them (speculative generality).
- Dead code: nothing uses it, so nothing will ever need it to change.

Also write down every **special case**: code that exists for one situation instead of following from how the system works. Each one is a requirement the design never accounted for, so use them to work out what the system needs to be.

- An `if` for one value
- A parameter for a specific caller
- A swallowed exception
- A retry or sleep
- A disabled test

## 3. Redesign from first principles

Work out the fixes as if the system had known today's requirements from the start. Look for the one fix behind several problems, which often looks nothing like them. Don't fix special cases one by one.

Ask the same thing of every fix, even one that looks better in the code: pieces that change together end up together, pieces that don't aren't tied, and everything depends on what changes less.

Write each fix above the problems it solves, as in the [decision log example](#decision-log-example).

A fix that touches a `Risk areas` entry goes through `leo-grilling` before you start it. A fix that changes an interface other repos or services consume is a judgment call: write it in the log with your recommendation and ask before doing it (under `leo-mode`, a gate).

## 4. Fix everything on the list

Before moving code whose behavior no test pins, add characterization tests through `leo-tdd`. Then make one fix per commit, deletions in an earlier commit than additions, with `test` and `typecheck` green at every commit. Tick each fix off in the log as it lands.

Remove the special cases the redesign makes unnecessary, and keep the ones the system still needs. Don't go looking for bugs separately. A structural fix may fix some along the way; note each one in the log, since it is a behavior change.

If the user chose Comments:

- Comments that restate the implementation, like `// sort first so the binary search works`, only change when it does, so they have no reason of their own to change. Remove them, even when they're phrased as a why.
- Comments about something outside the code, like `// the proxy drops websockets, so we poll`, change when that does, and the code can't show it. Keep them.
- Comments that explain a workaround in the codebase, like `// wait 100ms because the cache isn't ready yet`, only change when the problem behind the workaround does. They go when the redesign removes that problem.

If the user chose Tests, do this last, because tests are your regression safety net. A test should fail on a regression, and only then:

- Tests that repeat the implementation only change when it does, so they have no reason of their own to change. They check the same interpretation against itself, so remove them.
- Tests tied to internals break when the code changes but behavior doesn't, so they change for the wrong reason. Rewrite them to depend on behavior, which changes less.
- Tests that can't fail pass whatever the code does, so no change ever affects them. They aren't checking anything, so remove them.

## 5. Check, and repeat until done

Have subagents search for special cases, hidden links, needless links, and surplus, one category each, in parallel. Confirm each finding yourself before it goes on the list, then go back to step 3. **Do not stop until there is nothing worth fixing left.**

You're done when:

- **As few special cases are left in the system as possible.** How many remain is the best measure of how close you are.
- A typical change lands in one place.
- Every import is reasonable, and nothing imports anything more volatile than itself.
- Subagents have no issues left that are worth fixing.
- Intended behavior is the same as when you started, apart from bugs the refactor fixed and logged. Prove it with `leo-trust-but-verify` against the step 0 baseline, and by re-running every oracle on the final tree and comparing its output to the reference byte for byte.

Findings from subagents and reviewers are claims. Check each against the base commit before acting on it: a finding marked certain can still be wrong.

Prove two outputs equal with a byte compare (`cmp`, a checksum, or the harness's own comparer), never by reading a diff summary: some shells and wrappers summarise `diff`.

Then run `leo-gauntlet` and `leo-finishing-branch`.

## Tips

- **Start from a skeleton:** script away the function bodies, so the whole codebase fits in context.
- **Summarize with subagents:** have them summarize parts of the codebase, so you can reason across all of it at once.
- **Check the dependency graph often:** script one that shows what imports what, and rerun it as you go.
- **Enter where leverage is highest:** start looking there first.
- **Keep the decision log current:** it is what survives compaction.
- **Use Git as evidence:** `git log` shows how often pieces change and what changes together.

## Decision log example

The list of problems:

```md
- `ui/LogoutDialog.tsx:30` waits 100ms after closing and hopes the message input can take focus by then.
- `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own check for when they're disabled.
- `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
- `shortcuts/keymap.ts:18` has a switch with one case per action, separate from the menu's list.
- `ui/CommandPalette.tsx:55` keeps its own list of actions, and it's missing the newer ones.
- `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog it opens from sending focus to the message input.
- `history/undo.ts:30` has a special case for every action that can be undone.
- `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.
- Every action handler has to call `track()` by hand, and some don't.
- `ui/Toolbar.test.tsx` and `ui/Menu.test.tsx` test the same actions separately.
```

Then with the fixes:

```md
- Make the general `Dialog` give focus back to whatever had it before it opened, so the wait and the flag can both go.
  - `ui/LogoutDialog.tsx:30` waits 100ms after closing and hopes the message input can take focus by then.
  - `ui/SettingsDialog.tsx:61` sets a global `skipRefocus` flag to stop the logout dialog it opens from sending focus to the message input.
- Define a `PaymentProvider` interface that Stripe and PayPal both implement, so checkout and refunds no longer know which one they're using.
  - `checkout/submit.ts:9` depends directly on `payments/stripe.ts`.
  - `refunds/refund.ts:22` wraps every Stripe call in `if (order.provider === "paypal")`.
- Make every user action a command with a name, a handler and an undo, so the toolbar, menu, shortcuts, palette and undo history all run from one list.
  - `ui/Toolbar.tsx:40` and `ui/Menu.tsx:22` call the same actions, each with its own check for when they're disabled.
  - `shortcuts/keymap.ts:18` has a switch with one case per action, separate from the menu's list.
  - `ui/CommandPalette.tsx:55` keeps its own list of actions, and it's missing the newer ones.
  - `history/undo.ts:30` has a special case for every action that can be undone.
  - Every action handler has to call `track()` by hand, and some don't.
  - `ui/Toolbar.test.tsx` and `ui/Menu.test.tsx` test the same actions separately.
```
