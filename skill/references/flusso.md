# The guided flow: Brief → Structure → Template → Build → Editor

Source: `docs/pruva-prodotto-editor-PER-CLAUDE-CODE.md` (product spec, decisions of 23 Oct 2026).
The user decides the FORM first; the AI fills the CONTENT after. This file holds the rules the
engine enforces for the flow; names are Pruva's own, never taken from other tools.

## One document: the project
Everything the user decides lives in one **project** (`engine/progetto.js`). The engine spec is
never written by hand: `engine/compila.js` derives spec and data from the project. Every user
action goes through `mutateSpec` (`engine/azioni.js`): new project → compile → engine validation.
An action that would produce an invalid report is refused, the state does not change, and the
message names the field. Undo and redo walk a history of projects.

## Structure
`{ title, purpose, niche, pages: [{ id, title, subtitle, content }] }`. The niche is recognised
here and drives the later steps. A missing field takes the niche default; never a question back.
With data provided (`engine/dati-forniti.js`), the measures offered come from the data columns.

## Template
A template is a complete look: skin (palette, typography, shell, density, band) plus a card style
and a panel style. Templates come from `engine/catalogo.js`; 1–2 are marked "recommended" for the
niche.

## Build, page by page
- **KPI row:** `full` (value and variations), `value` (value only), `off` (no row; the space goes
  to the panels).
- **The KPI row is per page (Fra, 23 Oct 2026).** Each page has its own KPI cards (0–6) and its
  own grid: the grid has as many columns as the page's KPI cards, so every panel edge still lines
  up with a KPI edge inside the page. A page with no KPI row, or with no cards, declares its
  columns (the layout decides them). Spec: `page.kpi = { mode, cards }`, `page.columns`.
- **Card styles:** Plain · Badge · Banner · Ruled · Wash · Outline · Solid; with a chart: Columns ·
  Area · Stack · Ring. A chart style needs the data to support it (a time series, a breakdown, a
  share); otherwise it is offered greyed out with the reason. Tints use the theme accent, never the
  problem red.
- **Panel style:** header Quiet · Framed · Band · Tab, subtitle yes/no; one choice for the page.
- **Layout codes:** rows separated by `/`, columns by `+`, each number a span on the page grid:
  `3+2/5` is two panels (3 and 2 columns) over one panel of 5. A code whose rows do not sum to the
  grid is refused: no layout lives off the grid. The recommended layout comes from the page's
  archetype (`layout-archetypes.md`).
- **Fill page** (phase C) fills the panels of the chosen layout; until then the panels are
  deterministic placeholders.

## How the styles are drawn (phase B)
- **The accent of a card or panel style is the theme's frame colour**, never a data colour and
  never the problem red: on a light theme the rail colour, on a dark theme the rail lifted 30%
  toward white (`--acc`). Data colours belong to the members of a dimension; borrowing one for a
  card fill would make "Wash" and "the second region" the same colour.
- **Tints:** Wash is the card surface veiled 7% (10% on dark) toward the accent; the Band header
  is veiled 9%. Text on a tint keeps 4.5:1. Solid and Banner put light text on the accent and keep
  4.5:1 as well; the variations inside a Solid card are drawn in the light ink, with the arrow
  carrying the direction, because blue and orange on the accent would not read.
- **Badge** draws one small glyph from the unit of the measure (money, share, count, duration).
  Ruled puts a thin rule under the label. Outline thickens the frame to 1.5px in the accent.
- **Chart cards keep the KPI card height.** The mini chart sits to the right of the value, from
  the report's own data: Columns and Area the last 12 months (or the years, for annual data) of
  the measure, Stack the same months split by the first dimension (top 3 members plus the rest),
  Ring the share of the measure against 100%. Neutral marks: the current period in `--cur`, the
  rest in `--prior`; Stack uses the series colours of the members. Columns start at zero (a column
  is a length); Area runs from the minimum to the maximum of the series, because it is a trajectory:
  from zero, twelve months that move by ten percent were a flat band.
- **Panel headers:** Quiet has no separator and a small icon before the title; Framed draws a rule
  under the header; Band tints the header; Tab puts the header in a detached box above the body.
  The frame of the panel always stays visible. With subtitle "no" the panels have only a title.
- **A report that does not declare a style looks as before:** classes and rules travel only when a
  page declares `kpi.style` or `panels`.
- **Template names are English in the interface** (`name`), the ids stay as they are.
