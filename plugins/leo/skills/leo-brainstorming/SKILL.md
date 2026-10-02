---
name: leo-brainstorming
description: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
---

# Brainstorming Ideas Into Designs

**Adapted from:** Superpowers `brainstorming` (MIT, https://github.com/obra/superpowers).

## Before you start

Read `.agents/leo.md` first. If it does not exist, run `leo-setup`, then continue.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

**Under `leo-mode`.** The run replaces the interview. Answer each clarifying question from the repo, the `tracker` issue, and the code. Pick the approach yourself and log it as a ruling. Have an `other-vendor` subagent grill the written spec with `leo-grilling`. The approval gate applies only when the design touches a `Risk areas` entry or rests on a product or preference call no experiment settles: then write it to `gates.md` with your default and keep working around it. Otherwise continue to `leo-writing-plans`, and list the spec path in the final report.

<!-- leo:subagent-model -->
**Subagent model.** Use `subagent-model` from `.agents/leo.md` when it is set. Otherwise use one tier below your own model in the same vendor family; if you are already on the smallest tier, or cannot name your own model, use your own model. Delegate only read-heavy, independent work; design, security judgment, and final verification stay with you.
<!-- /leo:subagent-model -->

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Explore project context** — check files, docs, the `rules-files` from `.agents/leo.md`, recent commits
2. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches** — with trade-offs and your recommendation
4. **Present design** — in sections scaled to their complexity, get user approval after each section
5. **Write design doc** — save to the `specs` path from `.agents/leo.md` as `YYYY-MM-DD-<topic>-design.md`
6. **Spec self-review** — quick inline check for placeholders, contradictions, ambiguity, scope
7. **User reviews written spec** — ask user to review the spec file before proceeding
8. **Transition to implementation** — invoke `leo-writing-plans` skill to create implementation plan

**The terminal state is invoking leo-writing-plans.** Do NOT invoke any implementation skill. The ONLY skill you invoke after brainstorming is leo-writing-plans.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Before asking detailed questions, assess scope: if the request describes multiple independent subsystems, flag this immediately
- For appropriately-scoped projects, ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

**Design for isolation and clarity:**
- Break the system into smaller units that each have one clear purpose, communicate through well-defined interfaces, and can be understood and tested independently
- For each unit, you should be able to answer: what does it do, how do you use it, and what does it depend on?
- Can someone understand what a unit does without reading its internals? Can you change the internals without breaking consumers? If not, the boundaries need work.
- Smaller, well-bounded units are also easier for you to work with

**Working in existing codebases:**
- Explore the current structure before proposing changes. Follow existing patterns.
- Where existing code has problems that affect the work (e.g., a file that's grown too large, unclear boundaries, tangled responsibilities), include targeted improvements as part of the design
- Don't propose unrelated refactoring. Stay focused on what serves the current goal.

## After the Design

**Documentation:**
- Write the validated design (spec) to the `specs` path from `.agents/leo.md` as `YYYY-MM-DD-<topic>-design.md`
- Follow `specs-plans-tracked` from `.agents/leo.md`: when `yes`, the spec is committed with the work; when `no`, keep it local and untracked

**Spec Self-Review:**
After writing the spec document, look at it with fresh eyes:
1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague requirements? Fix them.
2. **Internal consistency:** Do any sections contradict each other? Does the architecture match the feature descriptions?
3. **Scope check:** Is this focused enough for a single implementation plan, or does it need decomposition?
4. **Ambiguity check:** Could any requirement be interpreted two different ways? If so, pick one and make it explicit.

Fix any issues inline. No need to re-review — just fix and move on.

**User Review Gate:**
After the spec review loop passes, ask the user to review the written spec before proceeding:
> "Spec written to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

Wait for the user's response. Only proceed once the user approves.

**Implementation:**
- Invoke the `leo-writing-plans` skill to create a detailed implementation plan
- Do NOT invoke any other skill. leo-writing-plans is the next step.

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design, get approval before moving on
- **Be flexible** - Go back and clarify when something doesn't make sense
