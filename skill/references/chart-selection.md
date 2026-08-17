# Chart Selection — think like a BI developer

The default failure of an AI-built dashboard is monotony: the same KPI band, line, donut and
bar in the same navy every single time. A real BI developer earns the project by choosing each
visual from the *question being asked* and by varying the look to the client. Choose
deliberately — this file is the decision guide.

## Pick the visual from the analytical intent

| The question the visual answers | Use | Avoid |
|---|---|---|
| How did one measure move over time? | Line (trend). Column if only a few periods. | Pie |
| Part-to-whole at a single moment | 100% stacked bar; treemap; donut **only if 2-5 slices** | Many-slice pie |
| Composition changing over time | 100% stacked column/area; **ribbon** for rank flow | Stacked pie series |
| Compare categories on one measure | Horizontal bar, **sorted by value** | Pie |
| Ranking, and how rank *changes* over time | **Ribbon chart** | Grouped bars (hide the crossings) |
| Contribution to a total / Pareto 80-20 | Pareto (sorted bar + cumulative % line); donut to dramatise a 2-5 split | Flat table alone |
| Are two measures related? | Scatter; or dual-axis column + line | |
| Distribution of values | Histogram; box plot | |
| One number vs a target | KPI card, optionally a bullet/gauge | |
| Decomposition of a change (A→B) | Waterfall / bridge | |
| Actual vs budget/prior over time | Clustered column + reference line | |
| Movement between stages | Funnel | |
| High revenue but low margin? (the tension) | **Scatter segmentation** (margin% vs revenue, median quadrant lines) | A flat table |
| Rate vs a target | Gauge/radial with target marker + a one-line annotation | |
| Rank evolution over months | **Ribbon** (consistent entity colours, values in bands) | Grouped bars |
| Movement / P&L or inventory decomposition | Waterfall (green add, red reduce) | |
| Geographic performance | Bubble map by country | |
| Multi-metric variation (MoM/WoW) | Grouped columns with % labels | |
| Revenue with margin% together | Combo column + line (dual axis) | Two separate charts |

## The author's explicit rules

- **Pie / donut: 2 to 5 categories, maximum.** And reserve it to *make a point* — a Pareto
  split where one or two slices dominate, or a clean two-way share. Six or more slices, or many
  near-equal slices, → use a **sorted horizontal bar** or a **100% stacked bar** instead. A pie
  that needs a legend of eight items has already failed.
- **100% stacked bars for composition.** When the question is "what *share* of the whole," not
  "how much." Comfortable with 3-4 series; label the dominant segment. Use several small 100%
  stacked bars (one per group) to compare compositions across groups.
- **Ribbon chart for rank change over time.** When categories reorder across periods — which
  product line led each quarter, which channel overtook another — a ribbon shows the crossings
  a grouped bar buries. Reach for it whenever "who's winning changes over time" is the story.
- Sort bars by value, not alphabetically, unless there is a natural order (months, sizes).
- One **hero** visual per page carries the story; everything else supports it.

## Vary the visuals and the palette across reports

Do not ship KPI-band + line + donut + bar in the same navy every time — that reads as
templated, and templated loses the project. Two levers:

- **Rotate the visual mix** to what the data needs to say. A composition story wants 100%
  stacked bars, not a donut and a table. A "who's leading changed" story wants a ribbon. A
  Pareto wants a Pareto chart. Let the analytical intent above drive the mix, and let it differ
  from report to report.
- **Rotate the palette** within the chosen aesthetic — see the palette variants in
  `domain-knowledge.md`. Same structure, different hue family, so two reports for two clients
  don't look identical.

## Make it compelling, not merely correct

The consultant wins by making the client *see* the insight in three seconds. Lead the page with
the visual that shows the story — usually the negative storyline or the standout performer —
give it the hero span, annotate the single point that matters, and let the matrix carry the
detail underneath. A correct chart nobody reads is a lost pitch.


## The author's real practice

For how the author actually composes reports — consistent colour per entity across all visuals,
conditional-format heatmap matrices, gauge-with-target KPIs, "best X for Y" ranked lists, 4-up
small multiples, scatter segmentation for the revenue-vs-margin tension, and the design-around-
decision-questions philosophy — see `house-style.md`. It is the highest-authority reference and
overrides generic guidance where more specific.