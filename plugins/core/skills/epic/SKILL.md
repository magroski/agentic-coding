---
name: epic
description: Plan product work before any task is planned - a roadmap of epics or a single epic. Interviews the founder to find the real outcome, settles every business rule, success metric, limitation and scope cut as an explicit decision, writes a product-only epic doc, and on approval creates its GitHub milestone and one issue per task. Use when the user invokes it, or wants to plan, scope or rethink a product idea, feature set, milestone, phase, epic or roadmap, or asks what to build and why. Not for the technical plan of a single task; that is the task skill.
argument-hint: "<idea, epic, or path to an epic doc>"
---

# Epic

The product owner's half of planning: what to build, for whom, and how anyone will know it worked. Never how it is built. Stack, architecture and code belong to the `task` skill, which reads this doc's business rules as binding.

Two readers. The founder decides from it. A task planner, with none of this conversation, turns each task into code and must find every product rule here, not guess it.

Planning ends at the doc, its milestone and its issues.

## 1. Locate

| Given | Do |
| :- | :- |
| An idea, no roadmap | Ask whether it is one epic or several. Several: a roadmap README plus one doc per epic; detail the first, outline the rest. An outline stays `Status: Draft` and files nothing until it is planned in full here. |
| A new epic in a roadmap | A new `NN-<slug>.md` after the last. |
| An existing epic doc | Revise it in place (see Revising). |

Files: `docs/plans/<roadmap>/README.md` and `docs/plans/<roadmap>/NN-<slug>.md`. The repo's own convention wins.

## 2. Read

The roadmap and earlier epic docs, for format and standing decisions. Research docs. Open issues, and suggested follow-ups not yet triaged. Usage data, read-only. The product as its users see it. Code only to learn what users can do today.

## 3. Draft and test the problem

Write it early, so the reading and the questions have something to aim at. Who is hurt, by what, how badly. No solution in it: "we need a CSV export" is a solution; "finance retypes 300 orders a month because orders cannot leave the app" is a problem, and leaves room for a simpler answer.

Gather what could prove it wrong, not only what agrees. Sort each finding into supports, contradicts or unknown. Contradicted: redraft and test again. A sound plan for the wrong problem is the most expensive kind.

## 4. Interview

Ask until nothing that would change the outcome is unknown. One numbered batch per round, most outcome-changing first, each question with a recommended default, so the founder can reply `go` or `2: other answer`. Show the problem draft when the evidence leaves it open.

Cover:

- **Outcome.** What changes, for whom, and the one metric that shows it.
- **People.** Users, buyers, and anyone else who decides or is affected: partners, platforms, regulators.
- **Business rules.** Every limit, price, quota, time window, permission, state and transition the deliverable implies. Enumerate them yourself from the deliverable: the founder cannot rule on a rule nobody named, and a rule left out here gets guessed in a task plan.
- **Limitations.** Platform policies, law, cost ceilings, founder-only prerequisites (accounts, contracts, verifications) and their lead times.
- **Scope.** The smallest epic that proves the outcome. Cut until removing anything more would fail it. Each cut goes to Out of scope with its reason.
- **Order and gates.** What must be learned first, and the result that would stop or re-plan the epic.
- **Risks.** What could make the outcome fail even if every task ships, and what would show it early.

A technical question goes to the task that needs it. Only when its answer changes cost or feasibility enough to change a product decision does it become a `research` issue, and the tasks it decides get `Blocked by #<n>`.

Small unknowns are not questions. Decide and record them.

## 5. Confirm the key decisions

Before writing, show three numbered lists: the business rules, the scope (in and out), and the success metrics. The founder confirms each list explicitly. Approving a long doc is not the same as reading every rule in it, and these are the decisions that send work the wrong way.

## 6. Write

```markdown
# NN <Epic>

Status: Draft
Milestone: <link, once created> · Roadmap: [README](README.md)

## Outcome
Who can do what when this ships, and why it matters. One or two sentences.

## Deliverable
What a user can do when the epic ends, as a short scenario.

## Stakeholders
- <who>: <what they need, or decide>

## Business rules
BR1. <rule> | decided: founder YYYY-MM-DD

## Success metrics
M1. <metric> | target <value> | measured by <source> | <n> days after task <k> ships

## Limitations
Platform, legal, cost, and founder prerequisites (#<n>).

## Out of scope
- <item>: <reason>

## Order
<ASCII dependency diagram of the tasks>

## Tasks
1. **<Name>** (#<n>). What a user can do after it, in a paragraph. Covers BR1, BR3. Depends on —.

## Exit criteria
1. <criterion> | check: <command or inspection>

## Risks
- <risk>: <mitigation or gate>

## Decisions
- Q: <question> A: <answer>, because <reason> (founder, YYYY-MM-DD)
- Assumed: <assumption>
```

