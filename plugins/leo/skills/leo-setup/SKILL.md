---
name: leo-setup
description: Use first in any repo without `.agents/leo.md`, or when project facts changed. Inspects the repo and writes the adapter every leo-* skill reads.
---

# Leo Setup

**Original.**

The skills ship the method; the repo supplies the facts. This skill writes those facts down once, in `.agents/leo.md`, so no other skill guesses a command, a branch, or a path.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## Inspect

Read, do not run, unless a step says otherwise. Independent reads may go to subagents.

| Look at | Yields |
|---|---|
| `package.json` scripts, `Makefile`, `pyproject.toml`, `Cargo.toml`, `go.mod` | `test`, `lint`, `lint-fix`, `format`, `typecheck`, `build`, `dev` |
| `.github/workflows/` | Which commands CI enforces; the canonical check names |
| `git symbolic-ref refs/remotes/origin/HEAD` | `base-branch` |
| AGENTS.md, CLAUDE.md | `rules-files`, any standards router, `formatting-owner` (a commit hook or a command), issue-ID pattern, risk areas already named |
| `docs/adr/`, `CONTEXT.md` | `adr-dir`, `domain-terms` |
| Lockfiles, framework configs, dependency lists | `data-layer`, `auth`, `vendors`, `frontend-runtime`, `mobile-runtime`, budget and index-check scripts |
| `tsconfig.json` at the root or in any workspace package | Whether the TypeScript standards step below applies |

A value found in two places that disagree is a question, not a pick.

## Propose

Fill every field of the template below from the inspection. Show a table before writing anything:

| Field | Value | Source file |
|---|---|---|

Ask one question per field you cannot infer, one at a time, each with a recommendation. Never guess a command: a wrong value here is repeated by every skill that reads it. Leave a field blank when it does not apply.

Always ask, whatever the inspection found:

- **Risk areas.** Which parts of this system must never change without `leo-grilling`? Names only (e.g. tenancy, payments, outbound sends), never how they could be attacked.
- **Customer-facing globs.** Which paths change something a customer sees or receives: UI directories, public API routes, email, SMS, or PDF templates.

Also ask `specs-plans-tracked` (`yes` or `no`) and, for `login` under Live check, keep the default: the agent never types passwords and asks the user to log in.

Do not run the proposed commands: `format` and `lint-fix` rewrite files, and `dev` never exits. Confirm each one resolves instead (the script exists in its manifest, or the binary is on `PATH`) and mark any that do not.

## Write

Create `.agents/leo.md` from the template below with the confirmed values. Keep the template's field names exactly.

It never contains vulnerability details, secrets, tokens, or environment values. Risk areas and vendors are names only. If a value you were about to write looks like a credential, leave it out.

## Ignore

- When `specs-plans-tracked: no`, append the `specs` and `plans` paths to `.gitignore`.
- Always create `.agents/gauntlet/` with a self-ignoring `.gitignore`, so reports never reach a commit and nothing under `.git/` is written:

```bash
mkdir -p .agents/gauntlet
printf '*\n' > .agents/gauntlet/.gitignore
```

## Rerun

When `.agents/leo.md` already exists, treat it as the baseline. Run Inspect and Propose, then show a diff between the file and the proposed one. Ask before overwriting. Fields the user edited by hand and inspection did not contradict stay as they are.

## TypeScript standards

Applies when `tsconfig.json` exists (at the root or in any workspace package) and no standards router is found. A repo with its own standards keeps them: set `standards-router` to that entry file, set `rule-id-convention` to whatever it uses, and fetch nothing.

Otherwise ask: "Fetch leonoronhas/typescript-standards into docs/standards/?" (the path is confirmable). Nothing is downloaded before a yes. On yes:

```bash
sha=$(git ls-remote https://github.com/leonoronhas/typescript-standards refs/heads/main | cut -f1)
mkdir -p docs/standards
curl -fsSL --max-time 60 "https://codeload.github.com/leonoronhas/typescript-standards/tar.gz/$sha" | tar -xz --strip-components=1 -C docs/standards
test -f docs/standards/AGENTS.md
```

If any step fails, stop and report; do not write the fields. On success set:

- `standards-router: docs/standards/AGENTS.md`
- `standards-source: leonoronhas/typescript-standards@<sha>`
- `rule-id-convention: typescript-standards IDs, e.g. TS-003, SEC-007`

On a rerun with `standards-source` set, read the latest `main` sha the same way. If it equals the recorded one, do nothing. Otherwise fetch it into a temp directory, show `git diff --no-index --stat docs/standards <temp dir>`, and ask before replacing. On yes, replace the directory and update `standards-source` to the new sha.

## Finish

Report: the file written or changed, the fields left blank and why, commands that did not resolve, and any ignore entries added. Do not commit.

## Template

Write `.agents/leo.md` with exactly these headings and field names:

````markdown
# leo adapter

Project facts for leo-* skills. Written by `leo-setup`; edit freely. Leave a field blank when it does not apply.

## Commands
- test:
- lint:
- lint-fix:
- format:
- typecheck:
- build:
- dev:
- formatting-owner: <hook | command | none>

## Git
- base-branch:
- worktree-dir: .worktrees/

## Paths
- specs: .agents/specs/
- plans: .agents/plans/
- specs-plans-tracked: <yes | no>
- research: docs/research/
- domain-terms: CONTEXT.md
- adr-dir: docs/adr/

## Rules
- rules-files: AGENTS.md
- standards-router:
- standards-source:
- rule-id-convention:

## Issues
- tracker: <linear | github | jira | none>
- id-pattern:

## Risk areas
<!-- Names only, never vulnerability details. A change touching one requires leo-grilling. -->
-

## Stack
- data-layer:
- auth:
- vendors:
- frontend-runtime:
- mobile-runtime:
- bundle-budget-command:
- index-check-command:

## Live check
- dev-url:
- login: ask the user to log in
- customer-facing:
  -

## Agents
- subagent-model:
````
