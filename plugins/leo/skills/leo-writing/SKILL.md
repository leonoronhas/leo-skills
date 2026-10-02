---
name: leo-writing
description: Use whenever you write prose a person or agent will read, such as a reply, PR description, commit message, doc, README, ADR, spec, plan, review finding, decision-log row, or code comment. Writes it plain, specific, and free of AI tells, and cleans up existing text on request ("unslop this", "tighten this").
---

# Leo Writing

**Adapted from:** pstack `unslop` and `technical-writing` (MIT, https://github.com/backnotprop/pstack).

## Before you start

Read `.agents/leo.md` if it exists. Files under `rules-files` may add repo-specific voice rules; they win over this skill where they conflict.

The goal is text a tired engineer understands on the first read.

## How to apply it

1. Write clean as you draft. A cleanup pass after drafting does not remove these patterns.
2. Scan the draft against the patterns below and rewrite. Keep the meaning and the intended tone.
3. Ask: "What makes this obviously AI-written?" Fix what remains.
4. For a PR description, plan, doc, or spec saved to a file, run `scripts/prose-lint <file>` from this skill's directory. It catches rules 3, 9, 15, 16, and placeholders; the rest need your read.

Three rules sit above the rest:

- **Cut every word that does no work.** "In order to" is "to". "It is important to note that" is nothing.
- **Use the short, everyday word.** "Use", not "utilize". A long word has to earn its length with precision.
- **When a rule makes a sentence worse, fix it another way or leave it.** The rules serve the reader.

The codebase is the word list. Write the real symbol, file, flag, or command name, not a synonym or a description of it.

## Replies and reports

- Lead with the result. Then what changed for the person affected, then what the next maintainer inherits.
- Short declarative sentences. One thought per sentence.
- Terse is not an excuse to drop content. Every section the task asks for stays: details, trade-offs, open decisions.
- Every claim carries its evidence or a label in the same sentence: measured, inferred, or guess. A prediction or an unseen cause is a guess.
- Never hand the reader a check you could have run.
- Never invent a link, citation, or reference. Link only what you produced or read in this session.

## Commits and PR descriptions

- A PR body is a briefing a reviewer reads in under a minute: what changed, why, how it was verified, what is open. Link logs, SHA lists, and metric tables instead of pasting them.
- A commit subject says what the commit does, in the imperative. The body says why, and names the root cause for a fix.
- Make every count or claim true at the commit that lands it, and give the command that regenerates it.

## Code comments

- Keep a comment only for a non-obvious *why* the code cannot show: a constraint, a workaround with its cause, a surprising invariant.
- Delete comments that restate the code, narrate steps, or record history (git has it).
- Tests and verify scripts get no phase-narrating comments such as `// Phase 1: add cards`. The assertion message documents the step: `assert(ok, 'persisted across restart')`.
- A "do not remove" or "do not change" comment is a constraint. Prefer encoding it as a type, test, or lint.

## Docs: pick the mode first

One document, one mode:

| Mode | For | Write it as |
|---|---|---|
| Tutorial | Learning by doing | Steps that each produce a visible result. Say what the reader should see. Explanation cut to a clause and a link. |
| How-to | Reaching a goal | Commands only, for a competent reader. Forks as "If you want X, do Y." Title it by the task. |
| Reference | Looking facts up | Describe only: options, limits, errors. Dry, complete, no hedging. Mirror the structure of the thing. Generate from code where possible. |
| Explanation | Understanding why | One bounded topic: decisions, history, constraints, alternatives. Opinion belongs here and nowhere else. |

Don't mix modes. Split and link instead.

## Sentences

- Talk to the reader as "you", in the present tense.
- Say who does what: "the compiler checks", not "is checked". Passive only when the actor is unknown or beside the point.
- Write instructions as commands, with the condition first: "To delete the document, run `rm`."
- Common case first, exceptions after.
- Split instructions over about 20 words and other sentences over about 25.
- Keep "the" and "a". "Remove backup file" reads two ways; "remove the backup file" reads one.
- Keep "only" and "not" next to the word they change.
- Make every "it", "they", and "this" point at one obvious thing. Repeat the noun when in doubt.
- Call each thing by one name everywhere. Don't reword an unchanged sentence between edits.
- Break up long noun strings: "the proto import budget check script" becomes "the script that checks the proto-import budget".
- No slashes ("a, b, or both", not "a/b"), no "(s)" plurals, no Latin abbreviations, no idioms.
- Headings carry the point, in sentence case. Numbered lists for sequences, bullets otherwise. Introduce a list with a full sentence.
- Mix sentence lengths. Short sentences land a point; a longer one can carry a fact with its condition.
- Be specific over sterile: not "schema changes can cause issues" but "a column rename fails the build".

## Patterns to remove

Rule numbers are stable ids other skills cite. Never renumber; a removed rule leaves a gap.

**Content**

1. **Superficial -ing phrases.** "highlighting...", "ensuring...", "showcasing...". Delete, or say the concrete thing.
2. **Vague attributions.** "Experts believe", "Industry reports suggest". Name the source or delete.

**Language**

3. **AI vocabulary.** Additionally, crucial, delve, enhance, fostering, garner, interplay, intricate, landscape, pivotal, robust, seamless, showcase, tapestry, testament, underscore, vibrant. Use plain words.
4. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Say "is" or "has".
5. **"Not just X, but Y."** State the point directly.
6. **Rule of three.** Forcing ideas into threes. Use the natural number.
7. **Synonym cycling.** Pick one word for a thing and repeat it.
8. **False ranges.** "from X to Y" where X and Y are not on a scale. List the items.

**Style**

9. **Em dashes.** Don't use them, and don't substitute en dashes or spaced hyphens. End the sentence or use a comma.
10. **Mid-sentence colons.** Fine before a list or example. Not as a connector between two clauses.
11. **Boldface overuse.** Don't bold every name or acronym.
12. **Inline-header lists.** "**Performance:** Performance improved..." restates the label. Use prose. A bold lead-in that ends in a period and adds new detail is fine.
13. **Title Case Headings.** Use sentence case.
14. **Decorative emojis.** Remove them from headings and bullets.
15. **Curly quotes.** Use straight quotes.

**Chat habits**

16. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Certainly!", "Great catch!". Remove.
17. **Sycophancy.** "You're absolutely right!" Respond to the substance.

**Filler**

18. **Filler phrases.** "Due to the fact that" is "because". "It is worth noting that" goes.
19. **Stacked hedging.** "could potentially possibly" is "may".
20. **Generic conclusions.** "The future looks bright." State the plan or the fact.

**Jargon and plain speech**

21. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, nexus, primitive, surface, bedrock, scaffolding, paradigm, gold-plating, ratchet, endgame, north star, flywheel. Use the concrete word: "base", "add", "way", "more than the job needs", "a limit that only tightens", "the last phase".
22. **Say what it does, not how it feels.** "SQL you can read" names a feeling; "`.toSQL()` returns the exact string sent to the database" names the mechanism. If a sentence could appear unchanged in another project's docs, it says nothing about this one. Cut it.
23. **Dense sentences.** If the reader has to backtrack, split it or drop clauses.
24. **Adverbs propping up weak verbs.** "runs quickly" becomes the number. "significantly improves" becomes the measured change.
25. **Mannered prose.** Aphorisms, rhetorical fragments, personified code ("the plan holds it"), figurative verbs ("rides along"). Say it literally.
26. **Over-compression.** Dropped articles, verbless fragments, arrows, and unexplained abbreviations. "Parser rejects bad date → exit 2, no write" becomes "The parser rejects a bad date, exits with code 2, and writes nothing."

## Review checklist

1. Is each doc one mode, with links where modes meet?
2. Is every instruction a command, with its condition in front?
3. Does any sentence carry two thoughts? Split it.
4. Can any word go without losing meaning? Cut it.
5. Is "only" next to its word, does every "it" point at one thing, does every clause keep its verb?
6. Does each thing have exactly one name?
7. Would a developer say these words out loud?
8. Are all symbols, paths, and counts real at this commit?
9. Does any pattern from the list remain?
