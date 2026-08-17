/* data-model.js — deterministic synthetic data that RECONCILES.
 *
 * The two reconciliation tools from references/data-realism.md:
 *   rescaleTo / rescaleInt  — one axis: make a detail grain sum exactly to its parent total
 *   ipf                     — two axes: fit a joint matrix to both sets of marginals (IPF/RAS)
 * Everything here is pure and seed-driven; no clock, no Math.random.
 */
'use strict';
const MK = require('./runtime.js');

const sum = (rows, f) => rows.reduce((a, r) => a + (r[f] || 0), 0);

/* ---------- one axis: rescale a detail grain to a target total (floats) ---------- */
function rescaleTo(rows, field, target) {
  if (!rows.length) return rows;
  const s = sum(rows, field);
  if (!s) { const each = target / rows.length; rows.forEach(r => r[field] = each); return rows; }
  const k = target / s;
  rows.forEach(r => r[field] *= k);
  return rows;
}

/* ---------- one axis, integers: largest-remainder so the parts sum EXACTLY to the total ---------- */
function rescaleInt(rows, field, target, opt) {
  if (!rows.length) return rows;
  const min = (opt && opt.min !== undefined) ? opt.min : 1;
  target = Math.round(target);
  const s = sum(rows, field);
  const ideal = rows.map(r => (s ? (r[field] || 0) * target / s : target / rows.length));
  let out = ideal.map(v => Math.max(min, Math.floor(v)));
  let diff = target - out.reduce((a, b) => a + b, 0);
  /* hand out (or claw back) the remainder, largest fractional part first */
  const order = ideal.map((v, i) => ({ i, frac: v - Math.floor(v), v }))
    .sort((a, b) => (b.frac - a.frac) || (b.v - a.v) || (a.i - b.i));
  let guard = 0;
  while (diff !== 0 && guard++ < rows.length * 40) {
    for (let k = 0; k < order.length && diff !== 0; k++) {
      const i = order[diff > 0 ? k : order.length - 1 - k].i;
      if (diff > 0) { out[i] += 1; diff -= 1; }
      else if (out[i] > min) { out[i] -= 1; diff += 1; }
    }
    if (diff < 0 && out.every(v => v <= min)) break;      /* target below the floor — cannot go lower */
  }
  rows.forEach((r, i) => r[field] = out[i]);
  return rows;
}

/* ---------- two axes: iterative proportional fitting (IPF / RAS) ----------
   Fit `seed` so its row sums == rowT and its column sums == colT. Use whenever two dimensions
   roll up to the same grand total and either is sliceable — the alternative (two independent
   1-D tables) makes one of the two filters silently inert. */
function ipf(seed, rowT, colT, iters) {
  iters = iters || 30;
  let M = seed.map(r => r.slice());
  for (let it = 0; it < iters; it++) {
    M.forEach((row, i) => { const s = row.reduce((a, b) => a + b, 0), f = s ? rowT[i] / s : 1; M[i] = row.map(v => v * f); });
    const colS = M[0].map((_, j) => M.reduce((a, row) => a + row[j], 0));
    M = M.map(row => row.map((v, j) => colS[j] ? v * colT[j] / colS[j] : v));
  }
  return M;
}

/* Build a joint fact grain from two marginals. Returns rows [{[dimA],[dimB],[field]}] whose
   roll-ups reproduce both marginals, so slicing either dimension is real. */
function jointRows(dimA, dimB, marginalsA, marginalsB, field, seedFn) {
  const seed = marginalsA.map((_, i) => marginalsB.map((__, j) => (seedFn ? seedFn(i, j) : 1)));
  const M = ipf(seed, marginalsA.map(m => m.v), marginalsB.map(m => m.v));
  const out = [];
  marginalsA.forEach((a, i) => marginalsB.forEach((b, j) => {
    const row = {}; row[dimA] = a.id; row[dimB] = b.id; row[field] = M[i][j]; out.push(row);
  }));
  return out;
}

/* ---------- shared model primitives ---------- */
const rng = seed => {
  const R = MK.mulberry32(seed);
  return { R, j: (a, b) => a + R() * (b - a), pick: (arr, ws) => { let r = R() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; } };
};

/* trend x seasonality x modest jitter — never flat randomness (data-realism.md) */
function seasonalValue(base, growth, yearIndex, seas, month, j) {
  return base * Math.pow(1 + growth, yearIndex) * seas[month] * j(.93, 1.07);
}

/* ---------- tie-out report for the QA gate ---------- */
function tieOut(facts, detail, fields) {
  const o = {};
  fields.forEach(f => {
    const a = Math.round(sum(facts, f) * 100) / 100, b = Math.round(sum(detail, f) * 100) / 100;
    o[f + '_facts'] = a; o[f + '_detail'] = b; o[f + '_delta'] = Math.round((a - b) * 100) / 100;
  });
  return o;
}

module.exports = { rescaleTo, rescaleInt, ipf, jointRows, rng, seasonalValue, tieOut, sum };
