/* Eval case "social-monthly" — monthly multi-platform social report for a beverage client.
 * Agency-modern, Italian, paid/organic split, one platform in decline.
 * Exercises: top-axis shell, stack100, hbar, ribbon, IPF-derived format shares.
 */
'use strict';
const DM = require('../data-model.js');

const SEED = 31071;
/* engagement rates stay platform-plausible: IG 1-4%, TikTok higher, LinkedIn 2-5% */
const PLATS = [
  { id: 'ig', n: 'Instagram', c: '#4C6FE0', base: 980000, growth: .08, er: .031, paid: .42, cpm: 6.2, fol: .019 },
  { id: 'tt', n: 'TikTok', c: '#22B5A6', base: 620000, growth: .41, er: .062, paid: .28, cpm: 4.1, fol: .048 },
  { id: 'fb', n: 'Facebook', c: '#3D4A6B', base: 540000, growth: -.14, er: .009, paid: .61, cpm: 5.4, fol: -.004 }, /* the negative storyline */
  { id: 'yt', n: 'YouTube', c: '#7A5AF8', base: 310000, growth: .17, er: .022, paid: .35, cpm: 8.9, fol: .012 },
  { id: 'li', n: 'LinkedIn', c: '#2E9BD6', base: 145000, growth: .23, er: .038, paid: .19, cpm: 11.4, fol: .021 }
];
const FORMATS = [
  { id: 'reel', n: 'Reel / Short' }, { id: 'post', n: 'Post statico' },
  { id: 'story', n: 'Story' }, { id: 'live', n: 'Video lungo' }
];
const SEAS = [.94, .90, 1.02, 1.05, 1.08, 1.12, .86, .74, 1.06, 1.08, 1.06, 1.09];
const YRS = [2024, 2025];

function build() {
  const { j } = DM.rng(SEED);
  const facts = DM.genMonthly({
    j, years: YRS, seas: SEAS, dim: 'plat',
    members: PLATS,
    row: (reach, p, yi) => {
      const impr = reach * j(1.35, 1.7);
      const eng = impr * p.er * j(.9, 1.1);
      const paidImpr = impr * p.paid * j(.92, 1.08);
      return {
        reach: Math.round(reach),
        impr: Math.round(impr),
        eng: Math.round(eng),
        paidImpr: Math.round(paidImpr),
        orgImpr: Math.round(impr - paidImpr),
        spend: Math.round(paidImpr / 1000 * p.cpm * j(.93, 1.07)),   /* paid always costs; organic never */
        clicks: Math.round(eng * j(.11, .19)),
        folNew: Math.round(reach * p.fol * j(.8, 1.2) / 12 * (yi ? 1.1 : 1))
      };
    }
  });

  /* format mix: authored global marginals x platform marginals, fitted with IPF so the joint
     reconciles on both axes instead of being two independent tables */
  const platTot = PLATS.map(p => ({ id: p.id, v: DM.sum(facts.filter(f => f.plat === p.id), 'impr') }));
  const gTot = platTot.reduce((a, p) => a + p.v, 0);
  const fmtTot = [.42, .27, .19, .12].map((s, i) => ({ id: FORMATS[i].id, v: gTot * s }));
  const seedGrid = (i, k) => 1 + j(0, 1.4) * (k === 0 && (i === 1 || i === 0) ? 2.2 : 1);   /* reels skew to IG/TikTok */
  const joint = DM.jointRows('plat', 'fmt', platTot, fmtTot, 'impr', seedGrid);
  const shares = {};
  PLATS.forEach(p => {
    const mine = joint.filter(r => r.plat === p.id), s = DM.sum(mine, 'impr') || 1;
    mine.forEach(r => shares[p.id + ':' + r.fmt] = r.impr / s);
  });

  const fmtMembers = [];
  PLATS.forEach(p => FORMATS.forEach(f => fmtMembers.push({ id: p.id + ':' + f.id, n: f.n, c: p.c, parent: p.id, parentDim: 'plat' })));

  const cols = ['y', 'm', 'plat', 'reach', 'impr', 'eng', 'paidImpr', 'orgImpr', 'spend', 'clicks', 'folNew'];
  return {
    dims: { plat: PLATS.map(p => ({ id: p.id, n: p.n, c: p.c })), fmt: fmtMembers },
    years: YRS,
    facts: { cols, rows: facts.map(f => cols.map(c => f[c])) },
    detailModel: { dim: 'fmt', parentDim: 'plat', fields: ['impr', 'eng'], shares },
    tieOut: { impr_facts: DM.sum(facts, 'impr'), impr_joint: Math.round(DM.sum(joint, 'impr')), impr_delta: Math.round(DM.sum(facts, 'impr') - DM.sum(joint, 'impr')) }
  };
}

