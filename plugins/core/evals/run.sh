#!/bin/sh
# Runs core's evals: each case is a real agent session against a fixture repo
# with a fake `gh`, so nothing reaches GitHub. Extra args pass through, e.g.
#   plugins/core/evals/run.sh --case 'next-*' --runs 3
set -eu
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"
exec claude plugin eval plugins/core \
  --scaffold --trust-plugin --no-publish \
  --allow-tools Bash Write Edit \
  --ablation none --concurrency 3 \
  "$@"
