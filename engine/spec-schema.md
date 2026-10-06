# SPEC schema — the grammar of a report

A **spec** is the JSON an LLM writes. It carries *judgement*: the aesthetic, the palette, which
visual answers which question, the storyline, the labels. It carries no rendering logic — the
engine owns that.

A **data** payload is the companion object: dimension members and a compact fact table
(`engine/data-model.js` generates reconciled ones).

```
render(spec, data) -> string   // one self-contained HTML file, deterministic
```

Determinism: the same `(spec, data)` always produces byte-identical HTML. The engine calls no
`Date.now()` and no `Math.random()`; any randomness lives in `data-model.js` behind a seed.

The types are in [`spec.d.ts`](spec.d.ts); this file is the prose reference.

---

## 1. Top level

```jsonc
{
  "meta":      { ... },   // titles, language, strings, watermark
  "aesthetic": "corporate-sober",     // | "agency-modern" | "executive-minimal"
  "archetype": "quadrants",           // OBBLIGATORIO — decide apertura e chiusura della
                                      // pagina, e il motore verifica che la composizione
                                      // corrisponda. scorecard | executive-summary | funnel |
                                      // quadrants | bridge | cohorts | operational.
                                      // Vedi layout-archetypes.md: "scorecard" NON e il default.
  "palette":   { ... },   // token overrides on top of the aesthetic
  "grid":      { "contentWidth": 1044, "gutter": 12, "columns": 5 },
  "model":     { ... },   // the measure layer
  "filters":   { ... },   // date hierarchy + filterable dimensions
  "kpiBand":   [ ... ],   // the top row, shared by every page
  "pages":     [ ... ],   // one or more report pages
  "drill":     { ... }    // the drill-through page
}
```

### `grid` — the hard alignment rule

`columns` **must** equal `kpiBand.length`; every visual's `span` is an integer number of those
columns. This is the shared-grid rule from SKILL.md §1: pick one page split (e.g. 3|2) and reuse
it in every row so vertical edges line up top to bottom. `contentWidth` is the page area inside
the canvas. La decide la SHELL, non il gusto: rail 1044, rail-slim 1116, top e bare 1248.

`render()` rejects a spec where `columns !== kpiBand.length`, where a row's spans do not sum to
`columns`, or where a row holds more than 3 visuals.

### `meta`

| field | meaning |
|---|---|
| `title`, `subtitle` | header text of the first page |
| `brand.name`, `brand.tagline` | left-rail / masthead wordmark |
| `locale` | `it-IT`, `en-US`, … — drives number formatting |
| `currency` | `€`, `$`, … |
| `months` | 12 month abbreviations in the report language |
| `strings` | UI words in the report language (see below) |
| `updated` | the "last refreshed" line — a literal string, never a live clock |
| `source` | rail footnote ("Fonte: gestionale negozio") |
| `watermark` | the synthetic-data watermark (required) |
| `skin.brand` | the client's official colours, main first (`["#0B2545", "#C8102E"]`): the rail and the frame take them; the data scale stays the verified palette |
| `numberFormat` | `"k1"`: every amount in thousands with one decimal (`€52,134.5K`), cards and tooltips included — the finance convention |
| `varianze` | `"finanza"`: favourable variances green, unfavourable red (arrows and signs stay, for colour-blind readers). Default: blue/orange |

`strings` keys: `fullYear, all, allM, compare, qtr, month, varShort, pyShort, cyShort,
prevShort, curShort, reset, period, conv`.

---

## 2. `model` — the measure layer

The engine never evaluates expressions from the spec. Measures are declared, not coded.

