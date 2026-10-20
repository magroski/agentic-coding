# Agentic workflow v2

Status: In progress

## Problem

The `core` plugin has one `plan` skill for both product and code planning, so epic docs carry stack and architecture choices, while product rules get "Assumed" inside task plans (beauty-booking `01-core-model-and-availability.md`: 2-hour notice, 60-day horizon, 15-minute grid). Agents run alone, but the tests they trust are written by the same agent that writes the code, review creates more work than the task needs, and tasks spawn tasks of unclear product value. Nothing answers "what's next" or runs parallel tasks.

## Evidence

- Supports: `docs/plans/v1/01-free-plan.md` (beauty-booking) decides Sanctum vs JWT, Vercel region and Filament MFA inside an epic doc.
- Supports: the same repo's task plan lists business rules under Decisions as "Assumed", never surfaced as decisions.
- Supports: `deliver` writes tests first only for bugs; `verify`'s reviewer checks criteria, not correctness, risk or scale.
- Supports: founder's account of review over-reach and task sprawl (2026-10-19).
- Unknown: whether a plugin agent can be invoked as `subagent_type: "core:<name>"`, and how the lead gets a lane's worktree path. Slice 00 settles both.

## Goal

The founder plans epics as product decisions, and agents take each task from issue to verified production change unattended, stopping only at the gates.

