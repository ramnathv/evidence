# Maintaining the evidence-dashboards skill

Authoritative record of how this skill is developed and distributed. (User-facing usage
is in `SKILL.md`; this file is for whoever maintains/extends the skill.)

## Where it lives — single source of truth

- The skill is the **`evidence-skill`** branch of the Evidence fork (`origin` =
  `github.com/ramnathv/evidence`). It's an **orphan branch** with the skill files at the
  branch **root** — so the branch itself is the distributable.
- That branch is checked out as a **git worktree** at, inside the fork:
  `.claude/skills/evidence-dashboards/`  (adjacent to `sites/docs/pages`).
- `~/.claude/skills/evidence-dashboards` is a **symlink** to that worktree.

Consequences (the whole point): there is **one physical copy**. Editing the skill while
building dashboards — in the fork (project-level auto-discovery) or in any other repo
(via the `~/.claude` symlink) — writes to the worktree. Maintaining = `git commit` +
`git push` on `evidence-skill`. Drift between "the copy I use" and "the copy I ship" is
structurally impossible.

## Files

| Path | Hand-maintained? | Notes |
|------|------------------|-------|
| `SKILL.md` | yes | Entry point Claude auto-loads. |
| `GOTCHAS.md` | yes | Version pins + pitfalls learned while building. Grows often. |
| `CORRECTIONS.md` | yes | Fixes where generated `reference/` is wrong/incomplete. Wins over `reference/`. |
| `reference/` | **no — generated** | `sync-docs.mjs` output. Never hand-edit. |
| `scripts/sync-docs.mjs` | yes | Transforms `sites/docs/pages` → `reference/`. |
| `scripts/detect-gaps.mjs` | yes | Audits enum gaps sync couldn't auto-fix. |
| `scripts/refresh.sh` | yes | sync + audit + change summary in one command. |
| `templates/CLAUDE.md` | yes | Appendable version-pin block for new projects. |
| `README.md` | yes | Install/distribution instructions for the branch. |

## Maintenance loop

- **GOTCHAS / CORRECTIONS** (the common case) — just edit and commit; they need nothing
  from the docs:
  ```bash
  git -C .claude/skills/evidence-dashboards commit -am "gotcha: ..." && git push
  ```
- **Refresh `reference/`** (rare — only when upstream docs change):
  ```bash
  ./scripts/refresh.sh          # from the skill folder; auto-locates sites/docs/pages
  # review, then: git add -A && git commit -m "refresh reference" && git push
  ```
  New enum gaps flagged by the audit → add a note to `CORRECTIONS.md`.

To pull fresh upstream docs first, update the fork's `next` (the main working tree stays
on `next`), then run `refresh.sh` — it reads `sites/docs/pages` from that tree.

## Footguns

- **Never `git clean -x` (or `-X`) in the fork.** The worktree is nested under the
  main tree's excluded `.claude/`; `-x` ignores excludes and would delete the worktree's
  working files. Commits are safe in `.git`, but you'd have to re-checkout.
- **Don't check out `evidence-skill` in the main tree** — git forbids the same branch in
  two worktrees anyway. Work on it only via this worktree.
- **Moving/deleting the worktree** dangles the `~/.claude` symlink. Remove it properly
  with `git worktree remove`, not `rm -rf`.
- `/.claude/` is in the fork's `.git/info/exclude` so `next` stays clean; keep it there.

## Recreate on a new machine

```bash
git clone https://github.com/ramnathv/evidence.git && cd evidence
git worktree add --orphan -b evidence-skill .claude/skills/evidence-dashboards  # if branch is local-only
# OR, if evidence-skill already exists on origin:
git worktree add .claude/skills/evidence-dashboards evidence-skill
printf '/.claude/\n' >> .git/info/exclude
ln -s "$PWD/.claude/skills/evidence-dashboards" ~/.claude/skills/evidence-dashboards
```

## Verify the symlink still loads

After any change to the install layout, open a fresh Claude session in *another* repo and
ask "what skills do you have available?" — `evidence-dashboards` should be listed.
