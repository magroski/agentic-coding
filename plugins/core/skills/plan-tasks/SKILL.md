---
name: plan-tasks
description: Plan every filed task of an approved epic before any is built - one task-skill planner per task in parallel, their interviews batched into one message to the founder, then a fresh cross-review of the plans against each other and the epic doc (business rules, exit criteria, acceptance criteria, shared interfaces, order, out of scope), with the gaps fixed in the plans. Use when the user invokes it, or asks to plan all of an epic's tasks or issues ahead of building, or to cross-review an epic's task plans. Not for planning the epic itself (epic) or a single task (task).
argument-hint: "<epic number, or path to its doc>"
---

# Plan tasks

Every task of one epic planned before any is built, then the plans read side by side. Each plan sees one issue. A gap between two of them, or a business rule none of them covers, shows only when they are read together, and is cheapest to fix before tests exist.

Planning ends at approved plans on their task branches. Building is `next`'s lanes, or `build`.

## 1. Load

Run `git fetch origin` and read from `origin/<default branch>`.

- **The epic doc:** by its `NN` or path. It must be `Approved` or `In progress`, with Business rules and its tasks' issues filed. Otherwise stop: it needs `/core:epic` first.
- **Its tasks:** the open `feature`, `chore`, `bug` and `research` issues in its milestone: `gh issue list --milestone "<title>" --state open --json number,title,labels,body`.
- **Their plans:** a remote branch `<type>/<n>-<slug>` holds task #<n>'s plan. Read it with `git show origin/<branch>:<path>`.

| Task | Do |
| :- | :- |
| No plan; `Draft`; or `Approved` with no `Map audit:` or `Outcome confirmed` line | Plan it. |
| `Approved` | Keep. The cross-review reads it. |
| `In progress` or `Done` | Being built or built. The cross-review reads it; nothing here revises it. |
| `Blocked by` an open task issue: an outline, or a task a `research` issue decides | Skip. It waits for what that issue teaches. |
| Joined into another issue | Skip. It is planned with that issue. |

A task blocked only by a `founder` issue is planned: setup the founder owes does not change the plan.

Join small tasks before planning, as `next`'s step 4 says; invoking this skill is the founder's go. Once planned, they can no longer be joined.

Nothing to plan: go to step 4.

## 2. Plan, in parallel

One fresh agent per task to plan, all in one message so they start together: Agent tool, `subagent_type: "general-purpose"`, `isolation: "worktree"`, in the background. Each commits its plan on its own task branch, so each needs its own worktree.

```
You plan #<n> in <repo>. Invoke the core:task skill for #<n>.

- Plan #<n> only, and never build it.
- You cannot ask the founder. Take the task skill's path for that: stop at the
  interview or a one-way door with the questions and your recommended answers.
  Answers arrive by message; continue from where you stopped.
- The epic's other tasks are planned in parallel. Where #<n> uses what an earlier
  task in the epic's Order builds, design against that task's issue and the epic
  doc, and name the interface in your Approach. Plans already written:
  <branch>:<path> for each, or none.
- End every report with `Plan: <branch>:<path>`.
```

A planner that splits its task files new issues in the milestone. Each gets its own planner, with its interview in the same batch when it arrives in time, else in the next.

## 3. Interview, in one message

Wait until every planner has returned its interview or a report. Then send the founder one message: each task interview whole, in the epic's Order, under its `#<n> <title>`, `Achieves:` and `Not in it:` lines. A question two tasks ask goes once, under the first, marked `also #<m>`. Recommendations that disagree between tasks sit side by side. The founder answers `go`, or `#<n> <k>: <answer>`.

Send each task's answers to its planner with `SendMessage`. It records them and finishes the plan. One-way doors it reports wait for step 5.

## 4. Cross-review

Once every planner has reported, its plan approved or held at a one-way door, or the planner stopped as blocked, spawn `core:cross-reviewer` as a fresh agent, never a fork, with the epic doc's path, each task's issue, `<branch>:<path>` and Status, and the skipped tasks with why. It reads the plans without this conversation's reasoning. Not found: spawn `general-purpose` with `agents/cross-reviewer.md`, two levels up from this skill's base directory, as its brief, with the `model` and `effort` its frontmatter names.

One review. Its fixes do not get a second one.

## 5. Apply

- **Plan fix:** send it to that plan's planner with `SendMessage`: `Cross-review: revise your plan per the task skill's Revising: <findings>. Report as before.` Its Revising rules decide the map audit and whether the founder sees it. A plan with no planner in this session gets a fresh one (step 2), told to revise it with the findings. A plan `In progress` or `Done` is never revised here: its finding becomes a new task.
- **New task** and **Founder**: wait for the plan fixes to report, then send the founder one numbered message, each item with its recommendation: the one-way doors planners hold, the questions their revisions raised, the Founder findings, and the new tasks as the epic skill's step 7 shows what it will file.

The answers:

- A one-way door, or a revision's question: to its planner, which approves the plan.
- A Founder finding: to the planner of the first plan in the epic's Order that it changes, which records it in the epic doc as the task skill records an interview answer; to each other plan it changes, as a plan fix. One branch adds it to the epic doc, so no two add the same rule.
- New tasks, on the founder's yes: filed as the epic skill's Revising says, then planned through steps 2 to 4, the cross-review checking only the new plans against the rest. No third round: what remains goes to the report.

## 6. Clean up

Once step 5 is settled and each planner has ended, remove its worktree as `next`'s Clean up says. Its plan is pushed: one waiting on the founder resumes from the plan's open lines, through `build`, with a fresh agent.

## 7. Report

One screen:

```
Planned: <NN epic> · <approved>/<total> tasks approved
  #<n> <title>: Approved · track <full | light> · <rows> test rows · <branch>
  #<n> <title>: waiting on you: <one-way door, recommend <choice>>
Skipped: #<n> blocked by #<m> · #<k> In progress
Joined: #<m> into #<n>
Cross-review: <count> findings · <k> fixed in plans · new tasks #<n>, #<m> · left: <each, or none>
Assumed business rules: <each, added to the epic doc on its task branch, or none>
Next: /core:next builds them in the epic's Order.
```
