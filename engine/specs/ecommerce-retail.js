/* Eval case "ecommerce-retail" — monthly e-commerce report for a fashion online store.
 * Corporate-sober, English, founder audience.
 * Exercises: TWO filterable dimensions over one joint IPF grain (channel x category), so
 * slicing either one is real; colline, donut, scatter, heat matrix.
 */
'use strict';
const DM = require('../data-model.js');

const SEED = 55219;
const CHANS = [
  { id: 'seo', n: 'Organic search', c: '#12304F', base: 210000, growth: .09, repeat: .41, cpa: 11 },
  { id: 'psoc', n: 'Paid social', c: '#1F4E79', base: 178000, growth: .04, repeat: .22, cpa: 34, cpaDrift: .38 }, /* CAC rising — the negative storyline */
  { id: 'email', n: 'Email & CRM', c: '#4A7FA8', base: 96000, growth: .16, repeat: .63, cpa: 4 },
  { id: 'dir', n: 'Direct', c: '#7FA8C6', base: 96000, growth: -.06, repeat: .55, cpa: 2 }
];
/* fashion return rates are high and category-specific: dresses worst, accessories lowest */
const CATS = [
  { id: 'dress', n: 'Dresses', c: '#12304F', share: .34, ret: .38, aov: 128 },
  { id: 'outer', n: 'Outerwear', c: '#1F4E79', share: .27, ret: .26, aov: 214 },
  { id: 'shoes', n: 'Shoes', c: '#4A7FA8', share: .23, ret: .31, aov: 156 },
  { id: 'acc', n: 'Accessories', c: '#7FA8C6', share: .16, ret: .12, aov: 62 }
];
const SEAS = [.88, .82, 1.02, 1.06, 1.04, .96, .78, .72, 1.08, 1.14, 1.42, 1.26];
const YRS = [2024, 2025];

function build() {
  const { j } = DM.rng(SEED);

  /* 1. channel x month */
  const chanRows = DM.genMonthly({
    j, years: YRS, seas: SEAS, dim: 'chan', members: CHANS,
    row: (gross, ch, yi) => ({
      gross: Math.round(gross),
      spend: Math.round(gross / (ch.cpa > 20 ? 4.2 : 9.5) * (1 + (ch.cpaDrift || 0) * yi) * j(.94, 1.06))
    })
  });

  /* 2. one joint grain for the two dimensions that both roll up to gross sales — the IPF fit
        (data-realism.md): two independent tables would leave one filter silently inert */
  const chanTot = CHANS.map(c => ({ id: c.id, v: DM.sum(chanRows.filter(r => r.chan === c.id), 'gross') }));
  const grand = chanTot.reduce((a, c) => a + c.v, 0);
  const catTot = CATS.map(c => ({ id: c.id, v: grand * c.share }));
  const joint = DM.jointRows('chan', 'cat', chanTot, catTot, 'gross',
    (i, k) => 1 + j(0, 1.2) + (i === 1 && k === 0 ? 1.4 : 0));      /* paid social skews to dresses */
  const mix = {};
  CHANS.forEach(ch => {
    const mine = joint.filter(r => r.chan === ch.id), s = DM.sum(mine, 'gross') || 1;
    mix[ch.id] = CATS.map(c => (mine.filter(r => r.cat === c.id)[0] || { gross: 0 }).gross / s);
  });

  /* 3. explode each channel-month onto the joint grain, deriving the category-driven measures */
  const facts = [];
  chanRows.forEach(r => {
    const ch = CHANS.filter(c => c.id === r.chan)[0];
    const parts = CATS.map((c, k) => ({ cat: c.id, gross: r.gross * mix[r.chan][k] }));
    /* integers that still sum to the channel month exactly — no drift in the tie-out */
    DM.rescaleInt(parts, 'gross', r.gross, { min: 0 });
    const spendParts = parts.map(p => ({ v: p.gross }));
    DM.rescaleInt(spendParts, 'v', r.spend, { min: 0 });
    parts.forEach((p, k) => {
      const cat = CATS[k];
      const gross = p.gross;
      const orders = Math.max(1, Math.round(gross / (cat.aov * j(.9, 1.12))));
      facts.push({
        y: r.y, m: r.m, chan: r.chan, cat: cat.id,
        gross,
        ret: Math.round(gross * cat.ret * j(.9, 1.1)),
        orders,
        repOrders: Math.round(orders * ch.repeat * j(.9, 1.1)),
        spend: spendParts[k].v,
        newCust: Math.max(1, Math.round(orders * (1 - ch.repeat) * j(.85, 1.15)))
      });
    });
  });

  const cols = ['y', 'm', 'chan', 'cat', 'gross', 'ret', 'orders', 'repOrders', 'spend', 'newCust'];
  const cIdx = {}; CHANS.forEach((c, i) => cIdx[c.id] = i);
  const kIdx = {}; CATS.forEach((c, i) => kIdx[c.id] = i);
  return {
    dims: {
      chan: CHANS.map(c => ({ id: c.id, n: c.n, c: c.c })),
      cat: CATS.map(c => ({ id: c.id, n: c.n, c: c.c }))
    },
    years: YRS,
    facts: { cols, rows: facts.map(f => [f.y, f.m, cIdx[f.chan], kIdx[f.cat], f.gross, f.ret, f.orders, f.repOrders, f.spend, f.newCust]) },
    tieOut: {
      gross_channels: Math.round(DM.sum(chanRows, 'gross')),
      gross_joint: Math.round(DM.sum(facts, 'gross')),
      gross_delta: Math.round(DM.sum(chanRows, 'gross')) - Math.round(DM.sum(facts, 'gross'))
    }
  };
}

