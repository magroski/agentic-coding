---
name: plan
description: Plan software work before building it, at any size - one code change, an epic, or a whole project. Reads the code, data and docs, drafts the problem and tests it against evidence, asks questions until nothing plan-changing is unknown, then writes a detailed plan with a checkable goal under docs/plans/ and a short summary in chat. Use whenever the user asks to plan, scope, design, spec or break down a feature, bugfix, refactor, migration, epic or new project, or asks how to approach non-trivial work, even if they never say "plan".
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
- A plan for this work already exists: revise it, do not write a second one.

## 2. Understand, ask, repeat

Loop over these steps until nothing unknown would change the plan.

**Read what exists.** The request and whatever it links (issues, tickets, specs). The repo's docs and CLAUDE.md. The code on the path of the change, its tests, and recent git history. Any data within reach: schemas, migrations, fixtures, sample payloads, logs. Query live systems read-only. Greenfield work leaves little to read, so the questions carry more weight.

**Draft the problem.** Write it early, on partial information, so the reading and the questions have something to aim at. One or two sentences: who is hurt, by what, and how badly. Keep the solution out of it. "We need a CSV export" is a solution. "Finance retypes 300 orders a month because orders cannot leave the app in a form their ledger imports" is a problem, and it leaves room for a simpler fix.

**Test the draft.** Gather what could prove it wrong, not only what agrees: usage data, logs, tickets, the code path, a reproduction, the user's own account. Sort each finding into supports, contradicts or unknown. When the evidence contradicts, redraft and test again. A sound plan for the wrong problem is the most expensive kind, because everything after it is built well and still wasted.

For a small change this is quick: the bug is the problem and a reproduction is the evidence.

**Ask what the sources cannot answer.** Intent, scope, priorities, constraints, acceptance criteria, and trade-offs that are the user's call. A question the code could have answered costs the user time and shows the reading was skipped.

- One batch per round, numbered, most plan-changing first.
- Give each question a recommended default, so the user can reply `go` or `2: other answer`.
- Show the problem draft when the evidence leaves it open. The user often knows what the data cannot show.
- Small unknowns are not questions. Decide, and record the assumption in the plan.

**Fold the answers in.** Answers move the ground: re-read the code they touch, and put any new questions in the next round.

Stop when every open point is either answered or an assumption the user has seen. Do not write the plan around a guess on something that matters. A written plan looks settled, and a wrong one sends real work the wrong way.

## 3. Write the plan

Repo conventions (CLAUDE.md, existing patterns) win where they differ from what follows.

What makes it executable:

- **A goal that can be checked.** The Goal is numbered pass/fail criteria, each paired with its check: a command to run, or the exact thing to inspect. A reviewer with no context must be able to return PASS or FAIL. Three to eight. Approving the plan approves these criteria, and the `verify` skill takes them as given.
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

## Problem
Who is hurt, by what, how badly. No solution in it. Two sentences.

## Evidence
- Supports: <finding> (<source>)
- Contradicts: <finding> (<source>)
- Unknown: <what would settle it>

## Goal
The outcome, in one sentence. Then the criteria that prove it:
1. <criterion> | check: <command or inspection>

## Context
How it works today, with `path:line` references. Constraints found.

## Approach
The chosen design and the reason. Rejected alternatives, one line each.

## Steps
1. [ ] <what changes> | `<files>` | <layer>

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

A slice inherits its epic's Problem and Evidence. Leave them out unless the slice has its own.

### Epic or project `README.md`

```markdown
# <Title>

Status: Draft

## Problem

## Evidence

## Goal
The outcome, then the criteria that prove the whole is done, each with its check.

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
1. <criterion> | check: <command or inspection>
```

## 4. Summarize in chat

After the files are written, print one screen and no more. The files hold the detail.

```
Plan: <title> (<size>)
Problem: <one line>
Goal: <one line>
Criteria: <numbered, one line each>
Approach: <2-4 bullets>
Steps: <numbered, one line each; slices or milestones for larger sizes>
Risks: <top 1-3>
Assumptions: <any the user may want to veto>
Files: <paths>
```

Then stop and wait. Apply requested changes to the files, not only to the chat. Set `Status: Approved` once the user approves.

## Revising

New information reopens a plan, whatever its Status. Change the Problem, Evidence, Goal, Approach or Steps in place, and add a Decisions line: what was learned, and what changed.

If the Goal or the Approach changed, set `Status: Draft` and get approval again. The user approved something that no longer exists. Corrections that leave both intact need no new approval.
