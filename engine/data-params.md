# dataParams — the declarative data generator

`dataParams` is the second half of what an LLM writes. It does not contain numbers row by row:
it declares the *character* of each segment and how each measure derives from it, and
`engine/data-builder.js` runs a seeded generator over that declaration. Same params → same
numbers, always.

```jsonc
{
  "seed": 90417,
  "years": [2024, 2025],
  "seasonality": [0.82,0.80,0.92,0.95,0.88,0.74,0.62,0.70,1.12,1.30,1.42,1.28],
  "dims": { ... },
  "facts": { ... },
  "detail": { ... }        // optional
}
```

- `years` — exactly two: prior and current. The report compares them.
- `seasonality` — 12 multipliers averaging ~1.0. Shape them for the domain (retail peaks in
  Nov–Dec, Europe dips in August, SaaS is nearly flat). Never leave it uniform.

## `dims` — the dimensions and the character of their members

```jsonc
"dims": {
  "cat": {
    "members": [
      { "id": "per", "n": "Persiani & Orientali", "c": "#12304F",
        "base": 41000, "growth": -0.086,
        "attrs": { "aov": 1200, "margin": 0.42, "onlShare": 0.05 } },
      { "id": "mod", "n": "Moderni Design", "c": "#1F4E79",
        "base": 30000, "growth": 0.224,
        "attrs": { "aov": 560, "margin": 0.52, "onlShare": 0.28 } }
    ]
  }
}
```

- `id` short slug · `n` the label the reader sees · `c` the member's colour, used in EVERY
  visual (one colour per member, always).
- `base` — the member's monthly value of the primary measure in the FIRST year.
- `growth` — compound growth per year. **At least one member must be negative** — that is the
  negative storyline.
- `attrs` — free numeric attributes the field formulas read (`aov`, `margin`, rates…).

## `facts` — the monthly fact table

```jsonc
"facts": {
  "dim": "cat",
  "fields": [
    { "id": "rev",    "kind": "seasonal" },
    { "id": "cost",   "kind": "share",  "of": "rev", "attr": "margin", "complement": true, "jitter": [0.97, 1.03] },
    { "id": "pieces", "kind": "divide", "of": "rev", "attr": "aov", "jitter": [0.85, 1.18], "min": 1 },
    { "id": "online", "kind": "share",  "of": "rev", "attr": "onlShare", "jitter": [0.85, 1.15], "cap": 0.6, "growthFactor": 1.9 }
  ]
}
```

`dim` is the dimension the monthly loop runs over. **The first field must be `kind:"seasonal"`** —
it is the primary measure, from which the others derive. Field kinds:

| kind | formula | options |
|---|---|---|
| `seasonal` | `base × (1+growth)^yearIndex × seasonality[m] × jitter` | `jitter` (default `[0.93,1.07]`) |
| `share` | `of × attrs[attr] × jitter` | `complement: true` → uses `1 − attr` · `cap` → ceiling on the rate · `growthFactor` → multiplies the rate in the current year (e.g. online doubling) |
| `divide` | `of ÷ (attrs[attr] × jitter)` | `min` (default 1) — always an integer |
| `combine` | `Σ plus − Σ minus` | for movement measures (new + expansion − churn = net new) |

Every field is rounded to an integer, so the totals a reader adds up actually add up.
`share` and `divide` read the member's `attrs`; add `"attrFrom": "split"` to read the split
dimension's attrs instead (see below).

### Two filterable dimensions (`facts.split`)

When two dimensions both roll up to the same total and the user can slice by either, do NOT
author two independent breakdowns — one of the two filters would be inert. Declare a split and
the builder fits a joint grain with IPF so both are real:

```jsonc
"facts": {
  "dim": "chan",
  "split": { "dim": "cat", "shares": [0.34, 0.27, 0.23, 0.16] },
  "fields": [ ... ]
}
```

`shares` are the split dimension's share of the grand total, in member order, summing to 1.
Keep the joint grain small: `members(dim) × members(split) ≤ 24`, or the output file gets fat.

## `detail` — the drill-down grain (optional)

A child dimension (models within a category, formats within a platform). It ships as a share
vector, not as rows: the runtime expands it against each fact row, so children always tie out
to their parent exactly.

```jsonc
"detail": {
  "dim": "mod",
  "parentDim": "cat",
  "members": {
    "per": ["Tabriz 200×300", "Kashan medaglione", "Heriz antico"],
    "mod": ["Astratto grigio", "Shaggy panna", "Optical B/N"]
  },
  "fields": ["rev"],
  "counts": { "field": "pieces", "from": "pieces" }
}
```

- `members` — child names per parent id (3–6 each). The builder assigns ids and inherits the
  parent's colour.
- `fields` — which measures split proportionally.
- `counts` — an integer field split by largest remainder so it still sums to the parent.

Use `detail` whenever the drill-through page needs a finer grain than the matrix rows.

## What the builder returns

`dims` (with members), `years`, a columnar `facts` table, an optional `detailModel`, and a
`tieOut` report. That object is what `render(spec, data)` takes as its second argument — the
spec's `filters.dims`, `model.sums` and every `bind.dim` must line up with it.
