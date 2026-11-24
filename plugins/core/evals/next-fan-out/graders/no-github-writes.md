---
type: regex
pattern: '(issue (create|edit|close|comment)|pr (create|merge|comment|edit)|label create|api .*(-X|--method|-f ))'
match: not_contains
target:
  source: file
  path: .git/gh-calls.log
---