1. Five skills exist (`epic`, `task`, `build`, `next`, `setup`) plus `file-issue`; `plan`, `deliver`, `verify`, `setup-issues` are gone, and no file references them | check: `ls plugins/core/skills`; `grep -rn "core:plan\|core:deliver\|core:verify\|setup-issues" plugins README.md`
2. `claude plugin validate .` passes; `marketplace.json` and `README.md` list only plugins that exist | check: run it; read both
3. On beauty-booking, `/core:epic` revising epic 02 yields a doc with no stack, architecture or code paths, every business rule numbered with who decided it, and each success metric tied to the task that unlocks it | check: read the doc
4. On beauty-booking, `/core:task` on a P1 issue yields a plan whose Test map covers every criterion that is not check-only, and every business rule it had to assume is also added to the epic doc marked `assumed (#n)` | check: read both files
5. A pilot `/core:build` leaves, in order: a test-only commit, a gate log in the plan, implementation commits that leave the frozen tests unchanged, a review split into Must fix and Suggested follow-ups, and a PR with both | check: `git log --stat`; `git diff <freeze> HEAD -- <gate tests>` is empty; read the PR
6. `/core:next` on beauty-booking prints one screen with due checks, founder blockers, open PRs, ready tasks grouped into lanes, and follow-ups to triage | check: run it on 2026-10-20 (check #56 is due; #54 blocks #59)
7. Two lanes run in parallel worktrees, each opens a PR, and the lead merges them one at a time with no force push | check: `gh pr view` timelines; no `force-pushed` events
8. No skill stops for anything but the gates below, blocked work, destructive actions, the limits this design sets (gate rounds, one review fix round, two attempts, two trips back), and the conversations the founder starts on purpose (the epic interview, `next`'s brief, triage and go) | check: fresh reviewer reads every SKILL.md for stop points

## Scope

In: the five skills, four plugin agents, `file-issue` alignment, README and marketplace cleanup.

Out: hooks (frozen tests are enforced by a diff check instead); mods; a standalone `verify` for arbitrary work; mobile store releases beyond what a repo's Delivery section describes.

## Gates

The only stops. Everything else is the agent's call, recorded under Decisions.

| Gate | Where | Skippable |
| :- | :- | :- |
| Epic plan approval | `epic` | no |
| One-way door: costly or impossible to undo (data model with live data, destructive migration, public contract others consume, auth model, framework, database, payment provider, money, legal, privacy) | any skill | no |
| Merge to default branch | `build`, `next` | yes, pre-authorized in the prompt |
| Production deploy (when not automatic on merge) | `build`, `next` | yes, pre-authorized in the prompt |
| Blocked: cannot continue without the founder; destructive; outside the repo | any skill | no |

Two-way doors (a library behind an adapter, an additive migration, internal APIs, UI, a constant) are decided with the ladder and recorded.

## Architecture

```
                       /core:next  (daily, current repo)
        reads milestones, issues, PRs, due checks, plans, follow-ups, health
                 │ idea            │ ready task           │ due check
                 ▼                 ▼                      ▼
           /core:epic         lead mode               runs it, comments
           product doc        N lanes, one worktree   Run YYYY-MM-DD: PASS|FAIL
           milestone          each, background        FAIL → bug
           issues                  │
                                   ▼
                              /core:build #n ──────────────────────────────┐
                                   │ no plan? /core:task #n                │
                                   ▼                                       │
       tests first ─► gate ─► code ─► self-check ─► review ─► PR ─► (lead) merge ─► deploy ─► post-deploy
       test-writer   test-auditor                 verifier                                   immediate checks
                                                  reviewer                                   delayed → check issue
```

Agents (plugin `agents/`, fresh context, given only their brief):

| Agent | Tools | Job |
| :- | :- | :- |
| `test-writer` | Read, Grep, Glob, Edit, Write, Bash | Writes the plan's Test map as failing tests. No implementation code. |
| `test-auditor` | Read, Grep, Glob, Bash | Gates the tests: coverage, right red, would catch a wrong implementation. |
| `verifier` | Read, Grep, Glob, Bash | PASS/FAIL per criterion with evidence. Today's `verify` brief. |
| `reviewer` | Read, Grep, Glob, Bash | Adversarial review bounded to the diff. ponytail-review order and output. |

Nesting: main → lane → agent is two levels; the default limit is three.

Files and GitHub:

```
docs/plans/<roadmap>/README.md     roadmap (optional): problem, goal, epics table, architecture diagram
docs/plans/<roadmap>/NN-<epic>.md  epic doc   ↔ GitHub milestone "PNN <Epic>", description links the doc
docs/plans/<roadmap>/NN-<task>.md  task plan  ↔ issue #n in that milestone, body links the plan
```

Repos with another convention keep theirs. GitHub holds status (issue open/closed, PRs, milestone progress); plan files hold detail and step ticks.

## Skills

### `setup` (merges `setup-issues`)

Run once per repo, safe to re-run.

1. Issues: today's `setup-issues` (six type labels, forms, `## Issues` conventions), plus a `triaged` label and the line "every task issue sits in its epic's milestone".
2. Delivery: detect from the repo (package files, `compose.yaml`, `.github/workflows`, `.railway`, `.vercel`), ask only what is missing, write `## Delivery` in CLAUDE.md:

```markdown
## Delivery
- Test: <unit> · <api/feature> · <e2e, or none>
- Lint and analyse: <commands>
- Local stack: <command>
- Worktree setup: <commands, e.g. cp .env; *_PORT=0>
- Deploy: <app>: <auto on merge to main | GitHub Action <name> | manual>; live when <signal>
- Rollback: <revert PR | platform rollback command>
- Health: <URL or command>
- Observability: <Sentry projects, logs, DB read access, metrics>
- Performance: api <tool> · page <tool> · db <tool>
- Expected load: <users/requests, for review>
```

### `epic` (product planning)

Mindset: product owner. Sources: roadmap, earlier epic docs, research docs, issues, usage data read-only, and the founder. Code only to learn what users can do today, never how to build.

1. Locate: new roadmap, new epic, or revision of an existing doc.
2. Interview until nothing outcome-changing is unknown (Karpathy): draft the problem without a solution, test it against evidence (Boris steps 1-3), then numbered question rounds with defaults, most outcome-changing first. Covers: who it is for and who decides, the outcome and its metric, every business rule (limits, prices, quotas, time windows, permissions, states), limitations (platform, law, cost, founder-only prerequisites), the smallest scope that proves the outcome, order, risks and kill gates.
3. Make the founder confirm key decisions explicitly: the business rules list and the scope cut, each one shown and confirmed, not implied by approving the doc.
4. Technical questions found while planning go to the task that needs them, unless one changes cost or feasibility enough to change the product decision; then it becomes a `research` issue that blocks the epic.
5. Write the doc. On approval, create the milestone, file one issue per task (repo form headings: Value, Acceptance criteria, Notes linking the doc), and file `founder` issues for founder-only prerequisites.

```markdown
# NN <Epic>

Status: Draft | Approved | In progress | Done
Milestone: <link> · Roadmap: <link>

## Outcome
## Deliverable
## Stakeholders
- <who>: <what they need or decide>
## Business rules
BR1. <rule> | decided: founder YYYY-MM-DD | assumed (#n)
## Success metrics
M1. <metric> | target | measured by | when, relative to ship | unlocked by task <k>
## Limitations
## Out of scope
## Order
<ASCII dependency diagram>
## Tasks
1. **<Name>** (#n). Product-level paragraph. Covers BR1, BR3. Depends on <k>.
## Exit criteria
1. <criterion> | check: <command or inspection>
## Risks
## Decisions
```

A task is one PR and verifiable alone. Founder-only tasks are `founder` issues, not tasks.

### `task` (technical planning)

Mindset: tech lead. Input: an issue, or an ad-hoc bug or chore. Sources: the issue, its epic doc (business rules), CLAUDE.md rules and Delivery, the code path and its tests, infra config, data read-only, git history.

1. Read, then run the ladder per part (rungs 2-5 need a search):
   1. Needs to exist? 2. In the codebase? 3. Standard library? 4. Platform feature? 5. Installed dependency? 6. One line? 7. The minimum that works.
   Never cut validation, security, accessibility, layer boundaries.
2. Goal: the issue's acceptance criteria and the business rules it covers, made pass/fail, each with a check. Criteria that only production can show (migrates, deploys) are `check-only`.
3. Test map: each criterion → named tests at the highest level the repo supports (e2e, api, unit), given/when/then, and why each fails before the build. Happy, sad, edge only where there is branching, a boundary or a rule.
4. Performance, only when the task can move a metric or the issue sets a target: metric, baseline measured now, target, method.
5. Post-deploy: immediate checks, and delayed ones (question, method, pass when, run dates relative to deploy).
6. A business rule the epic doc lacks: a two-way door is assumed, recorded, and appended to the epic doc as `assumed (#n)`; a one-way door stops.
7. Approval: no one-way door → `Status: Approved`, with the line `Auto-approved: no one-way doors`. Otherwise list them and stop.

Format: today's `plan` Change template (`01-core-model-and-availability.md` is the example), with `Issue:`, plus `## Test map`, `## Performance`, `## Post-deploy`, and the frozen test commit recorded under Decisions once built.

```markdown
## Test map
| C | Test | Level | Red before build because |
| :- | :- | :- | :- |
| 1 | FreeSlotsTest: buffer blocks next booking | unit | FreeSlots does not exist |
```

### `build` (execute one task)

Input: an issue or a plan path. Resume rules from `deliver` (Status, ticks, working tree). Way back and its two-trip limit kept from `deliver`.

1. Preflight: no approved plan → `/core:task`. Branch (or the lane's worktree, after Delivery's worktree setup). `Status: In progress`. Suite green on base. Performance baseline if planned.
2. Tests first: `test-writer` gets the Goal, Test map, business rules, the Approach's public interfaces, and Delivery's test commands. Commit the tests alone: `Add failing tests for #n`. That commit is the freeze point.
3. Gate: every gate test runs and fails, with output matching its stated reason (a failure for any other reason does not count); the rest of the suite stays green; `test-auditor` confirms each criterion is covered, names one plausible wrong implementation each test catches, and flags tautologies, mocking the unit under test, and nondeterminism. Fail → `test-writer` fixes, at most two rounds, then way back. Log the result under Decisions.
4. Build: Steps in order, ladder per step, tick each, run touched tests. Frozen tests stay unchanged: `git diff <freeze> -- <gate tests>` is empty; needing a change is a way-back trigger. New work found: in the task only if a criterion needs it; else a suggested follow-up.
5. Self-check: every Goal check, full suite, lint, performance against target.
6. Review: `verifier` (criteria, plus the frozen-test diff) and `reviewer` in parallel, fresh. Fixed in the task only: failed criteria, and bugs, security holes, data loss or breakage at expected load that this diff introduces, each with a concrete failing case. Everything else → suggested follow-ups. One fix round; a fresh `verifier` re-checks all criteria and the `reviewer` checks only the fix diff. Still failing → report.
7. PR: merge the default branch in (never rebase, so no force push), open the PR with summary, criteria table, `## Suggested follow-ups`, `Closes #n`. A follow-up that affects a future issue is also commented there. CI green.
8. Merge and deploy: gate unless pre-authorized. As a lane, stop here and report to the lead.
9. Post-deploy: wait for Delivery's live signal; run the immediate checks; file a `check` issue for the delayed ones with absolute dates. An immediate check fails: if merge was pre-authorized, revert and report; else stop with the revert ready.
10. Close: `Status: Done` lands in the PR itself, so a revert undoes it. Epic close-out (verifier on exit criteria checkable now, then `Done`) is `next`'s, once every task issue in the milestone is closed.
11. Report, one screen: criteria verdicts, review rounds, performance before and after, follow-ups, checks scheduled, plan revisions.

### `next` (daily brief and team lead)

Scope: the current repo.

1. Read: roadmap and epic docs (current epic: first not Done in order), open issues by milestone and label, open PRs and CI, plans `In progress`, due `check` issues, merged PRs with follow-ups not labeled `triaged`, Delivery's health sources.
2. Run due checks (read-only), comment `Run YYYY-MM-DD: PASS|FAIL` with evidence, file a linked `bug` on FAIL.
3. Brief, one screen:

```
Next: <repo> · <date> · <epic> (<done>/<total> tasks)
Checks run: #56 PASS
Needs you: #54 (founder) blocks #59 · PR #73 awaits merge · <one-way door from a lane>
In progress: #61 step 3/6
Ready, as lanes: A #59 sign-in · B #62 agenda   (no shared files or migrations)
Follow-ups: PR #72: 1) ... 2) ...   file or drop?
Health: <new errors, failed deploys>
Recommend: merge #73, launch A and B
```

4. Follow-ups: the founder says file or drop per item; file with `file-issue`, comment the decision on the PR, label it `triaged`.
5. Ideas raised in the conversation → `/core:epic`.
6. Lead mode, on the founder's go: one background agent per lane with `isolation: "worktree"`, prompt "You are a lane: run `/core:build #n`; stop before merge; return a question instead of guessing at a one-way door". Up to three lanes unless told otherwise. Questions from lanes are batched to the founder; answers go back with `SendMessage`. As PRs turn green: merge one at a time in dependency order (gate unless pre-authorized), wait for the deploy and its immediate checks, merge the default branch into the remaining PRs, then resume each merged lane to run its post-deploy steps. A lane that fails or takes a way back is reported, not retried.

### `file-issue`

Kept. Repo issue forms win over its What/Why/How pattern (beauty-booking uses the form headings), and an issue that belongs to an epic gets `--milestone`.

## Breakdown

| # | Slice | Delivers | Depends on |
| :- | :- | :- | :- |
| 00 | Spike | Plugin agent invocation by `core:<name>`, nested spawn from a background worktree lane, `SendMessage` to a finished lane, worktree path returned; results under Decisions | - |
| 01 | `setup` | Delivery section on beauty-booking; `setup-issues` folded in | - |
| 02 | `task` | Task plans with Test map; criterion 4 | 01 |
| 03 | `build` + agents | Test-first gate, bounded review, PR, post-deploy; criterion 5 | 00, 02 |
| 04 | `epic` | Product-only epic docs, milestone and issues; criterion 3 | - |
| 05 | `next` | Brief, check runs, follow-up triage, lead mode; criteria 6, 7 | 00, 03 |
| 06 | Cleanup | Old skills removed, `file-issue` aligned, README and marketplace fixed; criteria 1, 2, 8 | 01-05 |

Pilot runs on beauty-booking happen on branches; which issues to pilot and whether to merge them are the founder's call at the time.

## Risks

- Plugin agents can't be invoked by scoped name: fall back to `general-purpose` with each brief inlined in the skill, as `verify` does today.
- A lane needs a permission the main session hasn't granted: prompts surface in the main session; run `fewer-permission-prompts` after the pilot.
- Lanes touch the same files: conflicts surface when the default branch is merged in; the lane is resumed to resolve them.
- Test-writer tests depend on interface names that the build later changes: the plan's Approach names public interfaces; a change is a way back, recorded.

## Decisions

- Q: One planning skill or two? A: two, `epic` and `task`, because product and code planning need different questions and sources (founder, 2026-10-19).
- Q: Where is work tracked? A: GitHub issues for status, plan files for detail, linked both ways.
- Q: Levels? A: epic and task, plus an optional roadmap doc listing epics.
- Q: Epic in GitHub? A: a milestone, because the interface lists it apart from issues.
- Q: Who writes the tests? A: a separate agent, from the plan, before any code; the gate is enough, the founder does not review tests.
- Q: How far does review go? A: failed criteria and Must-fix defects introduced by the diff; the rest are follow-ups; one fix round.
- Q: New work found mid-task? A: done in the task only if it is clearly required for the task; else a suggested follow-up in the summary and PR.
- Q: When is a task done? A: merged, deployed, immediate checks passing; delayed measurement is a `check` issue.
- Q: When do agents stop? A: only at the gates above. One-way doors stop; two-way doors are decided by the ladder (founder, 2026-10-19).
- Q: Cross-task technical decisions? A: decided by the first task that needs them; durable rules move to the repo's CLAUDE.md; the roadmap keeps only the architecture diagram.
- Q: Follow-ups persistence? A: task summary, PR body, and a comment on any future issue they affect; `next` triages them.
- Q: Merge order? A: next lane merges only after the previous deploy is healthy.
- Q: Names? A: `epic`, `task`, `build`, `next`, `setup`; `file-issue` stays.
- Assumed: branches are updated by merging the default branch in, not rebasing, so no force push (global CLAUDE.md).
- Assumed: standalone `verify` is dropped; `verifier` covers tasks and epics.
- Assumed: an immediate post-deploy failure is reverted automatically only when merge was pre-authorized.
- Assumed: up to three lanes by default.
- Assumed: the ladder is copied into `task`, `build` and `reviewer` rather than shared, since skills cannot include each other.
- Assumed: `triaged` label marks PRs whose follow-ups were decided.
- Assumed: format examples are beauty-booking's `docs/plans/v1/README.md`, `01-free-plan.md`, `01-core-model-and-availability.md` and issue #58.
- Approved by the founder on 2026-10-19.
- Pilot finding (2026-10-20): a lane spent three hours on #59 (sign-in: a new API context, web routes and pages, production config on two platforms) and wrote no implementation. The gate failed twice, each time after two fix rounds and with real security holes, and each failure took a way back that grew the Test map from 30 to 45 rows; nobody heard until the end. Causes: no size limit on a task, gate rounds restarting after each way back, every audit starting from scratch, wrong builds the plan could have named left to the auditor, and `next` reporting a way back only at its limit, which drifted from this doc's lead mode ("a lane that fails or takes a way back is reported"). Changes: `task` and `epic` split a task at more than one deploy target, more than one new outside service, or 15 Test map rows; the Test map gains a `Rules out` column and attack rows for trust-boundary criteria; three test audits per task in all, counted across way backs; the first audit is the full one and fix rounds fail only on new security or data-loss gaps; a way back that pushes a task past the split limits splits it; tests never use one value for two inputs; a lane messages the lead on each way back. Thresholds are first guesses, to tune on later pilots.
- Built 00-06 on branch `agentic-workflow-v2` (2026-10-19). Changes from the design while building: the gate accepts a red test whose output matches its stated reason, since a unit test of a class not yet written can only fail with "class not found"; plan `Done` and the epic tick ride in the task's PR so a revert undoes them, and epic close-out moved to `next`; `epic` files the milestone and issues first, then merges the doc in one docs-only PR covered by the founder's approval; `task` may split a too-big task into more issues in the same milestone; `next` also surfaces `assumed (#n)` business rules for the founder to confirm. Criteria 3-7 wait on pilot runs in beauty-booking.
- Verify round 3 (2026-10-19, fresh reviewer on 932879d): 8 of 9 round-2 fixes hold. Fixed after it, without a further independent check: a Test map row whose behavior already works is a `guard` that must pass before the build, since a bug fix adding a refusal could otherwise never clear the gate; a rebuild after a rollback branches first, copies the plan from the merged branch and revises it there; `next` treats a started task as interrupted unless a lane of this session runs it, offers it as a lane to resume, and finishes merged PRs that lack a `Post-deploy:` comment; a triage merge runs `build` with merging pre-authorized, so a stale branch is brought up to date first; a manual deploy runs from a fresh detached checkout of the default branch.
- Verify round 2 (2026-10-19, fresh verifier and fix-round reviewer): criteria 1, 2 pass; 15 of 16 fixes confirmed. Fixed after it, without a further independent check: `setup` commits and opens its own PR; a pre-authorized manual deploy is not gated in `next`; the up-to-date check before a merge uses `git merge-base --is-ancestor`, since GitHub reports `BEHIND` only under branch protection (private free repos have none); a pushed plan that is `Approved` counts as ready, not in progress; `build` resumes `Done`-without-PR at 7.3 and runs a pending manual deploy before post-deploy; a lane runs worktree setup before planning; a task reopened after a rollback gets a new branch and a `Way back:` revision; each criterion's tests must fail both "always succeeds" and "always refuses". Next to the epic close-out: `next` triage now applies one-way door answers, ready-PR merges and close-out PRs.
- Verify round 1 (2026-10-19, fresh verifier and a fresh consistency reviewer): criteria 1 and 2 pass. Criterion 8 failed on stops the approved design itself sets (review and way-back limits, `next` waiting for the founder's go); its wording was wrong, not the skills, so it now names them (founder told). Real stops it found were removed: `setup` now enables issues, resolves label and template overlaps and types untyped issues without asking; `file-issue` files without showing drafts and comments on duplicates. Fixed from the review: `next`, `task` and `build` fetch and read from the remote; `task` commits and pushes the plan on the task branch, so lanes and `next` see it; open one-way doors are written into the plan as `One-way (open)`; older plans without a Test map are revised before building, and plan Steps never merge or deploy; check-only criteria go to post-deploy, not the verifier; the auditor judges "catches a wrong build" per criterion and knows pre-existing failures; resume after `Done` continues to merge or post-deploy, marked by a `Post-deploy:` PR comment; a lane without a Delivery section stops; CI and self-check fixes get two attempts; a Disputed criterion continues but holds the merge, even when pre-authorized; the fix-round reviewer gets the Must fix list; the lead checks a PR is up to date before merging and resumes two-task lanes; a rollback follows Delivery's Rollback line and reopens the issue; the verifier's format example and the epic-doc tick were dropped as unread; `next` finds untriaged PRs by their follow-ups heading. SKILL.md files are the source of truth for behavior; this doc keeps the why.
- Spike 00 (2026-10-19, Claude Code 2.1.303): a plugin agent is invoked as `subagent_type: "<plugin>:<agent>"` and its `tools` list holds, so the agents ship as `core:test-writer` and siblings. A background `isolation: "worktree"` lane runs in `.claude/worktrees/agent-<id>` on branch `worktree-agent-<id>`, its subagents inherit that directory, and its completion notice carries `worktreePath` and `worktreeBranch`. `SendMessage` to a finished lane resumes it in the same worktree. A lane's report can arrive as a handback or as a `SendMessage`; the lead accepts either. The worktree stays locked while the lane's session lives. Lanes create their own `<type>/<n>-<slug>` branch for the PR.
