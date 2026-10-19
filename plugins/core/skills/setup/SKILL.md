---
name: setup
description: Set up the current repository for agent work - GitHub issues in six types (feature, chore, check, research, bug, founder) with labels, issue forms and conventions, plus a Delivery section in the repo's agent instructions recording how it is tested, deployed, rolled back, observed and measured, which the task, build and next skills read. Safe to re-run; it updates rather than duplicates. Use when the user invokes it, or asks to set up a repo for agents, standardize issue types, labels or templates, or record how a repo is tested and deployed.
argument-hint: "[founder GitHub login]"
---

# Setup

Later sessions need two things from a repo that they cannot guess: how work is tracked, and how it is tested and shipped. Setup writes both into the repo, so every session and every parallel lane reads the same facts. Re-running updates them in place.

Every piece of work becomes a GitHub issue with exactly one of six type labels: feature, chore, check, research, bug, founder. Labels classify, issue forms ask each type for what it needs, and a conventions section tells later sessions how to use them.

Types are labels, not GitHub's native issue types. Native types exist only in organization repos and are defined for the whole organization. Labels work in every repo, filter the same way, and change nothing outside it.

## 1. Preflight

```bash
gh auth status
gh repo view --json nameWithOwner,hasIssuesEnabled,viewerPermission,defaultBranchRef
```

- Not a GitHub repo, or `gh` not authenticated: stop and say what is missing.
- `viewerPermission` is `READ` or `TRIAGE`: stop. Creating labels needs write access.
- Issues disabled: enable them with `gh repo edit --enable-issues`.

Founder login: the argument, else `gh api user --jq .login`.

## 2. Look before writing

```bash
gh label list --limit 200 --json name,description
ls .github/ISSUE_TEMPLATE/
```

Also read `CLAUDE.md` or `AGENTS.md`, if present, including any `## Delivery` section.

Resolve overlaps without asking; both are easy to undo, and the report lists them:

- **Label for the same type under another name** (`enhancement`, `type: bug`): `gh label edit <old> --name <type>`, which keeps it on its issues.
- **Template for the same type** (`bug_report.md`): delete it, else both appear in the chooser. Git keeps it.

Leave every other label and template alone.

## 3. Labels

Apply renames first, so `create` then updates the renamed label. `--force` updates a label that exists, which makes re-runs safe.

```bash
gh label create <label> --color <color> --description "<description>" --force
```

| Label | Color | Description |
| :- | :- | :- |
| `feature` | `0E8A16` | Task that delivers product value |
| `chore` | `BFD4F2` | Small maintenance or change, e.g. dependency update |
| `check` | `FBCA04` | Query to run on set dates to validate a piece of work |
| `research` | `5319E7` | Deep research before work can be defined (spike) |
| `bug` | `D73A4A` | Broken behavior to fix |
| `founder` | `D93F0B` | Task only the founder can do, by hand |
| `triaged` | `C5DEF5` | PR whose suggested follow-ups were filed or dropped |

## 4. Issue forms

Copy the six forms in this skill's `templates/` directory into `.github/ISSUE_TEMPLATE/`. Replace `FOUNDER_LOGIN` in `founder.yml` with the founder's login.

`templates/config.yml` turns off blank issues, so every issue filed in the browser picks a type. Copy it too, unless the repo has one: then set only `blank_issues_enabled: false` in it and keep the rest.

## 5. Delivery

The `task`, `build` and `next` skills run unattended and read this section instead of guessing commands. A wrong fact here sends every lane the wrong way, so detect what the repo shows and ask only for the rest.

| Fact | Where to look |
| :- | :- |
| Test, lint, analyse | `package.json`, `composer.json`, `Makefile`, `pyproject.toml` scripts; the CI workflow steps |
| End-to-end | Playwright or Cypress config; none is a valid answer |
| Local stack | `compose.yaml`, `docker-compose.yml`, `Makefile`, README |
| Worktree setup | git-ignored files the stack needs (`.env`), host port knobs in the compose file |
| Deploy | deploy jobs in `.github/workflows`, `.vercel`, `vercel.json`, Railway or Fly config, README |
| Live signal | health endpoints, deploy status commands (`gh run watch`, `vercel inspect`, `railway status`) |
| Rollback | the platform's previous-deploy command, else a revert PR |
| Observability | Sentry config, log access, read-only database access |
| Performance | existing scripts or configs (Lighthouse, k6), `EXPLAIN ANALYZE` access |
| Expected load | README, plans; else ask |

