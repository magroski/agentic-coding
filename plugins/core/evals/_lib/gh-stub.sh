#!/bin/sh
# Fake `gh` for evals. Logs every call to .git/gh-calls.log in the repo under
# test, answers reads from the case's fixtures, and acknowledges writes.
# Example: `gh issue view 12 --json body` prints fixtures/issue-12.json.
fx="$HOME/.eval/fixtures"
log="$(git rev-parse --git-dir 2>/dev/null || echo /dev/null)/gh-calls.log"
echo "$*" >> "$log"

serve() { if [ -f "$fx/$1" ]; then cat "$fx/$1"; else echo '[]'; fi; }
ack() { echo "https://github.com/acme/app/$1/99"; }

case "$1 $2" in
  "auth status") echo "Logged in to github.com account founder"; exit 0 ;;
  "repo view") serve repo.json ;;
  "label list") serve labels.json ;;
  "issue list") serve issues.json ;;
  "issue view") serve "issue-$3.json" ;;
  "pr list")
    case "$*" in *merged*) serve prs-merged.json ;; *) serve prs-open.json ;; esac ;;
  "pr view") serve "pr-$3.json" ;;
  "pr checks") echo "ci	pass	1m	https://ci" ;;
  "issue create") ack issues ;;
  "pr create") ack pull ;;
  "api "*)
    case "$*" in
      *-X*|*--method*|*" -f "*|*" -F "*) echo '{}' ;;
      *milestones*) serve milestones.json ;;
      *) echo '[]' ;;
    esac ;;
  *) : ;;
esac
exit 0
