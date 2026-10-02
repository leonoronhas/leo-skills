---
name: leo-handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

**Adapted from:** MattPocock `handoff` (MIT, https://github.com/mattpocock/skills) and pstack `pause-safely` and `session-pickup` (MIT, https://github.com/backnotprop/pstack).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to `<plans>/handoff-<YYYY-MM-DD>.md`, where `<plans>` is the `plans` path from `.agents/leo.md` and the date is today's. If that file exists, add a numeric suffix (`-2`, `-3`) instead of overwriting it.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

Under `leo-mode`, write the document to the task workspace as `.agents/leo-mode/<task-slug>/resume.md` and point at its `decisions.tsv`, `gates.md`, and `standing.md` instead of restating them.

## Pause

Pause only when the user asks. "Keep going", "going to bed, keep going", and "don't stop" are not pauses.

1. Stop at a safe boundary. Finish the current step or back out of it; never stop mid-edit in a broken state. Start nothing new and stop any delegated work you started.
2. Take no irreversible action to pause: no push and no PR that was not already out.
3. Commit uncommitted edits as one `wip:` commit on the current branch. If the tree is broken, say so in one line of the commit body.
4. Write the handoff document: intent, progress and what is verified, current state, next steps, key files, and gotchas.

Reply with where you stopped, the commit you made, whether the tree is clean, and the first action on resume.

## Pick up

1. Find the trail: the handoff document, the task workspace, the branch, and `git log` against the base.
2. Rebuild the state from it: branch, worktree, what landed, open gates, decisions made. The trail is authoritative; do not re-derive it.
3. Compare done with pending and name the resume point. Do not redo finished work or rerun a finished repro.
4. Route the remaining work to its `leo-mode` flow or skill.
5. Verify every inherited claim against the real artifact before relying on it. A prior self-report is not proof.

