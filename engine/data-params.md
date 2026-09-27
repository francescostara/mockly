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

**A dimension IS its members.** `members` is required on every dimension and must hold at least
one element: a dimension without members is not expressible in this grammar (`DimSpec` in
`engine/spec.d.ts` types it as a non-empty array). Declaring the dimension and populating it are
the same act, in the same object — there is nowhere else to put the members.

```jsonc
// WRONG — the dimension is announced and left empty. The build stops here.
"dims": { "platform": {} },
"facts": { "dim": "platform", "fields": [ ... ] }

// RIGHT — dim and members co-located, always.
"dims": {
  "platform": {
    "members": [
      { "id": "ig", "n": "Instagram", "c": "#1F4E79", "base": 41000, "growth": 0.12, "attrs": { "engRate": 0.041 } },
      { "id": "tt", "n": "TikTok",    "c": "#4A7FA8", "base": 28000, "growth": 0.34, "attrs": { "engRate": 0.058 } },
      { "id": "li", "n": "LinkedIn",  "c": "#A8926E", "base": 12000, "growth": -0.07, "attrs": { "engRate": 0.022 } }
    ]
  }
},
"facts": { "dim": "platform", "fields": [ { "id": "reach", "kind": "seasonal" } ] }
```

Same shape, with the attributes the field formulas read:

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

- `members` — **required, at least one.** Every dimension named anywhere else (`facts.dim`,
  `facts.split.dim`, `detail.parentDim`, a `bind.dim`, a toolbar filter) must appear here with
  its members already inside it.
- `id` short slug · `n` the label the reader sees · `c` the member's colour, used in EVERY
  visual (one colour per member, always). `id` and `n` are required on every member.
- `base` — **required.** The member's monthly value of the primary measure in the FIRST year;
  every other number of that member derives from it, so a member without `base` produces NaN.
- `growth` — compound growth per year. **At least one member must be negative** — that is the
  negative storyline.
- `seasonality` — optional, 12 multipliers, **overrides the global one for this member only**.
  Needed whenever the story is a rank change INSIDE a year: `growth` acts between years, so
  without a per-member shape the members keep the same order across every month of a year. A
  `ribbon` exists to show overtakes, and with a shared seasonality its bands run parallel and it
  degenerates into an area chart. Give the two entities that cross opposite shapes.
- `attrs` — free numeric attributes the field formulas read (`aov`, `margin`, rates…).

## Magnitude anchors: the ratio comes first, the count is derived

A measure declared as `ratio` (average basket, CPM, revenue per member, CAC payback) is not a
by-product of the counts — it is a **constraint on them**. Decide the ratio inside its
plausible range for the niche (see the "ANCORE DI GRANDEZZA" table in each entry of
`niches.md`), then derive the count:

```
count = total / target_ratio
```

So an `attrs.aov` is a currency amount (65 for a fashion basket), never a rate. A field
declared `{"kind":"divide","of":"rev","attr":"aov"}` produces `rev / aov` orders: with `aov`
written as `0.2` the report shows five million orders on one million euros of revenue,
reconciles perfectly, and is nonsense.

This is not a style preference. Every wrong number in the first paid run came from this one
mistake, in five different niches:

| what the report showed | what it means | the anchor that was missing |
|---|---|---|
| average basket €0 (really €0,24) | 5,1M orders on €1,2M revenue | `AOV` is money, so `orders = revenue / AOV` |
| CAC payback 0 days | payback is measured in MONTHS | `payback = CAC / monthly ARPA`, 12–24 |
| revenue per member €0,89 | a gym membership costs tens of euros | `members = revenue / monthly fee` |
| CPM €0,45 | cost per thousand impressions, in units of euro | `impressions = spend / CPM × 1000` |

The engine now refuses a currency ratio below one monetary unit, but the refusal costs a repair
turn on every generation. The cure is upstream: anchor first, derive after.

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

### A field that only exists for some members (`only`)

Paid spend does not exist on organic traffic; a shipping cost does not exist on click-and-collect.
Declare it, and the generator writes zero outside those members:

