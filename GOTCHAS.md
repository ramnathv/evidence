# Evidence Gotchas & Version Pins

Hand-maintained. This is the knowledge the upstream docs **cannot** give you: version
constraints and the mistakes an LLM makes by defaulting to newer framework idioms.
Read this before writing any Evidence page or custom component.

Pinned versions in this repo (Evidence **v40.1.8**):

| Thing   | Version  | Consequence |
|---------|----------|-------------|
| Svelte  | **4.2.19** | No runes. Use Svelte 4 idioms. |
| Tailwind| **3.4.18** | Config-file based, not CSS-first. |
| Node    | **>=18**   | — |
| SQL     | DuckDB dialect | Queries are DuckDB, not Postgres/BigQuery. |

---

## Svelte 4 — NOT Svelte 5

When writing custom components (`.svelte` files) or component plugins:

- **No runes.** Do NOT use `$state`, `$derived`, `$props`, `$effect`, `$bindable`.
  These are Svelte 5 and will break.
- Props: `export let foo;` — not `let { foo } = $props()`.
- Reactivity: `$: doubled = count * 2;` — not `$derived`.
- **A function call in a `$:` statement must take its reactive inputs as ARGUMENTS.**
  Svelte tracks dependencies by the variables *named in the statement*, not by looking
  inside the function. `$: kind = pick();` (where `pick` reads `rows` from closure) has **no
  tracked deps** → it runs once, too early, when `rows` is still `undefined` → throws.
  Fix: `$: kind = pick(rows, cols);` so Svelte orders it after `rows`/`cols` are assigned.
- Local state: plain `let count = 0;` — not `$state`.
- Side effects: `onMount`, `afterUpdate`, or `$:` blocks — not `$effect`.
- Stores: `import { writable } from 'svelte/store'` and `$store` auto-subscription.
- Event handlers: `on:click={...}` — not the Svelte 5 `onclick={...}` attribute form.
- Slots: `<slot name="x" />` and `<div slot="x">` — not Svelte 5 snippets (`{#snippet}` / `{@render}`).

## Tailwind 3 — NOT Tailwind 4

- Config lives in `tailwind.config.js` with `content`, `theme.extend`, `plugins` —
  NOT the Tailwind 4 CSS-first `@theme { }` block.
- Directives are `@tailwind base; @tailwind components; @tailwind utilities;` —
  NOT the Tailwind 4 single `@import "tailwindcss";`.
- No `@utility` / `@variant` at-rules (those are v4).
- Arbitrary values work (`w-[327px]`), but there is no v4 dynamic spacing scale.
- Only classes emitted by Evidence's preset are available; don't assume v4-only utilities.

---

## Evidence markdown syntax gotchas

Evidence pages are **markdown files** (`pages/**/*.md`) that mix markdown, SQL fences,
and component tags. Rules that trip people up:

- **Component props are unquoted for simple values:** `x=month`, `y=sales`, `type=stacked100`.
  Use quotes only for strings with spaces: `title="Sales by Category"`.
- **Data is passed by query name in curly braces:** `data={sales_by_category}` — the name
  refers to a SQL block on the same page, not a JS variable or a file path.
- **A SQL query is a fenced block with a name right after the backticks:**
  ````markdown
  ```sql sales_by_category
  select category, sum(sales) as sales from needful_things.orders group by 1
  ```
  ````
  The name after `sql` is required; that name is what `data={...}` references.
- **Query chaining:** reference another query inside SQL with `${other_query}`.
- **Text interpolation:** `{sales_by_category[0].sales}` or use `<Value/>` for formatted output.
- **`fmt` props** control formatting (e.g. `yFmt=usd0`, `fmt=pct1`); see `reference/core-concepts/formatting`.

## Input value access depends on the input TYPE

How you read a selected input value (`{inputs.name…}` in markdown, `${inputs.name…}` in
SQL) is **not uniform** — it varies by component. Using `.value` on a component that
returns a bare scalar (or vice-versa) silently yields `undefined`/`[object Object]` and
breaks the query or text. Match the component:

