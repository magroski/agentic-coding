---
type: regex
pattern: 'pr create.*--draft|pr create.*-d '
match: contains
target:
  source: file
  path: .git/gh-calls.log
---
