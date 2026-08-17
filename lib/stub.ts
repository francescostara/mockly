/* Development stub — set MOCKLY_STUB=1 to exercise the whole pipeline (parse -> build data ->
 * validate -> render -> preview) without an API key and without spending credits.
 * It returns exactly what the model is asked to return: a bare JSON string.
 *
 * MOCKLY_STUB=broken returns a spec that fails validation every time, to exercise the
 * repair-then-fallback path. */

/** Deliberately invalid: 5 KPI cards on a 4-column grid, a row whose spans sum to 4, a
 *  measure that sums a field the generator never emits, and no watermark. */
export const STUB_BROKEN = JSON.stringify({
  spec: {
    meta: { title: 'Rotto', locale: 'it-IT', currency: '€' },
    aesthetic: 'corporate-sober',
    grid: { contentWidth: 1044, gutter: 12, columns: 4 },
    model: {
      sums: ['rev', 'inesistente'],
      measures: [{ id: 'rev', label: 'Ricavi', agg: 'sum', field: 'rev', format: 'eur' }]
    },
    filters: { date: { default: { y: 2025 } }, dims: [{ id: 'nonEsiste', label: 'Boh', control: 'list' }] },
    kpiBand: [
      { id: 'a', label: 'A', measure: 'rev', span: 1 },
      { id: 'b', label: 'B', measure: 'rev', span: 1 },
      { id: 'c', label: 'C', measure: 'rev', span: 1 },
      { id: 'd', label: 'D', measure: 'rev', span: 1 },
      { id: 'e', label: 'E', measure: 'rev', span: 1 }
    ],
    pages: [{
      id: 'main', title: 'Rotto',
      rows: [{ visuals: [{ type: 'trend', span: 2, bind: { measure: 'rev' } }, { type: 'donut', span: 2, bind: { dim: 'seg', measure: 'rev' } }] }]
    }]
  },
  dataParams: {
    seed: 1, years: [2024, 2025],
    dims: { seg: { members: [{ id: 'x', n: 'X', base: 1000, growth: 0.1, attrs: {} }] } },
    facts: { dim: 'seg', fields: [{ id: 'rev', kind: 'seasonal' }] }
  }
});