| Input | Access | Notes |
|-------|--------|-------|
| **Slider** | `inputs.name` | **bare scalar** — NOT `.value`. It has no `.value`, so `.value` yields `undefined`. |
| **ButtonGroup** | `inputs.name` | bare scalar. |
| **TextInput** | `inputs.name` | **bare** — the docs' own SQL example uses `'{inputs.name}'` bare, and empirically `.value` does NOT work. (The prop-table row saying `.value` is misleading — ignore it.) Separately, `.search('col')` is a fuzzy-match method returning a 0–1 score for use in `ORDER BY`. |
| **Dropdown** | `inputs.name.value` | object; also `.label`. Multi-select returns a **list** → use `where col in ${inputs.name.value}` (no quotes, `IN` not `like`). |
| **DateInput** (single) | `inputs.name.value` | object. |
| **DateRange** / DateInput (range) | `inputs.name.start`, `inputs.name.end` | object with two fields. |
| **Checkbox** | `inputs.name` (boolean) | used **bare** as a SQL boolean, e.g. `where not ${inputs.name}` (docs' filter examples). Prop table also lists `.value`; both are the boolean. |
| **DimensionGrid** | `${inputs.name}` | **not a value — a whole SQL condition** (e.g. `category = 'X' and channel = 'Y'`). Drop it straight into a `where`/`filter`. Returns `true` when nothing is selected, so it composes: `where ${inputs.name} and <more>`. |

Rule of thumb: **Slider, ButtonGroup, TextInput → bare**; **Dropdown, DateInput →
`.value`**; **DateRange → `.start`/`.end`**; **Checkbox → bare boolean**; **DimensionGrid
→ bare, and it's a full condition**. When unsure, open the input's
`reference/components/inputs/<name>/index.md` and copy the exact `${inputs.…}` from its
**filtering / `where`** example (not the "Selected:" text example, which can hide the
`.value` via string coercion).

**An input with no initial value blocks the queries that reference it — on first load.**
Evidence holds any query that references an input until that input has a value. If a
control has no default, its queries never run on load, and because a filter page's charts
all hang off the shared filtered CTE, the *whole page* looks blocked until you interact.
The fix is **not** a SQL guard — an empty input renders as `''` (so `ilike '%%'` already
matches everything). The fix is to give **every** referenced input an initial value:
- **TextInput** → `defaultValue="…"` (the one that's easy to forget — it has no default).
  Use **`defaultValue=''`** for the neutral "show everything on load" start: an empty value
  still unblocks the queries, and `ilike '%%'` matches all.
- Dropdown → `defaultValue=` (or a hardcoded default `<DropdownOption>`); Slider →
  `defaultValue=`; ButtonGroup → mark one `<ButtonGroupItem … default>`; Checkbox →
  `checked` (unchecked is still a value, so it's fine by default); DateRange → `start`/`end`
  (or a `defaultValue` preset). DimensionGrid needs nothing (defaults to `true`).

Rule: if a query reads `${inputs.x…}`, make sure `x` has a starting value.

## Custom components as first-class citizens — the T0 SDK seam (verified)

Project components in `components/` can fully participate in Evidence's reactive model
with **no framework fork** ("T0"), via `@evidence-dev/sdk/utils/svelte`:

- **Drive cross-filtering (write inputs):** `import { getInputSetter, getReadonlyInputContext } from '@evidence-dev/sdk/utils/svelte'`.
  - `const setInput = getInputSetter(name, toggle, defaultSqlFragment)` → returns
    `(value, label, sqlFragment) => void`. Call `setInput()` with no args to apply the
    default; `setInput(v, label, sqlFragment)` to set a selection. `toggle=true` makes
    re-selecting the same value reset to the default.
  - **Seed the default at component INIT (script body), NOT `onMount`** — `onMount` runs
    after queries first evaluate, so the page loads blocked until a click. Evidence's own
    `ButtonGroupItem` seeds at init; mirror it.
  - The value's **`toString()` is what SQL interpolation uses** — make it match your page's
    quoting. If the page has `where c like '${inputs.seg}'` (quotes in SQL), `toString()`
    must return the **raw** value (`Odd Equipment`, `%`). Multi-select for `IN` returns a
    list: `where c in ${inputs.x.value}` (no quotes).
  - Read the current value for highlighting with `getReadonlyInputContext()` →
    `$inputs[name]?.toString()`. (`getInputContext()` still works but is deprecated.)
- **Theme-aware styling:** use Evidence's semantic Tailwind tokens so custom components
  inherit `evidence.config.yaml` colors **and** dark mode automatically — verified classes:
  `bg-base-100/200/300`, `text-base-content`, `text-base-content-muted`, `text-base-heading`,
  `bg-primary` + `text-primary-content`, `text-positive` / `text-negative`, `border-base-300`.
  Write the class literally (not string-concatenated) so Tailwind's scanner emits it.
- **Any chart is T0:** the built-in `<ECharts config={…}/>` component renders a raw ECharts
  option object (bake the data into the config from a query). For interactive/event-wired
  charts, `echarts` resolves directly — `import * as echarts from 'echarts'` in a component,
  create the instance in `onMount` (client only; dispose in `onDestroy`), and wire
  `chart.on('click', …)` → `setInput(...)` to make a chart cross-filter the page.
- **Base-path in a component `href`:** `import { addBasePath } from '@evidence-dev/sdk/utils/svelte'` (see base-path section).
- **Run ad-hoc SQL at RUNTIME (client-side) — verified.** Evidence runs DuckDB-WASM in the
  browser and the executor is a plain import (not a page-only virtual):
  ```js
  // browser-only: lazy-import inside a handler/onMount to avoid the SSR duckdb path
  const { query } = await import('@evidence-dev/universal-sql/client-duckdb');
  const rows = await query(sql); // rows = array of plain objects (Record<string,unknown>[])
  ```
  `query(sql)` is **self-initializing** (`if (!db) await initDB()` + waits for tables), so it
  works from any component with no page-authored query. Every shipped table is registered at
  init as a view named **`source.table`** (e.g. `needful_things.orders`) — same names as page
  SQL, no warm-up query needed. This is what makes **client-side conversational analytics**
  (LLM→SQL→render, no backend) a T0 capability — only the LLM *key* must live server-side.
  (`Query` from `@evidence-dev/sdk/usql` gives a reactive wrapper if you want one instead of a
  one-shot `await`.) Guard generated SQL with a `LIMIT` so a runaway can't freeze the tab.

## Recipe: package components as a local plugin (T0, verified)

Turn `components/` into a reusable installable library — no fork:
1. Make `packages/<name>/` with a `package.json`:
   ```json
   { "name": "@you/pkg", "version": "0.0.1", "type": "module",
     "svelte": "./dist/index.js", "main": "./dist/index.js",
     "evidence": { "components": true },
     "exports": { ".": { "svelte": "./dist/index.js", "default": "./dist/index.js" } },
     "files": ["dist"], "peerDependencies": { "svelte": "^4.2.19" } }
   ```
2. Put **raw `.svelte`** files in `dist/` (Evidence's Vite compiles them — no build step)
   plus `dist/index.js` with **named** exports:
   `export { default as Foo } from './Foo.svelte';` (keep the `.svelte` extension).
3. Flag each component: `<script context="module">export const evidenceInclude = true;</script>`
   at the top (above the normal `<script>`).
4. Register in **two** places: add `"@you/pkg": "file:./packages/<name>"` to the project
   `package.json` dependencies, and `"@you/pkg": {}` under `plugins.components` in
   `evidence.config.yaml`.
5. `npm install` (symlinks it into `node_modules`), then **RESTART the dev server** —
   plugins load at startup, NOT via HMR.

Then use the components by tag with no import, exactly like `components/` ones. Their
`echarts` / `@evidence-dev/sdk` imports resolve via the hoisted root `node_modules`, and the
generated Tailwind config scans `node_modules/@you/pkg/dist/**` (it globs registered
plugins), so semantic-class theming still works. For real cross-project use, publish to npm
(or a git / private-registry dep) instead of `file:`. `aliases` / `overrides` in the config
rename or replace components (including built-ins).

## Frontmatter does NOT interpolate — templated-page titles

Frontmatter (the `--- … ---` block) is **static YAML**. It does **not** evaluate
`{params.x}`, `{query…}`, or any `{}`/JS — the docs say so outright ("Frontmatter does
not support Javascript statements … things may behave unexpectedly if wrapped in `{}`").
So `title: "{params.category}"` renders the **literal** string `{params.category}` in the
tab / sidebar / breadcrumb.

For a templated page (`[param].md`) that needs a dynamic heading:
- **Omit the dynamic `title:`** and put the heading in the **body** instead:
  `# {params.category}` — body markdown DOES interpolate. (A frontmatter `title` also
  auto-renders an H1, so keeping both would double the header anyway.)
- If you want a static tab/breadcrumb label too, use a **static** `title:` plus
  `hide_title: true`, and keep the dynamic `# {params.x}` in the body.

## Docs-only components — NEVER put these in a real page

The transformed reference files no longer contain `<DocTab>`, but be aware:
`<DocTab>`, `<PropListing>`, and `<div slot='preview'>` are components of the **docs site
itself**. They are not Evidence page components. If you see `<PropListing>` in a reference
file it is documenting a prop — never copy it into a dashboard page.

## Data layer

- **Sources** (`sources/<name>/`) define connections + source queries; **page queries**
  (SQL fences) query the resulting tables as `source_name.table_name`.
- Data is materialized at build time into DuckDB (`npm run sources` refreshes it).
- If a query errors with "table not found", the source likely hasn't been run, or the
  `source_name.table` reference is wrong.

## Custom Svelte components in a project

- Put reusable `.svelte` components in the project-root `components/` directory. Evidence
  **auto-registers** every `.svelte` file there as a global component — just use the tag
  (`<UpDownBadge value={q[0].x} />`) on any page. **Do NOT add an `import ... from
  '../components/X.svelte'` in a page `<script>` block** — the component is already
  registered, and importing it again causes a build/registration error. (For sharing
  across projects, publish a component plugin instead — see `reference/plugins/`.)
- They run under Svelte 4 — all the Svelte 4 rules above apply.

---

## Add new gotchas here

When you hit real friction building a dashboard, append a dated bullet so the skill
learns. Keep each entry to the symptom + the fix.

- **2026-07-14** — Importing a project `components/` `.svelte` file via a page `<script>`
  block (`import X from '../components/X.svelte'`) errored. Evidence already auto-registers
  everything in `components/` as a global component; the explicit import double-registers
  it. Fix: delete the import and just use the tag. (See "Custom Svelte components" above.)

- **2026-07-14** — **Base path (`deployment.basePath`) + links.** With a base path set,
  the two kinds of links behave DIFFERENTLY, and getting it wrong yields either a
  double slash (`/base//foo`) or a missing base (`/foo` → "did you mean /base/foo?"):
  - **Markdown links** (plain `[x](…)`, and interpolated `[x]({row.link})` inside
    `{#each}`) ARE auto-adjusted — Evidence prepends the base path. So the link must be
    **relative (NO leading slash)**: use `[x](categories)` / build `'categories/' || id`,
    NOT `/categories`. A leading slash double-slashes into `/base//categories`. Relative
    links resolve against the base root (not the current page), so `channels/Social` from
    `/base/channels/` correctly becomes `/base/channels/Social`.
  - **Component `link` props** (`<USMap link=col>`, `<DataTable link=col>`) use the raw
    column value with NO adjustment. So the SQL column must contain the **full** path
    **including** the base path: `'/base/categories/' || category`. (These do NOT
    double-adjust, which is why hardcoding the base here is correct.)
  - The user prefers hardcoding the base in SQL over importing `addBasePath` in a
    `<script>` (they dislike JS on pages). Honor that.

- **2026-07-14** — A `<Slider>` value read as `${inputs.growth.value}` came back wrong;
  a Slider is accessed **bare** as `${inputs.growth}`. Input value access depends on the
  component type. Added the per-type table above ("Input value access depends on the
  input TYPE").

- **2026-07-14** — A templated page with `title: "{params.category}"` in frontmatter
  showed the literal text `{params.category}` in the tab/breadcrumb. Frontmatter is static
  YAML and never interpolates. Fix: drop the dynamic `title` and use a body `# {params.x}`
  heading (which does interpolate). See "Frontmatter does NOT interpolate" above.

- **2026-07-14** — **TextInput value is accessed BARE** (`inputs.search`), NOT `.value` —
  the prop table's `.value` is wrong; the docs' own SQL example and real behavior both use
  bare. (I flip-flopped on this mid-session; bare is correct.) Also: the page appeared
  **blocked on first load** — not because of the SQL (empty renders as `''`, matching
  all), but because a `TextInput` with **no `defaultValue`** has no initial value, and
  Evidence holds every query that references it until it does. Fix: give it (and any
  referenced input) an initial value — for TextInput, `defaultValue="…"`. See the "input
  with no initial value blocks the queries" note above. (My first attempt — a SQL
  `in ('', 'undefined')` guard — was the wrong fix and was removed.)

- **2026-07-15** — Packaged `components/` into a **local component plugin** (`file:` dep +
  `evidence.config.yaml` registration) — works; components used by tag, no import. Recipe
  banked in "Recipe: package components as a local plugin".

- **2026-07-15** — **Client-side runtime SQL from a component** confirmed rendering: a custom
  `<AskData>` ran LLM-stubbed SQL via `query` from `@evidence-dev/universal-sql/client-duckdb`
  against the in-browser DuckDB and auto-rendered it — no backend. Recipe banked in the T0
  SDK-seam section. Along the way: **a function call in a `$:` statement must take its
  reactive inputs as arguments** (`$: kind = pick(rows, cols)`, not `pick()`) or Svelte
  can't order it and it runs while `rows` is `undefined` → throws. Banked in the Svelte 4
  section.