- **Tasks** are one PR each and deliver something verifiable alone. A task that only pays off once a later one lands is cut in the wrong place. Cut by size, not by surface: an API, the page that uses it and the setup they need are one task while it holds at most eight acceptance criteria and one new outside service (a sign-in provider, an e-mail sender). Past either, cut it. A piece with fewer than three criteria joins its neighbor: every task pays a full cycle of planning, tests, review, PR and deploy. Setup only the founder can do is a `founder` issue. Detail what can be detailed now; where a later task depends on what an earlier one teaches, outline it and name what must be learned.
- **No technical content:** no stack, architecture, file paths or library choices. Business rules say what must hold, not how.
- **Success metrics** each name the task that unlocks them; that task's plan turns the metric into a dated `check` issue.
- **Exit criteria** are pass/fail, each with its check, and cover the deliverable and the business rules. A metric that needs weeks to read stays a success metric.

A roadmap README holds the Problem, Evidence, Goal with criteria, Scope, an Epics table (`# | Epic | Delivers | Depends on | Doc`), Risks and Decisions. Its architecture diagram, if any, belongs to task planning: leave it as it is.

## 7. Confirm what will be filed

Only a doc whose business rules the founder confirmed (step 5), and whose every task is detailed or outlined with what must be learned, gets here. An outline epic stays `Draft`.

Show the summary, then everything approval will file, as it will be filed:

```
Epic: NN <title>
Outcome: <one line>
Business rules: <count>, all confirmed
Metrics: <one line each>
Founder prerequisites: <list>
Risks: <top 1-3>
Doc: <path>

Will file in milestone "<title>":
  1. feature: <issue title>
     After it: <what a user can do, one line>
     Acceptance: 1) <criterion> 2) <criterion>
     Covers BR1, BR3 · depends on — · blocked by F1
  F1. founder: <issue title> · blocks 1, 3
Then: the doc's docs-only PR, merged.
```

Ask for approval of that list. Apply each change the founder asks for to the doc, not only to the chat, and show the changed items again. Approving files exactly that list.

## 8. File

On approval. An epic is `Approved` only once its business rules are confirmed and its task issues are filed, so the status changes here, never earlier.

1. Create the milestone, or reuse the epic's if one exists, with the repo's title convention (e.g. `P1 Free plan, public`) and a description that links the doc's path on the default branch:
   `gh api repos/{owner}/{repo}/milestones -f title="<title>" -f description="<deliverable, one line>. Plan: <url>"`
2. File one issue per task in the milestone, with the `file-issue` skill, whose drafts this approval already covers: label `feature`, or `chore` when no user notices it; the repo form's headings; the acceptance criteria approved in step 7; Notes holding only the task number, its dependencies, and `Plan the task before building. Epic: <path>`. An outlined task also names what must be learned, and is `Blocked by` the task that teaches it. No code paths or technical approach: those are the task plan's.
3. File a `founder` issue for each founder prerequisite, and add `Blocked by #<n>` to the tasks it blocks.
4. Write the issue numbers into the doc's Tasks and the milestone link into its header. Set `Status: Approved` and add `- Approved by the founder on YYYY-MM-DD.` to Decisions.
5. Commit the doc on a `docs/<NN>-<slug>` branch and open a PR. The founder's approval of the doc covers merging this docs-only PR: merge it, so the milestone's link resolves.

Report one line per issue: `#<n> <title>`.

## Revising

New information reopens the doc, whatever its Status. Change it in place and add a Decisions line: what was learned, and what changed.

A change to the outcome, a business rule, the scope or a success metric needs the founder's approval again. Anything else does not.

Filing after a revision reuses the milestone and the issues that exist: file only new tasks, and edit the issues whose task changed. Confirm those as step 7 does first.

Business rules that task plans add as `assumed (#<n>)` are the founder's to confirm. Confirmed: change the line to `decided: founder YYYY-MM-DD`. Changed: revise the rule, and file a task or bug for any built work it now contradicts.