export const STUB_RESPONSE = JSON.stringify({
  spec: {
    meta: {
      title: 'Performance punti vendita',
      subtitle: 'Fatturato per negozio e famiglia di prodotto',
      brand: { name: 'Forno Bertelli', tagline: 'Panetterie artigianali · 4 punti vendita' },
      locale: 'it-IT',
      currency: '€',
      months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
      strings: {
        fullYear: 'Anno intero', all: 'Tutto', allM: 'Tutti', compare: 'Confronto', qtr: 'Trim.',
        month: 'Mese', varShort: 'Var', pyShort: 'PY', cyShort: 'CY', prevShort: 'Prec.',
        curShort: 'Corr.', reset: 'Azzera filtri', period: 'Periodo', year: 'Anno',
        qtrLong: 'Trimestre', monthLong: 'Mese', updatedLabel: 'Ultimo aggiornamento'
      },
      updated: '2 set 2026, 07:00',
      source: 'Fonte: casse dei punti vendita<br>Export giornaliero 07:00',
      watermark: 'Mockup dimostrativo · dati sintetici · non rappresenta vendite reali'
    },
    aesthetic: 'corporate-sober',
    palette: { series: ['#4A4038', '#7A6A52', '#A8926E', '#D8C7A6', '#C6B79B', '#E3D9C4'] },
    grid: { contentWidth: 1044, gutter: 12, columns: 5 },
    model: {
      sums: ['rev', 'cost', 'pieces', 'waste'],
      measures: [
        { id: 'rev', label: 'Fatturato', agg: 'sum', field: 'rev', format: 'eur' },
        { id: 'cost', label: 'Costo', agg: 'sum', field: 'cost', format: 'eur' },
        { id: 'pieces', label: 'Scontrini', agg: 'sum', field: 'pieces', format: 'N' },
        { id: 'waste', label: 'Invenduto', agg: 'sum', field: 'waste', format: 'eur', inv: true },
        { id: 'gp', label: 'Margine lordo', agg: 'diff', a: 'rev', b: 'cost', format: 'eur' },
        { id: 'mg', label: 'Margine %', agg: 'ratio', num: 'gp', den: 'rev', format: 'pc' },
        { id: 'aov', label: 'Scontrino medio', agg: 'ratio', num: 'rev', den: 'pieces', format: 'eurF' },
        { id: 'wasteRate', label: 'Quota invenduto', agg: 'ratio', num: 'waste', den: 'rev', format: 'pc', inv: true }
      ]
    },
    filters: {
      date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
      dims: [{ id: 'shop', label: 'Punto vendita', control: 'list', allLabel: 'Tutti i negozi', pill: 'PV' }]
    },
    kpiBand: [
      { id: 'rev', label: 'Fatturato', measure: 'rev', span: 1 },
      { id: 'pieces', label: 'Scontrini', measure: 'pieces', span: 1 },
      { id: 'aov', label: 'Scontrino medio', measure: 'aov', span: 1 },
      { id: 'mg', label: 'Margine lordo', measure: 'mg', span: 1 },
      { id: 'waste', label: 'Quota invenduto', measure: 'wasteRate', span: 1, inv: true }
    ],
    pages: [{
      id: 'main',
      title: 'Performance punti vendita',
      subtitle: 'Fatturato per negozio e famiglia di prodotto',
      nav: 'Performance',
      rows: [
        {
          visuals: [
            {
              type: 'trend', span: 3, h: 206, title: 'Fatturato mensile', subtitle: '{y} vs {py}',
              note: 'i filtri Trim./Mese non toccano la timeline',
              legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
              bind: { measure: 'rev' }
            },
            {
              type: 'donut', span: 2, h: 238, title: 'Mix per punto vendita',
              subtitle: 'quota fatturato · clicca per filtrare', centreLabel: 'Fatturato',
              bind: { dim: 'shop', measure: 'rev' }
            }
          ]
        },
        {
          flex: true,
          visuals: [{
            type: 'matrix', span: 5, title: 'Performance per punto vendita', subtitle: 'ordinata per fatturato',
            note: 'tasto destro su una riga per le famiglie di prodotto',
            bind: {
              dim: 'shop', label: 'Punto vendita', sort: 'rev', totalsLabel: 'Totale catena',
              columns: [
                { measure: 'rev', label: 'Fatturato' },
                { measure: 'rev', label: '{basis}', kind: 'var' },
                { measure: 'pieces', label: 'Scontrini' },
                { measure: 'aov', label: 'Scontrino' },
                { measure: 'mg', label: 'Margine %' },
                { measure: 'wasteRate', label: 'Invenduto', kind: 'heat', scale: [0.09, 0.02] },
                { measure: 'rev', label: 'Quota', kind: 'share' }
              ]
            }
          }]
        }
      ]
    }],
    drill: {
      dim: 'shop',
      page: {
        id: '__drill__', title: '{drill}', subtitle: 'Dettaglio negozio e famiglie di prodotto',
        drillHeader: 'Dettaglio punto vendita · {period} · confronto {basis}',
        backLabel: 'Torna a tutti i negozi',
        rows: [{
          visuals: [
            {
              type: 'trend', span: 3, h: 210, title: 'Andamento mensile', subtitle: '{drill} · {y} vs {py}',
              legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
              bind: { measure: 'rev' }
            },
            {
              type: 'hbar', span: 2, title: 'Famiglie di prodotto', subtitle: 'per fatturato',
              bind: { dim: 'fam', measure: 'rev', top: 6, detail: true, subMeasure: 'pieces', subUnit: ' scontrini' }
            }
          ]
        }]
      }
    }
  },
  dataParams: {
    seed: 71042,
    years: [2024, 2025],
    seasonality: [0.94, 0.9, 1.02, 1.08, 1.02, 0.95, 0.86, 0.72, 1.04, 1.06, 1.08, 1.33],
    dims: {
      shop: {
        members: [
          { id: 'centro', n: 'Centro storico', c: '#4A4038', base: 47000, growth: 0.061, attrs: { aov: 8.4, margin: 0.63, waste: 0.041 } },
          { id: 'stazione', n: 'Stazione', c: '#7A6A52', base: 39000, growth: 0.124, attrs: { aov: 6.1, margin: 0.58, waste: 0.052 } },
          { id: 'quartiere', n: 'Quartiere Nord', c: '#A8926E', base: 28000, growth: -0.073, attrs: { aov: 9.2, margin: 0.61, waste: 0.089 } },
          { id: 'outlet', n: 'Centro commerciale', c: '#D8C7A6', base: 22000, growth: 0.028, attrs: { aov: 7.3, margin: 0.55, waste: 0.067 } }
        ]
      }
    },
    facts: {
      dim: 'shop',
      fields: [
        { id: 'rev', kind: 'seasonal' },
        { id: 'cost', kind: 'share', of: 'rev', attr: 'margin', complement: true, jitter: [0.97, 1.03] },
        { id: 'pieces', kind: 'divide', of: 'rev', attr: 'aov', jitter: [0.9, 1.12], min: 1 },
        { id: 'waste', kind: 'share', of: 'rev', attr: 'waste', jitter: [0.85, 1.2] }
      ]
    },
    detail: {
      dim: 'fam',
      parentDim: 'shop',
      members: {
        centro: ['Pane a lievitazione naturale', 'Focacce e pizze', 'Pasticceria da colazione', 'Torte su ordinazione'],
        stazione: ['Pane comune', 'Focacce e pizze', 'Pasticceria da colazione', 'Caffetteria'],
        quartiere: ['Pane comune', 'Pane a lievitazione naturale', 'Pasticceria da colazione', 'Biscotteria'],
        outlet: ['Pane comune', 'Focacce e pizze', 'Biscotteria', 'Prodotti confezionati']
      },
      fields: ['rev'],
      counts: { field: 'pieces', from: 'pieces' }
    }
  }
});
