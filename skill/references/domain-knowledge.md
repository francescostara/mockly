# Domain Knowledge

Two things live here: the three house **aesthetics** (with exact design tokens), and the
**domain playbooks** (which KPIs, which visuals, which report structure) per business area.
Pick an aesthetic by audience, then a playbook by domain.

## Table of contents
1. Choosing the aesthetic
2. Aesthetic A — Corporate sober
3. Aesthetic B — Agency modern (dark)
4. Aesthetic C — Executive minimal
5. Domain playbook — Social / marketing analytics
6. Domain playbook — Sales & pipeline
7. Domain playbook — Financial & operations
8. Domain playbook — Executive / board
9. The narrative sentence

---

## 1. Choosing the aesthetic

- **Board / C-level / investors →** Executive minimal. They read sentences and variances, not
  chart junk.
- **Marketing / growth / agency team →** Agency modern. Dark, energetic, funnel-centric.
- **Finance / operations / ops review →** Corporate sober. Restrained, trustworthy, dense.

When the domain and audience disagree (a *marketing* report for a *board*), the audience wins
the aesthetic and the domain wins the content.

### Default colour when no brand is specified

If the brief gives no brand colours, **default to a muted, desaturated palette** — the greys,
navies, steels and soft accents defined in each aesthetic below. Restraint reads as
professional and executive; punchy saturated colour reads as consumer or template-y and dates
quickly. Reserve any stronger colour for meaning (variance up/down, funnel stage), never for
decoration. When the client *does* have a brand, sample its primary and one accent and map
them onto the same restrained structure rather than colouring everything.

### Rotate the palette — don't ship the same look every time

Two reports must not look identical. Within each aesthetic, rotate among these muted variants
(pick one per report; keep variance colours as-is):

- **Corporate sober** — (a) navy/steel *(default)*: `#12304F #1F4E79 #4A7FA8 #7FA8C6 #C6D7E4`;
  (b) slate/teal: `#20323A #2F5D63 #4E8A86 #86B3AC #C4DAD3`;
  (c) charcoal/bronze: `#26262B #4A4038 #7A6A52 #A8926E #D8C7A6`.
- **Agency modern** — rotate the accent pair on the dark shell: violet/teal *(default)*
  `#6E7BB8/#5FA3A8`; indigo/coral `#5C6BC0/#E08A78`; teal/amber `#3DA8A0/#D6A24C`.
- **Executive minimal** — the ramp stays greyscale; rotate the single variance-neutral accent
  used for the trend fill/line: muted blue `#3E5C86`, muted green `#3F6B57`, or muted plum
  `#6A4E6E`. Keep up/down variance colours fixed.

Match the hue family loosely to the domain when it helps (warm neutrals for food/retail, cool
blues for finance/industrial), but stay muted. The point is that a batch of mockups reads as
bespoke, not stamped from one template.

## 2. Aesthetic A — Corporate sober

Light, side navigation, restrained. Trust over flash.

```
--canvas:#EDF0F4  --card:#FFFFFF  --line:#E2E7EE  --ink:#16202E  --ink2:#3A4759  --muted:#7A879B
--rail:#0E2439 (dark side nav)  --navy2:#1F4E79  --steel:#4A7FA8
sequential blues: #12304F #1F4E79 #4A7FA8 #8FB3CC #C6D7E4
--good:#2E7D5B  --bad:#B3453B  --amber:#C08A2E (budget/target line)
font: Segoe UI stack.  Cards: 1px border, 2px radius, whisper shadow.
```
Layout: dark left rail (brand, page buttons, slicers) + white content. KPI cards in a row,
then charts, then a matrix with a totals row. See `assets/corporate-financial-sales.html`.

## 3. Aesthetic B — Agency modern (dark)

Dark, top navigation, colour carries meaning (funnel stage).

```
--bg:#111420  --card:#191D2B  --card2:#1F2434  --line:#2A3143  --ink:#EDF0F7  --muted:#7C879E
--acc:#7A5AF8 (violet)  --acc2:#2FC2C9 (teal)
stage ramp: Sourced #3D4A6B, Contacted #4C6FE0, Qualified #2E9BD6, Meeting #22B5A6, Proposal #F0A63C, Won #35C48A
--up:#35C48A  --dn:#E0576B
Cards: 6px radius, subtle top-lit gradient. Pill-shaped filter chips. Rounded bars.
```
Layout: top bar (brand + tab nav) + a filter strip of chips + page. KPI cards carry
sparklines. See `assets/agency-lead-pipeline.html`.

## 4. Aesthetic C — Executive minimal

Light, hairline rules, **no card borders**, monochrome with colour reserved strictly for
variance. A generated narrative sentence is the hero element.

