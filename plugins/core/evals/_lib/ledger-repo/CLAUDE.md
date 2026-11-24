# Ledger

Invoicing app for small studios. Next.js on Vercel, Postgres.

## Delivery

- Test: `npm test` (node --test) · end-to-end: none
- Lint and analyse: `npm run lint`
- Local stack: none
- Worktree setup: `npm ci`
- Worktree teardown: none without a local stack
- Deploy: web: auto on merge to main (Vercel); live when the Vercel deployment for the merge commit is Ready
- Rollback: web: revert PR
- Health: `curl -fsS https://ledger.example.com/api/health`
- Observability: Sentry project ledger-web
- Performance: page Lighthouse · database EXPLAIN ANALYZE
- Expected load: 40 studios, under 5 requests per second

## Issues

Work is tracked in GitHub issues. Each issue has exactly one type label: `feature`, `chore`, `check`, `research`, `bug`, `founder`.

- Every issue but a `founder` one also has exactly one role label: `role:dev`.
- `founder`: assigned to @founder. Work blocked on one gets `Blocked by #<n>` in its body.
- Epics are milestones. Every task issue sits in its epic's milestone, and the milestone description links the epic doc.
- A PR lists work it found but did not do under `## Suggested follow-ups`. Once each is filed or dropped, the PR gets the `triaged` label.
