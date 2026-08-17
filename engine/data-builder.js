/* data-builder.js — run a declarative `dataParams` (see data-params.md) into a reconciled
 * dataset for render(spec, data).
 *
 * This is the bridge between the judgement layer (an LLM declares segment character and how
 * each measure derives) and data-model.js (seeded generation, rescale, IPF). It adds no new
 * statistics — it only sequences the primitives that already exist.
 */
'use strict';
const MK = require('./runtime.js');
const DM = require('./data-model.js');

const RAMP = ['#12304F', '#1F4E79', '#4A7FA8', '#7FA8C6', '#8FB3CC', '#C6D7E4', '#A8926E', '#D8C7A6'];
const DEFAULT_SEAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function fail(msg) { const e = new Error(msg); e.dataParams = true; throw e; }

function members(dp, dimId, what) {
  const d = (dp.dims || {})[dimId];
  if (!d || !Array.isArray(d.members) || !d.members.length) fail(`dataParams.dims["${dimId}"] ${what} has no members`);
  return d.members;
}

/* one field's value for one row */
function evalField(f, row, own, split, ctx) {
  const j = ctx.j, yi = ctx.yi;
  const attrsOf = f.attrFrom === 'split' ? (split && split.attrs) || {} : own.attrs || {};
  switch (f.kind) {
    case 'seasonal': {
      const jit = f.jitter || [.93, 1.07];
      return own.base * Math.pow(1 + (own.growth || 0), yi) * ctx.seas[row.m] * j(jit[0], jit[1]);
    }
    case 'share': {
      const base = row[f.of];
      if (base === undefined) fail(`field "${f.id}" reads "${f.of}" before it is declared`);
      let rate = attrsOf[f.attr];
      if (rate === undefined) fail(`field "${f.id}" needs attrs.${f.attr} on the members of ${f.attrFrom === 'split' ? 'the split dim' : ctx.dim}`);
      if (f.growthFactor && yi === ctx.years.length - 1) rate *= f.growthFactor;
      const jit = f.jitter || [.9, 1.1];
      rate *= j(jit[0], jit[1]);
      if (f.cap !== undefined) rate = Math.min(f.cap, rate);
      return base * (f.complement ? 1 - rate : rate);
    }
    case 'divide': {
      const base = row[f.of];
      if (base === undefined) fail(`field "${f.id}" reads "${f.of}" before it is declared`);
      const den = attrsOf[f.attr];
      if (!den) fail(`field "${f.id}" needs a non-zero attrs.${f.attr}`);
      const jit = f.jitter || [.85, 1.15];
      return Math.max(f.min === undefined ? 1 : f.min, Math.round(base / (den * j(jit[0], jit[1]))));
    }
    case 'combine': {
      const plus = (f.plus || []).reduce((a, k) => a + (row[k] || 0), 0);
      const minus = (f.minus || []).reduce((a, k) => a + (row[k] || 0), 0);
      return plus - minus;
    }
    default:
      fail(`field "${f.id}": unknown kind "${f.kind}" (seasonal | share | divide | combine)`);
  }
}

