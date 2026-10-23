/**
 * Pruva report SPEC — the grammar an LLM writes.
 * Prose reference: engine/spec-schema.md. Consumed by engine/render.js + engine/runtime.js.
 */

export type Aesthetic = 'corporate-sober' | 'agency-modern' | 'executive-minimal';

/** Dove stanno navigazione e filtri. Decide anche grid.contentWidth, che NON e una scelta:
 *  rail 1044 · rail-slim 1116 · top 1248 · bare 1248. */
export type Shell = 'rail' | 'rail-slim' | 'top' | 'bare';

/** Le famiglie di colore. Ognuna porta la sua scala categoriale e il suo raggio.
 *  COLORI DISTINTI PER CATEGORIA — dove il colore identifica il membro (ribbon, stack100, donut,
 *  hbar per membro) i membri a schermo non possono superarli, e il motore rifiuta:
 *    6 colori: slate-freddo, dark-agency, dark-tecnico, salvia, jewel-desaturati, pastello-sobrio
 *    5 colori: navy-corporate, warm-taupe, carta-inchiostro, terroso, monocromo-accento,
 *              alto-contrasto, blu-ghiaccio
 *  Nessuna scala contiene il rosso: e riservato al problema. */
export type PaletteFamily =
  | 'navy-corporate' | 'slate-freddo' | 'warm-taupe' | 'carta-inchiostro' | 'dark-agency'
  | 'dark-tecnico' | 'terroso' | 'salvia' | 'jewel-desaturati' | 'monocromo-accento'
  | 'alto-contrasto' | 'pastello-sobrio' | 'blu-ghiaccio';

/** Coppie display + interfaccia. I numeri sono mono e tabellari in tutte, sempre. */
export type Typeface =
  /** Inter — il default sicuro, denso e leggibile a 11-13px */
  | 'neutro-ui'
  /** IBM Plex Sans + IBM Plex Mono — manifattura, energia, logistica */
  | 'tecnico'
  /** Merriweather + Source Sans 3 — serif nei titoli, sans nel resto: il sistema del data-journalism */
  | 'editoriale'
  /** Roboto — neutro fino a sparire: CFO e board */
  | 'corporate'
  /** Lato — F&B, retail, palestre, consumo */
  | 'umanista'
  /** Public Sans / Noto Sans — istituzionale, social, agenzia */
  | 'grottesco'
  /** Source Sans 3 + JetBrains Mono — massima precisione tabellare, report densi */
  | 'mono-numerico'
  /** Lora + Open Sans — il serif che regge il fondo scuro */
  | 'serif-scuro';

/** Il ritmo: spaziature, raggi, e se le card sono riquadrate o appoggiate al fondo continuo.
 *  "denso" toglie il riquadro alle card: e la variazione che si vede di piu. */
export type Density = 'arioso' | 'medio' | 'denso';

/** La forma della banda KPI. Quattro riquadri separati, oppure una superficie sola divisa da
 *  separatori interni. Entrambe legittime; la scelta vale per l'intera pagina, mai meta e meta. */
export type BandStyle = 'box' | 'blocco';

/** LA PELLE — i quattro assi visivi, indipendenti fra loro e dall'archetipo.
 *  `aesthetic` resta il preset con un nome; `skin` sovrascrive un asse alla volta.
 *  8 archetipi x 4 shell x 13 palette x 8 tipografie x 3 densita = quasi diecimila facce, senza
 *  mantenere diecimila file. Vincoli e rotazione: skill/references/layout-archetypes.md. */
/**
 * UNA CARD, PIU VISTE — il "bookmark".
 *
 * Due domande diverse possono meritare lo stesso posto in pagina: "chi e entrato quando resta
 * di piu" e "in che mesi si iscrive la gente" sono entrambe vere, e nessuna delle due merita
 * di finire su una seconda schermata. Il contenitore dichiara span e altezza; le viste
 * dichiarano cosa mostrare, e il lettore sceglie con una linguetta nell'intestazione.
 *
 * La PRIMA vista e quella che si vede aprendo il file: e su quella che il motore giudica
 * l'archetipo, il fit e la geometria. L'azzeramento dei filtri riporta ogni card alla prima.
 */