```jsonc
{ "id": "spend", "kind": "share", "of": "impressions", "attr": "cpm",
  "only": { "dim": "paidOrg", "members": ["paid"] } }
```

Without it the generator spreads the field everywhere, and selecting "Organic" leaves paid spend
unchanged — a filter that does nothing, dressed as a filter that works. **The cure belongs in the
data, not downstream:** with `only`, the filter zeroes the measure because zero is the truth. The
engine then renders the visual as explicitly not applicable instead of drawing an empty chart.

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

**Three filterable dimensions: `split` as an array of two.** When the brief asks to filter by
three dimensions (category, region AND customer segment), declare both extra dimensions — never
push the third one into a family of fields shown as matrix columns: that is a filter asked for
and not given.

```jsonc
"facts": {
  "dim": "cat",
  "split": [ { "dim": "region",  "shares": [0.31, 0.24, 0.20, 0.25] },
             { "dim": "segment", "shares": [0.58, 0.25, 0.17] } ],
  "fields": [ ... ]
}
```

Each split is fitted to `facts.dim` on its own (the segment mix depends on the category, not on
the region). Keep `members(dim) × Π members(split) ≤ 120` — 5 × 4 × 3 = 60 is comfortable.

**Where a field reads its rate: `attrFrom`.** Omitted, a `share`/`divide` field reads the attrs of
`facts.dim`'s members; `"split"` reads the first split's; the NAME of a fact dimension reads
that dimension's members — with two splits, a discount rate that belongs to the region is
`"attrFrom": "region"`.

**A split member can grow faster than the others.** `growth` on a split member tilts its share
year after year (`(1+growth)^year`, renormalised; `shares` then describes the first year). Without
it every region grows exactly like the total, and "the region that grows while its margin falls"
cannot be told apart from the one that simply grows.

## `detail` — the drill-down grain (optional)

A child dimension (models within a category, formats within a platform). It ships as a share
vector, not as rows: the runtime expands it against each fact row, so children always tie out
to their parent exactly.

```jsonc
"detail": {
  "dim": "mod",
  "parentDim": "cat",
  "members": {
    "per": [{ "n": "Tabriz 200×300", "w": 2 }, "Kashan medaglione", { "n": "Heriz antico", "w": 0.6 }],
    "mod": ["Astratto grigio", "Shaggy panna", "Optical B/N"]
  },
  "fields": ["rev"],
  "counts": { "field": "pieces", "from": "pieces" }
}
```

- `members` — children per parent id (3–6 each). The builder assigns ids and inherits the
  parent's colour. A child is either a plain name, or an object that declares its character:
  `{ "n": "Seven noun cases", "w": 2.2, "mult": { "mistakes": 1.6 } }`.
  - `w` — the child's weight against its siblings: its share of the parent's volume. Declare it
    whenever "which child leads" is part of the story; plain names get a random share.
  - `mult` — per-field multiplier, for a child whose RATE must differ from the parent's (a harder
    topic makes more mistakes per attempt). The engine renormalises inside each parent, so the
    children of every fact row still sum to it exactly.
- `fields` — which measures split across the children (by `w`, times `mult` where declared).
- `counts` — an integer field split by largest remainder so it still sums to the parent.

Use `detail` whenever the drill-through page needs a finer grain than the matrix rows.

**A dimension you put in the toolbar must be able to move a KPI card.** Either the dimension is
a column of the fact grain, or the `detail` grain that carries it splits at least one measure
the KPI band uses (`fields`). A dimension that only exists in the detail grain, splitting a
measure no KPI card reads, produces a control that visibly does nothing — the engine rejects
that spec rather than shipping a dead filter. Two ways out: add the dimension to the facts
(`facts.split`), or extend `detail.fields` so a KPI measure lives at that grain.

## What the builder returns

`dims` (with members), `years`, a columnar `facts` table, an optional `detailModel`, and a
`tieOut` report. That object is what `render(spec, data)` takes as its second argument — the
spec's `filters.dims`, `model.sums` and every `bind.dim` must line up with it.
