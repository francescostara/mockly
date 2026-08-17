/**
 * Mockly report SPEC — the grammar an LLM writes.
 * Prose reference: engine/spec-schema.md. Consumed by engine/render.js + engine/runtime.js.
 */

export type Aesthetic = 'corporate-sober' | 'agency-modern' | 'executive-minimal';

/** eur = compact €1,2M/€41K · eurF = full grouped · pc = 42,1% · pp = +1,2 pp
 *  sgp = signed % · bps = +34bps · N = grouped integer · x = 1,8× · days · raw */
export type Format = 'eur' | 'eurF' | 'pc' | 'pp' | 'sgp' | 'bps' | 'N' | 'x' | 'days' | 'raw';

export interface Meta {
  title: string;
  subtitle?: string;
  brand?: { name: string; tagline?: string };
  /** BCP-47; drives grouping and decimal separator */
  locale?: string;
  currency?: string;
  /** 12 month abbreviations in the report language */
  months?: string[];
  /** UI words in the report language */
  strings?: Partial<Record<
    'fullYear' | 'all' | 'allM' | 'compare' | 'qtr' | 'month' | 'varShort' |
    'pyShort' | 'cyShort' | 'prevShort' | 'curShort' | 'reset' | 'period' | 'conv', string>>;
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

/** contentWidth = page area inside the canvas (1044 with a 200px rail, 1254 without).
 *  columns MUST equal kpiBand.length. */
export interface Grid { contentWidth: number; gutter: number; columns: number; }

export type Measure =
  | { id: string; label?: string; agg: 'sum'; field?: string; format?: Format; inv?: boolean }
  | { id: string; label?: string; agg: 'diff'; a: string; b: string; format?: Format; inv?: boolean }
  | { id: string; label?: string; agg: 'ratio'; num: string; den: string; format?: Format; inv?: boolean }
  /** point-in-time snapshot: latest (y,m) in the window, never summed */
  | { id: string; label?: string; agg: 'last'; field: string; format?: Format; inv?: boolean };

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
}

export interface LegendItem { l: string; c?: string; dash?: boolean }

export interface MatrixColumn {
  measure: string;
  label?: string;
  /** undefined = value · var = ▲/▼ vs prior · share = % of total · heat = conditional format */
  kind?: 'var' | 'share' | 'heat';
  /** [lo,hi] for kind:'heat' */
  scale?: [number, number];
  inv?: boolean;
}

export type Bind =
  | { measure: string }                                                       // trend, sparkline
  | { measure: string; line?: string }                                        // colline
  | { dim: string; measure: string }                                          // donut
  | { dim: string; measure: string; top?: number; parent?: string; detail?: boolean; subMeasure?: string; subUnit?: string } // hbar
  | { dim: string; measure: string; by?: 'q' | 'm' | string }                 // stack100, ribbon
  | { stages: Array<{ measure: string; label: string; c?: string }> }         // funnel
  | { dim: string; measure: string; startLabel?: string; endLabel?: string }  // waterfall
  | { dim: string; x: string; y: string; size?: string }                      // scatter
  | { dim: string; label?: string; sort?: string; drill?: boolean; totals?: boolean; totalsLabel?: string; columns: MatrixColumn[] } // matrix
  | { template: string; dim?: string; primary?: string };                     // narrative

export type VisualType =
  | 'trend' | 'colline' | 'donut' | 'hbar' | 'stack100' | 'ribbon'
  | 'funnel' | 'waterfall' | 'scatter' | 'matrix' | 'sparkline' | 'narrative';

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
  legend?: LegendItem[];
  centreLabel?: string;
  bind: Bind;
}

/** max 3 visuals; spans sum to grid.columns */
export interface Row { flex?: boolean; visuals: Visual[]; }

export interface Page {
  id: string;
  title: string;
  subtitle?: string;
  /** label in the page navigator; omit for a single-page report */
  nav?: string;
  /** false = no KPI band on this page */
  kpiBand?: boolean;
  rows: Row[];
  /** drill page only */
  drillHeader?: string;
  backLabel?: string;
}

export interface Drill { dim: string; page: Page; }

export interface Spec {
  meta: Meta;
  aesthetic: Aesthetic;
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

export declare function render(spec: Spec, data: Data): string;