export interface CardAVista {
  /** identita stabile della posizione: serve a ricordare quale vista e scelta */
  id?: string;
  span: number;
  h?: number;
  /** OBBLIGATORIO — perche questa card nasconde qualcosa dietro una linguetta. Senza, il motore
   *  rifiuta. `due-lenti`: la stessa domanda con due metriche che si contraddicono (ricavo e
   *  margine per prodotto) — le viste condividono la misura o la dimensione. `altro-taglio`: la
   *  stessa domanda su un altro asse (per coorte / per stagione) — idem. `pagina-sprecata`: serve
   *  un grafico in piu, la pagina e piena, e da solo non merita una pagina — l'unico motivo che
   *  ammette viste senza misura ne dimensione in comune. Massimo 3 viste, 2 sull'apertura. */
  motivo: 'due-lenti' | 'altro-taglio' | 'pagina-sprecata';
  /** ogni vista ha `type` ed `etichetta` (il testo della linguetta). La PRIMA vista e quella
   *  che si vede aprendo il file, ed e su quella che il motore giudica l'archetipo. */
  viste: Array<Visual & { etichetta: string }>;
}

export interface Skin {
  shell?: Shell;
  palette?: PaletteFamily;
  tipografia?: Typeface;
  densita?: Density;
  banda?: BandStyle;
}

/** eur = compact €1,2M/€41K · eurF = full grouped · pc = 42,1% · pp = +1,2 pp
 *  sgp = signed % · bps = +34bps · N = grouped integer · x = 1,8× · days · months = 18,3 mesi · raw */
export type Format = 'eur' | 'eurF' | 'pc' | 'pp' | 'sgp' | 'bps' | 'N' | 'x' | 'days' | 'months' | 'raw' | 'dur';

/** COSA misura, non come si scrive. Il formato e una conseguenza dell'unita, non una scelta
 *  indipendente: un modello reale ha scritto `format:"eur"` su reach e impression — due conte —
 *  pur avendo `N` nella grammatica e usandolo correttamente due righe piu sotto. Con l'unita
 *  dichiarata, quella combinazione non e piu esprimibile. */
/** seconds: una durata in secondi, con format "dur" (42 s · 2:07 min · 1 h 05) */
export type Unit = 'money' | 'count' | 'pct' | 'pp' | 'days' | 'months' | 'x' | 'seconds';

export interface Meta {
  title: string;
  subtitle?: string;
  brand?: { name: string; tagline?: string };
  /** BCP-47; drives grouping and decimal separator */
  locale?: string;
  currency?: string;
  /** "k1": every amount in thousands with one decimal (€52,134.5K) */
  numberFormat?: 'k1';
  /** "finanza": favourable variances green, unfavourable red */
  varianze?: 'finanza';
  /** 12 month abbreviations in the report language */
  months?: string[];
  /** UI words in the report language */
  /** UI words in the report language. Fuori dall'italiano, le parole che mancano le mette il
   *  motore in inglese: dichiararle serve solo per un'altra lingua o per un tono diverso. */
  strings?: Partial<Record<
    'fullYear' | 'all' | 'allM' | 'compare' | 'qtr' | 'month' | 'varShort' |
    'pyShort' | 'cyShort' | 'prevShort' | 'curShort' | 'reset' | 'period' | 'conv' |
    'spanLong' | 'year' | 'qtrLong' | 'monthLong' | 'updatedLabel' | 'report' | 'spanUno' |
    'spanTutti' | 'anni' | 'others' | 'target' | 'noPrev' | 'trajectory' | 'sopra' | 'sotto' | 'inLinea' | 'nuova', string>>;
  /** literal "last refreshed" string — never a live clock (determinism) */
  updated?: string;
  source?: string;
  /** synthetic-data watermark — required */
  watermark: string;
}

/** Token overrides on top of the aesthetic's defaults. `series` is the category ramp; a
 *  member's own colour in `data.dims` wins over it. */
