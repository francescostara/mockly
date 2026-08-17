/* Eval case "saas-metrics" — Series A SaaS growth dashboard for the exec team and board.
 * Executive-minimal, English, narrative hero.
 * Exercises: measure-driven narrative, waterfall bridge, point-in-time (agg:'last') MRR,
 * a ratio built on other ratios (CAC payback), and a lengthening-payback storyline.
 */
'use strict';
const DM = require('../data-model.js');

const SEED = 78310;
const SEGS = [
  { id: 'ent', n: 'Enterprise', c: '#14171A', base: 61000, growth: .29, churn: .006, exp: .028, arpa: 3400, cacM: 1.0 },
  { id: 'mid', n: 'Mid-market', c: '#4E555D', base: 48000, growth: .21, churn: .011, exp: .019, arpa: 1250, cacM: 1.0 },
  { id: 'smb', n: 'SMB', c: '#868D95', base: 33000, growth: .07, churn: .029, exp: .008, arpa: 320, cacM: 1.55 },  /* churning cohort + CAC payback lengthening */
  { id: 'self', n: 'Self-serve', c: '#BEC3C9', base: 14000, growth: .34, churn: .038, exp: .005, arpa: 74, cacM: .6 }
];
/* SaaS has no retail seasonality — a mild enterprise Q4/Q1 rhythm only */
const SEAS = [1.02, .99, 1.03, 1.0, 1.0, 1.04, .96, .93, 1.02, 1.03, 1.02, 1.06];
const YRS = [2024, 2025];

function build() {
  const { j } = DM.rng(SEED);
  const facts = DM.genMonthly({
    j, years: YRS, seas: SEAS, dim: 'seg', members: SEGS,
    row: (mrrStart, s, yi) => {
      /* round the components FIRST, then derive the movement from them, so
         new + expansion − churn == net new exactly (the board will add them up) */
      const start = Math.round(mrrStart);
      const churnMrr = Math.round(start * s.churn * j(.85, 1.2) * (s.id === 'smb' && yi === 1 ? 1.35 : 1));
      const expMrr = Math.round(start * s.exp * j(.85, 1.15));
      const newMrr = Math.round(start * (s.growth / 12 + s.churn) * j(.8, 1.25));
      const newLogos = Math.max(1, Math.round(newMrr / (s.arpa * j(.9, 1.1))));
      return {
        mrrStart: start,
        newMrr, expMrr, churnMrr,
        netNew: newMrr + expMrr - churnMrr,
        nrrNum: start + expMrr - churnMrr,
        mrr: start + newMrr + expMrr - churnMrr,
        newLogos,
        /* CAC payback lengthens for SMB in the current year — the negative storyline */
        cacSpend: Math.round(newLogos * s.arpa * s.cacM * j(6.5, 8.5) * (s.id === 'smb' ? 1 + .42 * yi : 1)),
        customers: Math.max(1, Math.round(start / (s.arpa * j(.95, 1.05))))
      };
    }
  });

  const cols = ['y', 'm', 'seg', 'mrrStart', 'newMrr', 'expMrr', 'churnMrr', 'netNew', 'nrrNum', 'mrr', 'newLogos', 'cacSpend', 'customers'];
  const idx = {}; SEGS.forEach((s, i) => idx[s.id] = i);
  return {
    dims: { seg: SEGS.map(s => ({ id: s.id, n: s.n, c: s.c })) },
    years: YRS,
    facts: { cols, rows: facts.map(f => cols.map(c => c === 'seg' ? idx[f.seg] : f[c])) },
    /* the MRR movement must reconcile: new + expansion − churn = net new */
    tieOut: {
      netNew_stated: DM.sum(facts, 'netNew'),
      netNew_components: DM.sum(facts, 'newMrr') + DM.sum(facts, 'expMrr') - DM.sum(facts, 'churnMrr'),
      netNew_delta: DM.sum(facts, 'netNew') - (DM.sum(facts, 'newMrr') + DM.sum(facts, 'expMrr') - DM.sum(facts, 'churnMrr'))
    }
  };
}

