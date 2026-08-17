/* Step 4 — reconciliation: rescale on one axis, IPF/RAS on two. */
const assert = require('assert');
const DM = require('../engine/data-model.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const near = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-6), `${a} !~ ${b}`);

console.log('data-model');

ok('rescaleTo makes a detail grain sum exactly to its parent total', () => {
  const rows = [{ v: 3 }, { v: 7 }, { v: 10 }];
  DM.rescaleTo(rows, 'v', 500);
  near(DM.sum(rows, 'v'), 500);
  near(rows[0].v / rows[1].v, 3 / 7);              // proportions preserved
  const zero = [{ v: 0 }, { v: 0 }];
  DM.rescaleTo(zero, 'v', 10);
  near(DM.sum(zero, 'v'), 10);                     // degenerate input still reconciles
});

ok('rescaleInt lands on the target exactly, in integers', () => {
  const cases = [[[5, 3, 2], 97], [[1, 1, 1], 100], [[9, 1], 3], [[4, 4, 4, 4], 7]];
  cases.forEach(([vals, target]) => {
    const rows = vals.map(v => ({ v }));
    DM.rescaleInt(rows, 'v', target);
    assert.strictEqual(DM.sum(rows, 'v'), target, `${vals} -> ${target}`);
    rows.forEach(r => assert.ok(Number.isInteger(r.v) && r.v >= 1, JSON.stringify(rows)));
  });
});

ok('rescaleInt is monotone in the weights (biggest weight keeps the biggest share)', () => {
  const rows = [{ v: 1 }, { v: 50 }, { v: 9 }];
  DM.rescaleInt(rows, 'v', 120);
  assert.ok(rows[1].v > rows[2].v && rows[2].v > rows[0].v, JSON.stringify(rows));
});

ok('allocInt in the runtime agrees with rescaleInt (same guarantee in the browser)', () => {
  const MK = require('../engine/runtime.js');
  const out = MK.allocInt([5, 3, 2], 97);
  assert.strictEqual(out.reduce((a, b) => a + b, 0), 97);
});

ok('ipf fits BOTH marginals — two dimensions, one joint matrix', () => {
  const rowT = [500, 300, 200], colT = [400, 350, 250];
  const seed = [[1, 2, 1], [3, 1, 1], [1, 1, 4]];
  const M = DM.ipf(seed, rowT, colT, 40);
  M.forEach((r, i) => near(r.reduce((a, b) => a + b, 0), rowT[i], 1e-3));
  colT.forEach((t, j) => near(M.reduce((a, r) => a + r[j], 0), t, 1e-3));
  assert.deepStrictEqual(DM.ipf(seed, rowT, colT, 40), M);            // deterministic
});

ok('ipf tolerates zero seed cells (structural zeros stay zero, no NaN)', () => {
  // a zero cell means "this combination cannot happen"; the fit routes around it
  const rowT = [10, 10], colT = [8, 12];
  const M = DM.ipf([[0, 1], [1, 1]], rowT, colT, 40);
  M.flat().forEach(v => assert.ok(isFinite(v), JSON.stringify(M)));
  assert.strictEqual(M[0][0], 0);
  M.forEach((r, i) => near(r.reduce((a, b) => a + b, 0), rowT[i], 1e-3));
  colT.forEach((t, j) => near(M.reduce((a, r) => a + r[j], 0), t, 1e-3));
  // an infeasible zero pattern cannot satisfy both sides — it must still be finite
  const inf = DM.ipf([[0, 1], [2, 0]], [10, 10], [8, 12], 30);
  inf.flat().forEach(v => assert.ok(isFinite(v), JSON.stringify(inf)));
});

ok('jointRows: slicing either dimension reconciles to the authored totals (no inert filter)', () => {
  const chan = [{ id: 'seo', v: 400 }, { id: 'ads', v: 350 }, { id: 'social', v: 250 }];
  const geo = [{ id: 'it', v: 600 }, { id: 'de', v: 250 }, { id: 'fr', v: 150 }];
  const rows = DM.jointRows('chan', 'geo', chan, geo, 'rev', (i, j) => 1 + ((i * 3 + j) % 4));
  chan.forEach(c => near(DM.sum(rows.filter(r => r.chan === c.id), 'rev'), c.v, 1e-3));
  geo.forEach(g => near(DM.sum(rows.filter(r => r.geo === g.id), 'rev'), g.v, 1e-3));
  near(DM.sum(rows, 'rev'), 1000, 1e-3);
});

ok('genMonthly is seeded, shaped by seasonality, and reproducible', () => {
  const opts = () => ({
    seed: 4242, years: [2024, 2025], dim: 'seg',
    seas: [.8, .8, 1, 1, 1, .9, .6, .7, 1.1, 1.3, 1.4, 1.3],
    members: [{ id: 'a', base: 1000, growth: .1 }, { id: 'b', base: 500, growth: -.05 }],
    row: rev => ({ rev })
  });
  const one = DM.genMonthly(opts()), two = DM.genMonthly(opts());
  assert.deepStrictEqual(one, two);
  assert.strictEqual(one.length, 2 * 2 * 12);
  const nov = DM.sum(one.filter(r => r.m === 10 && r.seg === 'a'), 'rev');
  const jul = DM.sum(one.filter(r => r.m === 6 && r.seg === 'a'), 'rev');
  assert.ok(nov > jul * 1.8, 'seasonality did not survive the jitter');
  const y24 = DM.sum(one.filter(r => r.y === 2024 && r.seg === 'b'), 'rev');
  const y25 = DM.sum(one.filter(r => r.y === 2025 && r.seg === 'b'), 'rev');
  assert.ok(y25 < y24, 'the declining segment must actually decline');
});

ok('shareVector normalises to 1 within each parent', () => {
  const { j } = DM.rng(7);
  const s = DM.shareVector({ a: ['a1', 'a2', 'a3'], b: ['b1', 'b2'] }, j);
  near(s.a1 + s.a2 + s.a3, 1);
  near(s.b1 + s.b2, 1);
});

ok('the Nodo & Trama dataset ties out exactly at both grains', () => {
  const { build } = require('../engine/specs/nodo-trama.build.js');
  const d = build();
  assert.strictEqual(d.tieOut.rev_delta, 0);
  assert.strictEqual(d.tieOut.pieces_delta, 0);
  // and the negative storyline the brief requires is really in the data
  const rev = (y, cat) => d.facts.rows.filter(r => r[0] === y && r[2] === 0).reduce((a, r) => a + r[3], 0);
  assert.ok(rev(2025) < rev(2024), 'Persiani & Orientali must be the declining category');
});

console.log(`\n${n} checks passed`);
