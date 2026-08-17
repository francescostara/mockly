---
name: dashboard-mockup-generator
description: >-
  Generate presentation-ready, interactive BI dashboard mockups from a natural-language
  brief. Produces a single self-contained HTML file at 1280x720 with synthetic-but-plausible
  data, cross-filtering, drill-through and tooltips — everything reproducible in Power BI.
  Use this skill WHENEVER the user asks for a dashboard, a report mockup, a "dashboard for a
  client", a proof-of-concept BI screen, a pitch/proposal visual, a data-viz layout, or wants
  to SEE what a report could look like before real data exists — even if they don't say the
  word "mockup". Covers social/marketing analytics, sales, financial and executive reporting.
  Do NOT connect to real data or build production ETL; this is the pre-sales artifact, the
  step before the real build.
---

# Dashboard Mockup Generator

Generate a convincing, interactive dashboard mockup that a BI consultant can send to a
client to win a project. The output looks like a real Power BI report but runs as one
portable HTML file, ready to deploy on a free Vercel and embed.

The goal is **persuasion, not correctness**: the numbers are synthetic. But they must be
plausible enough that a domain expert (a CFO, a sales director, a marketing lead) never
pauses on a figure that couldn't be real. Getting the data realism right is what separates
this from a generic "make me a chart" prompt — see `references/data-realism.md`.

## Intake questionnaire — ask once, then build

**Begin every generation with one short, structured intake questionnaire, then generate
without further questions.** This is a fixed set asked once, all items together (in the product
UI, as tappable options) — not open-ended interrogation and not ad-hoc questions sprinkled
through the flow. The distinction matters: a single structured intake personalises the output
and kills the "same navy every time" monotony; scattered clarifying questions are friction and
are not allowed. Never ask about output format (it is always the interactive HTML mockup).

The intake set (skip any item the brief already answers):

1. **Who is the end user?** Role and expertise — board/exec, operational manager, analyst, or a
   non-technical owner. Drives the aesthetic and whether to include the "how to use" guide.
2. **Branding.** Does the client have brand colours / a logo? If yes, capture the primary and an
   accent. If no, pick a muted palette *family* (navy, slate-teal, charcoal-bronze, …) so two
   reports don't look identical. Drives the whole palette.
3. **Domain & purpose** — what the report must show or help decide. Drives KPI set and chart
   choices.
4. **Main time comparison** — YoY, MoM, or both. Drives the KPI basis label and slicer default.
5. **Scope** — a single overview page, or multiple pages with distinct focuses (overview +
   deep-dive, one per business line). Drives page count.

After the intake, **build immediately and do not ask anything further.** If the user declines,
says "you decide", or gives a terse brief and skips the questionnaire, apply sensible muted
defaults and generate — never block waiting. If they mention having real data (an Excel), still
generate the mockup now with synthetic data and add one closing line that it can be rebuilt on
their numbers.

## The workflow

Follow these steps in order. Each references a detailed file — read it before you rely on it.

1. **Read the brief and fix the frame.** Canvas is **always 1280x720, landscape** (Power BI
   16:9 default) unless the user states otherwise. Default to **one page plus drill-through** —
   a single well-composed page reads faster. But **generate multiple pages when the brief
   carries distinct analytical focuses or audiences** — e.g. an executive overview *and* an
   operational deep-dive, or one page per business line, or a "performance" page plus a
   "drivers" page. Each page gets its own hero visual and a purpose; don't split one story
   across two pages to pad. Use the top/side nav to switch pages. Identify: domain, audience,
   page count and each page's focus, and the entities that will drive drill-through (business
   unit, niche, seller, company…). Drill-through still applies on any page: a right-click on a
   matrix row opens a detail page and a back button returns.

2. **Choose the aesthetic direction** to match the audience. There are three house styles,
   fully specified in `references/domain-knowledge.md`:
   - **Corporate sober** — light, side nav, restrained navy/steel. For finance & operations.
   - **Agency modern** — dark, top nav, funnel-stage colour. For marketing/growth teams.
   - **Executive minimal** — light, hairline rules, monochrome + variance colour, a
     generated narrative sentence as the hero. For boards and C-level.

3. **Model the data.** Build a seeded, deterministic synthetic dataset. Make it *internally
   consistent* (totals tie out across visuals) and *differentiated* (segments tell a story,
   not random noise). This is the highest-leverage step and the easiest to get wrong.
   Full method and the plausibility rules in `references/data-realism.md`.

4. **Assemble the page** from the reusable scaffold in `references/pattern-library.md`:
   the fixed-canvas shell, the KPI band, chart helpers, the cross-filter engine, the
   drill-through mechanism, tooltips, and the fit-to-viewport scaler. Do not reinvent these —
   they are battle-tested. Copy and adapt. **Lay everything on one shared column grid**
   defined by the KPI band: every visual below spans a whole number of KPI columns so all
   edges align top to bottom (a 5-KPI report → a 2+2+1 visual row; never off-grid widths).
   Always close the page with the full-width performance matrix.

