/* BANCO DI PROVA — delta-card in apertura: "come sta cambiando", non "quanto vale".
 *
 * La storia negativa FIRMA del finanziario (niches.md, voce CFO): RICAVO SU, MARGINE GIU.
 * E' il caso in cui una banda KPI da sola tradisce il lettore — quattro numeroni verdi con la
 * loro freccia, e la compressione del margine che passa come una riga fra le altre.
 *
 * Le due delta-card aprono dicendo la cosa che conta nella misura in cui conta: la prima porta
 * la crescita dei ricavi, la seconda l'erosione del margine IN PUNTI, non in percentuale della
 * percentuale. Una accanto all'altra la tensione si legge in due secondi, che e esattamente il
 * tempo che un board dedica alla prima riga di una slide.
 *
 * ANCORE (niches.md, voce finanziario / CFO):
 *   EBITDA %              5 – 20% secondo il settore  -> EBITDA = ricavi x margine
 *   scostamento budget    -15% – +10%
 *   margine lordo         coerente col settore, non un valore unico
 * Qui: manifattura, margine lordo attorno al 33% che si comprime, EBITDA attorno al 12%.
 *
 * VERIFICA A VISTA: la delta-card dei ricavi deve essere verde e quella del margine rossa nello
 * STESSO periodo. Se sono dello stesso colore, il generatore non sta raccontando la storia.
 */
'use strict';
const builder = require('../../data-builder.js');

const dataParams = {
  seed: 40771,
  years: [2024, 2025],
  seasonality: [0.88, 0.92, 1.06, 1.04, 1.10, 1.08, 0.94, 0.58, 1.08, 1.14, 1.12, 1.06],
  dims: {
    bu: {
      members: [
        /* la BU che cresce di piu e anche quella che compra il fatturato al costo peggiore:
           e da qui che nasce l'erosione, e la matrice in fondo deve permettere di trovarla */
        { id: 'oem', n: 'OEM', c: '#12304F', base: 640000, growth: 0.29, attrs: { cogs: 0.74, opex: 0.16 } },
        { id: 'ricambi', n: 'Ricambi', c: '#4A7FA8', base: 410000, growth: 0.07, attrs: { cogs: 0.58, opex: 0.19 } },
        { id: 'servizi', n: 'Servizi', c: '#A8926E', base: 265000, growth: 0.12, attrs: { cogs: 0.49, opex: 0.24 } },
        { id: 'retail', n: 'Retail', c: '#7FA8C6', base: 198000, growth: -0.06, attrs: { cogs: 0.63, opex: 0.21 } }
      ]
    },
    linea: {
      members: [
        { id: 'idr', n: 'Idraulica', c: '#1F4E79', base: 1, attrs: {} },
        { id: 'ele', n: 'Elettrico', c: '#8FB3CC', base: 1, attrs: {} },
        { id: 'ter', n: 'Termico', c: '#C6D7E4', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'bu',
    split: { dim: 'linea', shares: [0.42, 0.34, 0.24] },
    fields: [
      { id: 'ricavi', kind: 'seasonal', jitter: [0.94, 1.06] },
      /* growthFactor alza la quota di costo del venduto SOLO nell'anno corrente: e il
         meccanismo dell'erosione, un punto e mezzo di margine bruciato mentre i ricavi salgono */
      { id: 'costoVenduto', kind: 'share', of: 'ricavi', attr: 'cogs', jitter: [0.98, 1.03], growthFactor: 1.045 },
      { id: 'opex', kind: 'share', of: 'ricavi', attr: 'opex', jitter: [0.96, 1.05] },
      { id: 'margine', kind: 'combine', plus: ['ricavi'], minus: ['costoVenduto'] },
      { id: 'ebitda', kind: 'combine', plus: ['margine'], minus: ['opex'] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Controllo di gestione — redditivita',
    subtitle: 'I ricavi crescono, il margine si comprime · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'corporate-sober',
  archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['ricavi', 'costoVenduto', 'opex', 'margine', 'ebitda'],
    measures: [
      M('ricavi', 'Ricavi', { agg: 'sum', field: 'ricavi', unit: 'money', format: 'eur' }),
      M('costoVenduto', 'Costo del venduto', { agg: 'sum', field: 'costoVenduto', unit: 'money', format: 'eur' }),
      M('opex', 'Costi operativi', { agg: 'sum', field: 'opex', unit: 'money', format: 'eur' }),
      M('margine', 'Margine lordo', { agg: 'sum', field: 'margine', unit: 'money', format: 'eur' }),
      M('ebitda', 'EBITDA', { agg: 'sum', field: 'ebitda', unit: 'money', format: 'eur' }),
      M('marginePc', 'Margine lordo %', { agg: 'ratio', num: 'margine', den: 'ricavi', unit: 'pct', format: 'pc' }),
      M('ebitdaPc', 'EBITDA %', { agg: 'ratio', num: 'ebitda', den: 'ricavi', unit: 'pct', format: 'pc' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'bu', label: 'Business unit', control: 'list', allLabel: 'Tutte', pill: 'BU' },
      { id: 'linea', label: 'Linea', control: 'list', allLabel: 'Tutte', pill: 'Linea' }
    ]
  },
  kpiBand: [
    { id: 'ricavi', label: 'Ricavi', measure: 'ricavi', span: 1 },
    { id: 'margine', label: 'Margine lordo', measure: 'margine', span: 1 },
    { id: 'marginePc', label: 'Margine lordo %', measure: 'marginePc', span: 1 },
    { id: 'ebitdaPc', label: 'EBITDA %', measure: 'ebitdaPc', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Redditivita',
    subtitle: 'La crescita dei ricavi e la compressione del margine, una accanto all’altra',
    rows: [
      { visuals: [
        { type: 'delta-card', span: 1, h: 148, title: 'Ricavi',
          bind: { measure: 'ricavi' } },
        /* inv non serve: qui il margine che scende E' negativo, e il verso di default lo dice */
        { type: 'delta-card', span: 1, h: 148, title: 'Margine lordo %',
          bind: { measure: 'marginePc' } },
        { type: 'trend', span: 2, h: 148, title: 'Margine lordo % per mese — {y} vs {py}',
          subtitle: 'la divergenza dai ricavi e la storia',
          legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
          bind: { measure: 'marginePc' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Dettaglio per business unit — {period}',
        bind: {
          dim: 'bu', label: 'Business unit', sort: 'ricavi', drill: false,
          totalsLabel: 'Totale gruppo',
          columns: [
            { measure: 'ricavi', label: 'Ricavi' },
            { measure: 'ricavi', label: '{basis}', kind: 'var' },
            { measure: 'margine', label: 'Margine lordo' },
            { measure: 'marginePc', label: 'Margine %', kind: 'heat', scale: [0.24, 0.46] },
            { measure: 'ebitdaPc', label: 'EBITDA %' }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Delta-card — ricavi su, margine giu' };
