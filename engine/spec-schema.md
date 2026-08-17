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
the canvas — 1044 with a 200px left rail, 1254 with no rail (1280 − margins).

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
`legend: [{l, c, dash}]`, `bind` (type-specific). Label strings interpolate `{y}`, `{py}`,
`{basis}`, `{period}`, `{drill}`.

### Visual types and their `bind`

| type | bind | answers |
|---|---|---|
| `trend` | `{measure}` | one measure over time. **Timeline-exempt**: always the full 12 months of the selected year vs prior, highlighting the selected span |
| `colline` | `{measure, line}` | actual vs prior columns + a rate line on a secondary axis |
| `donut` | `{dim, measure}` | part-to-whole. **2-5 members only** — above that use `hbar`/`stack100` |
| `hbar` | `{dim, measure, top, parent, detail, subMeasure, subUnit}` | ranked list. `detail:true` reads the detail grain; `parent` colours by the parent dim and makes bars cross-filter it |
| `stack100` | `{dim, measure, by}` | composition across quarters (`by:"q"`) or another dim |
| `ribbon` | `{dim, measure, by}` | rank change over periods |
| `funnel` | `{stages:[{measure,label,c}]}` | stage-to-stage conversion |
| `waterfall` | `{dim, measure, startLabel, endLabel}` | prior → current decomposed by dimension |
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

`kind`: omitted = plain value · `var` = ▲/▼ vs the comparable prior window · `share` = % of the
filtered total · `heat` = conditional formatting on a `[lo,hi]` scale (house signature). The
totals row recomputes from the visible rows; every row carries cross-filter and drill-through.

**Narrative templates** are token-only — hand-written prose about specific entities is not a
Power BI visual and is rejected by convention. Tokens: `{m:id}` current value, `{p:id}` prior,
`{var:id}` signed variance span, `{bps:id}`, `{basis}`, `{top:}`/`{top:var}` best member,
`{drag:}`/`{drag:var}` worst member (`dim` + `primary` in the bind pick the ranking).

---

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
