---
name: next
description: Start the day on the current repo - read milestones, issues, PRs, due checks, plans in progress and untriaged follow-ups, run the checks that are due, and brief the founder in one screen on what needs them, what is moving and what is ready, grouped into parallel lanes. On the founder's go, act as team lead - run each lane as a background agent in its own worktree with the build skill, relay their questions, merge their PRs one at a time and see each deploy through. Use when the user invokes it, or asks what's next, what to work on, for a status or morning brief, or to run tasks in parallel.
argument-hint: "[merge and deploy pre-authorized]"
---

# Next

The founder's morning question, answered from the repo's own state, then turned into work. Scope: the current repo only.

## 1. Read the state

Fetch first, and read docs and plans from the remote, not the local checkout: lanes merge on GitHub, so a local branch is often behind.

```bash
git fetch origin --prune
gh api 'repos/{owner}/{repo}/milestones?state=open'
gh issue list --state open --limit 300 --json number,title,labels,milestone,body,assignees
gh pr list --state open --json number,title,headRefName,body,mergeStateStatus,statusCheckRollup
gh pr list --state merged --limit 30 --search '"Suggested follow-ups" in:body -label:triaged' --json number,title,body
gh pr list --state merged --limit 30 --search '"Plan:" in:body' --json number,body,comments
git branch -r
git worktree list
```

Also read, with `git show origin/<default branch>:<path>`:

- The roadmap and epic docs. The current epic is the first not `Done`, in roadmap order, else by its `NN` prefix.
- Business rules marked `assumed (#<n>)` in epic docs.
- The repo's `## Delivery` section, for health and observability sources.

A remote branch named `<type>/<n>-<slug>` with no merged PR holds task #<n>'s plan. Read it with `git show origin/<branch>:<path>`: its Status, its ticked steps, and any `One-way (open)` lines. `In progress`, or `Done` with no merged PR: started. It is in progress only while a lane of this session runs it; otherwise it was interrupted, and is ready to resume. `Draft` with open doors: Needs you. `Approved`: planned and waiting to be built.

## 2. Run the checks that are due

A `check` issue is due when one of its `Run on` dates is today or past, with no `Run YYYY-MM-DD:` comment for it. Run it read-only, as its How to check says. Comment `Run YYYY-MM-DD: PASS` or `FAIL` with the evidence. A FAIL opens a linked `bug`, unless the issue says where else it goes. Close the issue once its last date is recorded.

A check that needs the founder's hands or write access goes to Needs you.

Then finish interrupted post-deploys: for each merged PR with a `Plan:` line and no `Post-deploy:` comment, run the `build` skill on its issue. It resumes at deploy and post-deploy.

## 3. Close out epics