export interface Palette {
  series?: string[];
  canvas?: string; card?: string; line?: string; line2?: string;
  ink?: string; ink2?: string; muted?: string; muted2?: string; muted3?: string;
  rail?: string; c1?: string; c2?: string; c3?: string; c4?: string; c5?: string; c6?: string;
  good?: string; bad?: string; amber?: string;
  heatLo?: string; heatMid?: string; heatHi?: string;
}

/** contentWidth = page area inside the canvas. NON si sceglie: lo decide la shell (1280 meno
 *  la rail, meno il padding) — rail 1044, rail-slim 1116, top e bare 1248.
 *  columns MUST equal kpiBand.length. */
export interface Grid { contentWidth: number; gutter: number; columns: number; }

/** Campi comuni a ogni misura: `target` (sopra verde, sotto rosso, o il contrario con inv),
 *  `description` (cosa e, in parole per chi non sa nulla: va nella scheda "How to use"),
 *  `signed` (un conteggio che puo essere negativo, un saldo: nuovi meno persi). */
export interface MeasureCommon { target?: number; description?: string; signed?: boolean }

export type Measure =
  | { id: string; label?: string; agg: 'sum'; field?: string; unit: Unit; format?: Format; inv?: boolean }
  | { id: string; label?: string; agg: 'diff'; a: string; b: string; unit: Unit; format?: Format; inv?: boolean }
  | { id: string; label?: string; agg: 'ratio'; num: string; den: string; unit: Unit; format?: Format; inv?: boolean }
  /** point-in-time snapshot: latest (y,m) in the window, never summed */
  | { id: string; label?: string; agg: 'last'; field: string; unit: Unit; format?: Format; inv?: boolean };

export interface Model {
  /** additive fact columns */
  sums: string[];
  /** declared in dependency order */
  measures: Measure[];
}

export interface DateFilter {
  levels?: Array<'year' | 'quarter' | 'month'>;
  default?: { y?: number; q?: number | null; m?: number | null };
}

export interface DimFilter {
  /** must be a key of data.dims */
  id: string;
  label: string;
  /** 'list' only for <=5 members; above that 'dropdown' is required (QA Gate 6) */
  control?: 'list' | 'dropdown';
  allLabel?: string;
  /** short name used in the header context pill */
  pill?: string;
}

export interface Filters { date: DateFilter; dims: DimFilter[]; }

export interface KpiCard {
  id: string;
  label: string;
  measure: string;
  /** integer grid columns; the band's spans sum to grid.columns */
  span?: number;
  /** lower is better — flips the variance colour */
  inv?: boolean;
  /** finance card: the budget measure; the card shows vs budget and vs prior year */
  budget?: string;
  /** finance card: a second row with YTD up to the selected month, vs budget and vs prior year */
  ytd?: boolean;
}

export interface LegendItem { l: string; c?: string; dash?: boolean }

/** Ogni bind puo staccare il visual da alcuni filtri della barra: `ignoreFilters: ["seg"]` — il
 *  visual tiene sempre tutti i membri e non segue quei filtri (Power BI: Edit interactions → None). */
export interface BindCommon { /** id dei filtri della barra, e "date" per lo slicer del periodo (il visual tiene tutti gli anni) */ ignoreFilters?: string[]; /** false: i clic dentro il visual non filtrano gli altri (Edit interactions → None) */ crossFilter?: boolean }

export interface MatrixColumn {
  measure: string;
  label?: string;
  /** undefined = value · var = ▲/▼ vs prior · share = % of total · heat = conditional format */
  kind?: 'var' | 'share' | 'heat' | 'bud';
  /** kind:'bud' — the budget measure, and whether to show the variance as amount or % */
  budget?: string;
  show?: 'abs' | 'pct';
  /** [lo,hi] for kind:'heat' */
  scale?: [number, number];
  inv?: boolean;
}

