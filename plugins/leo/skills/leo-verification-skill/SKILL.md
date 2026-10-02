---
name: leo-verification-skill
description: Use when a repo has no scripted way to drive its app and prove behavior, or when its verification skill has drifted from the app. Creates a project-local verify-<app> skill (launch, doctor, drive, evidence, cleanup, feature map) and records it in .agents/leo.md, or maintains an existing one with one source pass and one live pass.
---

# Leo Verification Skill

**Adapted from:** pstack `create-verification-skill` and `maintain-verification-skill` (MIT, https://github.com/backnotprop/pstack).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

If `verify-skill` under `Live check` is set and that skill exists, run **Maintain**. Otherwise run **Create**.

You write the generated skill for the next agent, which reads it cold, mid-task, having never seen the app.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## Create

### 1. Read the repo, not the user

Answer these from the codebase. Ask only what you cannot observe; under `leo-mode`, that is a gate.

- **Surface**: what a user touches (web UI, CLI or TUI, desktop app, API, mobile app). Pick the primary one and note the rest.
- **Run**: how the app starts locally. Prefer the `dev` command from `.agents/leo.md`, then the repo's documented command. Note ports, environment variables, seed data, and sign-in.
- **Drive**: how an agent interacts with it. Existing harnesses first (end-to-end specs, PTY helpers, endpoints). Then a generic recipe: a browser driver for web and desktop, a PTY or tmux session for a CLI, HTTP for a service.
- **Observe**: what evidence can be captured: screenshots, transcripts, response bodies, logs, exit codes, database state.
- **Isolate**: whether two instances can run side by side. If not, the generated skill refuses to drive a shared instance.

If the checkout does not start as-is, fix that or report it precisely first. A skill written against a broken base teaches wrong steps.

### 2. Generate the skill

Write `<project skill folder>/verify-<app>/SKILL.md` with frontmatter (`name: verify-<app>` and a description naming the app, the surface, and when to use it) and these sections, each from what step 1 found, with no placeholders:

- **Launch**: the exact start command, how to tell it is ready, and teardown.
- **Doctor**: one read-only check that the instance is worth driving: process up, right build, port owned by this run, sign-in valid. Run it first, and again after anything surprising.
- **Drive**: the harness recipe with this repo's real selectors and commands. Prefer stable handles (accessible labels, data attributes, prompt strings, routes) over coordinates.
- **Evidence**: what to capture and where it goes. Exercise the real user path, not test-only endpoints. Capture the action and the resulting state. Verify side effects (files, rows, messages), not only the screen. When the safe path is a dry run, observe what it actually skips.
- **Cleanup**: tear down only what the run started, never by process name. Evidence survives cleanup, at the location the skill names.
- **Helpers**: every script the skill ships is executable, and its invocation appears in the skill body.

Never put a password or token in the skill. Sign-in follows `login` from `.agents/leo.md`.

### 3. Seed the feature map

Create `verify-<app>/features/README.md` as an index, plus one file for each of the top 3 to 5 user-facing features. Each file has four sections: `Sub-features`, `How to get to it (user view)`, `Driving it`, and `Gotchas`, ending in the observable state that proves the feature works.

### 4. Prove it before handing it over

Run the generated skill end to end once: launch, doctor, drive one mapped feature, capture evidence, clean up. Confirm the evidence still exists after cleanup. Fix what fails, running cleanup after every failed attempt. A generated skill that never ran is a draft.

### 5. Record it

Set `verify-skill: verify-<app>` under `Live check` in `.agents/leo.md`. `leo-live-check` then drives the app through it.

## Maintain

Only edit the verification skill's own directory. A behavior the map describes that the app no longer does is either map drift (fix the map) or a product regression (report it; never paper over it in the map).

1. **Index.** Fix missing, extra, duplicate, or dead entries in `features/README.md`.
2. **Source pass.** One read-only subagent per feature file, in parallel. Each explains how the feature works from source, flags drift with `file:line`, and returns one live-check recipe.
3. **Live pass**, required even when the source looks clean. You drive every feature at least once. Run doctor before the first drive and after any failed drive. Evidence survives every cleanup. Nothing a drive started outlives it. A feature you cannot reach is listed with its exact prerequisite and the route you tried.
4. **Triage.** Wrong description: fix the map. Working behavior the harness cannot drive: fix the harness and drive it again. Broken app behavior: report it, out of scope.
5. **Outcome.** One of: `clean` (no changes), `changed` (one branch of proven corrections; opening its PR is a gate under `leo-mode`), or `blocked` (say exactly what blocked it).
