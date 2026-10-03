#!/usr/bin/env node
/* IL REPORT FINANCE PARLA LA LINGUA DELLA FINANZA (Bodan, 3 ott 2026).
 *
 * Il primo colpo del report per il CFO non sapeva: il conto economico per righe coi subtotali
 * calcolati, il YTD, lo scostamento dal budget coi colori della finanza, le migliaia con un
 * decimale, il ponte di cassa da apertura a chiusura. Gate, sul caso locale/cfo-bodan:
 *  - migliaia con un decimale ovunque (meta.numberFormat "k1");
 *  - la card finance: periodo e YTD, ciascuno contro budget e anno prima, col verso giusto;
 *  - il conto economico: i subtotali sono le loro misure (Gross profit = ricavi - costo del
 *    venduto, EBIT = EBITDA - D&A), un costo sopra il budget e rosso, i conti aperti sommano la voce;
 *  - il ponte di cassa: apertura + passi = chiusura, e l'apertura e la cassa del mese prima;
 *  - lo stock cumulativo: la cassa di un mese e quella del mese prima piu il flusso netto.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const RT = require('../engine/runtime.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('finanza (conto economico, budget e YTD, ponte di cassa)');

const c = casi().find(x => x.id === 'locale/cfo-bodan');
const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document, win = dom.window;
const vai = id => doc.querySelector('.navbtn[data-page="' + id + '"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const num = t => parseFloat(String(t).replace(/[^\d.,\-−]/g, '').replace('−', '-').replace(/,/g, ''));

ok('migliaia con un decimale: €52,134.5K, anche nelle card', () => {
  const MK = RT.MK || RT;
  const f = MK.fmt({ locale: 'en-GB', currency: '€', numberFormat: 'k1' });
  assert.strictEqual(f.eur(52134500), '€52,134.5K');
  assert.strictEqual(f.eur(-820), '−€0.8K');
  const v = doc.querySelector('.kpi .v').textContent;
  assert(/^€[\d,]+\.\dK$/.test(v), 'la card dice ' + v);
});

ok('la card finance: periodo e YTD, contro budget e anno prima, col verso della misura', () => {
  const card = doc.querySelector('.kpi');
  const righe = [...card.querySelectorAll('.kf')];
  assert.strictEqual(righe.length, 2, 'due righe di scostamenti (periodo e YTD) con un mese scelto');
  assert(/YTD Dec/.test(card.querySelector('.ky').textContent), 'manca la riga YTD');
  righe.forEach(r => assert(/vs Bud/.test(r.textContent) && /vs PY/.test(r.textContent), 'ogni riga dice vs Bud e vs PY: ' + r.textContent));
  righe.forEach(r => [...r.querySelectorAll('b')].forEach(b => {
    if (!/[▲▼]/.test(b.textContent)) return;
    assert(b.classList.contains(/▲/.test(b.textContent) ? 'up' : 'dn'), 'sui ricavi il verso del colore segue lo scostamento: ' + b.outerHTML);
  }));
});

ok('il conto economico: subtotali calcolati, costi sopra il budget in rosso, YTD con un mese scelto', () => {
  vai('pnl');
  const righe = [...doc.querySelectorAll('.st tr.pl')];
  const riga = l => righe.find(r => r.children[0].textContent.replace(/[▸▾]/g, '').trim() === l);
  const v = (l, i) => num(riga(l).children[i].textContent);
  assert(Math.abs(v('Gross profit', 1) - (v('Revenue', 1) - v('Cost of goods sold', 1))) < 0.25, 'Gross profit non e ricavi - COGS');
  assert(Math.abs(v('EBIT', 1) - (v('EBITDA', 1) - v('Depreciation & amortisation', 1))) < 0.25, 'EBIT non e EBITDA - D&A');
  assert.strictEqual(doc.querySelectorAll('.st th.grp').length, 2, 'con un mese scelto ci sono il periodo e il YTD');
  righe.forEach(r => {
    if (r.classList.contains('pct')) return;
    const act = num(r.children[1].textContent), bud = num(r.children[2].textContent), cella = r.children[3];
    if (!isFinite(bud) || Math.abs(act - bud) < 0.05) return;
    const costo = /Cost|Research|Sales|General|opex|Depreciation/.test(r.children[0].textContent);
    const favorevole = costo ? act < bud : act > bud;
    assert(cella.classList.contains(favorevole ? 'up' : 'dn'), r.children[0].textContent.trim() + ': ' + cella.textContent + ' ha il colore sbagliato');
  });
});

ok('una voce si apre nei suoi conti, che sommano la voce', () => {
  doc.querySelector('tr[data-exp$=":5"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const conti = [...doc.querySelectorAll('.st tr.acc')];
  assert(conti.length >= 3, 'la voce non si apre');
  const voce = [...doc.querySelectorAll('.st tr.pl')].find(r => /Sales & marketing/.test(r.textContent));
  [1, 2].forEach(i => {
    const somma = conti.reduce((a, r) => a + num(r.children[i].textContent), 0);
    assert(Math.abs(somma - num(voce.children[i].textContent)) < 0.35, 'i conti sommano ' + somma + ' contro ' + voce.children[i].textContent);
  });
});

ok('il ponte di cassa: apertura + passi = chiusura, apertura = cassa del mese prima', () => {
  vai('cash');
  const tips = [...doc.querySelectorAll('#page rect.hit[data-tip]')].map(r => r.getAttribute('data-tip')).filter(t => /Opening|Operating CF|Capex|Tax|Closing/.test(t));
  const val = l => num(tips.find(t => t.indexOf(l) >= 0).split('<br>')[1]);
  const ap = val('Opening'), ch = val('Closing');
  assert(Math.abs(ap + val('Operating CF') + val('Capex') + val('Tax') - ch) < 0.3, 'il ponte non quadra');
  const d = c.caso.build(), C = d.facts.cols, R = d.facts.rows.map(r => Object.fromEntries(C.map((k, i) => [k, r[i]])));
  const nov = R.filter(r => r.y === 2026 && r.m === 10).reduce((a, r) => a + r.netcash, 0) / 1000;
  assert(Math.abs(nov - ap) < 0.3, 'l apertura (' + ap + ') non e la cassa di novembre (' + nov.toFixed(1) + ')');
});

ok('lo stock cumulativo: la cassa di un mese e quella del mese prima piu il flusso', () => {
  const d = c.caso.build(), C = d.facts.cols, R = d.facts.rows.map(r => Object.fromEntries(C.map((k, i) => [k, r[i]])));
  const serie = {};
  R.forEach(r => { const k = [r.ent, r.seg, r.prod].join(); (serie[k] = serie[k] || []).push(r); });
  Object.values(serie).forEach(s => {
    s.sort((a, b) => a.y * 12 + a.m - b.y * 12 - b.m);
    for (let i = 1; i < s.length; i++) assert(Math.abs(s[i].netcash - s[i - 1].netcash - s[i].ncfF) <= 1);
  });
});

console.log('  ' + n + ' checks');