export type Bind =
  | { measure: string; labels?: boolean; grain?: 'year' }                    // trend (labels:false spegne min/max/ultimo; grain:'year' = un punto per anno su tutti gli anni), sparkline
  | { measure: string; line?: string; target?: number; targetLabel?: string; labels?: boolean }  // colline: target = bersaglio della linea; labels:false spegne min/max/ultimo
  | { dim: string; measure: string }                                          // donut
  /** hbar — classifica. `order: "asc"` mostra la CODA: i `top` peggiori per la misura (i prodotti
   *  "che hanno bisogno di attenzione"), invece dei migliori. `subMeasure` si scrive accanto al
   *  valore di ogni barra ("$6.0M · 40.0% margin", con `subUnit` in coda). */
  | { dim: string; measure: string; top?: number; order?: 'desc' | 'asc'; parent?: string; detail?: boolean; subMeasure?: string; subUnit?: string; share?: boolean } // hbar: share:false spegne la quota sul totale
  | { dim: string; measure: string; by?: 'q' | 'm' | string }                 // stack100, ribbon
  /** donut — il visual della CONCENTRAZIONE. `topN` aggrega la coda in "Altri" (e cio che
   *  rende leggibile una dimensione con dodici membri); `centre: "share"` mette al centro la
   *  QUOTA della testa invece del totale, quando il messaggio e la dipendenza — "il 68% da tre
   *  clienti" e un rischio, non una statistica; `alert` colora di rosso lo spicchio problema. */
  | { dim: string; measure: string; topN?: number; centre?: 'total' | 'share';
      alert?: string; altriLabel?: string }                                    // donut
  /** heatmap — densita su due dimensioni: righe = membri di `dim`, colonne = membri di `by`
   *  (oppure i mesi con `by:"m"`, i trimestri con `by:"q"`). E' l'unico visual che ruota una
   *  seconda dimensione sulle colonne: la `matrix` ci mette le MISURE, quindi fascia-oraria x
   *  giorno, cliente x SKU e coorte x mese non erano esprimibili. `scale` fissa i due estremi
   *  della rampa; senza, si usano il minimo e il massimo osservati. */
  /** `per: "colonna"`: i gradini si calcolano dentro ogni colonna — quando una colonna vale dieci
   *  volte le altre (fuori promozione accanto alle campagne) e la domanda e "chi risponde meglio
   *  DENTRO ogni colonna". */
  | { dim: string; measure: string; by: string; scale?: [number, number]; per?: 'colonna' }     // heatmap
  /** delta-card - una sola misura, nessuna dimensione: mostra DI QUANTO e cambiata fra i due
   *  periodi confrontati. Con `unit: "pct"` la variazione esce in punti percentuali. */
  | { measure: string }                                                       // delta-card
  | { stages: Array<{ measure: string; label: string; c?: string }> }         // funnel
  | { dim: string; measure: string; startLabel?: string; endLabel?: string }  // waterfall
  | { stock: string; steps: Array<{ measure: string; label?: string; sign?: 1 | -1 }>; startLabel?: string; endLabel?: string } // waterfall: ponte da stock a stock
  | { label?: string; ytd?: boolean; lines: Array<{ label: string; measure: string; budget?: string; kind?: 'sub' | 'total' | 'pct'; inv?: boolean; accounts?: Array<{ label: string; w?: number }> }> } // statement
  | { dim: string; x: string; y: string; size?: string }                      // scatter
  /** gauge — SOLO misure di tipo tasso (`unit: 'pct' | 'x'`).
   *  Un gauge dice "quanto sei arrivato rispetto a dove dovevi", che e per natura un rapporto.
   *  Con una misura assoluta il bersaglio non si affetta insieme al valore: filtrando su una
   *  regione il valore scende alla sua quota e il target resta quello di tutta l'azienda, e il
   *  gauge dichiara un disastro che non esiste. Un tasso non ha questo problema: il bersaglio
   *  di un win rate e lo stesso per ogni segmento.
   *  `targets` e la forma prevista per i bersagli PER MEMBRO — un mercato nuovo puo avere un
   *  obiettivo al 70% invece che al 100%. Dichiarata qui perche non serva una migrazione
   *  dopo; il motore la rifiuta esplicitamente finche non e implementata. */
  | { measure: string; target?: string | number; targetLabel?: string; max?: number;
      dim?: string; targets?: Record<string, number> }                                      // gauge
  /** gauge MULTIPLO — due o tre gauge affiancati nella stessa card, ognuno un tasso col suo
   *  bersaglio (OTIF, puntualita, fill rate). Un gauge SINGOLO sta solo in una card stretta
   *  (<= 300px): da solo in una card larga occupa lo spazio di un grafico per un numero solo, e il
   *  motore lo rifiuta. Ogni pannello: 130–300px. Mai su una misura che ha gia una card nella
   *  banda KPI: ripeterebbe lo stesso numero, e il motore lo rifiuta. */
  | { misure: Array<{ measure: string; target?: string | number; targetLabel?: string; max?: number; label?: string }> } // gauge
  | { dim: string; label?: string; sort?: string; drill?: boolean; totals?: boolean; totalsLabel?: string; columns: MatrixColumn[] } // matrix
  | { template: string; dim?: string; primary?: string };                     // narrative
  | { etichetta?: string };                                                   // segnaposto

