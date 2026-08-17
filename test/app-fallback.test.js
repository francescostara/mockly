/* The app's safety net, under test.
 *
 * lib/fallback.ts is what the user gets when the model fails twice, and lib/stub.ts is what
 * every local UI session renders. Both are hand-written specs: if an edit breaks one, nothing
 * else in the suite notices — the app just starts failing at the worst moment (a real
 * generation that went wrong, or a dev with no API key).
 *
 * Both files are TypeScript, so the check reads their spec objects out of the source rather
 * than importing them: the point is to catch a broken spec, not to test the compiler.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render, validate, lint } = require('../engine/render.js');
const builder = require('../engine/data-builder.js');

const ROOT = path.join(__dirname, '..');
let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('app safety net');

/* ---- pull the two payloads out of the TS sources ---- */

/** lib/stub.ts holds one JSON.stringify({...}) call: eval that object literal. */
function stubPayload() {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'stub.ts'), 'utf8');
  const start = src.indexOf('export const STUB_RESPONSE = JSON.stringify(');
  assert.ok(start >= 0, 'STUB_RESPONSE non trovato in lib/stub.ts');
  const open = src.indexOf('({', start) + 1;
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return eval('(' + src.slice(open, end) + ')');
}

/** lib/fallback.ts builds its spec inside buildFallback(intake): run the file as JS after
 *  stripping the TypeScript-only bits (the type import and the annotation). */
function fallbackPayload(intake) {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'fallback.ts'), 'utf8')
    .replace(/^import type .*$/m, '')
    .replace(/: IntakeAnswers/g, '')
    .replace(/export function/, 'function')
    .replace(/const PALETTES: Record<string, string\[\]>/, 'const PALETTES')
    .replace(/const DETAIL: Record<string, string\[\]>/, 'const DETAIL');
  const mod = { exports: {} };
  new Function('module', 'exports', src + '\nmodule.exports = { buildFallback };')(mod, mod.exports);
  return mod.exports.buildFallback(intake);
}

/** Render a payload and drive it, the way the harness drives the eval fixtures. */
function exercise(spec, dataParams, label) {
  const data = builder.build(dataParams);
  validate(spec, data);                       /* throws on any engine gate */
  const html = render(spec, data);
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const d = dom.window.document;
  const q = s => d.querySelector(s);
  const clk = s => { const e = q(s); if (e) e.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); return !!e; };
  const kpi = () => [...d.querySelectorAll('#page .kpi .v')].map(e => e.textContent).join('|');

  assert.ok(q('#page').innerHTML.length > 500, `${label}: pagina vuota`);
  assert.ok(!/NaN|undefined|Infinity/.test(q('#page').innerHTML), `${label}: valori rotti allo stato iniziale`);

  /* a filter must be live, exactly as Gate 5 requires */
  const before = kpi();
  clk('#page tr.r');
  assert.notStrictEqual(kpi(), before, `${label}: il filtro sulla matrice è inerte`);
  clk('#btnReset');

  /* the month grain must flip the basis and leave the trend alone */
  clk('[data-m="9"]');
  assert.match(q('#page .kpi .d').textContent, /MoM/, `${label}: la base non passa a MoM`);
  assert.strictEqual(d.querySelectorAll('#page svg circle.hit').length, 12, `${label}: il trend non è esente dal filtro mese`);
  assert.ok(!/NaN|undefined|Infinity/.test(q('#page').innerHTML), `${label}: valori rotti sotto filtro mese`);
  clk('#btnReset');

  /* drill-through and back */
  const target = q('#page [data-drill]');
  assert.ok(target, `${label}: nessuna riga con drill-through`);
  target.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.ok(q('#btnBack'), `${label}: la pagina di dettaglio non ha il back`);
  assert.ok(!/NaN|undefined|Infinity/.test(q('#page').innerHTML), `${label}: valori rotti nel drill`);
  clk('#btnBack');

  /* the closing matrix and the watermark are non-negotiable */
  assert.ok(q('#page tr.tot'), `${label}: manca la riga dei totali`);
  assert.ok(q('.wm') && q('.wm').textContent.length > 10, `${label}: manca il watermark`);

  const bytes = Buffer.byteLength(html);
  assert.ok(bytes < 60 * 1024, `${label}: ${(bytes / 1024).toFixed(1)}KB, oltre il budget`);
  dom.window.close();
  return { bytes, advisories: lint(spec, data), tieOut: data.tieOut };
}

ok('la spec di fallback è valida e interattiva per ogni risposta di branding', () => {
  ['none', 'navy', 'teal', 'bronze', 'custom'].forEach(branding => {
    const { spec, dataParams } = fallbackPayload({ audience: 'owner', branding });
    const r = exercise(spec, dataParams, `fallback/${branding}`);
    assert.strictEqual(r.tieOut.rev_delta, 0, `fallback/${branding}: il dettaglio non quadra col padre`);
  });
});

ok('la spec di fallback regge anche un intake completamente vuoto', () => {
  const { spec, dataParams } = fallbackPayload({});
  exercise(spec, dataParams, 'fallback/vuoto');
});

ok('lo stub di sviluppo è valido e interattivo', () => {
  const { spec, dataParams } = stubPayload();
  const r = exercise(spec, dataParams, 'stub');
  assert.strictEqual(r.tieOut.rev_delta, 0, 'stub: il dettaglio non quadra col padre');
});

ok('il generatore dichiarativo è deterministico', () => {
  const { dataParams } = fallbackPayload({ branding: 'teal' });
  assert.deepStrictEqual(builder.build(dataParams), builder.build(dataParams));
});

ok('il generatore rifiuta dataParams incoerenti con un messaggio azionabile', () => {
  /* i messaggi del motore sono in inglese: l'italiano vive solo nello strato app */
  const cases = [
    [{ years: [2025] }, /exactly two years/i],
    [{ years: [2024, 2025], facts: { dim: 'x', fields: [{ id: 'rev', kind: 'share', of: 'rev' }] } }, /seasonal/i],
    [{
      years: [2024, 2025], dims: { s: { members: [{ id: 'a', n: 'A', base: 10, growth: 0 }] } },
      facts: { dim: 's', fields: [{ id: 'rev', kind: 'seasonal' }, { id: 'c', kind: 'share', of: 'rev', attr: 'manca' }] }
    }, /attrs\.manca/]
  ];
  cases.forEach(([dp, re]) => {
    assert.throws(() => builder.build(dp), re, `atteso un errore che combaci con ${re}`);
  });
});

console.log(`\n${n} controlli passati`);
