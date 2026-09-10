/* ARCHETIPO 3 — FUNNEL / CONVERSIONE. Vendite B2B, pipeline per fonte.
 *
 * DOMANDA: "dove perdo le persone?" — non "quanto ho venduto", che e un'altra pagina.
 * APERTURA: il funnel dominante a sinistra, la conversione per stadio a destra. E' un layout
 *           SCHEMATICO: la posizione dei riquadri segue il flusso, non una griglia neutra.
 * CHIUSURA: la tabella delle fonti col tasso di conversione — dove si decide dove spendere.
 *
 * ANCORE (niches.md, voce vendite B2B):
 *   win rate            20 – 25%, media ~21%   -> vinte = qualificate x win rate
 *   quota attainment    medio ~74%
 *   pipeline coverage   3x – 5x il target
 *   sales cycle         90 – 180 giorni mid-market
 *
 * STORIA NEGATIVA: il canale che porta piu lead e quello che converte peggio — la fiera porta
 * volume e non chiude, il referral porta poco e chiude quasi sempre. Nel funnel non si vede:
 * si vede nella tabella di chiusura, ed e per questo che quella tabella e la chiusura.
 */
'use strict';
const builder = require('../data-builder.js');

const dataParams = {
  seed: 33814,
  years: [2024, 2025],
  seasonality: [1.04, 1.08, 1.12, 1.02, 0.98, 0.94, 0.82, 0.54, 1.10, 1.16, 1.12, 0.88],
  dims: {
    fonte: {
      members: [
        /* la storia negativa sta qui dentro: `vinto` e la quota di qualificate che chiude */
        { id: 'fiera', n: 'Fiere', c: '#12304F', base: 2600, growth: 0.16,
          attrs: { qual: 0.31, vinto: 0.11, deal: 14200, giorni: 168 } },
        { id: 'ads', n: 'Ads', c: '#1F4E79', base: 2100, growth: 0.24,
          attrs: { qual: 0.26, vinto: 0.17, deal: 11800, giorni: 122 } },
        { id: 'out', n: 'Outbound', c: '#4A7FA8', base: 1450, growth: -0.05,
          attrs: { qual: 0.38, vinto: 0.22, deal: 19600, giorni: 147 } },
        { id: 'ref', n: 'Referral', c: '#7FA8C6', base: 620, growth: 0.31,
          attrs: { qual: 0.62, vinto: 0.44, deal: 24800, giorni: 96 } }
      ]
    },
    segmento: {
      members: [
        { id: 'ent', n: 'Enterprise', c: '#12304F', base: 1, attrs: {} },
        { id: 'mid', n: 'Mid-market', c: '#4A7FA8', base: 1, attrs: {} },
        { id: 'smb', n: 'SMB', c: '#C6D7E4', base: 1, attrs: {} }
      ]
    }
  },
  facts: {
    dim: 'fonte',
    split: { dim: 'segmento', shares: [0.24, 0.44, 0.32] },
    fields: [
      { id: 'lead', kind: 'seasonal', jitter: [0.9, 1.1] },
      { id: 'qualificate', kind: 'share', of: 'lead', attr: 'qual', jitter: [0.93, 1.08] },
      { id: 'demo', kind: 'share', of: 'qualificate', attr: 'qual', jitter: [0.95, 1.12], cap: 0.85 },
      /* il win rate si applica alle qualificate, non ai lead: e l'ancora della nicchia */
      { id: 'vinte', kind: 'share', of: 'qualificate', attr: 'vinto', jitter: [0.9, 1.12] },
      { id: 'valore', kind: 'share', of: 'vinte', attr: 'deal', jitter: [0.88, 1.15] },
      { id: 'giorniCiclo', kind: 'share', of: 'vinte', attr: 'giorni', jitter: [0.9, 1.12] }
    ]
  }
};

const M = (id, label, extra) => Object.assign({ id, label }, extra);

