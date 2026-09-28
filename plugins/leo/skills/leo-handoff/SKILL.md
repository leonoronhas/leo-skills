---
name: leo-handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

# Handoff

**Adapted from:** MattPocock `handoff` (MIT, https://github.com/mattpocock/skills).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to `<plans>/handoff-<YYYY-MM-DD>.md`, where `<plans>` is the `plans` path from `.agents/leo.md` and the date is today's. If that file exists, add a numeric suffix (`-2`, `-3`) instead of overwriting it.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
