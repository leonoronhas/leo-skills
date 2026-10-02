---
name: leo-live-check
description: Use to prove a customer-facing change works in the running app before a PR. Starts or reuses the dev server, exercises the changed behavior in a browser or over HTTP, captures evidence and errors, and ends with a fingerprinted pass/fail line.
---

# Leo Live Check

**Original.**

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

Fields used: `dev`, `dev-url`, `login`, `customer-facing`, `base-branch`. If `dev-url` is blank, ask the user for it; if none is given, end with `result: fail` and say why. Under `leo-mode`, write the missing `dev-url` to `gates.md` instead of asking, end with `result: fail`, and let the run continue on other work.

## Rules

- Never target production: not the app, its API, its database, or live vendor keys. If `dev-url` or the environment the dev server loads looks like production, or you cannot tell, stop and ask.
- Never type a password. Never ask the user to paste one.
- Stop only a server you started.

## Steps

1. **Fingerprint.** Compute it now with the `leo-gauntlet` skill's `scripts/live-fingerprint <base-branch> <customer-facing entries, quoted>`. With no entries, pass only the base branch so the whole diff is hashed.

2. **List what to exercise.** Read the diff. Write down each changed customer-facing behavior and the observable result that proves it.
3. **Server.** Request `dev-url`. Any HTTP response below 500 means a server is already running: reuse it, and do not stop it later. Otherwise run the `dev` command in the background, output to a log file, and poll `dev-url` every 2 seconds. If it has not answered after 120 seconds, stop the server you started and end with `result: fail`, quoting the last 40 lines of the log.
4. **Exercise.** Drive each listed behavior through the browser tool you have; if you have none, use HTTP requests. Follow the changed path end to end, plus the nearest failure path (invalid input, empty state). Capture per behavior: a screenshot or the response, and the result.
5. **Errors.** Read browser console messages and the server log (the one you started, or the terminal output you can see). An error caused by the change fails the check. Note unrelated errors that already existed; do not fail on them.
6. **Login.** If a behavior needs a session, follow `login`, except never type a password: ask the user to sign in, and keep running the unauthenticated behaviors while you wait. Under `leo-mode`, the sign-in request is a gate in `gates.md`. If no session appears, list the authenticated behaviors as unchecked and end with `result: fail`.
7. **Cleanup.** Stop the server only if you started it, including on failure.
8. **Fingerprint again.** If it differs from step 1, the diff changed during the run: rerun from step 1.

## Output

Per behavior: what you did, the evidence (screenshot path or response), pass or fail. Then console and server errors found. Anything unexercised is listed as unchecked.

`result: pass` requires every listed behavior exercised and passing, and no error caused by the change.

The last line of your output is exactly one of:

```
live-check fingerprint: <hash> result: pass
live-check fingerprint: <hash> result: fail
```

`<hash>` is the step 1 fingerprint. Also write the full output to `.agents/gauntlet/live-<hash>.txt`, creating the directory with its self-ignoring `.gitignore` if needed. `leo-gauntlet` reads that file to skip a repeat run, so the result survives a restarted session.
