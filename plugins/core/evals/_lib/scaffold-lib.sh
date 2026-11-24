#!/bin/sh
# Shared scaffold for core's evals. Sourced by a case's scaffold.sh with
# CASE_DIR set. Builds, in the sandbox only:
#   $HOME/.eval/origin.git   bare origin: main from _lib/ledger-repo/ with <case>/repo/
#                            laid over it, one branch per
#                            <case>/branches/<branch-with-__-for-/>/
#   ./ (the run's cwd)       a clone of it on main
#   $HOME/.eval/bin/gh       the gh stub, first on PATH via shell profiles
#   $HOME/.eval/fixtures     <case>/gh/*.json, served by the stub
set -eu
case "$HOME" in
  /private/tmp/*|/tmp/*|/private/var/*|/var/folders/*) ;;
  *) echo "refusing: HOME is not a sandbox ($HOME)" >&2; exit 1 ;;
esac
LIB_DIR="$(cd "$(dirname "$CASE_DIR")/_lib" && pwd)"
ev="$HOME/.eval"
ws="$PWD"
mkdir -p "$ev/bin" "$ev/fixtures"
cp "$LIB_DIR/gh-stub.sh" "$ev/bin/gh" && chmod +x "$ev/bin/gh"
[ -d "$CASE_DIR/gh" ] && cp "$CASE_DIR"/gh/*.json "$ev/fixtures/" 2>/dev/null || true
for rc in .zshrc .bashrc .profile .zshenv; do
  echo "export PATH=\"$ev/bin:\$PATH\"" >> "$HOME/$rc"
done

g() { git -c user.email=founder@example.com -c user.name=founder "$@"; }
git init -q --bare -b main "$ev/origin.git"
git init -q -b main
git config user.email founder@example.com && git config user.name founder
git remote add origin "$ev/origin.git"
cp -R "$LIB_DIR/ledger-repo/." .
[ -d "$CASE_DIR/repo" ] && cp -R "$CASE_DIR/repo/." .
g add -A && g commit -q -m "Initial state" && git push -q -u origin main
if [ -d "$CASE_DIR/branches" ]; then
  for b in "$CASE_DIR"/branches/*/; do
    name="$(basename "$b" | sed 's|__|/|g')"
    git checkout -q -b "$name" main
    cp -R "$b." .
    g add -A && g commit -q -m "Plan for $name" && git push -q origin "$name"
    git checkout -q main && git branch -q -D "$name"
  done
fi
git remote set-head origin main
touch .git/gh-calls.log
