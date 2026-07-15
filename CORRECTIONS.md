# Corrections to the generated reference

Hand-maintained overlay for gaps the sync script **cannot** safely auto-fix. Separate
from `reference/` so it survives every upstream re-sync untouched.

Two sources feed this file:
1. `node scripts/detect-gaps.mjs` — lists enum props whose documented `Options` are
   incomplete but that sync left alone (a prop defined several times in one file, so
   example values can't be attributed to the right definition). Review each and record
   the correct per-variant values below.
2. Real friction while building dashboards — a wrong default, a renamed prop, a
   combination that doesn't work. Add it here with the symptom and the fix.

When a correction here contradicts a `reference/` table, **this file wins.**

---

## `labelPosition` — annotation components (`components/charts/annotations`)

The docs define `labelPosition` four times in one file with different valid values per
component; the sync script can't attribute example values, so its tables under-document
some variants. Correct value sets:

- **`ReferenceLine`**: `aboveStart, aboveCenter, aboveEnd, belowStart, belowCenter, belowEnd` (default `aboveEnd`). Also accepts `top, bottom, left, right, center` style aliases in examples.
- **`ReferenceArea`**: `topLeft, top, topRight, left, center, right, bottomLeft, bottom, bottomRight` (default `topLeft`).
- **`ReferencePoint`**: `top, right, bottom, left` plus the `above*/below*` and corner values seen in examples (`topLeft`, `bottomRight`, …).

If unsure, check the live component or try in `dev` — the chart ignores an invalid
position rather than erroring, so verify visually.

---

## Add corrections below

Keep each entry to: **what's wrong in the reference → the correct fact → (optional) how you found out.**
