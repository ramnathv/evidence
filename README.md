# evidence-dashboards — a Claude Code skill

A skill for building **Evidence** (evidence.dev) dashboards: de-noised copies of the
official docs, version gotchas, and prop tables generated from the docs.

This is the **`evidence-skill`** branch of an Evidence fork. It contains only the skill
(files at the repo root), so the branch *is* the distributable.

## Install

Copy this folder into your Claude skills directory:

```bash
# user-level (all repos):
git clone --branch evidence-skill --single-branch <this-fork-url> evidence-dashboards
mv evidence-dashboards ~/.claude/skills/evidence-dashboards
rm -rf ~/.claude/skills/evidence-dashboards/.git   # if you don't want it as a live checkout
```

Or, per-project, drop it in `<project>/.claude/skills/evidence-dashboards/`.

Then optionally append the version-pin block to a project's CLAUDE.md:

```bash
grep -q "evidence-dashboards skill" CLAUDE.md 2>/dev/null || \
  cat ~/.claude/skills/evidence-dashboards/templates/CLAUDE.md >> CLAUDE.md
```

## Contents

| Path | What |
|------|------|
| `SKILL.md` | Entry point: index + workflow (auto-loaded by Claude). |
| `GOTCHAS.md` | Version pins (Svelte 4 / Tailwind 3 / DuckDB) + hard-won pitfalls. |
| `CORRECTIONS.md` | Manual fixes where the generated reference is wrong/incomplete. |
| `reference/` | Transformed copies of the Evidence docs (generated — do not hand-edit). |
| `scripts/sync-docs.mjs` | Regenerate `reference/` from `sites/docs/pages`. |
| `scripts/detect-gaps.mjs` | Audit enum props the sync couldn't auto-fix. |
| `templates/CLAUDE.md` | Appendable version-pin block for new Evidence projects. |

## Maintenance

Maintained as a git worktree checked out inside the Evidence fork at
`.claude/skills/evidence-dashboards/`, so the docs are adjacent:

```bash
# refresh reference/ after upstream docs change (docs are auto-located in the fork):
node scripts/sync-docs.mjs
node scripts/detect-gaps.mjs        # → CORRECTIONS.md candidates
git add -A && git commit -m "..." && git push
```

`GOTCHAS.md` / `CORRECTIONS.md` are updated by hand as you build dashboards; they need
nothing from the docs.
