#!/usr/bin/env bash
# refresh.sh — regenerate the reference from upstream docs, audit for enum gaps, and
# summarize what changed. Run this after the Evidence docs (sites/docs/pages) update.
#
#   ./scripts/refresh.sh                 # auto-locate sites/docs/pages (worktree is in the fork)
#   ./scripts/refresh.sh /path/to/pages  # explicit docs source (e.g. a distributed clone)
#
# GOTCHAS.md and CORRECTIONS.md are hand-maintained and NOT touched here.
set -euo pipefail

# Resolve this script's real location even when invoked via the ~/.claude symlink
# (cd -P resolves symlinked parent directories to their physical path).
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd -P "$SCRIPT_DIR/.." && pwd)"
cd "$SKILL_ROOT"

echo "▶ skill:  $SKILL_ROOT"
echo "▶ branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(not a git worktree)')"
echo

echo "== 1/3  regenerating reference/ (sync-docs.mjs) =="
node scripts/sync-docs.mjs "$@"
echo

echo "== 2/3  auditing enum gaps (detect-gaps.mjs) =="
node scripts/detect-gaps.mjs || true   # audit is informational; never fail the refresh
echo

echo "== 3/3  what changed =="
if git rev-parse --git-dir >/dev/null 2>&1; then
  changed="$(git status --porcelain -- reference/ | wc -l | tr -d ' ')"
  if [ "$changed" = "0" ]; then
    echo "reference/ is unchanged — docs already in sync."
  else
    echo "reference/ files changed: $changed"
    git --no-pager diff --stat -- reference/ | tail -20
    echo
    echo "Review, then commit:"
    echo "  git add -A && git commit -m 'refresh reference from upstream docs' && git push"
  fi
  echo
  echo "Reminder: any new enum gaps flagged above → add to CORRECTIONS.md (hand-maintained)."
else
  echo "(not a git worktree — skipping change summary)"
fi
