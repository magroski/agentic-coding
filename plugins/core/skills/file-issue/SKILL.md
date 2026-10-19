---
name: file-issue
description: File a task as a GitHub issue written to one pattern - a product-level title, then What, Why, How, Definition of done, and When for dated work. Use when the user invokes it or asks to file, open, create, log or write up an issue, ticket or task, or to turn a finding, bug, plan step or TODO into one, even if they never say "issue".
argument-hint: "<what needs doing>"
---

# File issue

An issue has two readers. One decides whether it matters, and reads the Title, What and Why. The other builds it, and reads How and Definition of done. Product sections come first, so the first reader can stop early and still decide.

## 1. Gather

- **Read the source.** The request, the conversation behind it, and the code on the path of the change, enough to write How with real paths.
- **Look for a duplicate.** `gh issue list --search "<keywords>" --state all --limit 10`. A match for the same outcome: comment on it instead of filing, and say so in the report.
- **Ask what the sources cannot answer.** Usually the product impact or the date. One numbered batch, each question with a recommended default. Never invent a Why: a made-up impact misleads whoever prioritizes the issue. Called by another skill, the caller supplies these.

One issue per outcome that can ship and be verified alone. A request covering several gets several issues. Link them with `Blocked by #<n>` as the last line of How.

## 2. Write

### Title

What needs doing, in the product's language: the outcome a user or the business gets, not the code change. Imperative, under 70 characters.

| Code-level | Product-level |
| :- | :- |
| Add CSV endpoint to OrdersController | Let finance export orders to their ledger |
| Fix null token in SessionService | Keep users signed in after a password reset |
| Add index on orders.created_at | Load the orders page in under a second |

Work with no product face, e.g. a dependency update, keeps a plain technical title.

### Body

The repo has issue forms in `.github/ISSUE_TEMPLATE/`: write under the matching form's headings, so issues filed by agents and in the browser read the same. Place the content below where it fits: What and Why under the form's value or question heading, Definition of done under its acceptance or pass heading, How under its notes. No forms: use this pattern.

```markdown
## What
<Product-level. What changes, for whom. No class names or file paths.>

## Why
<Product-level. The impact once done: who benefits, what pain or cost goes away. Numbers when known.>

## How
<Technical. The approach, the files (`path:line`) and layers it touches, migrations, risks. Steps as a list when more than one. Unknowns marked as such; open options listed, not guessed between.>

## Definition of done
- [ ] <Pass/fail check someone else can run: an action and its result, a command, a query.>

## When
<Only for dated work, else omit the section. One line per date.>
```

- **Definition of done** is checks, not intent. "Export works" fails the bar; "Orders page → Export → October 2026 downloads one row per order" passes it.
- **When** uses absolute dates, so the issue reads the same next month. Convert "next Friday" from today's date.

| Kind | Line |
| :- | :- |
| Not before | `After YYYY-MM-DD` |
| On the day | `On YYYY-MM-DD` |
| Deadline | `By YYYY-MM-DD` |

### Example

Title: `Let finance export orders to their ledger`

```markdown
## What
Finance can download a month of orders from the Orders page as a CSV their ledger imports.

## Why
Finance retypes about 300 orders a month by hand: 6 hours of work, and the source of most reconciliation errors.

## How
- `OrderExportService` builds the CSV in the ledger's import format (columns: spec linked in #12).
- `GET /orders/export?month=YYYY-MM` in `app/orders/controller.ts:40` streams it through the service.
- Export button with a month picker on `OrdersPage`.

## Definition of done
- [ ] Orders page → Export → October 2026 downloads `orders-2026-10.csv`, one row per order.
- [ ] The file imports into the ledger with no errors.
- [ ] A month with no orders downloads a header-only file.
```

## 3. Label

If the repo's `CLAUDE.md` or `AGENTS.md` has an `## Issues` section, it wins: apply its type label and assignee rules. Without forms, the pattern's sections by type:

| Type | What | How | Definition of done | When |
| :- | :- | :- | :- | :- |
| `bug` | What happens, and what should | Cause if known; fix starts with a failing test | Reproduction now gives the expected result | - |
| `check` | The question | The query or command | The pass threshold | Run dates, `On YYYY-MM-DD` |
| `research` | The question | Method and timebox | Findings posted; follow-up issues filed | - |
| `founder` | The task | Steps, links, values to enter | What the founder confirms | Due, `By YYYY-MM-DD` |

No such section: add a label only when an existing one clearly fits (`gh label list`).

## 4. File

File without showing drafts first: an issue is easy to edit or close, and the report links each one. Show drafts for approval only when the user asks to review them.

```bash
gh issue create --title "<title>" --label <type> --body-file - <<'EOF'
<body>
EOF
```

An issue that belongs to an epic goes in its milestone: add `--milestone "<title>"`.

Not a GitHub repo, or `gh` not authenticated: print the issue as markdown, ready to paste, and say why it was not filed.

Report one line per issue: `#<n> <title> <url>`.