```jsonc
"model": {
  "sums": ["rev", "cost", "pieces", "online"],        // additive fact columns
  "measures": [
    { "id": "rev",      "label": "Fatturato",     "agg": "sum",   "field": "rev",  "format": "eur" },
    { "id": "gp",       "label": "Margine lordo", "agg": "diff",  "a": "rev", "b": "cost", "format": "eur" },
    { "id": "mg",       "label": "Margine %",     "agg": "ratio", "num": "gp",  "den": "rev",    "format": "pc" },
    { "id": "aov",      "label": "Scontrino",     "agg": "ratio", "num": "rev", "den": "pieces", "format": "eurF" },
    { "id": "headcount","label": "Organico",      "agg": "last",  "field": "hc",  "format": "N" }
  ]
}
```

- `sum` — additive over the filtered rows (flow metrics: revenue, orders, spend).
- `diff` — `a − b` of two aggregates.
- Any measure can carry `target` (a number on its scale: `0.98` for 98%) — the engine colours its
  values green on the right side of the target and red on the wrong side (`inv` decides which side
  is right), in cards, tables, bars, heatmaps and line points — and `description`, a plain-words
  definition shown in the report's guide next to how it is calculated. A `count` that can go below
  zero (a balance: new minus lost) is `signed: true`; any other count with negative values is
  rejected.
- `ratio` — `num / den`, **guarded**: a zero denominator yields `0`, never `NaN`/`Infinity`.
- `last` — point-in-time snapshot: the value at the latest `(y,m)` in the window, never summed
  (net debt, headcount, followers — `data-realism.md` "point-in-time vs flow").

Order matters: `diff`/`ratio` may only reference `sums` or measures declared earlier.

`format`: `eur` (compact K/M) · `eurF` (full, grouped) · `pc` · `pp` · `sgp` · `bps` · `N` ·
`x` (multiple, e.g. leverage) · `days` · `raw`.

Set `"inv": true` on a measure or KPI where **lower is better** (CAC, sales cycle, net
debt/EBITDA) so the variance colours flip.

---

## 3. `filters`

```jsonc
"filters": {
  "date": { "levels": ["year","quarter","month"], "default": { "y": 2025, "q": null, "m": null } },
  "dims": [
    { "id": "cat", "label": "Categoria", "control": "list", "allLabel": "Tutte", "pill": "Cat." }
  ]
}
```

- The date slicer is **always** the Year → Quarter → Month dropdown. Selecting a month pins its
  quarter; changing quarter clears an out-of-range month; the grain sets the KPI basis
  (month → MoM, otherwise YoY).
- `dims[].id` must be a key of `data.dims`. `control`:
  - `"list"` — inline clickable members. Only for **≤ 5 members** (Gate 6).
  - `"dropdown"` — a button + panel. **Required above 5 members**, so the toolbar cannot clip.
- **Filter or highlight — the Power BI rule.** A toolbar filter (a slicer) FILTERS every visual,
  including the ones broken down by that same dimension (the ranking by segment shows the chosen
  segment). A click inside a chart HIGHLIGHTS that chart (the other members stay, dimmed) and
  filters the others. A rank chart (`ribbon`) always highlights: filtered to one member it would
  always rank first.
- **A click filters what you clicked.** A ranked list of a dimension that is not a toolbar filter
  (top customers, top products) is not clickable: it follows the slicers only. `"crossFilter": false`
  removes the clicks from any visual (Power BI: Edit interactions → None from that visual).
- **A visual can be detached from a filter:** `"ignoreFilters": ["seg"]` in its `bind` keeps every
  member and ignores that filter (Power BI: Format → Edit interactions → None; the kit says so).
  Use it where the full breakdown is the point (the mix of all segments next to a segment filter).
- Every declared dim filters through the one shared slice layer. There is no way to declare a
  decorative filter: a dim in this list slices the fact table or it is not in the list.

---

## 4. `kpiBand`

```jsonc
"kpiBand": [
  { "id": "rev", "label": "Fatturato", "measure": "rev", "span": 1 },
  { "id": "mg",  "label": "Margine",   "measure": "mg",  "span": 1, "inv": false }
]
```

**A count with its base:** `"of": "<base measure>"` makes the card say "of 1,338,483 payments ·
1.4% · PY 1.7%" instead of the plain prior/current line. Use it on every count that only makes sense
against a total (late payments, errors, returns).

