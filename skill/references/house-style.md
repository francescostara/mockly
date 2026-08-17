# House Style — the author's real practice

Extracted from the author's actual client work (sales, creator-economy, logistics, energy /
manufacturing) and his written design notes. This is the highest-authority reference for *how
he thinks*: where the rules here are more specific than the generic guidance, follow these.

## Design philosophy — the "why" behind every choice

1. **Design around decision questions, not metrics.** Every report answers three or four
   concrete questions the owner actually asks — "which routes are profitable? which clients
   bring revenue but destroy margin? who are the efficient drivers?" Lead the page with the
   visuals that answer those, not with whatever data exists. State the questions; then answer
   them.
2. **One measure, varied by grain — never a new metric per view.** The same measure (e.g.
   margin) is evaluated by vehicle, type, country, driver, day. Keeping one measure and varying
   the grain is what keeps two pages reconcilable when two people compare them. In a mockup:
   the KPI recomputes consistently at every filter/drill grain; don't invent parallel metrics.
3. **Normalise to a "unit of truth" for fair comparison.** Totals flatter big entities; a
   per-unit efficiency metric (margin *per km*, revenue *per FTE*, cost *per shipment*) makes
   large and small entities directly comparable. Surface the normalised metric, not only totals.
4. **Surface the revenue-vs-margin tension.** A recurring deliberate insight: entities that look
   good on revenue but bad on margin. This is his signature "negative storyline" — build it in
   (a declining category, a high-revenue/low-margin client) and make it visible.
5. **"Not a fancy dashboard full of colours."** Restraint. Colour carries meaning — brand,
   variance, or a single red highlight on the problem — never decoration.

## Recurring structure (his house layout)

- **Filters on one axis**, tailored to the client: top slicer row (sales, logistics — often as
  cards or coloured header dropdowns) OR a left filter rail (energy, creator-economy). Never
  split. A hierarchical date slicer (Year + Month) is standard.
- **KPI band on top, 3-5 cards.** His KPI card is a big number + arrow, plus one descriptor
  line. He uses several descriptor patterns — match to context:
  - period compare: `Feb: $13,528 | Mar: $23,667 | Var: +$10,139`
  - vs target: `Target: $44,500 | Diff: -$7,305 (▼ -16%)` with a status word `▲ On Target` / `▼ Below Target`
  - vs last year as a coloured pill: `vs Last Year $30.1M -13.2%`
  - often a small **area sparkline** in the card footer.
- **A dense analytical matrix is the centre of gravity**, with row/column totals and, crucially,
  **conditional formatting** — a green/yellow/red heatmap on the margin/ratio column, and MoM
  arrows (→ ▲ ▼) with the delta. This is more than a plain table; it is the analytical heart.
- **Consistent colour per category across every visual.** The author keeps a fixed colour
  pattern keyed to the *category* (product category, team, rep, segment): each category holds
  the same colour in every chart on every page. This is a firm, always-on rule — never recolour
  the same category between visuals, and carry the same category palette across pages.
- **"Best X for Y" ranked horizontal bar lists**, and **4-up small multiples** of the same bar
  chart to compare entities across several metrics at once.
- A **Chart / Table view toggle** on data-heavy visuals.
- A dedicated **variation page (MoM / WoW)** with grouped columns for multi-metric change.
- A **KPI-glossary / "how it works" page — only when warranted, not by default.** Include it
  only for **multi-page** dashboards *and* when either the end user is inexperienced *or* the
  report has **calculated / non-obvious KPIs that need explaining** (e.g. Net Achieved, MER vs
  ROAS, a custom margin or profitability-floor concept). For a single-page report, or an expert
  audience with self-evident metrics, skip it. When it earns its place, it defines each KPI in
  plain language and explains each page and its filters, with navigation (home / page tabs).
  - **The filter explainer must be a per-visual impact table, not vague prose.** State, for each
    filter: which pages it acts on, exactly which visuals it moves, and whether the effect is
    Exact or Modeled — rendered as a table in the report's matrix style. "Country and Channel are
    modeled jointly" is not useful; "Country → moves KPI band, trend, channel chart, country
    matrix, campaign table, funnel — Exact" is.
  - **Generate that explainer from an audit of the actual code, not from intent.** Grep every
    place each filter's state is read and describe what you find. Writing the explainer this way
    is a forcing function that catches silent drift — in testing it is exactly what surfaced a
    funnel that had quietly lost its date-dependency during an earlier refactor. Treat the
    documentation page as a self-check, not just output.

## Chart techniques he actually uses — reach for these, not just bars+donut

- **Ribbon chart** — rank evolution of entities over months (rep/team revenue), consistent
  colours, values labelled in the bands. His go-to for "who's leading changed over time."
- **Scatter segmentation** — Gross Margin % (y) vs Revenue (x) with **median reference lines**
  splitting four quadrants, to expose high-revenue/low-margin clients. The canonical way he
  shows the revenue-vs-margin tension.
- **Combo column + line, dual axis** — Revenue (columns) with Margin % (line) over months.
- **Gauge / radial with a target marker** plus a one-line textual annotation ("CR is 81%, 31%
  above the 50% target"). Used for rate-vs-target KPIs.
- **Funnel** — Leads → Deals → Paying Customers, with absolute and % at each step.
- **Treemap** — product/category mix where one slice dominates (Pareto), e.g. Course 90%.
- **2-category donut** — OTM vs NOTM style splits, to dramatise a Pareto share.
- **Conditional-highlight bars** — a ranked bar list mostly one colour with the *problem* entity
  in red (a high-cost/low-profit customer standing out).
- **Status-flag table** — a categorical flag column coloured red/green ("Leakage" / "Healthy").
- **Grouped columns for variation** — WoW/MoM Profit, Revenue, Cost side by side with % labels.
- **Bubble map** — geographic profit/revenue/cost by country.
- **Waterfall** — inventory or P&L movement (green additions, red reductions).
- **Line vs target band** — actual line over a shaded target range.
- **Parameter sliders** (what-if) — e.g. Labor Cost Rate, Shop Hourly Rate driving the model.

## Aesthetic signatures by client type

- **Sales / portfolio:** light grey field, white rounded cards with a soft shadow, black
  slicer + logo cards, jewel-tone per-rep colours; black bars for aggregates, coloured bars for
  per-entity.
- **Creator-economy:** dark/near-black theme, one bright brand accent (pink), themed
  naming, white text.
- **Logistics:** teal/green brand, coloured top slicer strips, red reserved for leakage /
  negative profit.
- **Energy / manufacturing:** light field, periwinkle/purple accent, a left filter rail with
  many dropdowns and parameter sliders, and a dense conditional-format heatmap matrix.

The through-line: he matches the palette tightly to the client's brand, keeps everything else
restrained, and always reserves red for the problem. When no brand is given, stay muted
(see `domain-knowledge.md`) but keep the red-for-problem convention.
