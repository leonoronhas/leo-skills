---
name: leo-trust-but-verify
description: Verify before claiming done. PROVEN / NOT YET / CAN'T PROVE verdict spine. Use before saying anything is done, fixed, working, passing, implemented, or ready.
---

# Trust But Verify

**Original.**

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Overview

Force a skeptical second pass on your own work. Because "it should work" has never once been true without verification.

**Core principle:** Evidence before claims. Every time.

## The Verdict Spine

Every claim gets one of three verdicts:

| Verdict | Meaning | Standard |
|---------|---------|----------|
| **PROVEN** | Verified with fresh evidence in this session | Command run, output read, matches claim |
| **NOT YET** | Not verified yet — could be true, could be false | No verification run; claim is unsupported |
| **CAN'T PROVE** | Fundamentally unverifiable in this context | External dependency, no test access, etc. |

**Default verdict is NOT YET.** You must earn PROVEN.

A verdict on a change also carries a `Standards:` line naming the rule IDs applied per
`rule-id-convention`, when one is set, and any deviation with its reason
(`Standards: <PREFIX>-003, <PREFIX>-012; deviations: none`). It is the same list the PR
description carries.

## The Gate

BEFORE saying "done", "fixed", "working", "passing", "implemented", "ready to ship":

1. **What command proves it?**
2. **Run it fresh** (not cached, not from memory)
3. **Read full output** — exit code, failure count, warnings
4. **Match output to claim** — does it actually confirm?
5. **Only then** make the claim, citing the evidence

For the adapter's checks, run `scripts/verify` from this skill's directory. It runs `typecheck`, `lint`, `test`, and `build` from `.agents/leo.md`, fails on leftover `__*` scratch files, and writes a transcript. Cite its summary lines and transcript path.

A success report from an agent, or a run from earlier in the session, is not evidence; run the command yourself. Any positive claim without fresh command output is NOT YET, whatever the wording.

## Common Claims → Required Verification

The commands come from the `Commands` section of `.agents/leo.md`.

| Claim | Command | PROVEN Evidence |
|-------|---------|-----------------|
| "Tests pass" | `test` | `34 passed, 0 failed` |
| "Types clean" | `typecheck` | `exit 0` |
| "Lint clean" | `lint` | `0 errors` |
| "Build works" | `build` | `exit 0` |
| "Bug fixed" | Repro test + `test` | Original test passes, regression added |
| "Deployed" | Deployment URL + health check | `200 OK` on `/health` |

A delegated task proves itself with the narrowest form of these commands that covers its files;
the full commands run once by whoever integrates the work, after integration.

## When You Can't Prove

Say: "CAN'T PROVE: [reason]. Here's what I *can* verify: [evidence]."

Never round up NOT YET to PROVEN.

## Scratch Files And Formatting

- A scratch test written to make a claim observable (a render dump, a real-component probe) is
  named with a `__` prefix, lives only for the run, and is deleted before the verdict. The final
  `git status --short` in the evidence must show none.
- When `formatting-owner` is `hook`, never run a formatter or an auto-fix (the `format` and
  `lint-fix` commands) to clear a finding; a formatting error in code you wrote is fixed by hand
  and re-verified.

## Integration

- **Required** before any completion claim
