---
name: task
description: Plan one task technically before it is built - read the issue, its epic's business rules, the code, tests, infra and data; interview the founder on what the task must achieve; choose the smallest approach with the ladder; turn the acceptance criteria into checkable criteria, a test map, performance targets and post-deploy checks; write the plan under docs/plans/, and approve it without asking again unless it holds a one-way door. Use when the user invokes it, asks to plan, scope or design a single task, issue, bug, chore or code change, or when build finds no approved plan. Not for epics or product planning; that is the epic skill.
argument-hint: "<issue number, or the task>"
---

# Task

The tech lead's half of planning. What to build and why was settled in the epic, or in the issue for a bug or chore, and the founder confirms what this task achieves in a short interview. This skill decides how, and how anyone will know it works.

The reader is a lane with none of this conversation, building alone. Every gap in the plan becomes a guess there, so the plan's precision is what makes unattended work safe.

Planning ends at the plan. Building is the `build` skill.

## 1. Load

- **The issue:** `gh issue view <n> --json title,body,labels,milestone,comments`. Comments carry notes left by earlier tasks.
- **The epic doc:** linked from the milestone description or the issue. Read its Business rules, Out of scope and Decisions; they bind this plan.
- **The repo's rules:** `CLAUDE.md` or `AGENTS.md`, including `## Delivery`. No Delivery section: use what the repo shows, record each fact you had to infer, and suggest `/core:setup` in the summary.
- **A plan for this issue already exists:** revise it (see Revising), do not write a second.
- **Joined issues:** each `Joins #<m>` line in the body adds #<m>'s acceptance criteria to this task. Mark #<m> in the epic doc's Tasks as `joined into #<n>`.
- **No issue:** the request is the source. A bug is reproduced before anything else. Not reproduced after two honest tries: report what was tried, on the issue if there is one, and stop as blocked.

Run `git fetch origin` first and read from `origin/<default branch>`: the local checkout may be behind work merged on GitHub.

## 2. Read the ground

The code on the path of the change, its callers and tests, infra config, migrations, data within reach (read-only), recent git history, and earlier task plans in the same epic, for their format and decisions. Measure a performance baseline now when step 7 applies; it cannot be measured after the change.

A task inherits its epic's problem. A bug's problem is its reproduction.

## 3. Interview

What the task achieves is the founder's call, settled before any decision is written. Draft it from the issue, the epic doc and what the product does today, then ask in one message, each question with a recommended answer, so the founder can reply `go` or `2: other answer`:

```
#<n> <title>
Achieves: <who can do what after it, and what they see, in the product's language>
Not in it: <what a user might expect that this task leaves out, or nothing>
1. <question>? Recommend: <answer>
```

Ask only what changes what a user gets:

- **Outcome.** The lines above, for the founder to confirm or correct.
- **Open behavior.** What a user sees at each edge the acceptance criteria leave open: empty, at a limit, on an error, when two changes collide, without permission; what happens to existing data and users.
- **Business rules** the epic doc does not settle.
- **Done.** What the founder will check first to call it done.

Technical choices are not questions: two-way doors are decided (step 5), one-way doors go to Approve.

Record each answer under the plan's Decisions as `- Q: <question> A: <answer> (founder, YYYY-MM-DD)`, then `- Outcome confirmed by the founder (YYYY-MM-DD)`. The confirmed `Not in it` goes under the plan's Out of scope. A business rule settled here goes into the epic doc as `BR<n>. <rule> | decided: founder YYYY-MM-DD (#<n>)`. An answer that changes the epic's outcome, scope or a success metric goes through the epic doc's Revising.

**Not talking to the founder** (a lane, or any agent another session started): write the plan file with `Status: Draft`, the drafted Goal, and each question under Decisions as `Interview (open): <question>; recommend <answer>`. Commit and push it as step 9 says, so the questions survive this session, then report `Needs you: interview for #<n>` and the message. Whoever started you relays it. When the answers arrive, by message or in the plan, rewrite each open line as a `Q: … A: …` and continue from recording them; do not ask again.

## 4. Choose the approach

For each part the goal needs, stop at the first rung that holds:

1. Needed at all? No: drop it, say why.
2. In this codebase? Reuse it.
3. Standard library? Use it.
4. Native platform feature (DB constraint, HTML attribute, framework built-in)? Use it.
5. Installed dependency? Use it.
6. One line? Write one line.
7. Else the minimum that works.

