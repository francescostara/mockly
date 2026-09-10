/* BANCO DI PROVA — il filtro che deve azzerare, non lasciare tutto com'era.
 *
 * Il difetto originale: nel report social, con Tipo = Organico selezionato, la KPI "Spesa paid"
 * e il donut della spesa restavano pieni e invariati. Sotto organico la spesa paid e
 * concettualmente ZERO: un filtro che non la tocca e un filtro che non fa niente, travestito da
 * filtro che funziona.
 *
 * La cura sta nel DATO, non a valle. Il campo `spend` dichiara di esistere SOLO sul paid
 * (`only`), quindi il generatore scrive zero sull'organico e il filtro lo azzera perche zero e
 * la verita. Il visual, trovandosi a zero per via del filtro e non per mancanza di dato, si
 * dichiara non applicabile invece di disegnare un grafico vuoto.
 *
 * ANCORE (niches.md, voce social):
 *   ER su impression   0,4 – 0,9%     -> interazioni = impression x ER
 *   CPM                3 – 15 €       -> impression = spesa / CPM x 1000
 *   reach / impression 0,35 – 0,70    -> il reach e sempre sensibilmente minore
 */
'use strict';
const builder = require('../../data-builder.js');

const dataParams = {
  seed: 71204,
  years: [2024, 2025],
  seasonality: [0.86, 0.92, 1.04, 1.08, 1.12, 0.98, 0.84, 0.62, 1.10, 1.18, 1.24, 1.02],
  dims: {
    piattaforma: {
      /* `brand: true`: qui la tinta E' l'identita — Instagram e rosa, TikTok e nero, e un
         lettore le riconosce prima di leggere la legenda. E' l'unica eccezione alla scala
         verificata, e va dichiarata dal dato, non dedotta dal motore. */
      members: [
        { id: 'ig', n: 'Instagram', c: '#C13584', brand: true, base: 980000, growth: 0.11,
          attrs: { er: 0.0071, cpm: 7.4, copertura: 0.52 } },
        { id: 'tt', n: 'TikTok', c: '#111111', brand: true, base: 720000, growth: 0.38,
          attrs: { er: 0.0092, cpm: 5.1, copertura: 0.61 } },
        { id: 'yt', n: 'YouTube', c: '#C4302B', brand: true, base: 430000, growth: 0.06,
          attrs: { er: 0.0048, cpm: 9.2, copertura: 0.44 } },
        { id: 'li', n: 'LinkedIn', c: '#0A66C2', brand: true, base: 260000, growth: 0.14,
          attrs: { er: 0.0039, cpm: 13.8, copertura: 0.38 } },
        { id: 'fb', n: 'Facebook', c: '#4267B2', brand: true, base: 340000, growth: -0.17,
          attrs: { er: 0.0031, cpm: 6.3, copertura: 0.41 } }
      ]
    },
    tipo: {
      members: [
        { id: 'paid', n: 'Paid', c: '#12304F', base: 1, attrs: {} },
        { id: 'org', n: 'Organico', c: '#A8926E', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'piattaforma',
    split: { dim: 'tipo', shares: [0.58, 0.42] },
    fields: [
      { id: 'impressions', kind: 'seasonal', jitter: [0.93, 1.07] },
      { id: 'reach', kind: 'share', of: 'impressions', attr: 'copertura', jitter: [0.94, 1.06] },
      { id: 'interazioni', kind: 'share', of: 'impressions', attr: 'er', jitter: [0.88, 1.14] },
      /* LA RIGA CHE CONTA: la spesa paid esiste solo sul paid. Senza `only` il generatore la
         spalmerebbe anche sull'organico, e il filtro non avrebbe niente da azzerare. */
      { id: 'spesa', kind: 'divide', of: 'impressions', attr: 'cpmMille', jitter: [0.96, 1.05],
        min: 0, only: { dim: 'tipo', members: ['paid'] } }
    ]
  }
};

/* CPM per mille: la spesa e impression / (1000 / CPM), cioe impression x CPM / 1000 */
dataParams.dims.piattaforma.members.forEach(m => { m.attrs.cpmMille = 1000 / m.attrs.cpm; });

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Social — paid e organico',
    subtitle: 'Con "Organico" selezionato la spesa paid deve sparire, non restare uguale',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'agency-modern',
  archetype: 'scorecard',
  grid: { contentWidth: 1248, gutter: 12, columns: 4 },
  model: {
    sums: ['impressions', 'reach', 'interazioni', 'spesa'],
    measures: [
      M('impressions', 'Impression', { agg: 'sum', field: 'impressions', unit: 'count', format: 'N' }),
      M('reach', 'Reach', { agg: 'sum', field: 'reach', unit: 'count', format: 'N' }),
      M('interazioni', 'Interazioni', { agg: 'sum', field: 'interazioni', unit: 'count', format: 'N' }),
      M('spesa', 'Spesa paid', { agg: 'sum', field: 'spesa', unit: 'money', format: 'eur' }),
      M('er', 'Engagement rate', { agg: 'ratio', num: 'interazioni', den: 'impressions', unit: 'pct', format: 'pc' }),
      M('copertura', 'Reach su impression', { agg: 'ratio', num: 'reach', den: 'impressions', unit: 'pct', format: 'pc' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'piattaforma', label: 'Piattaforma', control: 'list', allLabel: 'Tutte', pill: 'Piatt.' },
      { id: 'tipo', label: 'Tipo', control: 'list', allLabel: 'Tutti', pill: 'Tipo' }
    ]
  },
  kpiBand: [
    { id: 'impressions', label: 'Impression', measure: 'impressions', span: 1 },
    { id: 'reach', label: 'Reach', measure: 'reach', span: 1 },
    { id: 'er', label: 'Engagement rate', measure: 'er', span: 1 },
    { id: 'spesa', label: 'Spesa paid', measure: 'spesa', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Paid e organico',
    subtitle: 'Seleziona "Organico" nel filtro Tipo: la spesa deve dichiararsi non applicabile',
    rows: [
      { visuals: [
        { type: 'trend', span: 2, h: 148, title: 'Impression mensili — {y} vs {py}',
          legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
          bind: { measure: 'impressions' } },
        { type: 'donut', span: 2, h: 148, title: 'Spesa paid per piattaforma',
          subtitle: 'sotto "Organico" questa spesa non esiste', centreLabel: 'Spesa',
          bind: { dim: 'piattaforma', measure: 'spesa' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Dettaglio per piattaforma — {period}',
        bind: {
          dim: 'piattaforma', label: 'Piattaforma', sort: 'impressions', drill: false,
          totalsLabel: 'Totale account',
          columns: [
            { measure: 'impressions', label: 'Impression' },
            { measure: 'reach', label: 'Reach' },
            { measure: 'er', label: 'ER', kind: 'heat', scale: [0.003, 0.01] },
            { measure: 'spesa', label: 'Spesa paid' }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Filtro — organico azzera la spesa' };
