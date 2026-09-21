/* BANCO DI PROVA — gauge con bersaglio, su quota attainment B2B.
 *
 * Il gauge e firma dell'autore in due nicchie validate: B2B sales (quota attainment, win rate
 * contro il target) e creator-economy (target achievement). Non e un tachimetro decorativo: le
 * tre parti servono tutte.
 *   · l'arco dice quanto si e fatto;
 *   · il MARCATORE del bersaglio da il metro — senza, il numero non significa niente;
 *   · l'ANNOTAZIONE dice di quanto si e sopra o sotto, costruita dalle misure.
 *
 * ANCORE (niches.md, voce B2B sales):
 *   win rate 20 – 25% mid-market          -> vinte = chiuse x win rate
 *   quota attainment medio ~74%           -> il gauge deve stare sotto il target, non sopra
 *   pipeline coverage 3x – 5x             -> pipeline = target x coverage
 *   deal size coerente col segmento       -> trattative = valore / deal size
 *
 * LA STORIA NEGATIVA: la rete chiude sotto quota, e il divario non e uniforme — Enterprise
 * regge, Mid-market e sotto di parecchio. Il gauge lo dice in un numero, la matrice dice dove.
 */
'use strict';
const builder = require('../../data-builder.js');

const dataParams = {
  seed: 33107,
  years: [2024, 2025],
  /* il B2B chiude a trimestre: marzo, giugno, settembre e dicembre sono i mesi veri */
  seasonality: [0.72, 0.84, 1.34, 0.76, 0.86, 1.32, 0.70, 0.58, 1.30, 0.82, 0.92, 1.44],
  dims: {
    segmento: {
      members: [
        { id: 'ent', n: 'Enterprise', c: '#12304F', base: 148000, growth: 0.16,
          attrs: { deal: 62000, win: 0.24, quota: 0.94 } },
        { id: 'mid', n: 'Mid-market', c: '#4A7FA8', base: 121000, growth: -0.09,
          attrs: { deal: 24000, win: 0.21, quota: 0.61 } },
        { id: 'smb', n: 'SMB', c: '#A8926E', base: 74000, growth: 0.07,
          attrs: { deal: 8500, win: 0.19, quota: 0.78 } }
      ]
    }
  },
  facts: {
    dim: 'segmento',
    fields: [
      /* la misura primaria e il valore chiuso vinto */
      { id: 'vinto', kind: 'seasonal', jitter: [0.9, 1.12] },
      /* le trattative vinte si derivano dal deal size, non si scelgono */
      { id: 'dealVinti', kind: 'divide', of: 'vinto', attr: 'deal', jitter: [0.88, 1.15], min: 1 },
      /* le trattative chiuse in totale: vinte / win rate */
      { id: 'dealChiusi', kind: 'divide', of: 'dealVinti', attr: 'win', jitter: [0.94, 1.08], min: 1 },
      /* la quota assegnata: il valore chiuso diviso l'attainment del segmento */
      { id: 'quota', kind: 'divide', of: 'vinto', attr: 'quota', jitter: [0.98, 1.02], min: 1 }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Vendite B2B — quota e pipeline',
    subtitle: 'Chiuso contro quota assegnata · {y} vs {py}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici · banco di prova'
  },
  aesthetic: 'corporate-sober',
  archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['vinto', 'dealVinti', 'dealChiusi', 'quota'],
    measures: [
      M('vinto', 'Chiuso vinto', { agg: 'sum', field: 'vinto', unit: 'money', format: 'eur' }),
      M('quota', 'Quota assegnata', { agg: 'sum', field: 'quota', unit: 'money', format: 'eur' }),
      M('dealVinti', 'Trattative vinte', { agg: 'sum', field: 'dealVinti', unit: 'count', format: 'N' }),
      M('dealChiusi', 'Trattative chiuse', { agg: 'sum', field: 'dealChiusi', unit: 'count', format: 'N' }),
      M('attainment', 'Quota attainment', { agg: 'ratio', num: 'vinto', den: 'quota', unit: 'pct', format: 'pc' }),
      M('winRate', 'Win rate', { agg: 'ratio', num: 'dealVinti', den: 'dealChiusi', unit: 'pct', format: 'pc' }),
      M('dealSize', 'Valore medio', { agg: 'ratio', num: 'vinto', den: 'dealVinti', unit: 'money', format: 'eurF' }),
      M('gap', 'Scarto sulla quota', { agg: 'diff', a: 'vinto', b: 'quota', unit: 'money', format: 'eur' })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [{ id: 'segmento', label: 'Segmento', control: 'list', allLabel: 'Tutti', pill: 'Segm.' }]
  },
  kpiBand: [
    { id: 'vinto', label: 'Chiuso vinto', measure: 'vinto', span: 1 },
    { id: 'dealVinti', label: 'Trattative vinte', measure: 'dealVinti', span: 1 },
    { id: 'winRate', label: 'Win rate', measure: 'winRate', span: 1 },
    { id: 'dealSize', label: 'Valore medio', measure: 'dealSize', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Quota e pipeline',
    subtitle: 'Dove la rete regge e dove no · {y}',
    rows: [
      { visuals: [
        { type: 'gauge', span: 1, h: 156, title: 'Quota attainment',
          bind: { measure: 'attainment', target: 1, targetLabel: 'quota', max: 1.2 } },
        { type: 'gauge', span: 1, h: 156, title: 'Win rate',
          subtitle: 'benchmark mid-market 21%',
          bind: { measure: 'winRate', target: 0.21, targetLabel: 'benchmark', max: 0.4 } },
        { type: 'colline', span: 2, h: 156, title: 'Chiuso mensile e win rate — {y} vs {py}',
          bind: { measure: 'vinto', line: 'winRate' } }
      ] },
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Dettaglio per segmento — {period}',
        bind: {
          dim: 'segmento', label: 'Segmento', sort: 'vinto', drill: false, totalsLabel: 'Totale rete',
          columns: [
            { measure: 'vinto', label: 'Chiuso vinto' },
            { measure: 'quota', label: 'Quota' },
            { measure: 'attainment', label: 'Attainment', kind: 'heat', scale: [0.55, 1.0] },
            { measure: 'winRate', label: 'Win rate' },
            { measure: 'dealSize', label: 'Valore medio' }
          ]
        }
      }] }
    ]
  }]
};

module.exports = { spec, build: () => builder.build(dataParams), dataParams, name: 'Gauge — quota B2B' };
