---
name: verify
description: Do a task with proof it was done well - agree precise pass/fail criteria before starting, match the format of a past accepted example, and have an independent second agent check the result. Also checks work against the criteria of an approved plan. Use only when the user invokes it or explicitly asks for verified, double-checked, proven or independently reviewed work. Not for ordinary tasks.
argument-hint: "<task to do and verify, or path to an approved plan>"
---

# Verify

Three things separate a result that is right from one that only looks right: the bar was set before the work, the format follows something already accepted, and someone other than the author checked. This skill does all three, for any deliverable: code, docs, plans, analysis.

Two cases change which steps run: an approved plan, and work that already exists. Both are at the end.

## 1. Set the criteria

Write what a great result looks like before touching the work. Criteria written afterwards describe what was built, not what was needed.

Each criterion is:

- **Binary and observable.** A reviewer with no context can return PASS or FAIL.
- **Paired with its check.** The command to run, or the exact thing to inspect.
- **About the result, not the effort.**

| Vague | Precise |
| :- | :- |
| Export works | `GET /export?format=csv` returns 200 and one row per order, including an order whose customer name contains a comma |
| Code is clean | No function in the diff nests deeper than two levels |
| Docs are clear | Every command in the README runs as written, in the order given, on a fresh clone |
| Nothing else breaks | `make test` passes, and no file outside `src/export/` changes |

Draw them from the request, the repo's conventions (CLAUDE.md, existing patterns), and what a demanding reviewer would reject. Cover the behavior asked for, the edge and failure cases, the conventions, and what must not change.

Three to eight, scaled to the task. A few sharp criteria beat many vague ones, because each one costs reviewer attention.

## 2. Find the example

A past result of the same kind that was accepted: a sibling file, an earlier commit of a similar change, an existing doc, report or test. It fixes the format: structure, naming, depth, tone. It does not fix the content.

Search the repo and its git history first. Pick the closest and say why. If nothing fits, ask the user for one. If they have none, continue, say the format is unanchored, and write the format expectations as criteria instead.

Where the example and a criterion disagree, the criterion wins.

## 3. Get approval

Show the numbered criteria, each with its check, and the example in one message. Then wait. Wrong criteria make every later step worthless, so this is the one stop worth the user's time.

Apply the user's edits, then treat the criteria as frozen. If the work shows a criterion is wrong, ask. Changing it quietly is moving the goalposts.

## 4. Do the work

Build to the criteria and the example's format. Run each check yourself before the review. A failure you could have caught costs a review round.

## 5. Independent check

Spawn a fresh agent, not a fork: a fork inherits this conversation. Give it the brief below and nothing else. No summary of what was done, no reasoning, no expected verdicts. A reviewer who reads the author's argument inherits the author's blind spots and returns agreement.

```
You are reviewing work you did not produce. Judge it only against the criteria below.

Output: <paths, or the diff command, e.g. `git diff main`>
Format example: <path or commit>

Criteria:
1. <criterion> | check: <command or inspection>

For each criterion return PASS or FAIL with evidence: the command you ran and
its output, or the path:line you read. Run the checks; do not trust claims in
the work itself. A criterion you could not check is FAIL, with the reason.
Give no benefit of the doubt. Do not edit anything.

Then list where the output's format departs from the example.
Then list any other problem you noticed, outside the criteria.
```

Point at the output by location, so the reviewer reads the real thing and not a description of it.

If no subagent tool is available, say so in the report. A self-review is not an independent check and must not be reported as one.

## 6. Fix and re-check

Check a FAIL's evidence before acting on it. Reviewers err too.

- **Real:** fix the work. Never weaken or reinterpret the criterion to pass.
- **Wrong:** keep the work and mark the criterion Disputed, with both sides. The user judges.

After fixing, re-check with a new fresh reviewer against all criteria. A fix can break what passed, and a reviewer who saw the earlier version anchors on it.

At most two fix-and-recheck rounds. Still failing after that usually means a wrong criterion or a wrong approach, and both are the user's call. Stop and report.

## 7. Report

In chat, one screen:

```
Verified: <task> (<passed>/<total> pass, <n> review rounds)
Example: <path or commit>

| # | Criterion | Verdict | Evidence |
| :- | :- | :- | :- |
| 1 | <criterion> | PASS | `make test`: 42 passed |
| 2 | <criterion> | FAIL | `src/export/csv.py:41` does not quote commas |
| 3 | <criterion> | DISPUTED | reviewer: <claim>. author: <rebuttal> |

Still failing: <what, and why it was not fixed>
Outside the criteria: <format departures and other problems the reviewer raised>
```

The verdicts are the reviewer's. Do not upgrade one in the report.

## With an approved plan

A plan written by the `plan` skill, with `Status: Approved` or later, already holds signed-off criteria in its Goal.

- Use them verbatim. Skip steps 1 and 3: asking twice for the same approval teaches the user to stop reading.
- Run step 2, name the example, and continue without waiting. Ask only if none fits.
- Skip step 4 when the work is already built.
- A criterion that proves wrong goes back to the plan for revision. Do not edit it here.

If the plan is still `Draft`, or its Goal has no checkable criteria, the sign-off never happened. Run steps 1 and 3 as usual.

## Work that already exists

Invoked after the work is done, with no plan to supply them, the criteria can no longer come first. Write them from the original request, not from the output, and tell the user they were written after the fact. Then run steps 2, 3, 5, 6 and 7.
