# Data Realism

This is the step that separates a convincing mockup from an obvious fake. The numbers are
synthetic, but the audience is a domain expert. One implausible figure — a win rate no sales
team achieves, every subsidiary in covenant breach, an open pipeline twelve times closed-won —
and the whole artifact loses credibility. These are real failures caught while building the
gold-standard examples; the discipline below prevents them.

## The two properties every dataset needs

**1. Internal consistency — the numbers tie out.**
Figures that should reconcile must reconcile exactly. If a sales fact table and a finance
summary both describe revenue, generate one and derive or rescale the other so they match at
every intersection. Method: generate the detailed grain, then rescale it to the target total.

```js
// after generating per-row sales that should sum to the finance revenue for each month/unit:
months.forEach(m=>units.forEach(u=>{
  const target=financeRevenue(m,u);
  const rows=sales.filter(r=>r.m===m&&r.u===u);
  const s=rows.reduce((a,r)=>a+r.rev,0), k=target/s;
  rows.forEach(r=>r.rev*=k);               // now sales ties to finance exactly
}));
```
A totals row must be the sum of its visible rows under the current filter — recompute it,
never hard-code it.

**2. Differentiation — segments tell a story, including a negative one.**
Random noise around one mean is boring and reads as fake. Give each segment a *character*:
a high-margin/low-volume unit, a declining brand, a fast-growing digital arm. Encode this in
the model (per-segment growth, margin, cycle, win rate) so the matrix rewards reading.

**Always include at least one genuine negative storyline.** A report where every number is
green and every arrow points up reads as fake — real businesses always have a soft spot. Bake
in at least one: a segment in decline, a margin compressing, a seller under target, a channel
with rising cost per lead, a niche losing win rate. This is what makes the mockup credible and,
in a real pitch, gives the consultant something to *talk about* — the problem the engagement
will fix. The negative should be real but not catastrophic: one unit down 3%, not the group in
freefall. In the gold-standard examples, Calder Foods declines while the group grows, and one
niche/seller always lags the pack — mirror that pattern.

```js
const UNITS=[
  {id:'aut', share:.34, margin:.305, growth:.03},   // big, low margin
  {id:'ene', share:.23, margin:.421, growth:.09},   // smaller, high margin, growing
  {id:'aft', share:.15, margin:.468, growth:.02},   // niche, highest margin
];
```

## Build with a seed and structure, not flat randomness

Layer real structure onto the seeded PRNG:
- **Trend:** a compound growth factor per period.
- **Seasonality:** a 12-month multiplier vector (e.g. August dips in Europe, Q4 lifts retail).
- **Jitter:** a modest `j(.95,1.05)` on top, never the dominant signal.

```js
const SEAS=[.93,.90,1.05,1.01,1.04,1.07,.94,.78,1.06,1.10,1.07,1.05]; // Aug low, autumn high
const val = base * Math.pow(1+growth, yearIndex) * (SEAS[m]/12) * j(.96,1.04);
```

## Point-in-time vs flow — a subtle trap

Flow metrics (revenue, orders, spend) **accumulate** over the selected period — sum them.
Stock metrics (net debt, headcount, followers) are a **snapshot** — take the value at the end
of the period, don't sum monthly snapshots. Summing a balance-sheet figure across 12 months is
a classic tell. In the model, store the snapshot on each row but aggregate it by taking the
last month's value, not the sum.

## Plausibility rules — the sanity checks that catch embarrassment

Before shipping, read the headline numbers as the actual audience would. Concrete guardrails
by domain:

**Finance**
- Net debt / EBITDA typically **1–3×**; a covenant is usually 3.0–3.5×. If leverage lands
  above covenant for *every* entity, the balance sheet is wrong. Anchor net debt to EBITDA
  (`netDebt = ebitda * targetLeverage`, target ~1.3–2.8×), not to revenue.
- Gross margin and EBITDA margin differ by industry — retail 6–12% EBITDA, software 20%+.
  Differentiate; don't give a food brand and a SaaS the same margin.
- Free cash conversion 40–70% of EBITDA is normal; 100%+ needs a reason.
- Revenue per FTE roughly €120–200k for services; wildly outside that flags a headcount error.

**Sales / pipeline**
- Win rate on qualified opportunities is usually **20–40%**, not 5% and not 80%. Every
  segment should close *some* deals — a niche with zero wons over a whole period reads broken.
- Open pipeline is a small multiple of closed-won for the period (roughly 1–3×), not 10×+.
- Average order value should vary by segment but stay within one order of magnitude of the mean.
- Sales cycle: weeks for SMB, months for enterprise. A €38k B2B SaaS deal closing in 5 days is
  a tell.

**Social / marketing**
- Engagement rate by platform: Instagram ~1–4%, TikTok higher, LinkedIn ~2–5%. Not 40%.
- Paid always costs money; organic doesn't. CPM/CPC land in realistic ranges (CPM a few € to
  low tens). Referral/inbound convert better than cold outbound.
- Follower growth is a small % of base per month, not a doubling.

**Universal**
- No `NaN`, `undefined`, `Infinity` in any state (the QA harness enforces this).
- Percentages that are differences of near-equal numbers should read "flat", not "−0bps".
- Signed variances use a real minus sign and sensible precision.

## The mindset

After generating, spend thirty seconds *being the CFO / sales director / CMO* reading the
page. The number that makes that person frown is the one to fix. Getting this right is the
actual product — anyone can draw a bar chart; making the bars tell a believable story is the
craft this skill exists to encode.

## Two-axis cross-filtering — the joint matrix (IPF/RAS)

A subtle but serious failure on multi-dimension reports: you author two separate breakdowns of
the same total — say revenue by **channel** and revenue by **country** — each tying out to the
company total on its own. They look right. But they are two independent 1-D tables with no join,
so clicking a country can update the state and re-render while every channel value still reads
the unfiltered global figure. Nothing is broken (the QA NaN sweep passes); the filter is simply
**inert**. This is one of the most common ways a mockup silently fails.

Rule: whenever two (or more) dimensions both roll up to the same grand total (revenue, spend,
orders) and the brief implies the user can slice by either, **do not ship two independent
tables.** Either (a) generate one grain lower (channel×country rows) and derive both roll-ups
from it, or (b) when only the marginal totals exist — normal for a hand-authored mockup — build
a **joint matrix that matches both sets of marginals** via iterative proportional fitting
(IPF/RAS). It is the same "rescale a grid to match known totals" trick as the single-axis
rescale above, applied on two axes at once. Then every visual reads cells (or row/column sums)
from the joint matrix, so slicing either dimension is real and still reconciles to the authored
totals.

```js
// Fit a seed grid so its row sums == rowT and column sums == colT (both marginals honoured).
function ipf(seed, rowT, colT, iters=30){
  let M = seed.map(r => r.slice());
  for (let it=0; it<iters; it++){
    M.forEach((row,i)=>{ const s=row.reduce((a,b)=>a+b,0), f=s?rowT[i]/s:1; M[i]=row.map(v=>v*f); });
    const colS = M[0].map((_,j)=> M.reduce((a,row)=>a+row[j],0));
    M = M.map(row => row.map((v,j)=> colS[j] ? v*colT[j]/colS[j] : v));
  }
  return M;                         // M[i][j] = revenue for channel i × country j
}
const REV = ipf(seedGrid, CHANNELS.map(c=>c.revenue), COUNTRIES.map(c=>c.revenue), 30);
// channel value under a country filter:  S.country ? REV[ci][coIdx[S.country]] : CHANNELS[ci].revenue
```
