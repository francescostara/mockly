#!/usr/bin/env node
/* UN REPORT CHE SI LEGGE DA SOLO (call con Luca, 6 ott 2026).
 *
 *  - "se superiore al target farlo verde ed inferiore rosso in generale": una misura con `target`
 *    colora card, celle, barre, celle della heatmap e punti della linea;
 *  - "late payments da solo non ha senso, devi sempre confrontare a quanti non sono late": una card
 *    con `of` dice su quale totale si legge e con che quota;
 *  - "in how to use this mockup inserire come i kpi vengono calcolati": la guida spiega ogni KPI;
 *  - "il layout andrebbe adattato ai colori ufficiali della banca": `skin.brand`;
 *  - il tipo di pagamento come dimensione padre della valuta (`parentDim`);
 *  - le cause dei ritardi come parti che sommano i ritardi (`facts.parts`), mai negative.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const { render } = require('../engine/render.js');
const SKIN = require('../engine/skin.js');
const SCHEDA = require('../engine/scheda.js');
const builder = require('../engine/data-builder.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('lettura (target, totali, guida ai KPI, colori del cliente, padri, parti)');

const c = casi().find(x => x.id === 'locale/pagamenti-luca');
const data = c.caso.build();
const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document, win = dom.window;
const clic = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const num = t => parseFloat(String(t).replace(/[^\d.,\-−]/g, '').replace('−', '-').replace(/,/g, ''));

ok('una misura col target colora card, celle, celle della heatmap e punti della linea', () => {
  const v = doc.querySelector('.kpi .v');
  assert(v.classList.contains('tok') || v.classList.contains('tko'), 'la card della compliance non dice sopra o sotto il target');
  assert.strictEqual(v.classList.contains('tok'), num(v.textContent) >= 98, 'il verso del colore della card');
  const celle = [...doc.querySelectorAll('#page td.tok, #page td.tko')];
  assert(celle.length >= 6, 'le celle del Late % devono dire sopra o sotto il target');
  celle.forEach(td => { const x = num(td.textContent); if (/%$/.test(td.textContent.trim()) && x < 50) assert.strictEqual(td.classList.contains('tok'), x <= 2, 'Late % ' + x + ': colore sbagliato'); });
  const heat = [...doc.querySelectorAll('#page svg text[font-weight="700"]')].filter(t => /var\(--(ok|ko)\)/.test(t.getAttribute('fill') || ''));
  assert(heat.length >= 10, 'le celle della heatmap della compliance');
  heat.forEach(t => assert.strictEqual(t.getAttribute('fill') === 'var(--ok)', num(t.textContent) >= 98, 'heatmap ' + t.textContent));
  assert(doc.querySelectorAll('#page circle.l2p[fill="var(--ok)"], #page circle.l2p[fill="var(--ko)"]').length >= 12, 'i punti della linea della compliance');
});

ok('un conteggio si legge col suo totale: la card dice su quanti e che quota', () => {
  const card = [...doc.querySelectorAll('.kpi')].find(k => /Late payments/i.test(k.textContent));
  const det = card.querySelector('.det').textContent;
  assert(/of [\d,]+ payments/.test(det) && /\d\.\d%/.test(det), 'la card dei ritardi deve dire "of N payments · x%": ' + det);
  const late = num(card.querySelector('.v').textContent), tot = num(det.match(/of ([\d,]+)/)[1]), q = parseFloat(det.match(/(\d+\.\d)%/)[1]);
  assert(Math.abs(late / tot * 100 - q) < 0.06, 'la quota scritta non e ritardi / totale');
});

ok('la guida spiega come si calcola ogni KPI, con la definizione e il target', () => {
  const t = SCHEDA.testo(c.caso.spec, data);
  assert(/## How the KPIs are calculated/.test(t), 'manca la sezione');
  c.caso.spec.kpiBand.forEach(k => assert(t.indexOf('**' + k.label + '**') >= 0, 'manca ' + k.label));
  assert(/Calculation: Before cut-off divided by Payments/.test(t), 'la formula della compliance in parole');
  assert(/Target: 98%/.test(t) && /above target is green/.test(t), 'il target e il suo verso');
  assert(/Read it together with the total: Payments/.test(t), 'la base della card dei ritardi');
  assert(/cut-off of their currency \(CHF 16:00/.test(t), 'la definizione scritta nella spec');
});

ok('i colori ufficiali del cliente: skin.brand guida la cornice, i dati restano leggibili', () => {
  const spec = JSON.parse(JSON.stringify(c.caso.spec));
  spec.skin.brand = ['#7A1F2B', '#1D3557'];
  const p = SKIN.pelleDi(spec), base = SKIN.pelleDi(c.caso.spec);
  assert.notStrictEqual(p.tokens.rail, base.tokens.rail, 'la cornice nasce dal marchio');
  assert.deepStrictEqual(p.tokens.serie, base.tokens.serie, 'la scala dei dati resta quella verificata');
  const h = render(spec, data);
  assert(h.indexOf('--rail:' + p.tokens.rail) >= 0, 'la cornice del marchio arriva al file');
});

ok('il tipo di pagamento e il padre della valuta: il suo filtro funziona', () => {
  assert(data.dims.ptype && data.dims.ccy.every(m => m.parentDim === 'ptype' && m.parent));
  const prima = doc.querySelector('.kpi .v').textContent;
  clic(doc.querySelector('[data-dd="ptype"]'));
  clic(doc.querySelector('.ddp [data-f="ptype:xb"]'));
  assert.notStrictEqual(doc.querySelector('.kpi .v').textContent, prima, 'il filtro del padre deve muovere le card');
  clic(doc.getElementById('btnReset'));
});

ok('le cause dei ritardi sommano i ritardi in ogni riga, mai negative; un conteggio negativo e rifiutato', () => {
  const fresco = c.caso.build(), C = fresco.facts.cols, R = fresco.facts.rows.map(r => Object.fromEntries(C.map((k, i) => [k, r[i]])));
  R.forEach(r => {
    const s = r.cClient + r.cRepair + r.cSanct + r.cFunds + r.cSystem;
    assert.strictEqual(s, r.late, 'le cause non sommano i ritardi: ' + JSON.stringify(r));
    ['cClient', 'cRepair', 'cSanct', 'cFunds', 'cSystem'].forEach(f => assert(r[f] >= 0, f + ' negativo'));
  });
  const dp = JSON.parse(JSON.stringify(c.caso.dataParams));
  delete dp.facts.parts;
  dp.facts.fields = dp.facts.fields.map(f => f.id === 'cSystem' ? { id: 'cSystem', kind: 'combine', plus: ['late'], minus: ['cClient', 'cRepair', 'cSanct', 'cFunds'] } : f);
  dp.dims.ccy.members.forEach(m => { m.attrs.pC = 0.7; m.attrs.pR = 0.4; });
  assert.throws(() => render(c.caso.spec, builder.build(dp)), /un conteggio con valori negativi/);
});

console.log('  ' + n + ' checks');
