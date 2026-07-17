# Slide decks in Evidence (T0, verified)

Deep notes for building **presentation decks** with custom `<SlideDeck>` / `<Slide>`
components — a self-contained feature you only need when authoring a deck. The core
version pins and page rules still apply; see `GOTCHAS.md` first. For the general
custom-component / plugin / runtime-SQL mechanics these build on, see
`advanced-components.md`.

## Slidev-style slide deck is T0 (spike6)

`<SlideDeck>` + `<Slide>` custom components give a presentation shell (keyboard nav,
fullscreen, layouts) with each slide's slot holding **ordinary Evidence markdown** —
live queries, `<Grid>`/`<BigValue>`/`<LineChart>`, and a cross-filter `<EChartsBar>` all
render and cross-filter across slides. Mechanism: the exact Svelte-4 **context pattern
Evidence's own `<Tabs>`/`<Tab>` use** — the deck `setContext`s a `current` writable + a
`register()` fn; each `<Slide>` registers at init to claim its index and reads `current`
to show/hide. Keep every slide **mounted** (stack absolutely, toggle opacity/transform)
so embedded ECharts instances and query state survive navigation. Don't port Slidev
itself (Vue). Files: `components/SlideDeck.svelte`, `components/Slide.svelte`,
`pages/spike6.md`.

## Deck themes (spike6)

`<SlideDeck theme=editorial|bold|dashboard>` passes a theme name through context;
`Slide`/`TitleSlide`/`ChartSlide` pull literal class strings from the `DECK_THEMES`
registry (in `Slide.svelte`'s module script). Editorial = serif display + accent
hairline + small-caps eyebrow, covers on the base surface (no color fill); bold =
gradient covers; dashboard = full-width header rules. Only surfaces WE render (titles,
eyebrows, rules, cover/section slides, quotes, backgrounds) are themeable — built-in
Evidence `BigValue`/`LineChart` internals stay Evidence-styled.

## Fullscreen/fluid slide sizing = fixed-stage + `transform: scale()`

(reveal.js/Slidev technique.) Don't try to make each element responsive — built-in
Evidence charts (`LineChart`/`BigValue`) have sizes you can't control per-instance.
Instead render all slides on a **fixed design stage** (e.g. 1280×720), measure the
container with a `ResizeObserver`, and apply one
`transform: translate(-50%,-50%) scale(min(cw/W, ch/H))` so headings, KPI values,
charts, and spacing all fill the space uniformly — inline and in fullscreen. Keep app UI
(nav/control bar/chrome) OUTSIDE the scaled stage. Caveats under the transform: DOM text
(BigValue) stays crisp (re-rasterized); ECharts **canvas** charts soften a bit on large
upscales (bump `devicePixelRatio` if it matters); ECharts click hit-testing still maps
correctly (ZRender uses the scaled bounding rect). The element's layout box is unchanged
by the transform, so a chart's own ResizeObserver won't refire on scale (fine — it
renders at design px). Implemented in `components/SlideDeck.svelte`.

## PDF export = ride Evidence's native "Export PDF"

(Option menu, top-right; it's browser print-to-PDF + Evidence's print CSS, honoring
`<PageBreak>` / `<PrintGroup>`.) Don't build a separate exporter. To make a custom
**stacked/scaled** component (like the slide deck) print cleanly, make it **print-aware**
with Tailwind `print:` variants + a scoped `@media print`: (a) neutralize any inline
`transform: scale()` / absolute stacking — inline styles need a scoped
`@media print{ .el{ transform:none !important; position:static !important } }` (a
`print:` utility can't beat an inline style); (b) per "page" element →
`print:static print:min-h-screen print:break-after-page`; (c) force hidden/animated
content visible → `print:!opacity-100 print:!translate-x-0`; (d) hide app chrome →
`print:hidden`; (e) `@page { size: landscape }`. The `print:` variant IS enabled in
Evidence's preset and emits (verified). **Verified end-to-end via Playwright** (globally
installed: `/opt/homebrew/bin/playwright`, chromium cached): rendered the deck, emulated
print, and generated a PDF — slides came out **one per page, ECharts canvas charts
rendered fine (did NOT print blank), reveals all shown, chrome hidden, no console
errors**. Implemented for the deck in `SlideDeck`/`Slide`/`Reveal`. Two page-authoring
notes: (1) put ONLY the `<SlideDeck>` on a deck page — page intro prose + dev-mode
query-preview boxes print before the slides (that's what made a 6-slide deck export 8
pages); (2) slides print top-aligned on their page (optionally add `print:justify-center`).

## Faithful full-bleed 16:9 slide PDF — beat Evidence's document print CSS

Evidence's print layout is built for NARROW document reports: `<main>` gets `print:mt-8`
(a 32px top inset) and the content wrapper gets `print:w-[650px] print:md:w-[841px]
mx-auto` (caps width to ~841px, centered). A deck left as-is prints **squeezed and
spilling** (slide smaller than the page → overflow → extra pages). Fix, in a scoped
`@media print`: (a) `@page { size: 1280px 720px; margin: 0 }` — the page IS the 16:9
slide (1280×720px = 96dpi = PPT 13.333in×7.5in); (b) render each slide at the exact
design size (`print:h-[720px] print:w-full`, un-scaled, `overflow:hidden`,
`break-after:page`); (c) **override Evidence's print chrome via `:global`** —
`:global(main){margin:0;padding:0}`, `:global(#evidence-main-article){padding:0}`, and
neutralize the width cap with
`:global([class*='print:md:w-']){width:100%!important;max-width:100%!important}`, plus
`:global(body){margin:0}`. **Verified with Playwright + Ghostscript raster:** 5 slides →
5 pages, every `MediaBox [0 0 960 540]` (16:9), deck flush at (0,0), slides exactly
1280×720, charts render at full size — faithful to the on-screen slide. Author deck pages
with `sidebar: never`, `hide_title`, `hide_breadcrumbs`, `full_width: true` (see
`pages/deck.md`).

## Driving Evidence in a real browser (this machine)

Playwright is installed globally (`require('/opt/homebrew/lib/node_modules/playwright')`,
or `NODE_PATH=/opt/homebrew/lib/node_modules`). Dev server: `npm run dev` (Evidence, base
path `/test-ev-5`, picks next free port e.g. 3001). Goto `…/<page>/` with
`waitUntil:'networkidle'` + a ~3s wait for DuckDB-wasm + ECharts. A page's deck sits
BELOW its markdown, so `locator('.deck-canvas').scrollIntoViewIfNeeded()` before
screenshotting. This is the way to actually verify rendered/interactive/PDF behavior the
SSR build can't show. (General-purpose — useful for verifying any rendered/interactive
page, not only decks.)