export type VisualType =
  /** il pannello segnaposto del flusso guidato, prima di Fill page: cornice e titolo, niente dati */
  | 'segnaposto'
  | 'trend' | 'colline' | 'donut' | 'hbar' | 'stack100' | 'ribbon' | 'statement'
  | 'funnel' | 'waterfall' | 'scatter' | 'matrix' | 'sparkline' | 'narrative' | 'gauge'
  | 'heatmap' | 'delta-card';

export interface Visual {
  type: VisualType;
  /** integer count of grid columns */
  span: number;
  /** chart body height in px; omit inside a flex row */
  h?: number;
  /** labels interpolate {y} {py} {basis} {period} {drill} */
  title?: string;
  subtitle?: string;
  /** right-aligned hint in the card header */
  note?: string;
  /** NO legend field: the engine draws the legend of trend and colline from what it draws
   *  (a hand-written one guessed the prior-year style wrong three times). Declaring one is rejected. */
  legend?: never;
  centreLabel?: string;
  bind: Bind;
}

/** max 3 visuals; spans sum to grid.columns */
export interface Row { flex?: boolean; visuals: Array<Visual | CardAVista>; }

export interface Page {
  id: string;
  title: string;
  subtitle?: string;
  /** label in the page navigator; omit for a single-page report */
  nav?: string;
  /** false = no KPI band on this page */
  kpiBand?: boolean;
  /** LA RIGA KPI DELLA PAGINA (flusso guidato, 23 ott 2026): vince sulla banda del report. mode full = valore
   *  e variazioni, value = solo valore, off = niente riga; style = stile delle card (engine/stili.js) */
  kpi?: { mode?: 'full' | 'value' | 'off'; cards?: KpiCard[]; style?: string };
  /** le colonne della griglia della pagina; obbligatorie se la pagina non ha card KPI */
  columns?: number;
  /** lo stile dei pannelli della pagina: intestazione quiet · framed · band · tab, sottotitolo si/no */
  panels?: { header?: 'quiet' | 'framed' | 'band' | 'tab'; subtitle?: boolean };
  /** Archetipo proprio della pagina: e la regola "domande di forma diversa -> pagine diverse,
   *  una per archetipo". Senza, la PRIMA pagina porta quello del report e le altre non
   *  vengono verificate: sono approfondimenti, non la faccia del report. */
  archetype?: Archetype;
  rows: Row[];
  /** drill page only — il CONTESTO della pagina di dettaglio ("{period} · {basis}"). Mai
   *  `{drill}`: il nome dell'entita lo scrive il motore accanto al tasto indietro, e ripeterlo
   *  qui viene rifiutato. */
  drillHeader?: string;
  backLabel?: string;
}

export interface Drill { dim: string; page: Page; }

