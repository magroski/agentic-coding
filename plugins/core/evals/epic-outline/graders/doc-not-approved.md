---
type: regex
pattern: 'Status: Approved'
match: not_contains
target:
  source: file
  path: docs/plans/v1/02-invoices.md
---