5. **Apply the house KPI card pattern.** Every KPI shows a large value, a variance chip with
   ▲/▼, and a dynamic descriptor line in the form `PY <x> | CY <y> | Var <z>`. This is the
   signature of the author's reports; keep it consistent.

6. **Wire the interactions.** Cross-filtering on every visual (click a bar/slice/row filters
   the page). Drill-through on matrix rows (right-click → a dedicated detail page with a back
   button). Tooltips on every data element. A "clear filters" / "reset" control.

7. **Quality gate — do not skip.** Run the verification sweep in
   `references/qa-checklist.md`: a headless pass over every filter/page/drill state scanning
   for `NaN`/`undefined`/`Infinity`, a numeric tie-out check, a fit-to-canvas check, and a
   domain-plausibility read (would a real expert accept these numbers?). Fix before shipping.

8. **Package for delivery.** The **primary deliverable is the interactive report itself** —
   the single HTML file, deployed to a free Vercel and shared as a live link (or embedded via
   iframe). The client clicking through it, filtering and drilling, is the sell; a static
   screenshot is a fallback, not the goal. So optimise for the live experience: fast load,
   clean fit at any container size, every interaction wired. Save the HTML to the outputs
   directory, present it, and include the two-line Vercel deploy + iframe snippet. PNG/PDF
   export are secondary and built later. Everything reproducible in Power BI; add a discreet
   "synthetic demonstration data" watermark.

## Hard rules

- **Never use real client data.** Only invented companies, brands and numbers. Client
  materials (real accounts, real deliverables) are confidential and must not appear in
  anything shippable. Fictional cases only.
- **Canvas is 1280x720 landscape** by default. If the user works at another size, the number
  of visuals per row and type sizes must change — you cannot just scale.
- **Reproducible in Power BI.** Every visual must map to something buildable: KPI cards with
  DAX measures, clustered column + line, waterfall, matrix with conditional formatting,
  donut, funnel, page navigator, drill-through page, a measure-driven text box for narrative.
- **Single self-contained HTML file.** No external dependencies, no build step, no browser
  storage APIs. Inline everything so it runs from `file://` and embeds anywhere.
- **Deterministic data.** Seed the PRNG so the same brief regenerates the same mockup.

## Non-negotiable layout & interaction requirements

These are the requirements most often dropped when a model works from memory or copies an older
example. Treat them as hard gates, not suggestions. **The canonical example
`assets/canonical-retail-fullspec.html` implements every one of them — when in doubt, copy its
markup, CSS and JS directly.** Where any other example in `assets/` differs from these rules
(older off-grid widths, chip-style date filters), **the rules and the canonical example win.**

1. **Shared column grid — use `span()` verbatim.** The KPI band defines N equal columns; every
   card in every content row below must be sized with the `span(k)` helper so all vertical
   edges align top to bottom. Never hand-pick widths like `604 / 328`. Copy this and use it for
   every card width:
   ```js
   const CW = 1044, G = 12, NC = 5;          // content width (page area), gutter, KPI columns
   const colW = (CW - (NC-1)*G) / NC;
   const span = k => k*colW + (k-1)*G;        // width of a k-column card
   // KPI cards: span(1). A 3+2 content row: span(3) and span(2). Same boundary every row.
   ```
   Pick ONE page split (e.g. after column 3) and reuse it in row 2, row 3 and the matrix so the
   dividers line up. If a table is present it takes the wider span; companions fill the rest.

2. **Year → Quarter → Month dropdown slicer (Power BI style).** A hierarchical **dropdown**,
   not a row of chips and not year+quarter only. It must include the Month level. The trend /
   timeline visual is exempt from the quarter and month filter (it keeps its full series). Copy
   the working slicer component from `assets/canonical-retail-fullspec.html` (the `#slBtn` /
   `#slPanel` markup, its CSS, and the `inSel()` / `ff(..,{timeline:true})` logic).

3. **KPI cards label the basis (YoY / MoM)** on every variance, following the selected grain
   (year/quarter → YoY, month → MoM). Use the `kpi()` helper with the `basis` shown.

Before delivering, self-check all three: every content card width is a `span(k)` call; a
Year→Quarter→Month dropdown exists and the trend ignores month/quarter; every KPI shows YoY or
MoM. If any fails, fix it before finishing.

4. **Every filter must actually filter, at the shared layer.** A filter that changes state but not
   the numbers on screen passes the NaN sweep and is indistinguishable from broken. Wire each
   global filter through the one shared aggregation function the KPI band uses (not per-visual),
   and give every toolbar filter a real or documented-modeled data path — no decorative filters.
   When two dimensions both roll up to the same total and either is sliceable, build a joint
   matrix (IPF/RAS, see `data-realism.md`), not two independent tables. **Self-check:** click each
   filter and confirm a KPI card's *text* changes, not just a CSS class (`qa-checklist.md` Gate 5).
