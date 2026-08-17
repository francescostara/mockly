/* Step 1 smoke test — the runtime loads and works in isolation (no DOM, no spec). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const MK = require('../engine/runtime.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('runtime smoke');

ok('mulberry32 is seeded and deterministic', () => {
  const a = MK.mulberry32(90417), b = MK.mulberry32(90417);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepStrictEqual(sa, sb);
  sa.forEach(v => assert.ok(v >= 0 && v < 1));
  assert.notDeepStrictEqual(sa, [MK.mulberry32(1)(), 0, 0]);
});

ok('formatters match the canonical output (it-IT)', () => {
  const f = MK.fmt({ locale: 'it-IT', currency: '€' });
  assert.strictEqual(f.eur(1_250_000), '€1,3M');
  assert.strictEqual(f.eur(41000), '€41K');
  assert.strictEqual(f.eur(-820), '−€820');
  // it-IT groups from 5 digits up (CLDR minimumGroupingDigits=2) — same as the canonical in a browser
  assert.strictEqual(f.eurF(1234.6), '€1235');
  assert.strictEqual(f.eurF(41235), '€41.235');
  assert.strictEqual(f.pc(0.4213), '42,1%');
  assert.strictEqual(f.sgp(-0.086), '−8,6%');
  assert.strictEqual(f.pp(0.012), '+1,2 pp');
  assert.strictEqual(f.bps(0.0034), '+34bps');
  assert.strictEqual(f.bps(0.00001), 'flat');
  assert.strictEqual(f.N(12345), '12.345');
});

ok('formatters localise for en-US', () => {
  const f = MK.fmt({ locale: 'en-US', currency: '$' });
  assert.strictEqual(f.eur(1_250_000), '$1.3M');
  assert.strictEqual(f.N(12345), '12,345');
  assert.strictEqual(f.pc(0.4213), '42.1%');
});

ok('no NaN/Infinity leaks out of the formatters', () => {
  const f = MK.fmt({});
  [NaN, Infinity, -Infinity, undefined].forEach(bad => {
    ['eur', 'eurF', 'pc', 'pp', 'sgp', 'bps', 'N'].forEach(k => {
      const s = f[k](bad);
      assert.ok(!/NaN|Infinity|undefined/.test(s), `${k}(${bad}) = ${s}`);
    });
  });
});

ok('shared grid: 5 columns on a 1044 content width, spans absorb gutters', () => {
  const g = MK.grid(1044, 12, 5);
  assert.strictEqual(g.colW, 199.2);
  assert.strictEqual(Math.round(g.span(3) + g.span(2) + 12), 1044);
  assert.strictEqual(Math.round(g.span(1) * 5 + 12 * 4), 1044);
});

ok('axis ticks are round and cover the max', () => {
  const t = MK.ticks(41234);
  assert.ok(t[t.length - 1] >= 41234);
  assert.deepStrictEqual(t, [0, 20000, 40000, 60000]);
  [0.42, 3, 900, 41234, 12_500_000].forEach(max => {
    const ts = MK.ticks(max);
    assert.strictEqual(ts[0], 0);
    assert.ok(ts[ts.length - 1] >= max, `${max} not covered by ${ts}`);
    assert.ok(ts.length >= 3 && ts.length <= 6, `${max} produced ${ts.length} ticks`);
  });
});

ok('every chart region registered a visual builder', () => {
  ['trend', 'donut', 'hbar', 'matrix', 'colline', 'stack100', 'ribbon', 'funnel', 'waterfall', 'scatter', 'sparkline', 'narrative']
    .forEach(t => assert.strictEqual(typeof MK.V[t], 'function', 'missing visual: ' + t));
});

ok('region markers are balanced and each chart type has one', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'engine', 'runtime.js'), 'utf8');
  const open = src.match(/\/\*#region [a-z:0-9]+\*\//g) || [];
  const close = src.match(/\/\*#endregion\*\//g) || [];
  assert.strictEqual(open.length, close.length, 'unbalanced region markers');
  Object.keys(MK.V).forEach(t => assert.ok(src.includes('/*#region chart:' + t + '*/'), 'no region for ' + t));
});

ok('materialize maps dimension indices back to member ids', () => {
  const dims = { cat: [{ id: 'per', n: 'Persiani', c: '#111' }, { id: 'mod', n: 'Moderni', c: '#222' }] };
  const rows = MK.materialize({ cols: ['y', 'm', 'cat', 'rev'], rows: [[2025, 0, 1, 500]] }, dims);
  assert.deepStrictEqual(rows[0], { y: 2025, m: 0, cat: 'mod', rev: 500 });
});

console.log(`\n${n} checks passed`);
