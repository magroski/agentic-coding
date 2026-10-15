---
name: setup-issues
description: Set up the current repository's GitHub issues to track work in six types - feature, chore, check, research, bug, founder - with labels, issue forms, and a conventions section in the repo's agent instructions so later sessions file and work issues the same way. Safe to re-run; it updates rather than duplicates. Use when the user invokes it or asks to set up or standardize GitHub issue types, labels or templates for a repo.
argument-hint: "[founder GitHub login]"
---

# Setup issues

Every piece of work becomes a GitHub issue with exactly one of six type labels: feature, chore, check, research, bug, founder.

Three parts make the types stick: labels to classify, issue forms that ask each type for what it needs, and a conventions section that tells later sessions how to use them. Setup writes all three. Re-running updates them in place.

Types are labels, not GitHub's native issue types. Native types exist only in organization repos and are defined for the whole organization. Labels work in every repo, filter the same way, and change nothing outside it.

## 1. Preflight

```bash
gh auth status
gh repo view --json nameWithOwner,hasIssuesEnabled,viewerPermission,defaultBranchRef
```

- Not a GitHub repo, or `gh` not authenticated: stop and say what is missing.
- `viewerPermission` is `READ` or `TRIAGE`: stop. Creating labels needs write access.
- Issues disabled: ask before `gh repo edit --enable-issues`.

Founder login: the argument, else `gh api user --jq .login`.

## 2. Look before writing

```bash
gh label list --limit 200 --json name,description
ls .github/ISSUE_TEMPLATE/
```

Also read `CLAUDE.md` or `AGENTS.md`, if present.

Ask only about overlaps, in one numbered message, each with a recommended default:

- **Label for the same type under another name** (`enhancement`, `type: bug`): recommend `gh label edit <old> --name <type>`, which keeps it on its issues.
- **Template for the same type** (`bug_report.md`): recommend deleting it, else both appear in the chooser.

Leave every other label and template alone, unmentioned. No overlaps: continue without stopping.

## 3. Labels

Apply approved renames first, so `create` then updates the renamed label. `--force` updates a label that exists, which makes re-runs safe.

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

## 4. Issue forms

Copy the six forms in this skill's `templates/` directory into `.github/ISSUE_TEMPLATE/`. Replace `FOUNDER_LOGIN` in `founder.yml` with the founder's login.

`templates/config.yml` turns off blank issues, so every issue filed in the browser picks a type. Copy it too, unless the repo has one: then set only `blank_issues_enabled: false` in it and keep the rest.

## 5. Conventions

Later sessions follow the types only if told. Add the section below to the repo's agent instructions: `AGENTS.md` if the repo uses it, else `CLAUDE.md`, created if missing. Replace an existing `## Issues` section. Replace `FOUNDER_LOGIN`.

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
```

## 6. Untyped issues

```bash
gh issue list --state open --limit 500 --json number,title,labels
```

For open issues with none of the six labels, propose one type each in a table: number, title, type, one-line reason. Apply after approval with `gh issue edit <n> --add-label <type>`. None: skip.

## 7. Report

One screen:

```
Issues set up: <owner/repo>
Labels: <created | updated | renamed old -> new>
Forms: <paths written or deleted>
Conventions: <file>
Typed: <n issues>, or none untyped
Founder: @<login>
Pending: commit and push to <default branch>. Forms appear only from there.
```
