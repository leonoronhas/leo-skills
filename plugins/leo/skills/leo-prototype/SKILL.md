---
name: leo-prototype
description: Build a throwaway prototype to answer one design question. Use when the user wants to feel out a state model or business logic before building it, or to see several UI directions for a page before committing to one.
---

# Prototype

**Adapted from:** MattPocock `prototype` (MIT, https://github.com/mattpocock/skills); `LOGIC.md` and `UI.md` vendored, with `main` replaced by "the base branch".

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). One self-contained HTML file a non-developer can click through. Typical questions: billing or subscription state, recurrence rules, lead-to-customer conversion, payment retry.
- **"What should this look like?"** → [UI.md](UI.md). Several structurally different variants on one route, switched by `?variant=`, with a floating switcher hidden outside `__DEV__` / non-production builds.

If the question is ambiguous and the user is unreachable, default by surrounding code (backend module → logic; page or component → UI) and state the assumption at the top of the prototype.

## Rules

1. **Throwaway from the first line, named as such.** `*.prototype.tsx`, `prototype-*.html`, or a route containing `prototype`. Sit it next to the module or page it explores.
2. **Trivial to run.** UI: the `dev` command from `.agents/leo.md` for the relevant app, one of the repo's app entry points. Logic: double-click the HTML file.
3. **No persistence, no real money, no real sends.** In-memory state only. Never a database write, or a call to or send through any outbound send or payment vendor listed in `vendors`; the test-vs-live selection does not protect a prototype.
4. **Skip the polish.** No tests, no error handling beyond runnable, no abstractions. `leo-tdd` and the repo's rules (`rules-files`) resume the moment the answer becomes real code.
5. **Surface the state** after every action or variant switch.
6. **Capture, then delete.** Fold the validated decision into real code through `leo-tdd`. Commit the prototype itself to a `prototype/<slug>` branch off the current branch and link it from the issue in `tracker`; the `base-branch` receives only the decision. A prototype file in a PR against the `base-branch` is a review blocker.