5. **Toolbar width is budgeted like page height.** Any dimension with more than ~4-5 members is a
   dropdown, not a chip row; sum the fixed-width controls and keep them under the content width so
   the bar never silently clips (`qa-checklist.md` Gate 6).
6. **Insights/narrative panels must be PBI-reproducible.** A free-text panel of hand-written
   bullets referencing specific entities is not a native Power BI visual. Either make it a
   measure-driven text box with values interpolated from real measures (per the executive-minimal
   narrative pattern in `assets/executive-board-report.html` — the allowed form), or omit it —
   never ship authored prose as if it were a buildable visual. None of the gold-standard examples
   ship a static prose panel; do not introduce one.

## Output economy — keep it fast and light

The output should be lean: it generates faster, embeds better, and has less surface for bugs.

- **Copy the engine; don't re-derive it.** The chart helpers, `span()` grid, date slicer,
  cross-filter wiring, tooltip and fit-to-viewport in `assets/canonical-retail-fullspec.html` are
  tested — copy them close to verbatim and spend generation effort on the *data model and layout*,
  not on reinventing the engine. Re-deriving ~400 lines of engine each time is the main source of
  both slowness and variability.
- **Smallest sufficient data model.** Use a seeded generator plus aggregates; don't emit
  thousands of literal synthetic rows when a compact model reproduces the same visuals.
- **No dead weight.** No unused helpers, no unused CSS classes, no duplicated per-visual
  boilerplate. One helper, called many times.
- **Target the canonical's weight** (~500 lines / well under 60KB for a single page), not 900+.
  If a file balloons, it usually means the engine was rebuilt or the data model was over-modeled.

## Optional deliverables (on request or when the audience needs them)

- **"How to use" / KPI-glossary guide for the end user.** Include it **only when warranted**:
  the report is **multi-page** *and* either the audience is inexperienced *or* the report has
  **calculated / non-obvious KPIs that need explaining** (e.g. Net Achieved, a custom margin).
  Then add a documentation view — a dismissible ⓘ panel or a dedicated page — defining each KPI
  in plain language and explaining the pages and filters, in the report's language. For a
  single-page report or an expert audience with self-evident metrics, skip it. Never let it
  clutter the default view.
- **Power BI build guide.** If the user asks how to build this for real, produce a companion
  guide (as text, not inside the HTML): the data model and tables needed, each visual mapped to
  its Power BI visual type, the key DAX measures (with the YoY/MoM and variance patterns), the
  slicer and drill-through setup, and the layout on a 1280x720 canvas. This turns the mockup
  into a buildable spec. Offer it; don't include it unprompted.

## Language

Default to the language of the brief. The author delivers client-facing work in Italian for
Italian clients and in English otherwise — match that. Never mix two languages in one output.

## Reference files

- `references/pattern-library.md` — the reusable HTML/CSS/JS scaffold and every chart helper.
  Read this before writing any markup.
- `references/house-style.md` — the author's REAL practice, extracted from his client work:
  design philosophy (decision-questions, one-measure-many-grains, the revenue-vs-margin tension),
  his house layout, consistent entity colours, conditional-format matrices, and the chart
  techniques he actually uses. Highest-authority reference; read it first.
- `references/chart-selection.md` — how to CHOOSE the right visual for each analytical question
  (ribbon, 100% stacked, Pareto, when pie is and isn't allowed) and how to vary the mix and
  palette. Read this to avoid shipping the same bars-and-donut every time.
- `references/domain-knowledge.md` — the three aesthetics (full design tokens + palette
  variants), plus KPI sets and report structures per domain (social/marketing, sales, finance,
  executive).
- `references/data-realism.md` — how to generate synthetic data that ties out and stays
  plausible, with the specific sanity checks that catch embarrassing numbers.
- `references/qa-checklist.md` — the pre-delivery verification sweep, with a ready headless
  test harness.

## Gold-standard examples

Three complete, verified mockups live in `assets/`. When in doubt about structure, density,
interaction wiring or data realism, open the closest one and follow it:

- **`assets/canonical-retail-fullspec.html` — THE primary reference.** Corporate-sober retail
  report that implements every current rule: the shared `span()` grid with edges aligned across
  all rows, the Year→Quarter→Month dropdown slicer with a timeline-exempt trend, YoY/MoM-labelled
  KPI cards, a negative storyline, drill-through, and the full-width closing matrix. Copy from
  this first; where the three below differ, this file and the rules win.
- `assets/corporate-financial-sales.html` — corporate sober, financial + sales, drill-through
  (older; predates the grid/dropdown rules — use for chart variety, not layout).
- `assets/agency-lead-pipeline.html` — agency dark, lead scouting + pipeline by niche/seller
  (older; chip filters — follow the rules over its date-filter style).
- `assets/executive-board-report.html` — executive minimal, board report with live narrative
  (older; use for the narrative pattern and the bridge/waterfall charts).