const spec = {
  meta: {
    title: 'Growth review', subtitle: 'MRR, retention and acquisition efficiency',
    brand: { name: 'Halden', tagline: 'Confidential · board pack' },
    locale: 'en-US', currency: '$',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    strings: {
      fullYear: 'Full year', all: 'All', allM: 'All', compare: 'Comparison', qtr: 'Qtr', month: 'Month',
      varShort: 'Var', pyShort: 'PY', cyShort: 'CY', prevShort: 'PM', curShort: 'CM',
      reset: 'Clear filters', period: 'Period', year: 'Year', qtrLong: 'Quarter', monthLong: 'Month',
      updatedLabel: 'Board pack as of'
    },
    updated: '31 Aug 2026',
    watermark: 'Demonstration mockup · synthetic data · not actual company performance'
  },
  aesthetic: 'executive-minimal',
  palette: { series: ['#14171A', '#4E555D', '#868D95', '#BEC3C9', '#DDE0E3', '#3E5C86'] },
  grid: { contentWidth: 1254, gutter: 12, columns: 5 },
  model: {
    sums: ['mrrStart', 'newMrr', 'expMrr', 'churnMrr', 'netNew', 'nrrNum', 'newLogos', 'cacSpend', 'customers'],
    measures: [
      { id: 'newMrr', label: 'New MRR', agg: 'sum', field: 'newMrr', format: 'eur' },
      { id: 'expMrr', label: 'Expansion', agg: 'sum', field: 'expMrr', format: 'eur' },
      { id: 'churnMrr', label: 'Churned MRR', agg: 'sum', field: 'churnMrr', format: 'eur', inv: true },
      { id: 'netNew', label: 'Net new MRR', agg: 'sum', field: 'netNew', format: 'eur' },
      { id: 'newLogos', label: 'New customers', agg: 'sum', field: 'newLogos', format: 'N' },
      { id: 'cacSpend', label: 'S&M spend', agg: 'sum', field: 'cacSpend', format: 'eur', inv: true },
      { id: 'mrrStart', label: 'Opening MRR', agg: 'sum', field: 'mrrStart', format: 'eur' },
      { id: 'nrrNum', label: 'Retained MRR', agg: 'sum', field: 'nrrNum', format: 'eur' },
      { id: 'mrr', label: 'MRR', agg: 'last', field: 'mrr', format: 'eur' },
      { id: 'nrr', label: 'Net revenue retention', agg: 'ratio', num: 'nrrNum', den: 'mrrStart', format: 'pc' },
      { id: 'churnRate', label: 'Gross churn', agg: 'ratio', num: 'churnMrr', den: 'mrrStart', format: 'pc', inv: true },
      { id: 'cac', label: 'CAC', agg: 'ratio', num: 'cacSpend', den: 'newLogos', format: 'eurF', inv: true },
      { id: 'arpaNew', label: 'New ARPA', agg: 'ratio', num: 'newMrr', den: 'newLogos', format: 'eurF' },
      { id: 'payback', label: 'CAC payback', agg: 'ratio', num: 'cac', den: 'arpaNew', format: 'x', inv: true }
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [{ id: 'seg', label: 'Segment', control: 'list', allLabel: 'All segments', pill: 'Seg.' }]
  },
  kpiBand: [
    { id: 'mrr', label: 'MRR', measure: 'mrr', span: 1 },
    { id: 'nrr', label: 'Net revenue retention', measure: 'nrr', span: 1 },
    { id: 'netNew', label: 'Net new MRR', measure: 'netNew', span: 1 },
    { id: 'churn', label: 'Gross churn', measure: 'churnRate', span: 1, inv: true },
    { id: 'payback', label: 'CAC payback (months)', measure: 'payback', span: 1, inv: true }
  ],
  pages: [{
    id: 'main', title: 'Growth review', subtitle: 'MRR, retention and acquisition efficiency', nav: 'Growth review',
    rows: [
      {
        visuals: [{
          type: 'narrative', span: 5,
          bind: {
            dim: 'seg', primary: 'netNew',
            template: 'MRR stands at {m:mrr}, with net new MRR of {m:netNew} ({var:netNew} {basis}). ' +
              'Growth is led by {top:} at {top:var} and held back by {drag:} at {drag:var}. ' +
              'Net revenue retention is {m:nrr} ({bps:nrr} on the comparable period), gross churn {m:churnRate}, ' +
              'and CAC payback {m:payback} months on {m:newLogos} new customers.'
          }
        }]
      },
      {
        visuals: [
          {
            type: 'trend', span: 3, h: 176, title: 'Net new MRR by month', subtitle: '{y} vs {py}',
            note: 'quarter/month filters do not touch the timeline',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
            bind: { measure: 'netNew' }
          },
          {
            type: 'waterfall', span: 2, h: 176, title: 'MRR bridge by segment', subtitle: '{py} → {y}',
            bind: { dim: 'seg', measure: 'mrr', startLabel: '{py}', endLabel: '{y}' }
          }
        ]
      },
      {
        flex: true,
        visuals: [{
          type: 'matrix', span: 5, title: 'Performance by segment', subtitle: 'sorted by MRR',
          note: 'right-click a row for the segment detail',
          bind: {
            dim: 'seg', label: 'Segment', sort: 'mrr', totalsLabel: 'Company',
            columns: [
              { measure: 'mrr', label: 'MRR' },
              { measure: 'mrr', label: '{basis}', kind: 'var' },
              { measure: 'netNew', label: 'Net new' },
              { measure: 'nrr', label: 'NRR', kind: 'heat', scale: [.95, 1.25] },
              { measure: 'churnRate', label: 'Churn', kind: 'heat', scale: [.05, 0] },
              { measure: 'payback', label: 'Payback' },
              { measure: 'mrr', label: 'Share', kind: 'share' }
            ]
          }
        }]
      }
    ]
  }],
  drill: {
    dim: 'seg',
    page: {
      id: '__drill__', title: '{drill}', subtitle: 'Segment detail',
      drillHeader: 'Segment detail · {period} · {basis} comparison',
      backLabel: 'Back to all segments',
      rows: [{
        visuals: [
          {
            type: 'trend', span: 3, h: 200, title: 'Net new MRR by month', subtitle: '{drill} · {y} vs {py}',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
            bind: { measure: 'netNew' }
          },
          {
            type: 'colline', span: 2, h: 200, title: 'New MRR and CAC payback', subtitle: '{drill} · monthly',
            bind: { measure: 'newMrr', line: 'payback' }
          }
        ]
      }]
    }
  }
};

module.exports = { spec, build, SEED };