/** L'ARCHETIPO DI LAYOUT, dichiarato dalla spec e verificato dal motore.
 *  Definizioni complete in skill/references/layout-archetypes.md. Ogni archetipo ha
 *  un'APERTURA e una CHIUSURA proprie: e li che stava il difetto del template, non nel centro
 *  della pagina, che gia variava.
 *
 *  - 'scorecard'          panoramica generale: banda KPI + trend -> matrice. NON e il default:
 *                         va scelto solo se il brief chiede davvero una panoramica.
 *  - 'executive-summary'  un visual dominante + poche card; densita bassa (<= 6 conteggi),
 *                         chiude con una riga di supporto, non con una tabella densa.
 *  - 'funnel'             funnel dominante -> tabella delle fonti con la conversione.
 *  - 'quadrants'          scatter grande con le mediane -> heatmap o matrice per entita.
 *  - 'bridge'             waterfall dominante -> trend di cassa, non una matrice.
 *  - 'geo'                mappa a bolle dominante. NON ANCORA RENDERIZZABILE: manca il visual.
 *  - 'cohorts'            heatmap coorti dominante -> tabella per coorte.
 *  - 'operational'        heatmap fascia x giorno + gauge; densita alta (>= 8 conteggi).
 *
 *  Il conteggio di densita e kpiBand.length + i visual di contenuto. */
export type Archetype = 'scorecard' | 'executive-summary' | 'funnel' | 'quadrants'
  | 'bridge' | 'geo' | 'cohorts' | 'operational';

export interface Spec {
  meta: Meta;
  aesthetic: Aesthetic;
  /** Sovrascrive uno o piu assi del preset. Omettila per la faccia storica dell'estetica. */
  skin?: Skin;
  /** obbligatorio: una dichiarazione che nessuno verifica vale meno di nessuna dichiarazione,
   *  quindi il motore controlla che la composizione corrisponda. */
  archetype: Archetype;
  palette?: Palette;
  grid: Grid;
  model: Model;
  filters: Filters;
  kpiBand: KpiCard[];
  pages: Page[];
  drill?: Drill;
}

/* ---------------- data payload ---------------- */

export interface DimMember { id: string; n: string; c: string; parent?: string }

/** Columnar fact table. A column named like a key of `dims` holds an integer index into that
 *  dimension's member array; everything else is a number. */
export interface Table { cols: string[]; rows: Array<Array<number>>; }

export interface Data {
  dims: Record<string, DimMember[]>;
  years: number[];
  /** grain of the KPI band and every roll-up */
  facts: Table;
  /** optional finer grain (e.g. model within category) for detail visuals */
  detail?: Table;
  /** what the generator reconciled, echoed for the tie-out gate */
  tieOut?: Record<string, number>;
}

/* ---------------- dataParams: the declarative generator ---------------- */
/* Prose reference: engine/data-params.md. Run by engine/data-builder.js into the `Data` above. */

/** At least one element, checked by the compiler rather than at runtime. A dimension with an
 *  empty `members` array is not expressible in this grammar: declaring a dimension IS
 *  populating it. */
export type NonEmpty<T> = [T, ...T[]];

/** The character of one member. `base` is its monthly value of the primary measure in the
 *  first year; without it every number of that member comes out NaN. */
export interface MemberSpec {
  /** short slug, referenced by facts rows and by `detail.members` keys */
  id: string;
  /** the label the reader sees */
  n: string;
  /** the member's colour, reused in EVERY visual; the builder fills a ramp colour if omitted */
  c?: string;
  base: number;
  /** compound growth per year; at least one member of a dimension must be negative.
   *  Su un membro di uno SPLIT inclina la sua quota anno dopo anno (la regione che cresce piu
   *  delle altre); `shares` descrive allora il primo anno. */
  growth?: number;
  /** 12 moltiplicatori propri, che sostituiscono la stagionalita globale per questo membro */
  seasonality?: number[];
  /** la tinta del membro E' la sua identita (Instagram, TikTok): il motore non la sostituisce */
  brand?: boolean;
  /** solo per i membri di facts.dim: la SUA composizione di uno split, che vince sull'adattamento
   *  automatico — { "cat": { "clima": 1 } } per una campagna che vale su una categoria sola,
   *  { "cat": { "tv": 2, "piccoli": 1 } } per una che pesa di piu su alcune. Pesi, normalizzati. */
  mix?: Record<string, Record<string, number>>;
  /** gli anni in cui il membro esiste (una campagna fatta una volta, un negozio aperto da poco);
   *  fuori vale zero, e nella matrice la sua variazione si legge "nuova" */
  anni?: number[];
  /** free numeric attributes the field formulas read (aov, margin, rates...) */
  /** un numero, o un array con un valore per anno (il tasso che cambia negli anni) */
  attrs?: Record<string, number | number[]>;
}

