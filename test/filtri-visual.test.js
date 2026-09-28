#!/usr/bin/env node
/* OGNI VISUAL RISPONDE A OGNI FILTRO — non solo le KPI.
 *
 * Il Gate 5 prova che un filtro cambia il testo di una card KPI. Nel mockup di Parsa (27 set
 * 2026) il filtro "Corporate" muoveva le KPI e la matrice, mentre la lista dei prodotti peggiori
 * restava identica al dollaro: il grano di dettaglio ereditava dalla riga dei fatti solo la
 * dimensione genitore, e un filtro su qualunque altra dimensione gli passava accanto. Il difetto
 * c'era gia con due dimensioni, in mockup consegnati. Anche la heatmap non segnava la colonna
 * del segmento scelto.
 *
 * Il gate: su ogni pagina di ogni mockup, per ogni filtro di dimensione, scelto un membro, ogni
 * card deve cambiare — valori, o evidenziazione del membro scelto. Una card che resta identica
 * davanti a un filtro attivo e un visual che mente sul perimetro che dichiara la barra.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('filtri e visual (ogni card risponde a ogni filtro)');

ok('su ogni pagina di ogni mockup, ogni filtro di dimensione cambia ogni card', () => {
  const guasti = [];
  let prove = 0;
  casi().forEach(c => {
    const spec = c.caso.spec;
    const dom = new JSDOM(renderCaso(c, spec), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document, win = dom.window;
    const clic = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    const pagine = spec.pages.map(p => p.id);
    pagine.forEach(pid => {
      const nav = doc.querySelector('.navbtn[data-page="' + pid + '"]');
      if (nav) clic(nav);
      const foto = () => [...doc.querySelectorAll('#page .card:not(.kpi)')].map(k => ({
        t: ((k.querySelector('.ch h3') || {}).textContent || '').trim(), h: k.innerHTML }));
      (spec.filters.dims || []).forEach(fd => {
        /* si prova ogni membro: "Paid" puo lasciare giustamente identica la spesa paid (sugli
           organici e zero per costruzione); ferma e la card che NESSUN membro muove */
        const prima = foto();
        const mosse = prima.map(() => false);
        const membri = [...doc.querySelectorAll('[data-f^="' + fd.id + ':"]:not([data-f="' + fd.id + ':"])')].map(e => e.getAttribute('data-f'));
        [...new Set(membri)].forEach(df => {
          /* ci si ferma appena ogni card si e mossa: di solito basta il primo membro, e provarli
             tutti costava meta del tempo della suite senza provare niente in piu */
          if (mosse.every(Boolean)) return;
          const el = doc.querySelector('[data-f="' + df + '"]');
          if (!el) return;
          clic(el);
          foto().forEach((d, i) => { if (prima[i] && d.h !== prima[i].h) mosse[i] = true; });
          clic(doc.getElementById('btnReset'));
          if (nav) clic(doc.querySelector('.navbtn[data-page="' + pid + '"]'));
        });
        prima.forEach((p, i) => {
          if (!p.t || !membri.length) return;
          prove++;
          if (!mosse[i]) guasti.push(c.id + ' · ' + pid + ' · "' + p.t + '" non risponde al filtro ' + fd.id);
        });
      });
    });
    dom.window.close();
  });
  assert.ok(prove > 100, 'solo ' + prove + ' prove');
  assert.deepStrictEqual(guasti, [], guasti.length + ' card ferme:\n       ' + guasti.join('\n       '));
});

console.log('  ' + n + ' checks');