const spec = {
  meta: {
    title: 'Pipeline commerciale — dove si perdono le trattative',
    subtitle: 'Dal primo contatto al contratto, per fonte · {y}',
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    updated: 'aggiornato il 2 set 2026',
    watermark: 'Mockup dimostrativo · dati sintetici'
  },
  aesthetic: 'corporate-sober',
  /* B2B sales: slate freddo e titoli slab — la pelle "commerciale seria" della nicchia. */
  skin: { palette: 'slate-freddo', tipografia: 'editoriale' },
  archetype: 'funnel',
  grid: { contentWidth: 1044, gutter: 12, columns: 4 },
  model: {
    sums: ['lead', 'qualificate', 'demo', 'vinte', 'valore', 'giorniCiclo'],
    measures: [
      M('lead', 'Lead', { agg: 'sum', field: 'lead', unit: 'count', format: 'N' }),
      M('qualificate', 'Qualificate', { agg: 'sum', field: 'qualificate', unit: 'count', format: 'N' }),
      M('demo', 'Demo', { agg: 'sum', field: 'demo', unit: 'count', format: 'N' }),
      M('vinte', 'Vinte', { agg: 'sum', field: 'vinte', unit: 'count', format: 'N' }),
      M('valore', 'Valore vinto', { agg: 'sum', field: 'valore', unit: 'money', format: 'eur' }),
      M('winRate', 'Win rate', { agg: 'ratio', num: 'vinte', den: 'qualificate', unit: 'pct', format: 'pc' }),
      M('convLead', 'Conversione da lead', { agg: 'ratio', num: 'vinte', den: 'lead', unit: 'pct', format: 'pc' }),
      M('qualRate', 'Tasso di qualifica', { agg: 'ratio', num: 'qualificate', den: 'lead', unit: 'pct', format: 'pc' }),
      M('dealMedio', 'Valore medio', { agg: 'ratio', num: 'valore', den: 'vinte', unit: 'money', format: 'eurF' }),
      M('ciclo', 'Ciclo (giorni)', { agg: 'ratio', num: 'giorniCiclo', den: 'vinte', unit: 'days', format: 'days', inv: true })
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'fonte', label: 'Fonte', control: 'list', allLabel: 'Tutte', pill: 'Fonte' },
      { id: 'segmento', label: 'Segmento', control: 'list', allLabel: 'Tutti', pill: 'Segm.' }
    ]
  },
  kpiBand: [
    { id: 'lead', label: 'Lead', measure: 'lead', span: 1 },
    { id: 'vinte', label: 'Trattative vinte', measure: 'vinte', span: 1 },
    { id: 'winRate', label: 'Win rate', measure: 'winRate', span: 1 },
    { id: 'dealMedio', label: 'Valore medio', measure: 'dealMedio', span: 1 }
  ],
  pages: [{
    id: 'main',
    title: 'Conversione',
    subtitle: 'Il collo di bottiglia e la qualifica: due lead su tre non arrivano alla demo',
    rows: [
      { visuals: [
        /* L'APERTURA schematica: il flusso a sinistra, e accanto la stessa storia vista per
           entita — quale fonte regge la conversione e quale la perde. */
        { type: 'funnel', span: 2, h: 168, title: 'Dal lead al contratto — {period}',
          subtitle: 'a destra di ogni stadio, la conversione dal precedente',
          bind: {
            stages: [
              { measure: 'lead', label: 'Lead', c: 'var(--c1)' },
              { measure: 'qualificate', label: 'Qualificate', c: 'var(--c2)' },
              { measure: 'demo', label: 'Demo', c: 'var(--c3)' },
              { measure: 'vinte', label: 'Vinte', c: 'var(--c4)' }
            ]
          } },
        { type: 'hbar', span: 2, h: 168, title: 'Win rate per fonte',
          subtitle: 'la fonte che porta piu lead non e quella che chiude',
          bind: { dim: 'fonte', measure: 'winRate' } }
      ] },
      { visuals: [
        { type: 'colline', span: 2, h: 138, title: 'Lead per mese, con il win rate come linea',
          bind: { measure: 'lead', line: 'winRate' } },
        { type: 'stack100', span: 2, h: 138, title: 'Composizione delle vinte per segmento',
          bind: { dim: 'segmento', measure: 'vinte', by: 'q' } }
      ] },
      /* LA CHIUSURA: la tabella delle fonti col tasso di conversione, che e la decisione. */
      { flex: true, visuals: [{
        type: 'matrix', span: 4, title: 'Fonti — volume, conversione e valore · {period}',
        bind: {
          dim: 'fonte', label: 'Fonte', sort: 'valore', drill: true, totalsLabel: 'Totale pipeline',
          columns: [
            { measure: 'lead', label: 'Lead' },
            { measure: 'qualRate', label: 'Qualifica' },
            { measure: 'winRate', label: 'Win rate', kind: 'heat', scale: [0.1, 0.45] },
            { measure: 'vinte', label: 'Vinte' },
            { measure: 'valore', label: 'Valore' },
            { measure: 'ciclo', label: 'Ciclo' }
          ]
        }
      }] }
    ]
  }],
  drill: {
    dim: 'fonte',
    page: {
      id: '__drill__',
      title: '{drill}',
      drillHeader: 'Dettaglio della fonte — {period}',
      backLabel: 'Torna alla conversione',
      rows: [
        { visuals: [
          { type: 'trend', span: 2, h: 190, title: 'Lead mensili — {drill}', bind: { measure: 'lead' } },
          { type: 'hbar', span: 2, h: 190, title: 'Valore vinto per segmento',
            bind: { dim: 'segmento', measure: 'valore' } }
        ] }
      ]
    }
  }
};

module.exports = {
  spec, dataParams, build: () => builder.build(dataParams),
  name: 'Archetipo 3 — funnel (pipeline B2B per fonte)'
};