**Finance card:** add `"budget": "<budget measure>"` and/or `"ytd": true`. The card shows the
period value with **vs budget** and **vs PY**, and below it **YTD up to the selected month** with the
same two variances (with the full year selected, the second row states budget and PY in absolute
terms). Variances follow the measure's direction (`inv` on a cost: above budget is unfavourable).

Each card renders: label, big value, variance chip `▲ 5,6% YoY` (basis always shown), and the
descriptor line `PY <x> | CY <y> | Var <z>` (`Prec. | Corr. | …` when the basis is MoM;
percentage measures show a `pp` move instead of a `Var`). Spans must sum to `grid.columns`.

---

## 5. `pages` and visuals

```jsonc
"pages": [{
  "id": "main", "title": "Performance vendite", "subtitle": "Fatturato per mese e categoria",
  "nav": "Performance vendite",
  "rows": [
    { "visuals": [ {"type":"trend","span":3, ...}, {"type":"donut","span":2, ...} ] },
    { "flex": true, "visuals": [ {"type":"matrix","span":3, ...}, {"type":"hbar","span":2, ...} ] }
  ]
}]
```

The KPI band is emitted automatically as the first row of every page (`"kpiBand": false` on a
page opts out). `flex: true` makes a row absorb the leftover canvas height — use it on the last
row. `h` on a visual fixes its chart body height in px.

Common visual fields: `type`, `span`, `h`, `title`, `subtitle`, `note` (right-aligned hint),
`bind` (type-specific). There is no `legend`: the engine draws the legend of `trend` and
`colline` from the series it actually draws, and rejects a declared one. Label strings interpolate `{y}`, `{py}`,
`{basis}`, `{period}`, `{drill}`.

### Visual types and their `bind`

