<!-- BEGIN evidence-dashboards skill — appended block, safe to edit or remove -->

## Evidence project (evidence.dev)

This is an **Evidence** BI-as-code project: dashboards are markdown pages
(`pages/**/*.md`) that embed **DuckDB SQL** queries and **components**.

- **Use the `evidence-dashboards` skill** for any dashboard, page, query, or component
  work. It carries the component/prop reference, syntax rules, and known gotchas.
- Read the skill's **`GOTCHAS.md`** before writing a page or a custom `.svelte` component.
- Stack is version-pinned — do not use newer-framework idioms:
  - **Svelte 4** — no runes (`$state`/`$derived`/`$props`/`$effect`). Use `export let`,
    `$:`, stores, `on:click`, `<slot>`.
  - **Tailwind 3** — `tailwind.config.js` (not CSS-first `@theme`); `@tailwind base/…`.
  - **DuckDB** SQL dialect for all queries.
- Component props are unquoted (`x=month`); data is referenced by query name in braces
  (`data={my_query}`); a query is a named SQL fence (```` ```sql my_query ````).

<!-- END evidence-dashboards skill -->
