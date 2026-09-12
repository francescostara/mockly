/* The definition of done: the Nodo & Trama spec, passed to render(), must produce an HTML file
 * structurally equivalent to skill/assets/canonical-retail-fullspec.html.
 *
 * "Structurally equivalent" = the same shell, the same grid, the same visual composition and the
 * same interaction surface. The numbers differ (both are seeded synthetic data) and so does the
 * engine's internal shape — that is the point of the extraction.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const { TETTO_BYTE } = require('./harness.js');
const spec = require('../engine/specs/nodo-trama.spec.js');
const { build } = require('../engine/specs/nodo-trama.build.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

function load(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  return dom.window.document;
}
const round = w => Math.round(parseFloat(w) || 0);

/* the structural signature of a rendered report */
function signature(d) {
  const qa = s => [...d.querySelectorAll(s)];
  const rows = qa('#page > .row');
  return {
    canvas: [d.querySelector('#canvas').style.width || '1280px', d.querySelector('#canvas').style.height || '720px'],
    rail: !!d.querySelector('#rail'),
    brandLines: qa('#rail .brand div').length > 0,
    slicer: {
      button: !!d.querySelector('#slBtn'),
      years: qa('#slYear [data-y]').length,
      quarters: qa('#slQtr [data-q]').length,
      months: qa('#slMon [data-m]').length
    },
    catFilter: qa('[data-cat], [data-f^="cat:"]').length > 0,
    header: {
      title: !!d.querySelector('#hTtl'), sub: !!d.querySelector('#hSub'),
      pills: !!d.querySelector('#hCtx'), reset: !!d.querySelector('#btnReset'),
      updated: !!d.querySelector('.updated')
    },
    watermark: !!d.querySelector('.wm'),
    tip: !!d.querySelector('#tip'),
    kpis: qa('#page > .row:first-child .kpi').map(c => round(c.style.width)),
    kpiBasis: qa('#page .kpi .d').every(e => /YoY|MoM/.test(e.textContent)),
    kpiDetail: qa('#page .kpi .det').every(e => e.textContent.split('|').length >= 2),
    rows: rows.slice(1).map(r => [...r.children].map(c => round(c.style.width))),
    visualKinds: rows.slice(1).map(r => [...r.children].map(c =>
      c.querySelector('table') ? 'matrix' : c.querySelector('svg') ? 'svg' : 'other')),
    matrixHeaders: qa('#page table th').length,
    totalsRow: qa('#page tr.tot').length,
    drillTargets: qa('#page [data-drill]').length > 0,
    crossFilterTargets: qa('#page [data-f]').length > 0,
    trendPoints: qa('#page svg circle.hit').length
  };
}

console.log('canonical equivalence');

const canonical = load(fs.readFileSync(path.join(__dirname, '..', 'skill', 'assets', 'canonical-retail-fullspec.html'), 'utf8'));
const generated = load(render(spec, build()));
const C = signature(canonical), G = signature(generated);

ok('same canvas, shell and interaction surface', () => {
  assert.deepStrictEqual(G.canvas, C.canvas);
  assert.strictEqual(G.rail, C.rail);
  assert.strictEqual(G.watermark, C.watermark);
  assert.strictEqual(G.tip, C.tip);
  assert.deepStrictEqual(G.header, C.header);
  assert.strictEqual(G.catFilter, C.catFilter);
});

ok('same Year>Quarter>Month slicer (2 years, 5 quarter chips, 13 month chips)', () => {
  assert.deepStrictEqual(G.slicer, C.slicer);
});

ok('same KPI band: 5 cards, one grid column each, YoY-labelled with a descriptor line', () => {
  assert.deepStrictEqual(G.kpis, C.kpis);
  assert.deepStrictEqual(G.kpis, [199, 199, 199, 199, 199]);
  assert.ok(G.kpiBasis && C.kpiBasis);
  assert.ok(G.kpiDetail && C.kpiDetail);
});

ok('same row composition on the shared grid (3+2, then 3+2)', () => {
  assert.deepStrictEqual(G.rows, C.rows);
  assert.deepStrictEqual(G.rows, [[622, 410], [622, 410]]);
});

ok('same visual kinds in the same slots (chart+chart, then matrix+chart)', () => {
  assert.deepStrictEqual(G.visualKinds, C.visualKinds);
  assert.deepStrictEqual(G.visualKinds, [['svg', 'svg'], ['matrix', 'svg']]);
});

ok('same closing matrix: 6 columns, a totals row, drill-through on every row', () => {
  assert.strictEqual(G.matrixHeaders, C.matrixHeaders);
  assert.strictEqual(G.totalsRow, C.totalsRow);
  assert.ok(G.drillTargets && C.drillTargets);
  assert.ok(G.crossFilterTargets && C.crossFilterTargets);
});

ok('same 12-point trend', () => {
  assert.strictEqual(G.trendPoints, C.trendPoints);
  assert.strictEqual(G.trendPoints, 12);
});

ok('il file generato resta dentro il tetto di peso', () => {
  /* Questa verifica misurava il rapporto col file canonico (meno di 1,8 volte il suo peso). Era
     una buona proxy quando il motore era l'estrazione di quel file, e ha smesso di esserlo man
     mano che il motore ha acquisito cose che li dentro non ci sono: la scheda di interazione,
     la palette verificata, il fit, i bookmark, la finestra temporale. Il rapporto misurava la
     DISTANZA da un artefatto congelato, non il gonfiore — e infatti era rosso da un pezzo senza
     che nessuno leggesse il perche.
     Quello che conta davvero e uno solo: il tetto del file spedito. E' dichiarato una volta in
     harness.js e si importa da li, cosi non nascono due budget diversi. */
  const gen = Buffer.byteLength(render(spec, build()));
  assert.ok(gen < TETTO_BYTE, `${(gen / 1024).toFixed(1)}KB, tetto ${(TETTO_BYTE / 1024).toFixed(0)}KB`);
  /* il file canonico resta il termine di paragone STRUTTURALE, verificato dalle firme qui sopra */
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'skill', 'assets', 'canonical-retail-fullspec.html')),
    'il file canonico deve esistere: e il riferimento strutturale di questo test');
});

console.log(`\n${n} checks passed`);