| type | bind | answers |
|---|---|---|
| `trend` | `{measure}` | one measure over time. **Timeline-exempt**: always the full 12 months of the selected year vs prior, highlighting the selected span |
| `statement` | `{label, lines:[{label, measure, budget, kind, inv, accounts:[{label, w}]}], ytd}` | **the income statement**: rows are the lines in account order; `kind` `"sub"` (subtotal: Gross profit, EBITDA — a calculated measure, never a sum of rows), `"total"` (EBIT, net income), `"pct"` (a margin row, varies in points). Columns Actual · Budget · Var · Var % for the period and, with a month or quarter selected, for YTD. A line with `accounts` expands in place into its accounts (weights `w`). Closes a page like a matrix |
| `colline` | `{measure, line, target, targetLabel, labels}` | actual vs prior columns + a rate line on a secondary axis that fits the data. `target` (on the line's scale: `0.98` for 98%) draws a fixed dashed target line; **declare it whenever the line's measure has a target in the brief** |
| `donut` | `{dim, measure}` | part-to-whole. **2-5 members only** — above that use `hbar`/`stack100` |
| `hbar` | `{dim, measure, top, order, parent, detail, subMeasure, subUnit}` | ranked list. `detail:true` reads the detail grain; `parent` colours by the parent dim and makes bars cross-filter it; `order:"asc"` shows the TAIL — the `top` weakest members (products that "need attention") instead of the best |
| `stack100` | `{dim, measure, by}` | composition across quarters (`by:"q"`) or another dim |
| `ribbon` | `{dim, measure, by}` | rank change over periods |
| `funnel` | `{stages:[{measure,label,c}]}` | stage-to-stage conversion |
| `waterfall` | `{dim, measure, startLabel, endLabel}` or `{stock, steps:[{measure, label, sign}], startLabel, endLabel}` | prior → current decomposed by dimension; **or a stock bridge** (opening cash → operating CF − capex − tax → closing cash): `stock` is an `agg:"last"` measure built from a `cumulative` field, so opening + steps = closing exactly. When the steps are small against the totals the axis starts near the minimum |
| `scatter` | `{dim, x, y, size}` | the revenue-vs-margin tension, with median quadrant lines |
| `matrix` | see below | the analytical closing table |
| `sparkline` | `{measure}` | inline 12-month trend |
| `narrative` | `{template, dim, primary}` | the executive-minimal measure-driven sentence |

`matrix` bind:

```jsonc
{ "dim": "cat", "label": "Categoria", "sort": "rev", "drill": true,
  "totalsLabel": "Totale negozio",
  "columns": [
    { "measure": "rev", "label": "Fatturato" },
    { "measure": "rev", "label": "{basis}", "kind": "var" },
    { "measure": "mg",  "label": "Margine %", "kind": "heat", "scale": [0.4, 0.65] },
    { "measure": "rev", "label": "Quota",     "kind": "share" }
  ] }
```

`kind`: omitted = plain value · `bud` = variance vs a budget measure (`"budget": "bRev"`, `"show": "abs"|"pct"`), coloured by finance logic · `var` = ▲/▼ vs the comparable prior window (a percentage
measure varies in **points**, `▼ −3.2 pp`, never in percent of itself — the engine does it) · `share` = % of the
filtered total · `heat` = conditional formatting on a `[lo,hi]` scale (house signature). The
totals row recomputes from the visible rows; every row carries cross-filter and drill-through.

**Narrative templates** are token-only — hand-written prose about specific entities is not a
Power BI visual and is rejected by convention. Tokens: `{m:id}` current value, `{p:id}` prior,
`{var:id}` signed variance span, `{bps:id}`, `{basis}`, `{top:}`/`{top:var}` best member,
`{drag:}`/`{drag:var}` worst member (`dim` + `primary` in the bind pick the ranking).

---

### Cards with several views (`viste`) — the bookmark

A position in a row can hold two or three views behind tabs instead of one visual:

```jsonc
{ "id": "products", "span": 2, "h": 176, "motivo": "due-lenti", "viste": [
  { "type": "hbar", "etichetta": "Best", "title": "Top products by profit", "bind": { "dim": "prod", "measure": "profit", "detail": true, "top": 6 } },
  { "type": "hbar", "etichetta": "Worst", "title": "Products that need attention", "bind": { "dim": "prod", "measure": "profit", "detail": true, "top": 6, "order": "asc" } }
] }
```

- `motivo` is **required** — why something hides behind a tab: `due-lenti` (two metrics on the
  same question; the views share the measure or the dimension), `altro-taglio` (the same
  question on another axis; same condition), `pagina-sprecata` (one more chart, the page is full,
  and alone it does not deserve a page — the only reason that admits unrelated views).
- every view has `type` and `etichetta` (the tab text); at most 3 views, 2 on the opening visual.
- the FIRST view is what the reader sees on opening, and what the archetype is judged on.

## 6. `drill`

```jsonc
"drill": {
  "dim": "cat",
  "page": {
    "id": "__drill__", "drillHeader": "Dettaglio · {period} · confronto {basis}",
    "backLabel": "Torna a tutte le categorie", "subtitle": "Dettaglio categoria e modelli",
    "rows": [ ... ]
  }
}
```

`drillHeader` is the CONTEXT line (`"{period} · {basis}"`). Never put `{drill}` in it: the engine
already prints the entity's name, with its colour, next to the back button, and rejects the
repetition.

Right-clicking any `matrix` row opens this page with the entity pinned on **every** visual of
the page (the pin runs through the same shared slice layer), plus a back button that returns to
the page the user came from. The drill page reuses the KPI band and the same chart helpers.

---

## 7. What the spec must NOT contain

- No JavaScript, no expressions, no HTML in labels (labels are escaped).
- No literal numbers that should be measured — a value on screen comes from `data` through a
  measure, or it does not appear.
- No filter that does not slice the fact table.
- No authored prose panel presented as a visual.
- No off-grid widths (`span` is an integer count of grid columns, never a pixel width).
