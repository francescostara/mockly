#!/usr/bin/env node
/* UNA PERCENTUALE VARIA DI PUNTI — in ogni posto dove il mockup scrive una variazione.
 *
 * Nel mockup di Parsa (27 set 2026) la card KPI diceva "Gross margin ▼ 0.8 pp" e la colonna
 * "Margin YoY" della matrice, due centimetri sotto, "▼ −9,4%" per il West: la stessa regola
 * scritta in due posti e dimenticata nel terzo. La card e la delta-card avevano ciascuna la loro
 * copia; la matrice, il tooltip del trend e la narrativa no.
 *
 * Due gate:
 *  - strutturale: nel runtime la variazione relativa (A.delta) e il suo formato (f.sgp) vivono
 *    SOLO dentro A.varia. Chi scrive una variazione nuova e costretto a passare di li;
 *  - sul disegno: aperto ogni mockup del corpus, ogni colonna "var" di una matrice che legge una
 *    misura percentuale mostra punti ("pp") in ogni cella, totale compreso.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('variazioni (una percentuale varia di punti, ovunque)');

const RT = fs.readFileSync(path.join(__dirname, '..', 'engine', 'runtime.js'), 'utf8');

ok('nel runtime A.delta e f.sgp compaiono solo dentro A.varia', () => {
  const inizio = RT.indexOf('A.varia = function'), fine = RT.indexOf('\n    };', inizio);
  assert.ok(inizio > 0, 'A.varia deve esistere');
  const fuori = RT.slice(0, inizio) + RT.slice(fine);
  const righe = fuori.split('\n').map((l, i) => ({ l, i })).filter(x => /A\.delta\(|f\.sgp\(/.test(x.l) && !/A\.delta = /.test(x.l));
  assert.deepStrictEqual(righe.map(x => x.l.trim()), [], 'variazioni scritte fuori da A.varia');
});

const punti = (spec, id) => { const m = (spec.model.measures || []).find(x => x.id === id) || {}; return m.unit === 'pct' || m.unit === 'pp' || m.format === 'pc'; };

ok('ogni colonna "var" su una misura percentuale mostra punti in ogni cella, su ogni mockup', () => {
  const guasti = [];
  let colonne = 0;
  casi().forEach(c => {
    const spec = c.caso.spec;
    const dom = new JSDOM(renderCaso(c, spec), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document, win = dom.window;
    const pagine = [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page);
    (pagine.length ? pagine : [null]).forEach(p => {
      if (p) doc.querySelector('.navbtn[data-page="' + p + '"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      const pg = p ? spec.pages.find(x => x.id === p) : spec.pages[0];
      const matrici = [];
      pg.rows.forEach(r => r.visuals.forEach(v => { const vv = v.viste ? v.viste[0] : v; if (vv.type === 'matrix') matrici.push(vv); }));
      const tabelle = [...doc.querySelectorAll('#page table')];
      matrici.forEach((mx, k) => {
        const t = tabelle[k];
        if (!t) return;
        (mx.bind.columns || []).forEach((col, ci) => {
          if (col.kind !== 'var' || !punti(spec, col.measure)) return;
          colonne++;
          [...t.querySelectorAll('tr')].slice(1).forEach(tr => {
            const td = tr.children[ci + 1];
            if (td && /[▲▼]\s*[+−-]?0[.,]0/.test(td.textContent))
              guasti.push(c.id + ' · ' + pg.id + ' · "' + (col.label || col.measure) + '": "' + td.textContent.trim() + '" (una variazione nulla e piatta, non una freccia)');
            if (td && td.textContent.trim() && !/pp\s*$/.test(td.textContent.trim()))
              guasti.push(c.id + ' · ' + pg.id + ' · "' + (col.label || col.measure) + '": "' + td.textContent.trim() + '"');
          });
        });
      });
    });
  });
  assert.ok(colonne >= 1, 'nessuna colonna var su una misura percentuale nel corpus: il gate non prova niente');
  assert.deepStrictEqual(guasti.slice(0, 8), [], guasti.slice(0, 8).join('\n       '));
});

console.log('  ' + n + ' checks');
