---
name: build
description: Build one task end to end without supervision - from its approved plan (planning it first if needed), have a separate agent write failing tests and gate them, implement until they pass without touching them, check the criteria and review the diff with a fresh agent, have another click through any screen change and screenshot it, open the PR, merge, deploy (a manual deploy at the founder's gate), run post-deploy checks and schedule delayed ones. Use when the user invokes it, asks to build, implement, ship or work on an issue or a plan under docs/plans/, or when a lane is told to build an issue.
argument-hint: "<issue number or plan path> [deploy pre-authorized]"
---

# Build

```
plan --> tests first --> gate --> build --> self-check --> review --> walk-through --> PR --> merge --> deploy --> post-deploy
core:task  test-writer   test-auditor                     reviewer   acceptance                         (gate if   immediate checks
map-auditor              (full track)                                (screen tasks)                     manual)    delayed: check issues
         <------------- new information: way back to the plan -------------
```

Past the plan's interview, the founder is not watching. What makes that safe: tests written before the code by an agent that will not write the code, a gate on those tests, code that must pass them unchanged, a review by an agent that wrote neither, and, for anything a user sees on screen, an agent that clicks through it and leaves screenshots for the founder to look at later.

The plan file is the shared state. Every stage reads it and writes to it, which is what lets a later session or another lane pick the work up.

## Agents

Spawn each with the Agent tool as a fresh agent, never a fork: a fork inherits this conversation, and a checker who read the author's reasoning inherits its blind spots. Give each only what its row lists. A fix round continues the same agents instead (Gate and Review).

| `subagent_type` | Gets |
| :- | :- |
| `core:test-writer` | plan path, Delivery's test commands, the closest existing test file as the style example |
| `core:test-auditor` | full track only: plan path, the test files, Delivery's test commands |
| `core:reviewer` | diff command, plan path, the plan's criteria that are not check-only, verbatim, the freeze commit and its files, Delivery's expected load |
| `core:acceptance` | plans with a `## Walk-through` only: plan path, issue number, Delivery's Walk-through line, a new evidence folder outside the repo, `${TMPDIR:-/tmp}/walk-<n>/` |

If an agent type is not found, spawn `general-purpose` with that agent's file as the brief: `${CLAUDE_PLUGIN_ROOT}/agents/<name>.md`, telling it the plugin root is `${CLAUDE_PLUGIN_ROOT}`. Pass the `model` and `effort` its frontmatter names: `general-purpose` would inherit this session's instead.

## Gates

Stop only for these. Everything else is decided, recorded under the plan's Decisions, and the work moves on.

- The task interview, while planning (the `task` skill's Interview).
- An open one-way door: impossible or costly to undo, and not settled by the epic (see the `task` skill).
- A Disputed criterion: it holds the merge for the founder's ruling. Merging is otherwise not a gate.
- A deploy that does not follow merge automatically, unless the prompt pre-authorizes it.
- Cannot continue without the founder; anything destructive; anything outside the repo.

The design also sets limits that end in a report: three gate rounds per task (counted across way backs), one review fix round, one walk-through fix round, two attempts at a red CI or a missed check, two trips back to the plan.

**As a lane** (the prompt says so), the founder is reached only through the lead: return a question instead of stopping on it, and stop before merging. The task interview is returned the same way, and planning resumes when the answers arrive.

## Where to start

| Given | Start at |
| :- | :- |
| The issue is open but its PR is merged: reopened after a rollback | Preflight, on a new branch (see Branch) |
| An issue or request with no plan | Preflight, which plans it |
| `Status: Draft` with `One-way (open)` or `Interview (open)` lines | Answers in the prompt or the plan: Preflight, and `core:task` records them. Else show them, each with its recommendation, and stop. |
| `Status: Draft` without them | Preflight: `core:task` finishes the plan. |
| `Status: Approved` | Preflight |
| `Status: In progress` | Resume. Compare the branch's commits with the plan: no freeze commit in Decisions means Tests first or Gate; otherwise the first unticked step. A step left half done is finished, not redone. |
| `Status: Done`, PR still a draft | Pull request: fill in the PR and mark it ready |
| `Status: Done`, PR ready for review | Pull request: wait for CI |
| `Status: Done`, PR merged, no post-deploy comment on it | Merge and deploy's deploy, if Delivery's deploy is manual and the live signal does not show this merge; then Post-deploy |
| `Status: Done`, otherwise | Nothing. Say so. |

## 1. Preflight

- **Fetch** first: `git fetch origin`. Everything below works from the remote's state.
- **Delivery.** In a lane, run the Delivery section's worktree setup before anything else, since planning may reproduce a bug or measure a baseline. No Delivery section: outside a lane, use the facts the plan's Context records; in a lane, stop as blocked and ask for `/core:setup`, since a lane without its own stack fights the main one for ports.
- **Branch.** Check out the task's branch, `<type>/<n>-<slug>`, from the remote if it exists there; else create it from `origin/<default branch>`. Type: `feat` for a feature, `fix` for a bug, `spike` for research, else `chore`. An issue reopened after a rollback never reuses its merged branch, which the revert undoes: create `<type>/<n>-<slug>-<k>` from `origin/<default branch>` and copy the plan in from the merged branch (`git checkout origin/<merged branch> -- <plan>`), so its decisions and way-back count survive.
- **Plan.** None, Draft, or reopened after a rollback: invoke `core:task` and follow it, on this branch. A rollback's revision starts with a `Way back:` line saying what the rollback showed. A one-way door there is a gate.
- Set `Status: In progress`, commit, push, and update the draft PR's body to match. Label the issue `gh issue edit <n> --add-label in-progress`, creating the label first with `gh label create in-progress --color 0052CC --force` if the repo lacks it, so status boards show the task as started.
- **Baseline.** Run the full suite. Tests already failing are recorded under Decisions as pre-existing and left out of every later "still green" check. Measure the performance baseline if the plan has one without a value.

## 2. Tests first

Spawn `core:test-writer`. It writes the Test map's tests and runs them. It does not see this conversation and does not write the code.

## 3. Gate

The Test map was audited when it was planned. This gate checks only that the tests are that map: each row written as stated, red for its reason, and sound.

1. **Red check.** Run each new test yourself. Each fails, and its output matches the reason in the Test map; guard rows pass. The rest of the suite is unchanged.
2. On the plan's full track (`Track:`), spawn `core:test-auditor`. On the light track, the red check is the gate, and the reviewer judges the tests' soundness (Review).
3. A FAIL from either: send the findings to the same `core:test-writer` with `SendMessage`, run the red check again, then, on the full track, send the same `core:test-auditor` its fix round. Both keep what they already read, so neither starts over, and they stay separate agents. One that cannot be continued (a new session) is spawned fresh, given the plan and the findings. Log every round under Decisions as `Gate round <k>: PASS | FAIL, <one line>`. Three rounds per task in all, counted across way backs: a way back does not restart them. A row that cannot be written as stated, or an interface the plan names wrongly: take the way back. A third FAIL: stop and report.
4. Gate passed: commit the test writer's files alone, as `Add failing tests for #<n>`. That commit is the freeze point, and every file in it is frozen, test support included; the build adds its own helpers in new files. Add to Decisions: `Tests frozen at <sha>: <files>. Gate: <n> red for the stated reasons; <auditor PASS | light track>, round <k>.`

## 4. Build

Take the plan's Steps in order. Steps change code only: opening the PR, merging and deploying are Pull request, Merge and deploy, and Post-deploy. For each:

- **Re-check the ladder before coding.** Needed at all? In the codebase? Standard library? Platform feature? Installed dependency? One line? Only then the minimum that works. A higher rung that holds replaces the step's code; if that changes the Approach, take the way back.
- **Do what the step says.** Unit tests for internals are welcome. Frozen files are not edited, renamed or skipped. A frozen test that is wrong is a way-back trigger.
- **New work found:** do it here when a criterion cannot pass without it, or when it is a defect in what this task builds: that is part of the task, not new work. Anything else is not built. It goes under the plan's `## Suggested follow-ups` only if it meets the follow-up bar (Pull request), one line with why it matters.
- **Check after the step.** Run the tests it touches. A break found now has one suspect.
- Tick the step in the plan, commit, push.

Do not stop to ask what the plan answers.

## 5. Self-check

Run every criterion's check (not the check-only ones), the full suite, lint and analysis, and `git diff <freeze> HEAD -- <frozen files>`, which must print nothing. Measure performance against the target with the plan's method.

Fix what fails before the review: a failure you could have caught costs a review round. Two attempts per failure. Still failing: a performance miss is a way back; anything else is reported as blocked.

## 6. Review

Spawn `core:reviewer` with `git diff origin/<default branch>...HEAD`. It checks the criteria, then the diff.

Check a finding's evidence before acting on it. Reviewers err too.

| Finding | Action |
| :- | :- |
| Criterion FAIL, evidence holds | Fix it. Never weaken or reinterpret the criterion. |
| Criterion FAIL, evidence wrong | Mark it Disputed, with both sides. It does not count as failing; it holds the merge for the founder's ruling. Continue. |
| Must fix or Fix here, case holds | Fix it. |
| Must fix or Fix here, case does not hold | Drop it; record why under Decisions. |
| Follow-up | Not fixed. Goes under the plan's suggested follow-ups, if it meets the follow-up bar (Pull request). |

After fixing, run the self-check again. Only when a Must fix held or a criterion failed, send the same `core:reviewer` its fix round with `SendMessage`: the Must fix items and criteria it should find fixed, on `git diff <sha before the fixes> HEAD`. One that cannot be continued (a new session) is spawned fresh, told it is a fix round, with the same. Fix here items alone end at the self-check. One fix round. Record each fix under Decisions: what failed, what changed.

Still failing after that round: when the plan is the cause, take the way back; otherwise report and stop.

## 7. Walk-through

Only when the plan has a `## Walk-through`. It runs after the review's fixes, on the final code, with nothing else using the local stack.

Spawn `core:acceptance`. It starts and seeds the app as Delivery's Walk-through line says, does each step as a user would, and judges a screenshot of each.

| Result | Action |
| :- | :- |
| PASS | Publish the evidence. |
| FAIL, the screen is wrong | Fix it, run the self-check, then send the same `core:acceptance` its fix round with `SendMessage`. One round. Still failing: report as blocked, with the screenshots. |
| FAIL, the agent misread the screen, or a step cannot apply as written | Mark it Disputed, with both sides and the screenshot. It holds the merge for the founder's ruling. |
| Not run (the app would not start, no driver) | Record why under Decisions and say so in the PR, so the founder knows to look by hand. Continue. |
| Noticed | A defect in lines this diff adds or changes is fixed here. The rest goes in the PR's Walk-through section for the founder. |

Log `Walk-through: PASS | FAIL | not run, <one line>` under Decisions.

**Publish the evidence** on the `evidence` branch, which holds only screenshots and is never merged:

1. `git fetch origin evidence`; then `git worktree add <tmp> origin/evidence`, or `git worktree add --orphan -b evidence <tmp>` when the branch does not exist yet.
2. Copy the evidence folder's `*.png` into `<tmp>/<n>/`, commit `Walk-through for #<n>`, `git push origin HEAD:evidence`. Rejected because another lane pushed first: `git pull --no-edit origin evidence`, then push again.
3. `git worktree remove <tmp>`.

## 8. Pull request

1. `git fetch` and merge `origin/<default branch>` in. Never rebase a pushed branch, never force-push. Rerun the suite if anything came in.
2. Hold the plan's `## Suggested follow-ups` to the follow-up bar. Each one costs the founder a decision, and a kept one a whole task. Keep an item only when all of these hold:
   - This task did not cause it, or fixing it here would need a new criterion. Everything else it caused is fixed here.
   - A user or the founder will hit it at Delivery's expected load, or it is a legal or security duty. A test that could be added, code that could be shared, or load past the expected one does not count.
   - No open issue tracks it and no earlier triage dropped it, unless this diff makes it worse. Search `gh issue list --state open --search '<words>'` and `gh pr list --state merged --label triaged --search '<words> in:comments'`.

   At most three, the worst `If we skip it` first. A note on how another issue should be built is not a follow-up: comment it on that issue and list it under `## Noted on other issues`. Log the count cut under Decisions as `Follow-ups cut: <n>`.
3. Set the plan's `Status: Done` on the branch, so the merge carries it and a revert undoes it. Push.
4. Fill in the task's draft PR, opened when the plan was written (`gh pr list --head <branch> --state open`; none: open one now), with `gh pr edit <pr> --body-file -` and the body below, then `gh pr ready <pr>`:

```markdown
<What it does, two or three sentences, in the product's language.>

Closes #<n> · Closes #<m>, for each `Joins #<m>` in the issue · Plan: `<path>`

## Criteria
| # | Criterion | Verdict | Evidence |
| :- | :- | :- | :- |

## Walk-through
<PASS | not run: why> · <k> steps on <web | iOS simulator | Android emulator>
| # | Step | Verdict | Screenshot |
| :- | :- | :- | :- |
| 1 | <step> | PASS | ![](https://github.com/<owner>/<repo>/blob/evidence/<n>/NN-<slug>.png?raw=true) |
Noticed: <defects outside the steps, each with its screenshot>

## Performance
<metric: before -> after, target>

## Suggested follow-ups
1. <item>. If we skip it: <consequence>.

## Noted on other issues
- #<m>: <what its build must know>
```

Leave out sections with nothing in them.

5. Wait for CI: `gh pr checks <pr> --watch`. Red: two attempts to fix it. A cause outside this diff (the default branch already red, a missing secret), or still red after two: report as blocked.

## 9. Merge and deploy

**A lane stops here** and reports (Report), to be resumed by the lead once merged.

Otherwise merge, unless a criterion is Disputed: then ask the founder for a ruling in one line. Just before merging, `git fetch` and check the branch contains the default branch: `git merge-base --is-ancestor origin/<default branch> origin/<branch>`. It does not: merge the default branch in again, as Pull request starts. Use the repo's usual merge method, as recent history shows. Deploy per Delivery: automatic on merge, a GitHub Action to watch, or a manual command behind the deploy gate. A manual deploy runs from a fresh detached checkout of the merged default branch (`git fetch`, `git worktree add --detach <tmp> origin/<default branch>`, removed after), never from a working checkout, which may be behind or hold unmerged work.

## 10. Post-deploy

Wait for Delivery's live signal. None known: post-deploy is not run; say so in the PR comment and the report, because checks against the old deploy would pass falsely.

Run the plan's immediate checks marked `build`, which include every check-only criterion only production shows. Comment the results on the PR, starting `Post-deploy:`. That comment marks this step done.

- **All pass:** file each delayed check as a `check` issue in the epic's milestone, under the repo's form headings, with absolute run dates counted from today and `Validates: #<n>`. File the checks marked `founder` the same way as one `check` issue run today, its How to check saying the founder runs it: `next` lists it for them, and it holds nothing. Add each Release line to the open `founder` issue titled `Check on real devices before the next release`, as `- [ ] #<n>: <check>`, filing that issue first if none is open.
- **One fails:** roll back per Delivery's Rollback line (a revert PR, merged and deployed the way this one was), reopen #<n> with a comment linking the rollback and the evidence, and report.

## 11. Way back

Stop building and revise the plan when:

- A step shows the Approach cannot work, or that a much simpler one exists.
- A criterion or a frozen test proves wrong or uncheckable.
- The gate finds a row that cannot be written as stated or an interface the plan names wrongly, or the review still fails after its round and the plan is the cause.
- A performance target is still missed after two attempts.
- The founder changes what they want.

Ordinary friction is not a trigger: a test that fails inside the approach gets fixed.

On a trigger: say what was learned in a line or two, invoke `core:task` to revise the plan in place (its Revising rules decide whether the founder must approve again), untick the steps the revision invalidates, and resume. A changed Test map goes back through Tests first and Gate, with a new freeze commit.

A revision that takes the task past the task skill's split limits (its Choose the approach: 15 Test map rows, one new outside service) is a split, not a revision: split it as that step says, keep the first piece in this plan, and say so in the report. Rebuilding an oversized task only grows it.

At most two trips per plan. Count the `Way back:` lines, so the count survives a new session. A third trigger means the problem is not understood: stop and report what each trip taught.

## 12. Report

One screen:

```
Built: #<n> <title> · <PR url> · <merged and deployed | ready to merge | blocked | failed>
Criteria: <passed>/<total>, <disputed> disputed (<review rounds> review rounds)
| # | Criterion | Verdict | Evidence |
Tests: <n> frozen at <sha>; gate round <k>
Performance: <metric before -> after, or none>
Walk-through: <PASS | FAIL | not run: why | none>, <k> steps, evidence on `evidence/<n>/`
Post-deploy: <immediate results, or not run: why>; checks filed: <#n on dates>
Suggested follow-ups: <at most three, numbered, one line each>; <n> cut
Plan revisions: <what was learned, what changed, or none>
Needs you: <question or dispute, with a recommended answer, or nothing>
```

A lane adds its branch and worktree path.

A `failed` task gives the work back: `gh issue edit <n> --remove-label in-progress`, so it shows as queued again. A `blocked` one keeps the label, since its branch resumes.