Rungs 2-5 need a search, not a guess. A new dependency is fine when no higher rung holds and it earns its place; a package for a few lines never does. Never cut: validation, security, accessibility, layer boundaries.

Too big for one build: split it. It is too big when its Test map comes to more than 15 rows (check again after step 6), or it brings in more than one new outside service. Every gate and review round on an oversized task finds another gap, so it never converges. Two deploy targets alone (an API and the page that uses it) are not a reason: they ship together while the rows fit. Split into pieces each verifiable alone, none with fewer than three criteria where the criteria allow: every task pays a full cycle of tests, gate, review, PR and deploy. File the extra issues in the same milestone, move the acceptance criteria they take over out of the original issue, add them to the epic doc's Tasks, and plan the first.

## 5. Classify every decision

Each decision is a door.

- **One-way:** impossible or costly to undo. A data model once live data depends on it, a destructive migration, a public contract others consume, the auth model, a framework, database or payment provider, anything that moves money or carries legal or privacy weight. These are the founder's.
- **Two-way:** easy to undo. A library behind an adapter, an additive migration, internal APIs, UI, refactors, a constant. Decide it and record the reason.

A business rule the epic doc does not settle is a product decision, asked in the interview. One found after it is answered: two-way (a value that can change later): assume it, record it here, and append it to the epic doc's Business rules as `BR<n>. <rule> | assumed (#<issue>)`, so the founder sees it where product rules live. An older epic doc with no Business rules section gets one, before Decisions, starting at BR1. One-way: stop.

Small unknowns are not questions. Decide and record them.

## 6. Goal and test map

**Goal.** One sentence, then three to eight numbered criteria, each pass/fail and paired with its check: a command, or the exact thing to inspect. Draw them from the issue's acceptance criteria (a bug's expected behavior, a chore's change), the business rules it covers, and the repo's rules (lint, layers, contract). A criterion only production can show, such as "migrates on deploy", is `check-only`.

**Test map.** Every criterion that is not check-only maps to tests, held to these rules and nothing past them:

- At the highest level the repo supports: end-to-end, then API or feature, then unit. No unit test of a function with no conditional logic: the API or feature test covers it.
- Each test is one behavior a user or caller sees, not a line to cover, written as given/when/then with concrete values, and the reason it fails before the build. Two inputs the code receives separately (ids, URLs, tokens) get different values.
- Each row names the plausible wrong implementation it rules out.
- A criterion on a trust boundary (sign-in, sessions, tokens, callbacks from outside services, payments, permissions) gets a row for each property an attacker would exploit: cookie flags, state and nonce checks, single-use secrets, values that must match from one request to the next.
- A row earns its place only when it validates branching, protects a boundary, or documents a business rule: happy, sad and edge cases where those exist. No tautologies, no tests of boilerplate (DTOs, plain data objects, getters, config).
- A criterion's rows together fail a fixed list of wrong builds: one that always succeeds, one that always refuses, each row's Rules out, and on a trust boundary each attack above. A wrong build outside the list is not a gap: a bar with no end never passes. Against always-refuses, a criterion about rejecting bad input also gets a test where good input passes. When that behavior already works today, its row is a guard: its red reason reads `guard: passes before build`, and it must pass, not fail, before the build.
- External dependencies are mocked; time and randomness are injected. Tests are deterministic and fast.
- A bug's first test reproduces the report.

A separate agent writes these tests before any code exists, from this plan alone. So the Approach names every public interface the tests touch: endpoints, classes, functions, commands. Renaming one later is a way back.

## 7. Performance

Only when the task can move a metric (queries, hot paths, page weight) or the issue sets a target. Metric, baseline measured now, target, and the method from Delivery, so the build measures before and after the same way.

## 8. Post-deploy

- **Immediate:** what the build checks once the deploy is live: health, a smoke request, a metric read. Every check-only criterion is one of these.
- **Delayed:** what needs time to show, such as a week of query times after an index. Each becomes a `check` issue when the task ships: question, method, pass threshold, run dates as days after deploy.

An epic success metric this task unlocks becomes a delayed check here.

## 9. Write the plan

Next to the epic doc, prefixed with the epic's number: `docs/plans/<roadmap>/NN-<slug>.md`. A task with no epic: `docs/plans/<slug>.md`. The repo's own convention wins.

