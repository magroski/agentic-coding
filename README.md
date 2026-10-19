# agentic-coding

Personal Claude Code plugin marketplace. One repo, every project.

```
.claude-plugin/marketplace.json    catalog: lists every plugin
plugins/
  core/                            one plugin = one installable unit
    .claude-plugin/plugin.json     manifest
    skills/<name>/SKILL.md         invoked as /core:<name>
    agents/<name>.md               spawned as core:<name>
```

## Workflow

```
/core:setup   once per repo: issue types, labels, forms, and the Delivery facts every skill reads
/core:epic    product planning: outcome, business rules, metrics, scope -> epic doc, milestone, issues
/core:task    technical planning: approach, criteria, test map, post-deploy checks -> task plan
/core:build   one task: tests first, gated -> code -> verifier + reviewer -> PR -> merge -> deploy -> checks
/core:next    daily brief: due checks, what needs you, ready lanes; then leads lanes in parallel
/core:file-issue  one issue in the repo's format
```

Agents stop only at the gates: epic approval, one-way doors, merge, deploy, and anything blocked,
destructive or outside the repo. Merge and deploy can be pre-authorized in the prompt. Retries are
capped (two test-gate rounds, one review fix round, two trips back to the plan), then they report.
Design and decisions: [docs/plans/agentic-workflow/README.md](docs/plans/agentic-workflow/README.md).

## Use

This machine, all projects:

```bash
claude plugin marketplace add /path/to/agentic-coding
claude plugin install core@agentic-coding
```

Another machine:

```bash
claude plugin marketplace add magroski/agentic-coding
claude plugin install core@agentic-coding
```

One project only: add `--scope project` (committed, shared with the team) or
`--scope local` (git-ignored, yours alone) to `install`.

## Add a skill

Create `plugins/<plugin>/skills/<skill>/SKILL.md`:

```markdown
---
name: <skill>
description: What it does and when Claude should use it.
---

Instructions.
```

Other components go beside `skills/`: `agents/`, `commands/`, `hooks/hooks.json`, `.mcp.json`.

## Add a plugin

Split by audience: a plugin is the unit a project turns on or off.

1. Copy `plugins/core` to `plugins/<name>`, set `name` in its `plugin.json`.
2. Add an entry to `marketplace.json` with the same `name`.
3. `claude plugin validate .`

## Updates

| Marketplace added from | Edits arrive |
| :- | :- |
| Local path | Next session or `/reload-plugins`. Read in place, no copy. |
| GitHub | After push, on `claude plugin marketplace update agentic-coding`. |

`version` is omitted from `plugin.json` on purpose: each commit counts as a new
version. Setting it pins users until it is bumped. `validate` warns about this; ignore.