/** A dimension and its members, co-located. There is nowhere else to put them. */
export interface DimSpec { members: NonEmpty<MemberSpec>; }

/** Da quali membri un campo legge `attr`: omesso = facts.dim; "split" = il primo split; il
 *  NOME di una dimensione dei fatti = i membri di quella (serve con due split). */
/** il tasso moltiplicato per un attr dei membri di un'altra dimensione dei fatti */
export type RateMod = { from: string; attr: string };
export type AttrFrom = 'split' | string;

/** Il campo esiste solo per questi membri di una dimensione dei fatti; altrove vale zero
 *  (la spesa paid non esiste sull'organico). */
export interface OnlyFor { dim: string; members: string[] }

export type FieldSpec =
  | { id: string; kind: 'seasonal'; jitter?: [number, number] }
  | { id: string; kind: 'share'; of: string; attr: string; attrFrom?: AttrFrom; complement?: boolean; cap?: number; growthFactor?: number; mod?: RateMod | RateMod[]; jitter?: [number, number]; only?: OnlyFor }
  | { id: string; kind: 'divide'; of: string; attr: string; attrFrom?: AttrFrom; min?: number; mod?: RateMod | RateMod[]; jitter?: [number, number]; only?: OnlyFor }
  | { id: string; kind: 'combine'; plus?: string[]; minus?: string[]; only?: OnlyFor }
  /** a stock that is the running sum of a flow: starts at attrs[start] x startOf, then += flow */
  | { id: string; kind: 'cumulative'; flow: string; start: string; startOf: string };

/** Una dimensione dello split: `shares` = la sua quota del totale, in ordine dei membri. */
export interface SplitSpec { dim: string; shares?: number[] }

export interface FactsSpec {
  /** key of `dims` — the dimension the monthly loop runs over */
  dim: string;
  /** altre dimensioni filtrabili, adattate agli stessi totali con IPF: UNA (oggetto) o DUE
   *  (array). Con due, il report ha tre filtri di dimensione — es. categoria (facts.dim) x
   *  regione x segmento cliente. Celle: membri(dim) x membri(split) <= 60 per ogni split, e il
   *  prodotto di tutti <= 120. */
  split?: SplitSpec | [SplitSpec, SplitSpec];
  /** parti di un intero che sommano l'intero in ogni riga: [{ of: "late", parts: ["cClient", ...] }] */
  parts?: Array<{ of: string; parts: string[] }>;
  /** fields[0] must be the primary measure, kind:'seasonal' */
  fields: NonEmpty<FieldSpec>;
}

export interface DetailChild {
  n: string;
  /** share of the parent's volume, relative to the siblings (default: random) */
  w?: number;
  /** per-field multiplier on the child's share, e.g. { mistakes: 1.6 } for a harder topic */
  mult?: Record<string, number>;
}

export interface DetailSpec {
  dim: string;
  parentDim?: string;
  /** children per parent id — one entry per member of the parent dimension. A child is a plain
   *  name (random share) or declares its character: `w` = weight against its siblings, `mult` =
   *  per-field multiplier for a child whose rate differs from the parent's (renormalised, so the
   *  children still tie out to the parent). */
  members: Record<string, NonEmpty<string | DetailChild>>;
  fields?: string[];
  counts?: { field: string; from?: string };
}

export interface DataParams {
  seed?: number;
  /** exactly two: prior and current */
  years: [number, number];
  /** 12 multipliers averaging ~1.0 */
  seasonality?: number[];
  /** quanti degli ultimi anni restano mensili (default 3, minimo 2); i piu vecchi diventano una
   *  riga per membro — serve solo con molti anni, per il peso del file */
  dettaglioMesi?: number;
  /** every dimension the report can filter, slice or drill by */
  dims: Record<string, DimSpec>;
  facts: FactsSpec;
  detail?: DetailSpec;
}

export declare function build(dataParams: DataParams): Data;

export declare function render(spec: Spec, data: Data): string;
