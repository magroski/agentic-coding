---
name: deliver
description: Take work from request to verified result in one run - understand, draft and test the problem, set a checkable goal, choose a simple approach, build, then have the result independently checked, going back to the plan whenever new information changes the picture. Chains the plan and verify skills. Use when the user invokes it, asks for work to be taken end to end (planned, built and verified), or asks to execute or resume a plan under docs/plans/. Not for ordinary tasks.
argument-hint: "<request, or path to a plan>"
---

# Deliver

One loop, six steps:

```
1. Understand the available information --+
2. Draft the problem                      |
3. Gather what tests the draft            +-- plan
4. Define a goal                          |
5. Define a clear and simple approach   --+
6. Act with urgency to achieve the goal ----- build, then verify
       |
       +-- new information: revise the plan (2-5)
```

This skill owns the order, the building, and the way back. The `plan` and `verify` skills own the rest. Invoke them with the Skill tool as `core:plan` and `core:verify`, and follow them as written.

The plan file is the shared state. Every stage reads it and writes to it, which is what lets a later session pick the work up. Past ticking steps and setting Status, every change to it follows the `plan` skill's Revising rules, so it leaves a Decisions line.

## Where to start

| Given | Start at |
| :- | :- |
| A request | Plan |
| A plan with `Status: Draft` | Plan, to finish it and get approval |
| A plan with `Status: Approved` or `In progress` | Build, at the first unticked step |
| A plan with `Status: Done` | Nothing. Say so. |

Resuming `In progress`, compare the working tree and recent commits with the ticks before building. A session that stopped mid-step leaves that step unticked but partly done: finish it from where it stands, do not redo it.

An epic or project runs one slice at a time, in Breakdown order: build and verify a slice before starting the next. Slices are cut to be verifiable alone, so a wrong turn caught at slice two is not built on by slice five. A slice that was only outlined gets planned in detail when its turn comes, with what the earlier slices taught.

The levels above a slice follow it. A milestone or the README goes `In progress` with its first slice. When its last slice is `Done`, invoke `core:verify` with its file, and set it `Done` only when that passes.

## Plan: steps 1 to 5

Invoke `core:plan`. It ends by waiting for the user's approval, and that approval covers the Goal's criteria.

Do not build on a Draft. Once the plan is approved, go straight to Build without asking again: invoking this skill was the go-ahead to implement.

## Build: step 6

Set `Status: In progress`. Take the plan's Steps in order and tick each one in the file as it lands.

Urgency is the shortest path to the Goal's criteria, not haste:

- **Do what the step says and nothing else.** Improvements the plan did not ask for are how a two-day change becomes a two-week one. Note them for later and move on.
- **Check after every step.** Run the tests or checks that step touches. A break found now has one suspect; found at the end it has ten.
- **Keep moving.** Do not stop to ask what the plan already answers. Stop for the triggers below, and for anything destructive or irreversible.

## Verify

When every step is ticked, invoke `core:verify` with the plan's path. It takes the criteria from the plan and does not ask for them again.

Record each fix verify makes as a Decisions line in the plan: the criterion that failed, and what changed. The plan stays the full record of what was built.

- **All criteria pass:** set `Status: Done`.
- **A criterion is Disputed:** report both sides and wait for the user's ruling.
- **Still failing after verify's two rounds:** that is new information, and the user's call. Take the way back.

## The way back

Stop building and revise the plan when:

- Evidence contradicts the Problem.
- A step shows the Approach cannot work, or that a much simpler one exists.
- A Goal criterion proves wrong or uncheckable.
- `core:verify` still fails after its two rounds.
- The user changes what they want.

Ordinary friction is not a trigger. A test that fails inside the approach gets fixed. A wrong path in a step gets corrected in the plan, and the work carries on.

On a trigger:

1. Say what was learned, in a line or two.
2. Invoke `core:plan` to revise the plan in place. Its Revising section decides whether the user must approve again, except after a verify failure: then they always must. Unless the user asked for the change, start the revision's Decisions line with `Way back:`.
3. Untick the steps the revision invalidates, then resume Build at the first unticked one.

At most two trips back per plan file. Count the `Way back:` lines, so the count survives a new session. A third trigger means the problem is not yet understood: stop, report what each trip taught, and wait for the user.

Stopping feels slower than pushing on. It is not: work built past a broken assumption is work to redo, and the cheapest moment to change the plan is the moment the assumption breaks.

## Report

End with one screen: verify's report, the plan's path and Status, and for each time the plan was revised, what was learned and what changed.
