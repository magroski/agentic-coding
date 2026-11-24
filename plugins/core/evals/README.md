# core evals

Regression tests for rules the pilots broke once. Each case is a real agent session (`claude plugin eval`) in a throwaway repo, with a fake `gh` that serves fixtures and logs every call, so nothing reaches GitHub.

```bash
plugins/core/evals/run.sh                      # every case, 3 runs each
plugins/core/evals/run.sh --runs 1             # quick pass, about $1.30 and 3 minutes
plugins/core/evals/run.sh --case 'next-*'      # some cases
```

Run before merging a change to `plugins/core`. Results land in `evals/results/` (git-ignored).

| Case | Guards | Broken on |
| :- | :- | :- |
| `next-epic-order` | `next` builds no task of an epic whose dependency is a Draft; triage drops test gaps and cleanup, files what users hit | 2026-10-21, 2026-10-27 |
| `next-fan-out` | tasks that depend only on the foundation run as separate lanes, never chained or joined | 2026-11-12 |
| `epic-outline` | an outline epic is never approved or filed, even when the founder asks | 2026-10-21 |
| `lane-interview` | a lane stops at the task interview with a Draft plan pushed and a `Needs you:` report; no tests, no code | 2026-10-21 |
| `map-auditor-bar` | the map auditor removes boilerplate rows and asks for nothing outside the closed list | 2026-10-20, 2026-10-27 |

`core:acceptance` has no case: inside an eval's OS sandbox on macOS, Chromium cannot start (its Mach port check is denied) and no local port can be opened. It was checked by hand on 2026-11-24 against this fixture with a real page, outside the sandbox: it walked the step, read the screenshot showing 8.69, and reported FAIL.

Not covered yet, because each needs several turns or a built task: the lead launching a fresh agent per task, the up-to-date check before a merge, a lane messaging the lead on each way back, the three gate rounds, splitting past 15 Test map rows, and worktree teardown naming its own compose project.

## How a case is built

```
_lib/scaffold-lib.sh   builds the run: bare origin + clone, branches, gh stub on PATH
_lib/gh-stub.sh        fake gh: reads from <case>/gh/*.json, writes only to .git/gh-calls.log
_lib/ledger-repo/      the base fixture repo every case starts from
<case>/repo/           files laid over the base repo
<case>/branches/<b>/   files committed on branch <b> (`__` stands for `/`)
<case>/gh/             fixtures: issues.json, issue-<n>.json, milestones.json, prs-open.json, prs-merged.json
<case>/graders/        regex, tool_used and llm graders
```

The stub reaches PATH through the sandbox HOME's shell profiles; project settings `env` does not apply inside an eval run. The scaffold refuses to run unless HOME is a temp directory.