const spec = {
  meta: {
    title: 'E-commerce performance', subtitle: 'Sales, returns, acquisition and repeat purchase',
    brand: { name: 'Marlowe & Fen', tagline: 'Online store · monthly report' },
    locale: 'en-US', currency: '$',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    strings: {
      fullYear: 'Full year', all: 'All', allM: 'All', compare: 'Comparison', qtr: 'Qtr', month: 'Month',
      varShort: 'Var', pyShort: 'PY', cyShort: 'CY', prevShort: 'PM', curShort: 'CM',
      reset: 'Clear filters', period: 'Period', year: 'Year', qtrLong: 'Quarter', monthLong: 'Month',
      updatedLabel: 'Last refreshed'
    },
    updated: '2 Sep 2026, 06:00',
    source: 'Source: store back office<br>Daily export 06:00',
    watermark: 'Demonstration mockup · synthetic data · not real trading figures'
  },
  aesthetic: 'corporate-sober',
  palette: { series: ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4'] },
  grid: { contentWidth: 1044, gutter: 12, columns: 5 },
  model: {
    sums: ['gross', 'ret', 'orders', 'repOrders', 'spend', 'newCust'],
    measures: [
      { id: 'gross', label: 'Gross sales', agg: 'sum', field: 'gross', format: 'eur' },
      { id: 'ret', label: 'Returns', agg: 'sum', field: 'ret', format: 'eur' },
      { id: 'orders', label: 'Orders', agg: 'sum', field: 'orders', format: 'N' },
      { id: 'spend', label: 'Acquisition spend', agg: 'sum', field: 'spend', format: 'eur' },
      { id: 'newCust', label: 'New customers', agg: 'sum', field: 'newCust', format: 'N' },
      { id: 'repOrders', label: 'Repeat orders', agg: 'sum', field: 'repOrders', format: 'N' },
      { id: 'net', label: 'Net sales', agg: 'diff', a: 'gross', b: 'ret', format: 'eur' },
      { id: 'retRate', label: 'Return rate', agg: 'ratio', num: 'ret', den: 'gross', format: 'pc', inv: true },
      { id: 'aov', label: 'AOV', agg: 'ratio', num: 'net', den: 'orders', format: 'eurF' },
      { id: 'repRate', label: 'Repeat rate', agg: 'ratio', num: 'repOrders', den: 'orders', format: 'pc' },
      { id: 'cac', label: 'CAC', agg: 'ratio', num: 'spend', den: 'newCust', format: 'eurF', inv: true }
    ]
  },
  filters: {
    date: { levels: ['year', 'quarter', 'month'], default: { y: 2025, q: null, m: null } },
    dims: [
      { id: 'chan', label: 'Channel', control: 'list', allLabel: 'All channels', pill: 'Ch.' },
      { id: 'cat', label: 'Category', control: 'list', allLabel: 'All categories', pill: 'Cat.' }
    ]
  },
  kpiBand: [
    { id: 'net', label: 'Net sales', measure: 'net', span: 1 },
    { id: 'orders', label: 'Orders', measure: 'orders', span: 1 },
    { id: 'aov', label: 'AOV', measure: 'aov', span: 1 },
    { id: 'retRate', label: 'Return rate', measure: 'retRate', span: 1, inv: true },
    { id: 'repRate', label: 'Repeat rate', measure: 'repRate', span: 1 }
  ],
  pages: [{
    id: 'main', title: 'E-commerce performance', subtitle: 'Sales, returns, acquisition and repeat purchase',
    nav: 'Performance',
    rows: [
      {
        visuals: [
          {
            type: 'colline', span: 3, h: 206, title: 'Net sales by month', subtitle: '{y} vs {py} · return rate on the right axis',
            note: 'quarter/month filters do not touch the timeline',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', c: 'var(--c5)' }],
            bind: { measure: 'gross', line: 'retRate' }
          },
          {
            type: 'donut', span: 2, h: 238, title: 'Channel mix', subtitle: 'share of net sales · click to filter',
            centreLabel: 'Net sales', bind: { dim: 'chan', measure: 'net' }
          }
        ]
      },
      {
        visuals: [
          {
            type: 'scatter', span: 3, h: 138, title: 'Repeat rate vs net sales', subtitle: 'by channel · bubble = orders',
            bind: { dim: 'chan', x: 'net', y: 'repRate', size: 'orders' }
          },
          {
            type: 'hbar', span: 2, h: 138, title: 'Acquisition spend by channel', subtitle: 'CAC in the tooltip',
            bind: { dim: 'chan', measure: 'spend', top: 5, subMeasure: 'newCust', subUnit: ' new customers' }
          }
        ]
      },
      {
        flex: true,
        visuals: [{
          type: 'matrix', span: 5, title: 'Performance by category', subtitle: 'sorted by net sales',
          note: 'right-click a row for the channel detail',
          bind: {
            dim: 'cat', label: 'Category', sort: 'net', totalsLabel: 'Store total',
            columns: [
              { measure: 'net', label: 'Net sales' },
              { measure: 'net', label: '{basis}', kind: 'var' },
              { measure: 'orders', label: 'Orders' },
              { measure: 'retRate', label: 'Return rate', kind: 'heat', scale: [.4, .1] },
              { measure: 'aov', label: 'AOV' },
              { measure: 'repRate', label: 'Repeat' },
              { measure: 'net', label: 'Share', kind: 'share' }
            ]
          }
        }]
      }
    ]
  }],
  drill: {
    dim: 'cat',
    page: {
      id: '__drill__', title: '{drill}', subtitle: 'Category detail by channel',
      drillHeader: 'Category detail · {period} · {basis} comparison',
      backLabel: 'Back to all categories',
      rows: [{
        visuals: [
          {
            type: 'trend', span: 3, h: 210, title: 'Net sales by month', subtitle: '{drill} · {y} vs {py}',
            legend: [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }],
            bind: { measure: 'gross' }
          },
          {
            type: 'hbar', span: 2, title: 'Channels for this category', subtitle: 'by net sales',
            bind: { dim: 'chan', measure: 'net', top: 5, subMeasure: 'orders', subUnit: ' orders' }
          }
        ]
      }]
    }
  }
};

module.exports = { spec, build, SEED };
