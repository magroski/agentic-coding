---
name: plan
description: Plan software work before building it, at any size - one code change, an epic, or a whole project. Reads the code, data and docs, asks questions until nothing plan-changing is unknown, then writes a detailed plan under docs/plans/ and a short summary in chat. Use whenever the user asks to plan, scope, design, spec or break down a feature, bugfix, refactor, migration, epic or new project, or asks how to approach non-trivial work, even if they never say "plan".
argument-hint: "<what to plan>"
---

# Plan

Turn a request into a plan someone else could execute: another engineer, or a fresh session with none of this conversation. That reader is the quality bar, and the reason the detail goes to files: a plan outlives the chat that produced it.

Planning ends at the plan. Do not start implementing; the user decides when.

## 1. Size it

Size sets depth and file layout. Over-planning a one-PR change wastes the user's time. Under-planning a project hides the risk the plan exists to expose.

| Size | Signal | Files |
| :- | :- | :- |
| Change | One PR | `docs/plans/<slug>.md` |
| Epic | Several PRs, one goal | `docs/plans/<slug>/README.md` + one `NN-<slice>.md` per slice |
| Project | Several epics, or a new system | `docs/plans/<slug>/README.md` + one `NN-<milestone>.md` per milestone |

`<slug>` is short kebab-case taken from the goal, e.g. `csv-export`.

- Too vague to size: that is the first question.
- The repo already keeps plans or design docs elsewhere under `docs/`: follow its convention.
- A plan for this work already exists: update it, do not write a second one.

## 2. Understand, ask, repeat

Loop over these three steps until nothing unknown would change the plan.

**Read what exists.** The request and whatever it links (issues, tickets, specs). The repo's docs and CLAUDE.md. The code on the path of the change, its tests, and recent git history. Any data within reach: schemas, migrations, fixtures, sample payloads, logs. Query live systems read-only. Greenfield work leaves little to read, so the questions carry more weight.

**Ask what the sources cannot answer.** Intent, scope, priorities, constraints, acceptance criteria, and trade-offs that are the user's call. A question the code could have answered costs the user time and shows the reading was skipped.

- One batch per round, numbered, most plan-changing first.
- Give each question a recommended default, so the user can reply `go` or `2: other answer`.
- Small unknowns are not questions. Decide, and record the assumption in the plan.

**Fold the answers in.** Answers move the ground: re-read the code they touch, and put any new questions in the next round.

Stop when every open point is either answered or an assumption the user has seen. Do not write the plan around a guess on something that matters. A written plan looks settled, and a wrong one sends real work the wrong way.

## 3. Write the plan

Repo conventions (CLAUDE.md, existing patterns) win where they differ from what follows.

What makes it executable:

- **Ordered steps, each leaving the system working.** Work can then stop or ship after any step.
- **Concrete targets.** Each step names its files (`path:line` where the code exists) and the layer it touches.
- **Layers respected.** No step lets a layer skip its neighbor, e.g. a controller querying the database directly. Route through the layer in between.
- **Smallest change that reaches the goal.** Refactors the goal does not need go under Out of scope.
- **Bugs start with a failing test.** Step 1 reproduces the reported behavior in a test, so the fix is proven rather than assumed.
- **Tests as behaviors, not coverage.** Happy path, sad path, edge cases, and only where there is branching, a boundary, or a business rule to protect.
- **A diagram for anything with more than two moving parts.** ASCII, in the file.
- **Decisions kept.** Every question resolved while planning, its answer and the reason. A later reader needs the why, not only the what.
- **Honest about the far end.** Detail what can be detailed now. Where a later slice depends on what an earlier one discovers, outline it and name what must be learned first. Invented detail reads as fact.

Write tersely. Every sentence should change what the executor does.

### Change, and each slice of an epic

```markdown
# <Title>

Status: Draft

## Goal
What changes, for whom, and why. Two sentences.

## Context
How it works today, with `path:line` references. Constraints found.

## Approach
The chosen design and the reason. Rejected alternatives, one line each.

## Steps
1. <what changes> | `<files>` | <layer>

## Tests
- Happy: <behavior>
- Sad: <behavior>
- Edge: <behavior>

## Risks
- <risk>: <mitigation or rollback>

## Out of scope

## Decisions
- Q: <question> A: <answer>, because <reason>
- Assumed: <assumption>
```

### Epic or project `README.md`

```markdown
# <Title>

Status: Draft

## Goal

## Scope
In: ...
Out: ...

## Context

## Architecture
ASCII diagram of the parts and how they talk. Key technical decisions.

## Breakdown
| # | Slice or milestone | Delivers | Depends on | Plan |
| :- | :- | :- | :- | :- |
| 01 | <name> | <what is usable after it> | - | [01-<name>.md](01-<name>.md) |

## Risks

## Decisions
```

Every slice delivers something verifiable on its own. A slice that only pays off once a later one lands is cut in the wrong place.

### Project milestone file

```markdown
# <NN> <Milestone>

Status: Draft

## Goal

## Deliverable
What a user can do when this milestone ends.

## Slices
1. <slice>: a paragraph, or a change-level plan for the first milestone.

## Exit criteria
```

## 4. Summarize in chat

After the files are written, print one screen and no more. The files hold the detail.

```
Plan: <title> (<size>)
Goal: <one line>
Approach: <2-4 bullets>
Steps: <numbered, one line each; slices or milestones for larger sizes>
Risks: <top 1-3>
Assumptions: <any the user may want to veto>
Files: <paths>
```

Then stop and wait. Apply requested changes to the files, not only to the chat. Set `Status: Approved` once the user approves.
