/* Nodo & Trama — the canonical retail report, expressed as a SPEC.
 * Reference target: skill/assets/canonical-retail-fullspec.html (structural equivalence).
 * Judgement (aesthetic, chart choice, labels, storyline) lives here; rendering does not.
 */
'use strict';

const trend = {
  type: 'trend', span: 3, h: 206,
  title: 'Fatturato mensile', subtitle: '{y} vs {py} · anno intero',
  note: 'i filtri Trim./Mese non toccano la timeline',
  legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
  bind: { measure: 'rev' }
};

module.exports = {
  meta: {
    title: 'Performance vendite',
    subtitle: 'Fatturato per mese, categoria e modello',
    brand: { name: 'Nodo & Trama', tagline: "Tappeti d'autore · Torino" },
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    strings: {
      fullYear: 'Anno intero', all: 'Tutto', allM: 'Tutti', compare: 'Confronto',
      qtr: 'Trim.', month: 'Mese', varShort: 'Var', pyShort: 'PY', cyShort: 'CY',
      prevShort: 'Prec.', curShort: 'Corr.', reset: 'Azzera filtri', period: 'Periodo',
      year: 'Anno', qtrLong: 'Trimestre', monthLong: 'Mese', updatedLabel: 'Ultimo aggiornamento'
    },
    updated: '14 ago 2026, 07:00',
    source: 'Fonte: gestionale negozio<br>Export giornaliero 07:00',
    watermark: 'Mockup dimostrativo · dati sintetici · non rappresenta vendite reali'
  },

  aesthetic: 'corporate-sober',
  palette: { series: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4'] },
  grid: { contentWidth: 1044, gutter: 12, columns: 5 },

  model: {
    sums: ['rev', 'cost', 'pieces', 'online'],
    measures: [
      { id: 'rev', label: 'Fatturato', agg: 'sum', field: 'rev', format: 'eur' },
      { id: 'cost', label: 'Costo', agg: 'sum', field: 'cost', format: 'eur' },
      { id: 'pieces', label: 'Numero vendite', agg: 'sum', field: 'pieces', format: 'N' },
      { id: 'online', label: 'Online', agg: 'sum', field: 'online', format: 'eur' },
      { id: 'gp', label: 'Margine lordo', agg: 'diff', a: 'rev', b: 'cost', format: 'eur' },
      { id: 'mg', label: 'Margine %', agg: 'ratio', num: 'gp', den: 'rev', format: 'pc' },
      { id: 'aov', label: 'Scontrino medio', agg: 'ratio', num: 'rev', den: 'pieces', format: 'eurF' },
      { id: 'onlShare', label: 'Vendite online', agg: 'ratio', num: 'online', den: 'rev', format: 'pc' }
    ]
  },

  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [{ id: 'cat', label: 'Categoria', control: 'dropdown', allLabel: 'Tutte le categorie', pill: 'Cat.' }]
  },

  kpiBand: [
    { id: 'rev', label: 'Fatturato', measure: 'rev', span: 1 },
    { id: 'pieces', label: 'Numero vendite', measure: 'pieces', span: 1 },
    { id: 'aov', label: 'Scontrino medio', measure: 'aov', span: 1 },
    { id: 'mg', label: 'Margine lordo', measure: 'mg', span: 1 },
    { id: 'onl', label: 'Vendite online', measure: 'onlShare', span: 1 }
  ],

  pages: [{
    id: 'main',
    title: 'Performance vendite',
    subtitle: 'Fatturato per mese, categoria e modello',
    nav: 'Performance vendite',
    rows: [
      {
        visuals: [trend, {
          type: 'donut', span: 2, h: 238,
          title: 'Mix per categoria', subtitle: 'quota fatturato · clicca per filtrare',
          centreLabel: 'Fatturato',
          bind: { dim: 'cat', measure: 'rev' }
        }]
      },
      {
        flex: true,
        visuals: [{
          type: 'matrix', span: 3,
          title: 'Performance per categoria', subtitle: 'ordinata per fatturato',
          note: 'tasto destro su una riga per i modelli',
          bind: {
            dim: 'cat', label: 'Categoria', sort: 'rev', totalsLabel: 'Totale negozio',
            columns: [
              { measure: 'rev', label: 'Fatturato' },
              { measure: 'rev', label: '{basis}', kind: 'var' },
              { measure: 'aov', label: 'Scontrino' },
              { measure: 'mg', label: 'Margine %' },
              { measure: 'rev', label: 'Quota', kind: 'share' }
            ]
          }
        }, {
          type: 'hbar', span: 2,
          title: 'Top modelli', subtitle: 'top 8 per fatturato',
          bind: { dim: 'mod', measure: 'rev', top: 8, parent: 'cat', detail: true, subMeasure: 'pieces', subUnit: ' pz' }
        }]
      }
    ]
  }],

  drill: {
    dim: 'cat',
    page: {
      id: '__drill__',
      title: '{drill}',
      subtitle: 'Dettaglio categoria e modelli',
      drillHeader: 'Dettaglio categoria · {period} · confronto {basis}',
      backLabel: 'Torna a tutte le categorie',
      rows: [
        {
          visuals: [Object.assign({}, trend, {
            h: 210, title: 'Andamento mensile', subtitle: '{drill} · {y} vs {py}', note: ''
          }), {
            type: 'hbar', span: 2,
            title: 'Modelli della categoria', subtitle: 'per fatturato',
            bind: { dim: 'mod', measure: 'rev', top: 7, detail: true, subMeasure: 'pieces', subUnit: ' pz' }
          }]
        }
      ]
    }
  }
};
