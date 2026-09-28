#!/usr/bin/env node
/* CAMPAGNE, EVENTI E COMPOSIZIONI — cio che il brief di Fra sulle promozioni (28 set 2026) ha
 * trovato non esprimibile, e che ora il motore regge.
 *
 *  - `mix` su un membro di facts.dim: la sua composizione di uno split vince sull'IPF. Senza,
 *    "Clima Days" vendeva il 54% di grandi elettrodomestici e il 13% di clima;
 *  - `anni` su un membro: una campagna fatta una volta vale zero negli altri anni, e nella matrice
 *    la sua variazione si legge "nuova", non "+0,0%";
 *  - le righe tutte a zero non viaggiano nel file, e i totali restano identici;
 *  - il tetto delle celle conta quelle effettive;
 *  - la heatmap con per:"colonna" gradua dentro ogni colonna, e `per` e rifiutato altrove.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const builder = require('../engine/data-builder.js');
const { render, validate } = require('../engine/render.js');
const { casi } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('eventi e composizioni (campagne nel tempo, di categoria, una tantum)');

const caso = casi().find(c => c.id === 'locale/promo-elettrodomestici');
assert.ok(caso, 'serve il caso delle promozioni nel corpus');
const dp = caso.caso.dataParams;
const data = builder.build(dp);
const col = k => data.facts.cols.indexOf(k);
const somma = (filtro, campo) => data.facts.rows.filter(filtro).reduce((a, r) => a + r[col(campo)], 0);
const idx = (dim, id) => data.dims[dim].findIndex(m => m.id === id);

ok('una campagna con mix dichiarato vende solo le voci che nomina, in ogni anno', () => {
  const conMix = dp.dims[dp.facts.dim].members.filter(m => m.mix);
  assert.ok(conMix.length >= 1, 'il caso deve avere almeno una campagna di categoria');
  conMix.forEach(m => Object.keys(m.mix).forEach(dim => {
    const ammessi = Object.keys(m.mix[dim]).filter(id => m.mix[dim][id] > 0).map(id => idx(dim, id));
    const fuori = somma(r => r[col(dp.facts.dim)] === idx(dp.facts.dim, m.id) && ammessi.indexOf(r[col(dim)]) < 0, 'netto');
    assert.strictEqual(fuori, 0, m.n + ' vende fuori dalle voci di ' + dim + ' che dichiara');
  }));
});

ok('una campagna con anni vale zero negli altri anni, e la matrice la dice "nuova"', () => {
  const una = dp.dims[dp.facts.dim].members.find(m => m.anni);
  assert.ok(una, 'il caso deve avere una campagna una tantum');
  data.years.filter(y => una.anni.indexOf(y) < 0).forEach(y =>
    assert.strictEqual(somma(r => r[col('y')] === y && r[col(dp.facts.dim)] === idx(dp.facts.dim, una.id), 'netto'), 0));
  const dom = new JSDOM(render(caso.caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const riga = [...dom.window.document.querySelectorAll('#page table tr')].find(tr => tr.textContent.indexOf(una.n) >= 0);
  assert.ok(riga, 'la campagna una tantum deve comparire nella matrice');
  assert.ok(/nuova/.test(riga.textContent) && !/[+−-]0[,.]0%/.test(riga.textContent), 'la variazione di una voce nuova si legge "nuova": ' + riga.textContent);
  dom.window.close();
});

ok('le righe tutte a zero non viaggiano, e i totali sono quelli di prima', () => {
  const tutti = data.facts.rows.filter(r => data.facts.cols.slice(2 + 1 + (Array.isArray(dp.facts.split) ? dp.facts.split.length : 1)).every(c => r[col(c)] === 0));
  assert.strictEqual(tutti.length, 0, 'righe tutte a zero rimaste nel file');
  assert.strictEqual(data.tieOut.netto_delta || 0, 0);
});

ok('il tetto delle celle conta quelle effettive: una campagna su una categoria vale una cella per sede', () => {
  const d2 = clona(dp);
  /* senza mix le stesse campagne sforano il tetto */
  d2.dims[d2.facts.dim].members.forEach(m => { delete m.mix; });
  const membri = d2.dims[d2.facts.dim].members.length * d2.facts.split.reduce((a, sc) => a * d2.dims[sc.dim].members.length, 1);
  if (membri > 120) assert.throws(() => builder.build(d2), /sotto 120/);
  builder.build(dp);    /* con mix il caso sta nel tetto */
});

ok('la heatmap per colonna gradua dentro ogni colonna; per e rifiutato altrove', () => {
  const s = clona(caso.caso.spec);
  const hm = s.pages.flatMap(p => p.rows.flatMap(r => r.visuals.flatMap(v => v.viste || [v]))).find(v => v.type === 'heatmap');
  assert.ok(hm && hm.bind.per === 'colonna', 'il caso usa una heatmap per colonna');
  const dom = new JSDOM(render(s, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document;
  doc.querySelector('.navbtn[data-page="' + s.pages.find(p => p.rows.some(r => r.visuals.some(v => v === hm || (v.viste || []).indexOf(hm) >= 0))).id + '"]')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const card = [...doc.querySelectorAll('#page .card')].find(k => k.querySelector('rect[fill^="var(--heat"]'));
  const celle = [...card.querySelectorAll('rect[fill^="var(--heat"]')];
  const nCol = (data.dims[hm.bind.by] || []).length;
  for (let ci = 0; ci < nCol; ci++) {
    const tinte = new Set(celle.filter((_, i) => i % nCol === ci).map(r => r.getAttribute('fill')));
    assert.ok(tinte.size >= 3, 'la colonna ' + ci + ' ha ' + tinte.size + ' gradini: non si legge dentro la colonna');
  }
  dom.window.close();
  const s2 = clona(caso.caso.spec);
  const v2 = s2.pages.flatMap(p => p.rows.flatMap(r => r.visuals.flatMap(v => v.viste || [v]))).find(v => v.type === 'hbar' || v.type === 'matrix');
  v2.bind.per = 'colonna';
  assert.throws(() => validate(s2, data), /per "colonna" non ammesso/);
});

ok('una KPI su una voce nuova dice "nuova"; un tasso senza base e "—", non un numero', () => {
  const una = dp.dims[dp.facts.dim].members.find(m => m.anni);
  const senzaPromo = dp.dims[dp.facts.dim].members.find(m => (m.attrs || {}).inPromo === 0);
  const dom = new JSDOM(render(caso.caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document, win = dom.window;
  const clic = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  clic(doc.querySelector('#page tr[data-f="' + dp.facts.dim + ':' + una.id + '"]'));
  const kpi = [...doc.querySelectorAll('#page .kpi')].map(k => k.textContent);
  assert.ok(kpi.some(t => /nuova/.test(t)), 'filtrando la campagna nuova almeno una KPI deve dire "nuova": ' + kpi.join(' | '));
  assert.ok(!kpi.some(t => /[+−-]\d+[,.]\d pp/.test(t) && /nuova/.test(t) === false && /Margine/.test(t)), 'nessun margine "+x pp" contro un anno che non esisteva');
  clic(doc.getElementById('btnReset'));
  const riga = [...doc.querySelectorAll('#page table tr')].find(tr => tr.textContent.indexOf(senzaPromo.n) >= 0);
  assert.ok(!/−100[,.]0%/.test(riga.textContent), 'un uplift senza base non e −100%: ' + riga.textContent);
  assert.ok(/—/.test(riga.textContent), 'il tasso senza base si scrive "—": ' + riga.textContent);
  dom.window.close();
});

console.log('  ' + n + ' checks');
