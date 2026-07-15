---
name: evidence-dashboards
description: >-
  Build dashboards, reports, and data apps with Evidence (evidence.dev) — the
  open-source BI-as-code framework. Use whenever creating or editing Evidence
  pages (`pages/**/*.md`), writing DuckDB SQL queries for a dashboard, adding
  Evidence components (BarChart, LineChart, DataTable, BigValue, Value, inputs,
  maps), configuring data sources, theming, or authoring custom Svelte
  components/plugins for Evidence. Triggers: "evidence dashboard", "evidence.dev",
  "BI as code", ".md page with charts and SQL", "DataTable/BigValue/BarChart".
---

# Building dashboards with Evidence

Evidence is BI-as-code: dashboards are **markdown pages** that embed **DuckDB SQL
queries** and **components**. This skill bundles a de-noised copy of the official
Evidence docs (in `reference/`) plus version-specific gotchas the docs don't cover.

## Read this first

1. **`GOTCHAS.md`** — always read it before writing a page or component. It pins the
   framework versions (Svelte **4**, Tailwind **3**, DuckDB SQL) and lists the syntax
   traps. Getting the Svelte/Tailwind version wrong is the #1 failure mode.
2. **`CORRECTIONS.md`** — hand-maintained fixes for places the generated `reference/`
   is wrong or incomplete. If it contradicts a `reference/` table, CORRECTIONS wins.
3. Then open the specific `reference/` file(s) for what you're building (index below).

## Setting up a new Evidence project

Append this skill's `templates/CLAUDE.md` block to the project root's CLAUDE.md so the
version pins and a pointer to this skill are always in context (CLAUDE.md is
unconditional; skill invocation is heuristic). **Append, never overwrite** — the repo
may already have a CLAUDE.md. This is idempotent (skips if already present) and creates
the file if missing:

```bash
TPL=~/.claude/skills/evidence-dashboards/templates/CLAUDE.md   # adjust if project-level
grep -q "evidence-dashboards skill" CLAUDE.md 2>/dev/null || cat "$TPL" >> CLAUDE.md
```

## How an Evidence page works (the 30-second model)

- A page is `pages/<route>.md`. It renders as a route in the app.
- Add data with a **named SQL fence** (DuckDB dialect):
  ````markdown
  ```sql sales_by_month
  select date_trunc('month', order_date) as month, sum(sales) as sales
  from needful_things.orders group by 1 order by 1
  ```
  ````
- Use the result by **query name in braces**, with **unquoted props**:
  ```markdown
  <BarChart data={sales_by_month} x=month y=sales yFmt=usd0 />
  ```
- Chain queries with `${other_query}`, interpolate text with `{query[0].col}` or `<Value/>`.

See `reference/core-concepts/` for the full model; `GOTCHAS.md` for the syntax rules.

## Reference index — read on demand

Depth lives in `reference/` (transformed copies of the docs — safe to read, do not
hand-edit). Jump straight to what you need:

### Core concepts — `reference/core-concepts/`
`queries` · `data-sources` · `components` · `syntax` · `pages` · `templated-pages` ·
`loops` · `if-else` · `filters` · `formatting` · `query-functions` · `themes` · `exports`

### Charts — `reference/components/charts/`
`bar-chart` · `line-chart` · `area-chart` · `scatter-plot` · `bubble-chart` ·
`histogram` · `box-plot` · `heatmap` · `calendar-heatmap` · `funnel-chart` ·
`sankey-diagram` · `sparkline` · `mixed-type-charts` · `annotations` ·
`custom-echarts` · `echarts-options`

### Data display — `reference/components/data/`
`data-table` · `big-value` · `value` · `delta`

### Inputs (interactivity) — `reference/components/inputs/`
`dropdown` · `date-input` · `date-range` · `text-input` · `slider` · `checkbox` ·
`button-group` · `dimension-grid`

### UI & layout — `reference/components/ui/`
`grid` · `tabs` · `accordion` · `alert` · `note` · `info` · `details` · `modal` ·
`link` · `link-button` · `big-link` · `image` · `embed` · `download-data` ·
`last-refreshed` · `print-format-components`

### Maps — `reference/components/maps/`
`base-map` · `area-map` · `bubble-map` · `point-map` · `us-map`

### Other — `reference/`
`install-evidence/` · `build-your-first-app/` · `guides/` (best-practices,
chart-cheat-sheet, troubleshooting) · `deployment/` · `plugins/` (custom
components & sources) · `reference/` (cli, markdown, layouts)

## Component prop reference

Each component's reference file lists its props as a **markdown table**
(`Prop | Description | Options | Default`) — that's the authoritative prop API, and
the `Options` column is where valid enum values live (check it before guessing a value).
The sync script generates these tables from the docs' `<PropListing>` components;
`<PropListing>` itself is a docs-only component — never put it in an actual page.

A `_(+examples: …)_` marker in an Options cell means the docs' enum was incomplete and
the sync script recovered those extra valid values from the docs' own code examples —
they are safe to use. For props the script couldn't auto-correct, check `CORRECTIONS.md`.

## Keeping the reference current

`reference/` is generated from `sites/docs/pages` by `scripts/sync-docs.mjs`. After the
upstream docs are synced, regenerate and review the diff:

```bash
node scripts/sync-docs.mjs      # regenerate reference/ (run from the skill folder)
git diff reference/             # see exactly what upstream changed
node scripts/detect-gaps.mjs    # audit: enum props sync couldn't auto-fix → CORRECTIONS.md candidates
```

The script strips docs-only render blocks and site chrome, converts each component's
`<PropListing>` props into a markdown table, and augments incomplete `Options` enums
from the docs' own examples (the `_(+examples: …)_` marker). It never touches
`sites/docs/pages`. `GOTCHAS.md`, `CORRECTIONS.md`, and this file are hand-maintained —
the script leaves them alone.