function build(dp) {
  if (!dp || typeof dp !== 'object') fail('dataParams is missing');
  const years = dp.years || [2024, 2025];
  if (years.length !== 2) fail('dataParams.years must hold exactly two years (prior, current)');
  const seas = (dp.seasonality && dp.seasonality.length === 12) ? dp.seasonality : DEFAULT_SEAS;
  const facts = dp.facts || fail('dataParams.facts is missing');
  const fields = facts.fields || [];
  if (!fields.length || fields[0].kind !== 'seasonal') fail('facts.fields[0] must be the primary measure with kind:"seasonal"');

  const { j } = DM.rng(dp.seed || 20260101);
  const dimId = facts.dim || fail('facts.dim is missing');
  const own = members(dp, dimId, '(facts.dim)');
  own.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });

  const splitCfg = facts.split || null;
  let splitMembers = null;
  if (splitCfg) {
    splitMembers = members(dp, splitCfg.dim, '(facts.split.dim)');
    splitMembers.forEach((m, i) => { if (!m.c) m.c = RAMP[i % RAMP.length]; });
    if (own.length * splitMembers.length > 60) fail('the joint grain is too large: keep members(dim) x members(split) under 60');
  }

  /* ---- 1. the primary measure at the facts.dim grain ---- */
  const prim = fields[0];
  const rows = [];
  years.forEach((y, yi) => own.forEach(mb => {
    for (let m = 0; m < 12; m++) {
      const ctx = { j, yi, seas, years, dim: dimId };
      const r = { y, m, [dimId]: mb.id, __own: mb };
      r[prim.id] = Math.round(evalField(prim, r, mb, null, ctx));
      rows.push(r);
    }
  }));

  /* ---- 2. optional second dimension: one joint grain fitted with IPF ---- */
  let grain = rows;
  if (splitCfg) {
    const ownTot = own.map(mb => ({ id: mb.id, v: DM.sum(rows.filter(r => r[dimId] === mb.id), prim.id) }));
    const grand = ownTot.reduce((a, o) => a + o.v, 0);
    const shares = splitCfg.shares && splitCfg.shares.length === splitMembers.length
      ? splitCfg.shares
      : splitMembers.map(() => 1 / splitMembers.length);
    const splitTot = splitMembers.map((mb, i) => ({ id: mb.id, v: grand * shares[i] }));
    const joint = DM.jointRows(dimId, splitCfg.dim, ownTot, splitTot, prim.id, () => 1 + j(0, 1.2));
    const mix = {};
    own.forEach(mb => {
      const mine = joint.filter(r => r[dimId] === mb.id), s = DM.sum(mine, prim.id) || 1;
      mix[mb.id] = splitMembers.map(sm => (mine.filter(r => r[splitCfg.dim] === sm.id)[0] || {})[prim.id] / s || 0);
    });
    grain = [];
    rows.forEach(r => {
      const parts = splitMembers.map((sm, k) => ({ sm: sm, [prim.id]: r[prim.id] * mix[r[dimId]][k] }));
      DM.rescaleInt(parts, prim.id, r[prim.id], { min: 0 });   /* the split ties to its parent month */
      parts.forEach(p => {
        const o = { y: r.y, m: r.m, [dimId]: r[dimId], [splitCfg.dim]: p.sm.id, __own: r.__own, __split: p.sm };
        o[prim.id] = p[prim.id];
        grain.push(o);
      });
    });
  }

  /* ---- 3. the derived fields, in declared order ---- */
  years.forEach((y, yi) => {
    grain.filter(r => r.y === y).forEach(r => {
      const ctx = { j, yi, seas, years, dim: dimId };
      for (let i = 1; i < fields.length; i++) {
        const f = fields[i];
        r[f.id] = Math.round(evalField(f, r, r.__own, r.__split, ctx));
      }
    });
  });

  /* ---- 4. optional detail grain as a share model ---- */
  const dims = { [dimId]: own.map(m => ({ id: m.id, n: m.n, c: m.c })) };
  if (splitCfg) dims[splitCfg.dim] = splitMembers.map(m => ({ id: m.id, n: m.n, c: m.c }));

  let detailModel = null;
  if (dp.detail && dp.detail.dim) {
    const d = dp.detail;
    const parentDim = d.parentDim || dimId;
    const parents = dims[parentDim] || fail(`detail.parentDim "${parentDim}" is not a fact dimension`);
    const kids = [], groups = {};
    parents.forEach(p => {
      const names = (d.members || {})[p.id] || [];
      if (!names.length) fail(`detail.members is missing entries for "${p.id}"`);
      groups[p.id] = names.map(n => p.id + ':' + n);
      names.forEach(n => kids.push({ id: p.id + ':' + n, n: n, c: p.c, parent: p.id, parentDim: parentDim }));
    });
    dims[d.dim] = kids;
    const shares = DM.shareVector(groups, j);
    detailModel = {
      dim: d.dim, parentDim: parentDim,
      fields: (d.fields && d.fields.length) ? d.fields : [prim.id],
      shares: Object.keys(shares).reduce((o, k) => (o[k] = Math.round(shares[k] * 1e5) / 1e5, o), {})
    };
    if (d.counts && d.counts.field) detailModel.counts = { field: d.counts.field, from: d.counts.from || d.counts.field };
  }

  /* ---- 5. serialise ---- */
  const idx = {};
  Object.keys(dims).forEach(k => { idx[k] = {}; dims[k].forEach((m, i) => idx[k][m.id] = i); });
  const factDims = splitCfg ? [dimId, splitCfg.dim] : [dimId];
  const cols = ['y', 'm'].concat(factDims).concat(fields.map(f => f.id));
  const data = {
    dims: dims,
    years: years,
    facts: { cols: cols, rows: grain.map(r => cols.map(c => idx[c] ? idx[c][r[c]] : r[c])) },
    tieOut: {}
  };
  if (detailModel) data.detailModel = detailModel;

  /* the tie-out the harness checks: the detail grain reproduces its parent exactly */
  if (detailModel) {
    const F = MK.materialize(data.facts, dims);
    const kids = MK.expandDetail(F, dims, detailModel);
    detailModel.fields.forEach(f => {
      const a = Math.round(DM.sum(F, f)), b = Math.round(DM.sum(kids, f));
      data.tieOut[f + '_facts'] = a; data.tieOut[f + '_detail'] = b; data.tieOut[f + '_delta'] = a - b;
    });
  }
  data.tieOut[prim.id + '_total'] = Math.round(DM.sum(grain, prim.id));
  return data;
}

module.exports = { build };
