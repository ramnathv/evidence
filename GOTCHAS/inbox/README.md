# GOTCHAS inbox

Drop-box for newly discovered gotchas. **One file per finding, never edit an existing
one.** Fragments here are periodically folded into `GOTCHAS.md` (or a companion file) by
a consolidation pass, then deleted.

## Why this exists

`~/.claude/skills/evidence-dashboards` is a symlink into a single shared worktree, so
**every Claude session using this skill writes to the same physical files** — including
sessions running in unrelated repos. Two sessions editing `GOTCHAS.md` directly can clobber
each other's work, and a careless `git add -A` in one session commits another's half-finished
research. Append-only fragments with unique names make both structurally impossible.

Nothing in this directory is in the skill's always-read path — `SKILL.md` and `GOTCHAS.md`
do not link to the fragments, so they cost no context until someone consolidates.

## Writing a fragment

Filename: `YYYY-MM-DD-<session>-<slug>.md`

`<session>` is your session id if you know it (the short token from the session URL), else
any short random token. It exists only to guarantee two sessions never pick the same name —
**do not reuse another fragment's token, and do not edit a file you did not create.**

```markdown
---
target: GOTCHAS | advanced-components | slide-decks | CORRECTIONS
verified: how you actually confirmed this — the command or procedure you ran
versions: evidence@40.1.8, core-components@5.4.2   # whatever is relevant
date: 2026-07-25
---

**Symptom** — what you observed, concretely.

**Cause** — the mechanism, with `file.svelte` / function references if you found them.

**Fix** — what to do instead.
```

`verified:` is the field that matters and the one most likely to be skipped. GOTCHAS.md is
trusted precisely because its claims were tested, not inferred — the base-path section was
only correctable because someone built a project twice under two `basePath` values and read
the emitted HTML. If you did not verify, say so explicitly:

```
verified: NOT VERIFIED — observed once in one project, mechanism inferred from source
```

An honest unverified fragment is useful. An unverified fragment that reads as verified
launders a guess into an always-read file, and the next session has no way to tell.

## Consolidating

Trigger: **5+ fragments, or before any push that touches `GOTCHAS.md`.** Don't let these
accumulate — an unbounded inbox is the dated append-log this skill already retired once
(see `82540ac67`, `46a2d0a17`), just at file granularity.

The pass, in one session:

1. Read every fragment. Group by `target`.
2. **Distill into the relevant themed section** — do not append a running log. If a fragment
   contradicts existing text, verify which is right before overwriting; the existing text may
   itself have been empirically established.
3. Demote anything deep or occasional to `advanced-components.md` / `slide-decks.md`.
   `GOTCHAS.md` is read on every task — keep it lean.
4. Carry `verified:`/`versions:` context into the prose where a future reader would otherwise
   doubt the claim. Drop `NOT VERIFIED` fragments, or verify them first — never promote one
   silently.
5. `git rm` the consolidated fragments in the same commit that adds their content, so the
   inbox is self-evidently empty of already-promoted material.

Stage explicit paths (`git add GOTCHAS.md GOTCHAS/inbox/…`). Never `git add -A` or
`git commit -am` here — another session may have work in flight.
