---
name: leo-grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test a proposal before committing.
---

# Grilling

**Adapted from:** Superpowers `grilling` (MIT, https://github.com/obra/superpowers) and MattPocock `grilling` (MIT, https://github.com/mattpocock/skills).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

## Overview

Relentless questioning to stress-test a plan, decision, or idea. Don't let weak assumptions survive.

**Core principle:** If it can't survive grilling, it shouldn't ship.

## How to Ask

The rounds below are a checklist of what to cover, not a form to paste. Grilling is an
interview.

- **One question at a time.** Wait for the answer before asking the next. Pasting a whole
  round at once is bewildering, and it gets you four shallow answers instead of one real one.
- **Look facts up; ask only for decisions.** If the answer is in the repo, the schema, a
  workflow file, or the issue in `tracker`, go read it. The user's time is for the calls only
  they can make.
- **Recommend an answer with each question.** "A or B? I'd take A, because X" beats an open
  question — it gives them something to push against.
- **Do not act until they confirm.** Grilling ends at shared understanding, not at the last
  question. No code, no plan, no issue created until they say so.

Follow each answer where it leads before moving on. Resolve one branch of the decision tree at
a time rather than sweeping all four rounds.

## When to Use

- Before committing to a significant design
- When a plan feels "obvious" (that's when it's most dangerous)
- Before writing code for a feature with user-facing impact
- When the stakes are high (payments, auth, data isolation, migrations)
- When the change touches an entry under `Risk areas` in `.agents/leo.md`

## The Process

### 1. Steelman the Proposal

First, articulate the strongest version of what the user wants. "So you're proposing X because Y, with outcome Z. Correct?"

### 2. Grill Round 1: Problem & Scope

- What problem does this actually solve? (Not "what does it do" — "what problem")
- Who has this problem? How many? How badly?
- What's the smallest version that tests the hypothesis?
- What gets deprioritized to make room for this?

### 3. Grill Round 2: Technical Risks

Cover each family the proposal touches:

- **Tenant/data isolation:** Does this touch tenant-scoped data? How is isolation enforced? Can one tenant see another's data through this path?
- **Authz on every entry point:** Is access checked on every route, job, and webhook that reaches this? Is identity taken from a trusted source, not the request body?
- **Money movement and test-vs-live credentials:** Can this move money? How is test vs live selected? Are test runs on sandbox credentials only? Any new webhook endpoints, and are their signatures verified?
- **Outbound sends:** Can this email, text, or call a real customer? What stops a test or seed run from sending?
- **Time zones and date math:** Calendar date or instant? Whose time zone? Any use of the raw system clock where a shared date utility exists?
- **Migrations and backfills:** Reversible? Safe on a large table and on existing rows? Do new NOT NULL columns, tightened constraints, and seed or fixture data still hold?
- **Feature flags:** Does this need one? Is any flag inert, or left on forever?

Plus every entry under `Risk areas` in `.agents/leo.md`.

### 4. Grill Round 3: Operational Risks

- How do we verify it works before production? In production?
- What's the rollback plan?
- What monitoring/alerting catches failures?
- Does this need a feature flag?

### 5. Grill Round 4: Maintenance & Debt

- Does this create a new pattern others will copy?
- Any code that will be hard to test? Hard to debug?
- Does this add to the quality debt the codebase already has?
- What's the cost to remove this later?

### 6. Synthesize

Present the surviving plan with all assumptions made explicit. Flag what remains uncertain.

## Red Flags That Should Kill or Redirect

| Flag | Action |
|------|--------|
| "We'll figure it out later" | Stop. Figure it out now. |
| "It's just a small addition" | Small additions to wrong abstractions compound. |
| "No one will misuse this" | They will. Design for misuse. |
| "We can add tests later" | Tests-after ≠ TDD. Use `leo-tdd`. |
| "We don't have time for X" | You don't have time to fix the bug X prevents. |

## Output Format

After grilling, deliver:

```
## Surviving Proposal

**What:** [One sentence]
**Why:** [Problem + metric]
**Scope:** [Smallest testable version]

## Explicit Assumptions

- A: [Assumption] — [Confidence: High/Med/Low]
- B: [Assumption] — [Confidence: ...]

## Risks Requiring Mitigation

- R1: [Risk] → [Mitigation or "accept with monitoring"]
- R2: ...

## Recommendation

[Proceed / Proceed with mitigations / Redesign / Kill]
```

## Integration

- When the plan names, renames, or redefines a domain concept, use `leo-domain-modeling`
  in the same session so the glossary and ADRs move with the decision
- Use **before** `leo-brainstorming` presents design
- Use **before** `leo-writing-plans` creates implementation plan
- Can be invoked standalone: "Grill this idea: ..."
