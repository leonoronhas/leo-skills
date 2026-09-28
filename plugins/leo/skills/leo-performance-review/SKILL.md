---
name: leo-performance-review
description: Performance review of a diff: N+1 queries, paging correctness, bundle size, caching, missing indexes, mobile runtime pitfalls. Use for performance-focused code review.
---

# Performance Review

**Original.**

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Standards

When `standards-router` in `.agents/leo.md` is set, read it, load only the files it routes to for this task, and cite rule IDs per `rule-id-convention` in findings and in the PR description. A deviation from a MUST rule names the rule and the reason where the deviation lives.

## Overview

Runtime performance of the diff: what it makes slower, larger, or more expensive under real data. Not code cleanup (that is `leo-simplify`), not correctness (`leo-code-review`), not security (`leo-security-review`).

Review only what the diff adds or worsens. Read `data-layer`, `frontend-runtime`, and `mobile-runtime` under Stack in `.agents/leo.md` to know which checks apply; skip a check whose stack is absent.

## Scope

Diff against `base-branch`. Count changed lines.

- **Under 50 changed lines: sweep only.** Run N+1 and Paging correctness; skip the rest.
- **50 or more: run every check below.**

## Checks

### N+1

- [ ] A query or network request inside a loop, `map`, or per-row render or resolver
- [ ] A list item component that fetches its own data instead of receiving a batch
- [ ] Related rows loaded one parent at a time where one join, `IN` list, or batch call would do
- [ ] Handlers that call the data layer once per input item

### Paging correctness

- [ ] Large reads are bounded: a page size, a limit, or a cursor. No unbounded read of a table that grows
- [ ] Loops end on a short page or an explicit end marker, never on "empty page" alone or a fixed count
- [ ] Loops survive a past-the-end range error: some data layers error rather than return empty when the offset passes the last row
- [ ] Sort order is stable and unique (tie-break on a unique column), so pages neither skip nor repeat rows
- [ ] Only needed columns are selected; no wide-row reads to use one field

### Bundle size

- [ ] Run `bundle-budget-command` from `.agents/leo.md` when set; a failure is a finding
- [ ] When unset, run `build` on the base branch and on the head and compare output sizes; report any entry that grew noticeably
- [ ] New heavy dependency in an entry chunk; a lighter or native alternative exists
- [ ] Heavy, rarely used surfaces (editors, charts, admin panels) load lazily rather than in the entry bundle
- [ ] Imports allow tree-shaking (ES modules, named imports, no whole-library imports)

### Caching

- [ ] The same request issued repeatedly with identical inputs in one view or flow
- [ ] Missing or unstable cache keys: keys built inline, or missing an input the result depends on
- [ ] Cache with no expiry or invalidation after a write (stale forever), or expiry so short it refetches on every render or focus
- [ ] Server data held in component state plus an effect instead of a shared query cache
- [ ] Cache written directly after a mutation with no invalidation of the derived queries
- [ ] Cacheable responses missing cache headers

### Missing indexes

- [ ] A new filter, join, or sort on a column that no index covers
- [ ] A new index-worthy foreign key or lookup column added without an index
- [ ] Run `index-check-command` from `.agents/leo.md` when set. When unset, read the schema or migration files for an index on each new filter or sort column, and use the data layer's plan tooling on the query when you can reach a database
- [ ] Never run heavy plan analysis against production

### Server hot path

- [ ] Synchronous I/O or CPU-heavy work inside a request handler stalls every concurrent request
- [ ] Large payloads buffered whole in memory instead of streamed
- [ ] A database transaction held open across a network call to another service

### Mobile runtime pitfalls

Only when `mobile-runtime` is set.

- [ ] APIs the runtime does not support or supports partially, such as `Intl` formatters, timezone conversion, or newer built-ins. Check the runtime's own compatibility docs; a dependency bump can break these silently
- [ ] Large synchronous JS work on the main thread; parse, sort, or format of big lists during render or gesture
- [ ] Long lists rendered with a scroll container plus `map` instead of a virtualized list
- [ ] Row renderers recreated each render (inline components, new function props on every row)
- [ ] Unoptimized or uncached images; full-size images in thumbnails

## Rule IDs

When `rule-id-convention` is the `NODE-NNN` / `REACT-NNN` guide, these checks map to:

| Check | Rule |
|---|---|
| Server hot path: CPU-heavy work | `NODE-009` |
| Server hot path: buffering | `NODE-010` |
| Server hot path: transaction across external call | `NODE-020` |
| Caching: server state in a query cache | `REACT-008` |
| Stable list keys | `REACT-010` |
| Memoize only what is measured | `REACT-011` |
| Bundle: lazy heavy surfaces | `REACT-017` |

Any other convention: cite its own IDs per the Standards section.

## Findings

Same shape as `leo-code-review`, one line each:

`file:line, severity (blocker/high/medium/low), confidence 0-100, failure scenario`

The failure scenario names the data size or load that hurts and what the user or system sees, e.g. "1 query per row; 500 customers means 501 round trips on page load". A finding without a concrete scenario is not a finding. Measured numbers beat estimates; say which one you have.

Rank by severity. Drop style opinions and speculative micro-optimizations.

## Verdict

- **FAIL:** any finding at high severity or above.
- **PASS:** none.

List medium and low findings either way.

## Integration

- Runs as the performance stage of `leo-gauntlet`
- Standalone: "performance review this PR"
- Complements `leo-code-review` and `leo-security-review` (different axes)
