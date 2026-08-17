/* The safety net: a spec + dataParams built deterministically from the intake alone.
 * No model call, no branching on model output — if the repair loop fails, the user still
 * gets a working, valid, interactive mockup instead of an error page. */

import type { IntakeAnswers } from './intake';

const PALETTES: Record<string, string[]> = {
  none: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4'],
  navy: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4'],
  teal: ['#20323A', '#2F5D63', '#4E8A86', '#86B3AC', '#A8C8C2', '#C4DAD3'],
  bronze: ['#26262B', '#4A4038', '#7A6A52', '#A8926E', '#C3B292', '#D8C7A6'],
  custom: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4']
};

const SEGMENTS = [
  { id: 's1', n: 'Linea storica', base: 42000, growth: -0.058, aov: 340, margin: 0.44 },
  { id: 's2', n: 'Linea in crescita', base: 31000, growth: 0.196, aov: 190, margin: 0.51 },
  { id: 's3', n: 'Su misura', base: 21000, growth: 0.112, aov: 880, margin: 0.58 },
  { id: 's4', n: 'Entry level', base: 13000, growth: 0.034, aov: 95, margin: 0.39 }
];

const DETAIL: Record<string, string[]> = {
  s1: ['Prodotto A1', 'Prodotto A2', 'Prodotto A3'],
  s2: ['Prodotto B1', 'Prodotto B2', 'Prodotto B3'],
  s3: ['Servizio C1', 'Servizio C2', 'Servizio C3'],
  s4: ['Prodotto D1', 'Prodotto D2', 'Prodotto D3']
};

export function buildFallback(intake: IntakeAnswers) {
  const series = PALETTES[intake.branding || 'none'] || PALETTES.none;

  const spec = {
    meta: {
      title: 'Performance commerciale',
      subtitle: 'Ricavi per mese e per segmento',
      brand: { name: 'Report dimostrativo', tagline: 'Mockup generato da Mockly' },
      locale: 'it-IT',
      currency: '€',
      months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
      strings: {
        fullYear: 'Anno intero', all: 'Tutto', allM: 'Tutti', compare: 'Confronto', qtr: 'Trim.',
        month: 'Mese', varShort: 'Var', pyShort: 'PY', cyShort: 'CY', prevShort: 'Prec.',
        curShort: 'Corr.', reset: 'Azzera filtri', period: 'Periodo', year: 'Anno',
        qtrLong: 'Trimestre', monthLong: 'Mese', updatedLabel: 'Ultimo aggiornamento'
      },
      updated: '1 set 2026, 07:00',
      source: 'Fonte: gestionale<br>Export giornaliero',
      watermark: 'Mockup dimostrativo · dati sintetici · non rappresenta dati reali'
    },
    aesthetic: 'corporate-sober',
    palette: { series },
    grid: { contentWidth: 1044, gutter: 12, columns: 5 },
    model: {
      sums: ['rev', 'cost', 'units'],
      measures: [
        { id: 'rev', label: 'Ricavi', agg: 'sum', field: 'rev', format: 'eur' },
        { id: 'cost', label: 'Costo', agg: 'sum', field: 'cost', format: 'eur' },
        { id: 'units', label: 'Volumi', agg: 'sum', field: 'units', format: 'N' },
        { id: 'gp', label: 'Margine lordo', agg: 'diff', a: 'rev', b: 'cost', format: 'eur' },
        { id: 'mg', label: 'Margine %', agg: 'ratio', num: 'gp', den: 'rev', format: 'pc' },
        { id: 'aov', label: 'Valore medio', agg: 'ratio', num: 'rev', den: 'units', format: 'eurF' }
      ]
    },
    filters: {
      date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
      dims: [{ id: 'seg', label: 'Segmento', control: 'list', allLabel: 'Tutti i segmenti', pill: 'Seg.' }]
    },
    kpiBand: [
      { id: 'rev', label: 'Ricavi', measure: 'rev', span: 1 },
      { id: 'units', label: 'Volumi', measure: 'units', span: 1 },
      { id: 'aov', label: 'Valore medio', measure: 'aov', span: 1 },
      { id: 'gp', label: 'Margine lordo', measure: 'gp', span: 1 },
      { id: 'mg', label: 'Margine %', measure: 'mg', span: 1 }
    ],
    pages: [{
      id: 'main',
      title: 'Performance commerciale',
      subtitle: 'Ricavi per mese e per segmento',
      nav: 'Performance',
      rows: [
        {
          visuals: [
            {
              type: 'trend', span: 3, h: 206, title: 'Ricavi mensili', subtitle: '{y} vs {py}',
              note: 'i filtri Trim./Mese non toccano la timeline',
              legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
              bind: { measure: 'rev' }
            },
            {
              type: 'donut', span: 2, h: 238, title: 'Mix per segmento',
              subtitle: 'quota ricavi · clicca per filtrare', centreLabel: 'Ricavi',
              bind: { dim: 'seg', measure: 'rev' }
            }
          ]
        },
        {
          flex: true,
          visuals: [{
            type: 'matrix', span: 5, title: 'Performance per segmento', subtitle: 'ordinata per ricavi',
            note: 'tasto destro su una riga per il dettaglio',
            bind: {
              dim: 'seg', label: 'Segmento', sort: 'rev', totalsLabel: 'Totale',
              columns: [
                { measure: 'rev', label: 'Ricavi' },
                { measure: 'rev', label: '{basis}', kind: 'var' },
                { measure: 'units', label: 'Volumi' },
                { measure: 'aov', label: 'Valore medio' },
                { measure: 'mg', label: 'Margine %', kind: 'heat', scale: [0.35, 0.6] },
                { measure: 'rev', label: 'Quota', kind: 'share' }
              ]
            }
          }]
        }
      ]
    }],
    drill: {
      dim: 'seg',
      page: {
        id: '__drill__', title: '{drill}', subtitle: 'Dettaglio segmento',
        drillHeader: 'Dettaglio segmento · {period} · confronto {basis}',
        backLabel: 'Torna a tutti i segmenti',
        rows: [{
          visuals: [
            {
              type: 'trend', span: 3, h: 210, title: 'Andamento mensile', subtitle: '{drill} · {y} vs {py}',
              legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
              bind: { measure: 'rev' }
            },
            {
              type: 'hbar', span: 2, title: 'Dettaglio', subtitle: 'per ricavi',
              bind: { dim: 'item', measure: 'rev', top: 6, detail: true, subMeasure: 'units', subUnit: ' pz' }
            }
          ]
        }]
      }
    }
  };

  const dataParams = {
    seed: 30011,
    years: [2024, 2025],
    seasonality: [0.9, 0.86, 1.0, 1.04, 1.02, 0.94, 0.78, 0.72, 1.08, 1.12, 1.24, 1.3],
    dims: {
      seg: {
        members: SEGMENTS.map((s, i) => ({
          id: s.id, n: s.n, c: series[i % series.length],
          base: s.base, growth: s.growth,
          attrs: { aov: s.aov, margin: s.margin }
        }))
      }
    },
    facts: {
      dim: 'seg',
      fields: [
        { id: 'rev', kind: 'seasonal' },
        { id: 'cost', kind: 'share', of: 'rev', attr: 'margin', complement: true, jitter: [0.97, 1.03] },
        { id: 'units', kind: 'divide', of: 'rev', attr: 'aov', jitter: [0.88, 1.14], min: 1 }
      ]
    },
    detail: {
      dim: 'item', parentDim: 'seg', members: DETAIL,
      fields: ['rev'], counts: { field: 'units', from: 'units' }
    }
  };

  return { spec, dataParams };
}
