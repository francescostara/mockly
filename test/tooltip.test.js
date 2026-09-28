#!/usr/bin/env node
/* IL TOOLTIP COMPARE ACCANTO AL CURSORE, NON NELL'ANGOLO.
 *
 * Nei drill di Parsa e di Nitish (28 set 2026) un tooltip restava in alto a sinistra, sopra il
 * marchio: prendeva il contenuto al mouseover e la posizione solo al mousemove, e quando il
 * grafico si ridisegna sotto un cursore fermo il mousemove non arriva. Il gate: su ogni mockup,
 * un solo mouseover (nessun movimento) su un elemento con tooltip lo mostra gia vicino al punto.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('tooltip (compare accanto al cursore gia al primo evento)');

ok('su ogni mockup un solo mouseover mette il tooltip accanto al cursore', () => {
  const guasti = [];
  casi().forEach(c => {
    const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document;
    const el = doc.querySelector('#page [data-tip]');
    if (!el) { dom.window.close(); return; }
    el.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true, clientX: 400, clientY: 300 }));
    const tip = doc.getElementById('tip');
    const x = parseFloat(tip.style.left), y = parseFloat(tip.style.top);
    if (tip.style.opacity !== '1' || !(Math.abs(x - 400) < 60 && Math.abs(y - 300) < 60))
      guasti.push(c.id + ': tooltip a (' + tip.style.left + ', ' + tip.style.top + '), opacita ' + tip.style.opacity);
    dom.window.close();
  });
  assert.deepStrictEqual(guasti, [], guasti.join('\n       '));
});

console.log('  ' + n + ' checks');
