# Advanced components & edge traps (T0, verified)

Deeper custom-component mechanics and rare authoring traps that don't come up on a
routine dashboard. Read `GOTCHAS.md` first for the always-needed core (version pins,
input access, markdown syntax, the T0 SDK seam, the local-plugin recipe). For the slide
deck feature specifically, see `slide-decks.md`.

## Custom components compose (template pattern)

A project `components/` component can `import Slide from './Slide.svelte'` and render it,
forwarding page children via `<slot/>`. Svelte context set by an outer component
(`<SlideDeck>`) flows through the intermediate template to the inner `<Slide>`, and slide
registration order is preserved. This is how `<TitleSlide>` / `<KpiSlide>` /
`<ChartSlide>` wrap `<Slide>`. (Within-component imports are fine — the "never import in a
page" rule is about pages only.)

## Theming custom components: three verified facts

(1) Evidence's Tailwind preset ships only `font-sans` / `font-mono` — no `font-serif`.
Add families (or any `theme.extend`) via a **root project `tailwind.config.js`**: the
template's `.evidence/template/tailwind.config.cjs` auto-loads `../../tailwind.config.js`
as a **preset**, so it merges with no fork. (2) **Every** config color is a usable
utility, not just the common ones — `text-accent`/`bg-accent`, `text-info`,
`text-primary-content` all work; they're just not emitted until used in a scanned file.
Each is exposed as CSS vars `--twc-<name>` / `--twc-<name>-content`, so you can build
**theme-aware arbitrary values** like
`bg-[linear-gradient(135deg,hsl(var(--twc-primary)),hsl(var(--twc-info)))]` (verified to
emit and stay dark-mode aware). (3) Tailwind's content glob is
`src/**/*.{svelte,js,md…}`, but a **standalone `components/*.js` class registry did NOT
get its classes emitted** in practice even though the file synced into `src/`. The
reliable pattern for a shared class-string registry is a **`.svelte`
`<script context="module">` export** (proven scanned), imported by the other components —
e.g. `export const DECK_THEMES` in `Slide.svelte`,
`import { getDeckTheme } from './Slide.svelte'` in the templates.

## Named slots render markdown + components inside

A custom component with `<slot name="left"/>` / `<slot name="right"/>`, filled from a
page with `<div slot="left">…</div>`, DOES compile the inner markdown and SQL-driven
components (used it for a two-column slide layout — a `<LineChart>` and an `<EChartsBar>`
in separate named slots both rendered and cross-filtered). So named slots are a viable T0
layout primitive, not just default slots. Keep a blank line after the opening
`<div slot="…">` so mdsvex treats the contents as markdown.

## The project `pages/` sync is `.md`-ONLY — no SvelteKit route files

You cannot add a SvelteKit route file (`+server.js`, `+page.server.js`, etc.) through
`pages/`. Evidence copies pages by `endsWith('.md')`; any non-`.md` file dropped in
`pages/` (e.g. `pages/api/x/+server.js`) is **silently ignored** — the route 404s, no
error. It only runs if forked directly into the generated
`.evidence/template/src/pages/` (ephemeral — regenerated each build/dev). So a
**same-origin server endpoint is not a T0 capability.** Combined with the build config
(**`adapter-static`**, root `+layout.js` sets `prerender = import.meta.env.VITE_EVIDENCE_SPA
!== 'true'` → true, and `ssr = !dev`), a live/dynamic server endpoint has no runtime in
the static bundle anyway. Consequence for **runtime data**: a **browser-side `fetch()`
from a custom component is fully T0** (works dev + built; feed the result into client
DuckDB-WASM via `query` from `@evidence-dev/universal-sql/client-duckdb` if you want it in
the query engine), but the **key-safe server-side proxy needs a fork (non-static adapter)
or a companion process.** Verified end-to-end in spike7 (`LiveFetch`/`ProxyFetch`).

## Build trap: a literal `` `<script>` `` in a markdown code span breaks the whole page

Symptom: a misleading `ParseError: Unexpected </script>` / `(unexpected-eof)`, pointing
at a far-away line (often the page's last `</...>` tag). Cause: `<script>` (like
`<style>`/`<textarea>`) is an HTML **raw-text element**, so the Svelte/mdsvex parser
enters raw-text mode the moment it sees `<script` — *even inside backticks* — and consumes
the rest of the file looking for a matching `</script>` that never comes. `` `<SlideDeck>`
``, `` `<BigValue>` ``, `` `${inputs.x}` `` in code spans are all fine — it's specifically
the raw-text tags. Fix: don't write the literal `<script>` token in prose; reword (e.g.
"no page-level JavaScript"). Bisected from a real page; every other element built clean.