Task issues are an epic's `feature`, `chore`, `bug` and `research` issues. When every task issue in the current epic's milestone is closed and its doc is not `Done`, spawn a fresh `core:verifier` with the exit criteria that can be checked now, and the default branch and production as the output (if the type is not found: `general-purpose` with `agents/verifier.md`, two levels up from this skill's base directory, as the brief, with the `model` and `effort` its frontmatter names).

- All pass: offer the close-out under Needs you, as a docs-only PR setting the epic `Done`.
- A FAIL, or a criterion only the founder can check: under Needs you, with the evidence.

Close the milestone of any `Done` epic once it has no open issues left.

## 4. Find ready work

Ready: an open `feature`, `chore`, `bug` or `research` issue with no open `Blocked by #<n>`, whose dependencies in the epic's Order are closed, and that no lane of this session is building. A planned or interrupted task is ready: its lane resumes from the plan, through the build skill's Where to start. A green PR waiting only for merge goes under Needs you instead.

Group it into lanes, at most three unless the founder says otherwise. Two tasks share a lane, in dependency order, when one depends on the other or when they touch the same files or migrations: judge from their plans' Steps and Test map when plans exist, else from the issues and the epic doc. Bugs first, then the current epic's tasks in its Order, then the rest.

## 5. Brief

One screen. Leave out empty sections.

```
Next: <repo> · <date> · <epic> (<closed>/<total> tasks)

Checks run: #<n> PASS · #<n> FAIL -> bug #<m>
Needs you:
  1. #<n> (founder) blocks #<m>, #<k> · due <date>
  2. #<n>: one-way door: <decision>, recommend <choice>
  3. PR #<n> ready to merge · criterion 3 disputed: <both sides, briefly>
  4. Assumed rule BR<k> in <epic>: <rule>. Confirm?
  5. No Delivery section: run /core:setup before lanes
Ready, as lanes:
  A: #<n> <title> (resume: step <k>/<total>)
  B: #<n> <title> -> #<m> <title>
Follow-ups from merged PRs:
  PR #<n>: 1) <item> 2) <item>   file or drop?
Health: <new errors, failed deploys, or ok>
Recommend: <the next moves, in one or two lines>
```

## 6. Triage

The founder answers per item.

- **Follow-ups:** file each kept one with the `file-issue` skill, in the epic's milestone when it belongs to one. Comment the decisions on the PR and add the `triaged` label, creating it first with `gh label create triaged --color C5DEF5 --force` if the repo lacks it.
- **Assumed rules:** update the epic doc as its Revising section says.
- **One-way doors:** record the decision in the plan on the task's branch, as the `task` skill's Approve step says; the task becomes ready.
- **Ready PRs and the epic close-out:** the founder's yes is the merge approval. Run the `build` skill on the issue with merging pre-authorized for that PR: it brings the branch up to date if needed, waits for CI, merges, deploys and runs post-deploy. A close-out PR is opened and merged on the same yes.
- **Ideas** raised in the conversation: hand them to the `epic` skill.

## 7. Lead

On the founder's go, for the lanes they pick. No `## Delivery` section: launch nothing; it is under Needs you.

### Launch

One agent per lane, all in one message so they start together: Agent tool, `subagent_type: "general-purpose"`, `isolation: "worktree"`. They run in the background.

```
You are a lane in <repo>. Invoke the core:build skill for #<n>.
(This lane then builds #<m>, once #<n> is merged and you are resumed.)

- You cannot ask the founder. At a one-way door, or anything else that needs them,
  stop and report the question with your recommended answer.
- Stop before merging and report the PR as ready to merge. Merging, deploying and
  rolling back are the lead's, whatever the plan or the prompt says.
- On each way back, send the lead one line with SendMessage to "main": what the
  trip taught, and the Test map's row count before and after. Then carry on.
```

Its completion notice carries the worktree path and branch. A report can arrive as a handback or as a message; accept either.

### Relay

Batch the lanes' questions into one numbered message to the founder, each with its recommendation. Send each answer back with `SendMessage` to its lane, which resumes it where it stopped.

A lane's way-back line goes in the same batch, with a recommendation: carry on, or split the task when the trip grew its Test map. A split goes to the lane as a message, and the lane splits per the task skill's step 3.

### Merge, one at a time

As lanes report ready, take them in dependency order, else in the order they became ready:

1. **Up to date.** `git fetch origin`, then `git merge-base --is-ancestor origin/<default branch> origin/<branch>`. GitHub's own merge state reports a stale branch only under branch protection, so do not rely on it. Not an ancestor: resume the lane with `The default branch moved: merge it in, rerun the suite, push, wait for CI, report.` and take the next ready one meanwhile.
2. **Merge** at the gate, unless the founder pre-authorized merging and nothing is Disputed. The repo's usual merge method.
3. **Deploy** per Delivery: wait for the live signal. A manual deploy is its own gate, unless the founder pre-authorized deploying, and runs from a fresh checkout of the default branch, as the build skill's step 8 says.
4. **Resume the lane:** `Merged and deployed: run the build skill's post-deploy, then report. If this lane has a next issue, start it from the updated default branch.`
5. **Its immediate checks fail:** if merging was pre-authorized, roll back per Delivery's Rollback line and reopen the issue with a comment linking the rollback and the evidence; else put the rollback under Needs you. Hold the merge queue until it is settled.

Never rebase or force-push a lane's branch.

A lane that fails, or stops at one of the build skill's limits, is reported, not retried. A way back is reported as it happens (Relay).

### Finish

When every lane is merged, stopped or failed, report one screen: per lane, the PRs, their state, the checks filed and the suggested follow-ups, which go to triage. Remove the worktrees of merged lanes with `git worktree remove` once their agents have ended.