Ask the founder only for what the repo cannot show (expected load, rollback, often the live signal), in one numbered batch, each with a recommended default. A fact the founder cannot give yet is written `unknown`: skills that need it skip that step and report it, rather than guess.

Write the section to `AGENTS.md` if the repo uses it, else `CLAUDE.md`, created if missing. Replace an existing `## Delivery` section. One line per fact; a repo with several apps gets one sub-line per app.

```markdown
## Delivery

- Test: <unit> · <api or feature> · <end-to-end, or none>
- Lint and analyse: <commands>
- Local stack: <command to start; command to run things inside it>
- Worktree setup: <commands a fresh worktree needs, e.g. `cp ../../../.env .env`, `*_PORT=0`>
- Deploy: <app>: <auto on merge to main | GitHub Action `<name>` | manual: <command>>; live when <signal>
- Rollback: <app>: <command, or revert PR>
- Health: <URL or command>
- Observability: <Sentry projects, logs, database read access>
- Performance: api <method> · page <method> · database <method>
- Expected load: <users and requests, so review judges scale against it>
```

## 6. Conventions

Later sessions follow the types only if told. Add the section below to the same file as Delivery. Replace an existing `## Issues` section, carrying over its repo-specific lines that this one does not cover, such as a milestone naming rule. Replace `FOUNDER_LOGIN`.

```markdown
## Issues

Work is tracked in GitHub issues. Each issue has exactly one type label:

| Label | For |
| :- | :- |
| `feature` | Task that delivers product value |
| `chore` | Small maintenance or change, e.g. dependency update, accent color |
| `check` | Query to run on set dates to validate work, e.g. is DB load stable after the last change? |
| `research` | Deep research before work can be defined; a spike, e.g. how do competitors handle X? |
| `bug` | Broken behavior to fix |
| `founder` | Task only the founder can do, by hand, e.g. buy a domain, configure DNS |

- File with `gh issue create --label <type>`. Write the body under the headings of the matching form in `.github/ISSUE_TEMPLATE/`, so every issue reads the same.
- `feature` or `chore`: if a user notices something new, it is a `feature`.
- `check`: `Run on` lists dates, one `YYYY-MM-DD` per line. Record each run as a comment starting `Run YYYY-MM-DD: PASS` or `FAIL`, with the evidence. A date is due when it is today or past and has no such comment. A FAIL opens a linked `bug`. Close once the last date is recorded.
- `research`: post findings as a comment, open the issues they lead to and link them, then close.
- `founder`: assigned to @FOUNDER_LOGIN. Agents never do these; they may write the steps. Work blocked on one gets `Blocked by #<n>` in its body.
- Epics are milestones. Every task issue sits in its epic's milestone, and the milestone description links the epic doc.
- A PR lists work it found but did not do under `## Suggested follow-ups`. Once each is filed or dropped, the PR gets the `triaged` label.
```

## 7. Untyped issues

```bash
gh issue list --state open --limit 500 --json number,title,labels
```

Give each open issue with none of the six type labels one type, with `gh issue edit <n> --add-label <type>`, and list them in the report: number, title, type, one-line reason. A label is easy to change.

## 8. Commit

Commit the forms and the agent instructions on a `chore/setup` branch, push, and open a PR. Other skills read Delivery from the default branch, so it counts only once merged. Merging is the founder's gate, unless pre-authorized.

## 9. Report

One screen:

```
Setup: <owner/repo>
Labels: <created | updated | renamed old -> new>
Forms: <paths written or deleted>
Conventions and Delivery: <file>
Delivery unknowns: <facts left unknown, or none>
Typed: <table>, or none untyped
Founder: @<login>
PR: <url>, <merged | waiting on your merge>. Forms and Delivery take effect once merged.
```
