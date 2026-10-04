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
| Best AND worst performers ("which products need attention?") | Two ranked bars: `top` N and the tail with `order:"asc"` — side by side, or one card with two views (`motivo:"due-lenti"`) | Only the top list: the weak tail is half the question |
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


## Maps and location visuals — use them, don't skip them

Whenever the data has a **location dimension** (store, venue, region, country, route, territory,
sender/receiver), a map is often the most immediate visual and is heavily used in real
dashboards. Do not default to omitting geography. Options:
- **Bubble map** — a metric (profit, revenue, cost) sized/coloured per location. Great for
  "which places win/lose" (logistics routes, sales territories, retail estate).
- **Filled/choropleth map** — a metric shaded by region/country.
- If a true map isn't feasible in the render, a **location matrix or ranked bar by place** with
  conditional formatting is the fallback — but prefer the map when a location dimension exists.
Applies across niches: retail (by store), F&B (by venue), sales (by territory), logistics
(by route/country), not only logistics.


## Labels and bars — readable at a glance (Fra, 3 Oct 2026)

Before choosing a visual, ask two questions, not one: **is every label fully visible and
uncut**, and **is every bar visible at a size that makes comparison possible?** A ranked list
whose bars are thin slivers in six colours, with the figure written outside the card, fails
both, even when the numbers are right.

The engine draws the `hbar` in the "space-saving" layout of Power BI: the name sits above the
bar, the bar spans the card in ONE colour, the value is bold at the end of the bar (or inside
it, in contrasting ink, when it would not fit outside), and the `subMeasure` sits muted on the
name's line, right-aligned. What that asks of the spec:
- **One or two figures per bar, no more.** The value, plus at most one detail
  (`subMeasure`, e.g. a share, a count, a rate). Keep `subUnit` short (" late", " STP").
- **Short member names.** They have the whole card width, but a name like
  "USD · SWIFT · 17:00" is already the limit.
- **Use the hbar where the comparison is the point.** If one member is ten times the others,
  the others become slivers. Then rank a RATE or a share instead of the absolute value, or use a
  matrix with a `share` column. A bar chart where only the first bar is readable answers nothing.
- **Time series:** label what the reader needs (the last point, the minimum and maximum), not
  every point. The engine does it by default on every trend and on the line of a column + line
  chart with at least six points; `"labels": false` turns it off when the chart is too dense.
- **Ranked bars of an additive measure show their share of the total** next to the value
  (`€2,922.0K 52%`), computed on all members, not only the ones shown; `"share": false` turns it
  off. Rates, ratios and stocks never get a share. Put the line of a column + line chart on its own axis, which fits the data (the
  engine does it).
- **A rate with a target shows the target.** In a column + line chart whose line is a
  percentage with a target (compliance 98%, OTIF 92%), declare `"target": 0.98`: the engine draws
  a fixed dashed line on the line's axis, which spans the whole chart height as in Power BI.
- **The same member keeps the same colour everywhere.** The swatch of a currency in a table is the
  colour of its bar in the ranked list; the engine does it, so do not fight it with a `parent`
  unless the parent is the point.
- **Nothing outside the card, nothing overlapping.** That is a gate, not a preference.

## Filters filter, clicks highlight (4 Oct 2026)

The toolbar filters behave like Power BI slicers: they filter every visual, the ones broken down
by that dimension included. A click on a bar or a row highlights its own chart and filters the
others. When a visual must keep showing all members whatever the filter (a composition of all
segments, a benchmark of all entities), detach it with `"ignoreFilters": ["<dim>"]` — in Power
BI that is Edit interactions → None, and the kit writes it down.

## Finance reporting — actual, budget, prior year (Bodan, 3 Oct 2026)

A CFO report is read in the language of finance; the engine speaks it, if the spec asks:
- **The income statement is a `statement`, not a matrix by entity.** Lines in account order,
  subtotals (`kind: "sub"`) as calculated measures, margins as `kind: "pct"`, the bottom line as
  `"total"`. Give every cost/revenue line its `budget` measure and its `accounts` (3–5, with
  weights) so the reader can open a line. Model one budget field per line (`bRev`, `bCogs`,
  `bRnd`, …) and the budget subtotals as `diff` measures, like the actuals.
- **KPI cards carry `budget` and `ytd`** when the brief asks for month and YTD against budget
  and prior year.
- **Variance columns are `kind: "bud"`** (absolute and %), never a plain difference column:
  they take the finance colours. Set `meta.varianze: "finanza"` when the brief asks for red and
  green, and `meta.numberFormat: "k1"` for thousands with one decimal.
- **A cash bridge goes from opening to closing cash by flow type:** a `waterfall` with `stock`
  and `steps`, on a `cumulative` net-cash field.
- **Default the date filter to the latest month** (`"m": 11`) when the brief talks about "the
  month" and YTD: with the full year selected, YTD is the year itself.

## gauge — un valore contro il suo bersaglio

Quando la domanda e "siamo arrivati dove dovevamo?". Firma in B2B sales (quota attainment, win
rate contro target) e creator-economy (target achievement).

**Solo misure di tipo tasso** (`unit: 'pct'` o `'x'`), e il motore rifiuta le altre. Il motivo:
il gauge si affetta coi filtri, il suo bersaglio no. Con "fatturato contro target 2M", filtrare
una regione mostra la quota di quella regione contro il target di tutta l'azienda — un numero
falso che sembra un disastro. Un tasso non ha il problema: il bersaglio di un win rate e lo
stesso per ogni segmento. Se serve un valore assoluto, la misura giusta e il rapporto: non
"fatturato contro target" ma "quota raggiunta", cioe fatturato / target.