```
--paper:#FFFFFF  --ink:#14171A  --ink2:#42484F  --mid:#6D747C  --muted:#9BA1A9  --rule:#E4E4E0
grey ramp: #14171A #4E555D #868D95 #BEC3C9 #DDE0E3
--up:#1F6B4F  --dn:#A03328   (variance only — nothing else is coloured)
narrative font: Georgia/serif ~18px.  Body/labels: Segoe UI. Uppercase micro-labels, wide tracking.
```
Layout: masthead (wordmark + "Confidential") + period bar + a serif narrative paragraph +
a 5-metric KPI band separated by thin rules + charts + a matrix. See
`assets/executive-board-report.html`.

## 5. Domain playbook — Social / marketing analytics

The author's core domain. Structure a monthly report around platform performance.

**Headline KPIs:** Reach, Impressions, Engagement rate, Follower growth (net), Video
views/completion, Link clicks / CTR, and for paid: Spend, CPM, CPC, ROAS.

**Per-platform nuance (get this right — it signals real expertise):**
- **Instagram/Facebook (Meta):** reach vs impressions distinction, reels plays, saves &
  shares as engagement, story completion. Split **paid vs organic**.
- **TikTok:** video views, average watch time, completion rate, shares; growth-driven.
- **LinkedIn:** impressions, engagement rate, follower demographics, click-through; B2B tone.
- **YouTube:** views, watch time (hours), average view duration, subscribers gained.

**Structure (single page default):** cross-platform overview — KPI band + trend (this period
vs last) + platform-mix donut + per-platform table with a sparkline. Only if the brief asks
for depth, add a second page: content/campaign breakdown, paid vs organic split, top posts.
Commentary in Italian for Italian clients. Campaigns are named fictional (never real client
campaigns).

**Visuals:** trend line (this period vs last), platform-mix donut, engagement-rate bars by
platform, a content/post matrix with a sparkline, paid vs organic stacked bar.

## 6. Domain playbook — Sales & pipeline

**Headline KPIs:** Net sales, Orders, Average order value, Win rate, Pipeline value (open),
Weighted pipeline, Average sales cycle (days). Mark lower-is-better metrics with `inv`.

**Entities for drill-through:** business unit, sales rep, customer, niche/segment.

**Structure (single page default):** overview — KPI band + sales-vs-prior trend + mix donut +
top customers + a rep/segment matrix with drill-through. Add a second performance page (funnel,
largest open deals) only if the brief asks. Weighted pipeline uses stage probabilities (e.g.
Qualified 20% / Meeting 45% / Proposal 70%).

**Visuals:** clustered column vs prior year, funnel with step conversion, ranked horizontal
bars (customers, reps), rep matrix with vs-target variance and a data bar for open pipeline.

## 7. Domain playbook — Financial & operations

**Headline KPIs:** Revenue (vs budget), Gross margin, EBITDA & margin, Free cash flow &
conversion, Net debt / EBITDA (inv), Revenue per FTE, Capex.

**Structure (single page default):** group summary — KPI band + revenue-vs-budget column/line +
EBITDA waterfall + business-unit matrix with totals and drill-through. Add a drivers page
(revenue bridge PY→CY, margin by unit, cash & leverage table) only if the brief asks.

**Visuals:** revenue vs budget clustered column with budget line, EBITDA bridge waterfall,
cost-structure horizontal bars (% of revenue), BU matrix with growth/margin/EBITDA.

## 8. Domain playbook — Executive / board

A synthesis layer over the others. Fewer numbers, more meaning. Five-metric KPI band max.
The **narrative sentence** (section 9) is the centrepiece. Add a revenue bridge decomposed by
operating unit, a margin-by-unit bar with a prior-year tick marker, and a cash/leverage
table. Always state covenant headroom if leverage is shown. Compare against the same period
prior year, stated explicitly.

## 9. The narrative sentence

The single most differentiating element. **Default it only in the executive-minimal
aesthetic**, where it is the hero. In corporate and agency mockups, include it *only if the
brief explicitly asks* for written commentary or an executive summary — there it adds weight
the audience may not want, and the visuals carry the story. When present, it is a sentence
(or two) that **recomputes from the filtered data on every interaction**: it names the biggest
contributor and the biggest drag, states the margin move in bps, and reports headroom or a
key ratio. It is the DAX "measure-driven text box" pattern promoted to hero.

Rules that keep it from reading like a broken template:
- Proper list grammar: `A, B and C` — never `A and B and C and D` (use a join helper that
  puts commas between all but the last pair).
- Guard empty sides: if every segment grew, don't say "X gave back €0" — say "every unit grew".
- Treat near-zero movements as words: a flat margin reads "held at", not "−0bps".
- Colour only the variance spans (`.up`/`.dn`), never the whole sentence.

Example shape (finance):
> "The group delivered revenue of **€411.2m**, **+6.2%** ahead of prior year, led by *Vestra
> Care* at +12% and held back by *Calder Foods* at −3%. EBITDA margin expanded **34bps** to
> **13.1%**, and free cash flow of €25.7m represented 48% conversion."