Commit the plan, and any epic doc edits, on the branch the `build` skill checked out, else on the task's branch `<type>/<n>-<slug>` (the existing one, or new from `origin/<default branch>`), and push it. Type: `feat` for a feature, `fix` for a bug, `spike` for research, else `chore`. A plan that lives only in one checkout is invisible to the lane that builds it and to `next`.

```markdown
# <Title>

Status: Draft | Approved | In progress | Done
Issue: [#<n>](<url>) · Task <k> of [<epic>](<epic doc>)

## Goal
<the outcome the founder confirmed: who can do what, and what they see>

1. <criterion> | check: <command or inspection>
2. <criterion> | check-only: <production check>

## Context
How it works today, with `path:line`. Constraints. Delivery facts that matter here.

## Approach
The design and why. An ASCII diagram for anything with more than two moving parts. Each part's rung and what it reuses (`path:line`, API, package). The public interfaces the tests use. Rejected alternatives, one line each.

## Test map
| C | Test | Level | Behavior | Red before build because | Rules out |
| :- | :- | :- | :- | :- | :- |
| 1 | `<file>`: <name> | api | given … when … then … | <endpoint> does not exist | <a wrong build that would pass without this row> |

## Performance
| Metric | Baseline | Target | Method |
| :- | :- | :- | :- |

## Steps
1. [ ] <what changes> | `<files>` | <layer>

## Post-deploy
- Immediate: <check> | `<command>`
- Delayed: <question> | <method> | pass when <threshold> | run on deploy + <n> days

## Risks
- <risk>: <mitigation or rollback>

## Out of scope

## Suggested follow-ups

## Decisions
- One-way (open): <decision>; recommend <choice>
- One-way: <decision> | approved by the founder YYYY-MM-DD
- Two-way: <decision>, because <reason>
- Assumed: <assumption>
```

Leave out Performance when step 7 does not apply. Steps cover the implementation only: the build writes the tests first and handles the PR and deploy.

Every step names its files and layer, and no step lets a layer skip its neighbor. Write tersely: every sentence should change what the builder does.

## 10. Audit the Test map

Spawn `core:map-auditor` as a fresh agent, never a fork, with the plan path: it judges the table without this conversation's reasoning. No test exists yet, so a gap it finds costs an edit here instead of rewritten tests and another audit at the build's gate. Not found: spawn `general-purpose` with `agents/map-auditor.md`, two levels up from this skill's base directory, as its brief, with the `model` and `effort` its frontmatter names.

One audit, no second round: each finding comes with the row that fixes it. Apply each one whose case holds; record each that does not, and why, under Decisions. Log `- Map audit: PASS | FAIL, <one line>` under Decisions, put its follow-ups under `## Suggested follow-ups`, check the split limits again (step 4), then commit and push.

## 11. Approve

- **No one-way door:** set `Status: Approved` and add `- Auto-approved: no one-way doors (YYYY-MM-DD)` to Decisions. Do not wait.
- **One or more:** keep `Status: Draft`, write each under Decisions as `One-way (open): <decision>; recommend <choice>`, commit and push, and stop. The lines are what `next` and `build` show the founder later. Once the founder decides, rewrite each as `One-way:` and approve.

Comment the plan's path on the issue, so issue and plan link both ways.

## 12. Summarize

One screen:

```
Task: #<n> <title> (<Approved | waiting on you>)
Achieves: <who can do what after it, and what they see, as the founder confirmed>
Not in it: <what it leaves out, or nothing>
Criteria: <numbered, one line each>
Tests: <count> mapped, <count> check-only; map audit <PASS | FAIL, <n> rows changed>
Approach: <2-4 bullets>
One-way doors: <each with the recommended choice, or none>
Assumed business rules: <each, also added to the epic doc, or none>
Plan: <path>
```

## Revising

New information reopens a plan, whatever its Status. Change it in place and add a Decisions line: what was learned, and what changed. A revision during a build starts that line with `Way back:`.

Rows a revision adds or changes go through one map audit (step 10): give the auditor their test names, and it checks only those. A plan with no `Map audit:` line in Decisions, written before that step existed, gets a full one. A plan with no `Outcome confirmed` line that is not yet `In progress` gets the interview (step 3).

The founder must approve again only when the revision adds a one-way door. Dropping or weakening a criterion drawn from the issue's acceptance criteria, an interview answer or a business rule changes the founder's product decision, so it goes through the epic doc's Revising instead of being loosened quietly. Other criteria (repo rules, technical checks) are the agent's call, recorded.