const spec = {
  meta: {
    title: 'Performance social', subtitle: 'Reach, engagement e crescita follower per piattaforma',
    brand: { name: 'Fonte Vivace', tagline: 'Report social mensile · dati sintetici' },
    locale: 'it-IT', currency: '€',
    months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    strings: {
      fullYear: 'Anno intero', all: 'Tutto', allM: 'Tutti', compare: 'Confronto', qtr: 'Trim.', month: 'Mese',
      varShort: 'Var', pyShort: 'PY', cyShort: 'CY', prevShort: 'Prec.', curShort: 'Corr.',
      reset: 'Azzera filtri', period: 'Periodo', year: 'Anno', qtrLong: 'Trimestre', monthLong: 'Mese',
      updatedLabel: 'Ultimo aggiornamento'
    },
    updated: '3 set 2026, 06:30',
    watermark: 'Mockup dimostrativo · dati sintetici · non rappresenta performance reali'
  },
  aesthetic: 'agency-modern',
  palette: { series: ['#4C6FE0', '#22B5A6', '#3D4A6B', '#7A5AF8', '#2E9BD6', '#F0A63C'] },
  grid: { contentWidth: 1254, gutter: 12, columns: 5 },
  model: {
    sums: ['reach', 'impr', 'eng', 'paidImpr', 'orgImpr', 'spend', 'clicks', 'folNew'],
    measures: [
      { id: 'reach', label: 'Reach', agg: 'sum', field: 'reach', format: 'N' },
      { id: 'impr', label: 'Impression', agg: 'sum', field: 'impr', format: 'N' },
      { id: 'eng', label: 'Interazioni', agg: 'sum', field: 'eng', format: 'N' },
      { id: 'spend', label: 'Spesa paid', agg: 'sum', field: 'spend', format: 'eur' },
      { id: 'folNew', label: 'Nuovi follower', agg: 'sum', field: 'folNew', format: 'N' },
      { id: 'clicks', label: 'Click', agg: 'sum', field: 'clicks', format: 'N' },
      { id: 'paidImpr', label: 'Impression paid', agg: 'sum', field: 'paidImpr', format: 'N' },
      { id: 'er', label: 'Engagement rate', agg: 'ratio', num: 'eng', den: 'impr', format: 'pc' },
      { id: 'ctr', label: 'CTR', agg: 'ratio', num: 'clicks', den: 'impr', format: 'pc' },
      { id: 'paidShare', label: 'Quota paid', agg: 'ratio', num: 'paidImpr', den: 'impr', format: 'pc' }
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [{ id: 'plat', label: 'Piattaforma', control: 'dropdown', allLabel: 'Tutte le piattaforme', pill: 'Piatt.' }]
  },
  kpiBand: [
    { id: 'reach', label: 'Reach', measure: 'reach', span: 1 },
    { id: 'er', label: 'Engagement rate', measure: 'er', span: 1 },
    { id: 'fol', label: 'Nuovi follower', measure: 'folNew', span: 1 },
    { id: 'spend', label: 'Spesa paid', measure: 'spend', span: 1 },
    { id: 'ctr', label: 'CTR', measure: 'ctr', span: 1 }
  ],
  pages: [{
    id: 'main', title: 'Performance social', subtitle: 'Reach, engagement e crescita follower per piattaforma',
    nav: 'Panoramica',
    rows: [
      {
        visuals: [
          {
            type: 'trend', span: 3, h: 184, title: 'Reach mensile', subtitle: '{y} vs {py}',
            note: 'i filtri Trim./Mese non toccano la timeline',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
            bind: { measure: 'reach' }
          },
          {
            type: 'stack100', span: 2, h: 184, title: 'Mix piattaforme per trimestre',
            subtitle: 'quota impression · clicca per filtrare',
            bind: { dim: 'plat', measure: 'impr', by: 'q' }
          }
        ]
      },
      {
        visuals: [
          {
            type: 'hbar', span: 3, h: 124, title: 'Formati più visti', subtitle: 'impression per formato',
            bind: { dim: 'fmt', measure: 'impr', top: 5, parent: 'plat', detail: true, subMeasure: 'eng', subUnit: ' int.' }
          },
          {
            type: 'ribbon', span: 2, h: 124, title: 'Chi guida, trimestre per trimestre',
            subtitle: 'ordine per impression',
            bind: { dim: 'plat', measure: 'impr', by: 'q' }
          }
        ]
      },
      {
        flex: true,
        visuals: [{
          type: 'matrix', span: 5, title: 'Performance per piattaforma', subtitle: 'ordinata per reach',
          note: 'tasto destro su una riga per i formati',
          bind: {
            dim: 'plat', label: 'Piattaforma', sort: 'reach', totalsLabel: 'Totale profilo',
            columns: [
              { measure: 'reach', label: 'Reach' },
              { measure: 'reach', label: '{basis}', kind: 'var' },
              { measure: 'impr', label: 'Impression' },
              { measure: 'er', label: 'Eng. rate', kind: 'heat', scale: [.008, .06] },
              { measure: 'paidShare', label: 'Quota paid' },
              { measure: 'folNew', label: 'Follower' },
              { measure: 'spend', label: 'Spesa' }
            ]
          }
        }]
      }
    ]
  }],
  drill: {
    dim: 'plat',
    page: {
      id: '__drill__', title: '{drill}', subtitle: 'Dettaglio piattaforma e formati',
      drillHeader: 'Dettaglio piattaforma · {period} · confronto {basis}',
      backLabel: 'Torna a tutte le piattaforme',
      rows: [{
        visuals: [
          {
            type: 'trend', span: 3, h: 210, title: 'Reach mensile', subtitle: '{drill} · {y} vs {py}',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
            bind: { measure: 'reach' }
          },
          {
            type: 'hbar', span: 2, title: 'Formati della piattaforma', subtitle: 'per impression',
            bind: { dim: 'fmt', measure: 'impr', top: 6, detail: true, subMeasure: 'eng', subUnit: ' int.' }
          }
        ]
      }]
    }
  }
};

module.exports = { spec, build, SEED };