**Nessun doppione della banda KPI.** Se la misura ha gia la sua card in alto, un gauge accanto
ripete lo stesso numero (lo ha detto l'autore: "se un gauge mostra gia qualcosa che c'e nelle card
KPI, non metterlo"). Il bersaglio si scrive nell'etichetta della card ("OTIF (target 92%)") e lo
spazio va a cio che la card non puo dire: DOVE si perde (funnel dei passaggi: ordini -> puntuali ->
puntuali e completi), CHI e sotto il bersaglio (hbar per entita, `order:"asc"`), QUANDO (trend).
Il gauge resta per un tasso che NON e in banda. Il motore rifiuta il doppione.

**Lo spazio segue l'informazione.** Un gauge dice UN numero contro UN bersaglio: da solo in una card
larga meta pagina occupa lo spazio di un grafico per l'informazione di una KPI (lo ha segnalato
l'autore su due mockup di fila). Un gauge singolo sta in una card stretta (una colonna, al massimo
300px); quando i bersagli sono piu d'uno — OTIF, puntualita, fill rate; NRR e churn — si affiancano
nella stessa card con `misure`, due o tre. Se il bersaglio e uno solo e la card e larga, lo spazio
va a un altro visual, o il numero va nella banda KPI.

Tre parti obbligatorie: l'arco, il **marcatore del bersaglio** (senza, il numero non ha metro) e
l'**annotazione** costruita dalle misure — "Win rate 20,6%, 0,4 pp sotto benchmark", mai un
testo fisso.

## heatmap — densita su due dimensioni

Quando la domanda e "dove si concentra, incrociando due assi?". Righe = membri di `dim`, colonne
= membri di `by` (oppure i mesi con `by:"m"`, i trimestri con `by:"q"`).

E' l'unico visual che ruota una seconda dimensione sulle colonne: la `matrix` ci mette le
MISURE. Quindi fascia oraria x giorno, cliente x SKU e coorte x mese dall'ingresso si fanno solo
qui. Firma nell'archetipo operativo (F&B daypart, palestre, manifattura) e in energia /
manifattura (matrice cliente x prodotto).

**Il ripiego da non prendere:** dichiarare sette campi lun...dom e metterli come colonne di una
matrice. A schermo somiglia, ma congela la seconda dimensione dentro i campi — niente filtro,
niente cross-filter, niente drill. E' un filtro decorativo travestito da heatmap.

**Quando una colonna schiaccia le altre** (le vendite fuori promozione accanto alle campagne, il
negozio principale accanto ai piccoli) e la domanda e "chi risponde meglio dentro ogni colonna",
`per: "colonna"` calcola i gradini colonna per colonna: ogni colonna si legge da sola.

Perche la mappa dica qualcosa serve una **stagionalita per membro** nei dataParams: con quella
globale tutte le righe hanno lo stesso profilo e la heatmap diventa un muro di un colore solo.

## donut — il visual della CONCENTRAZIONE, non la torta

Quando la domanda e "quanto dipendo da pochi?". In quasi ogni impresa vale una versione della
legge di Pareto: pochi clienti fanno il grosso del fatturato, pochi prodotti il grosso del
margine, poche piattaforme il grosso della spesa. E la concentrazione e **fragilita**: "il 68%
del fatturato viene da tre clienti" non e una statistica, e un rischio di dipendenza — ed e il
gancio di pre-vendita piu forte che un mockup possa avere. Stessa cosa per "l'82% delle views e
paid" (crescita drogata) o "il 91% dei costi e sui vettori terzi" (nessun controllo).

Il donut dice due cose in un colpo: **al centro** il numero che riassume, **nell'anello** come
quel totale si spacca fra poche categorie.

**Le tre forme ammesse:**
- **Due categorie** — la piu forte. X contro il resto: paid/organico, nuovo/di ritorno,
  ricorrente/progetti. Centro sul totale.
- **Top-N + "Altri"** — `topN: 3` (o 4, o 5) aggrega la coda. Mai piu di cinque spicchi piu Altri.
- **Centro sulla QUOTA** — `centre: "share"` scrive "69%" invece del totale, quando il messaggio
  E la concentrazione.

**Regole:** il numero centrale e sempre calcolato da una misura, mai un testo fisso; sopra i sei
spicchi senza `topN` il motore rifiuta; colore costante per categoria e `alert` per lo spicchio
problema, secondo la regola del rosso; le etichette sugli spicchi portano la QUOTA, non il
valore — la lettura di un donut e "quanta parte", e il valore sta nel tooltip e in legenda.

## delta-card — quando il numero grande e la variazione

Quando la domanda e **"come sta cambiando?"** e dietro la misura c'e una serie temporale. La card
porta in grande la VARIAZIONE, non il livello: `+14,2%`, oppure `-3,6 pp` se la misura e una
percentuale — una percentuale varia in punti, e dire che un margine dal 35,9% al 32,3% e sceso
"del 10%" e vero e si legge come un crollo del fatturato.

Quando invece conta il livello assoluto — un totale, uno stock, una giacenza — resta la KPI card
classica. Sono uno scambio dentro la stessa classe (`sintesi`), non due visual diversi.

E' anche l'apertura che rompe la formula da principiante: e ammessa in **ogni** archetipo la cui
domanda sia il cambiamento, non solo nell'executive summary. Vedi `layout-archetypes.md`.

## ribbon — la soglia

Oltre **sette** entita i nastri diventano fettucce, i sorpassi spariscono nel groviglio e il
motore rifiuta la spec. Le due uscite vere: accorpare la coda in un membro "Altri", oppure usare
un hbar ordinato se la domanda e solo "chi e primo". Il criterio per riconoscere un ribbon che
non fa il suo mestiere: se due entita si scambiano di posizione fra due periodi e i loro nastri
non si incrociano, sta impilando per valore ed e un area chart travestito.
