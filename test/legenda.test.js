#!/usr/bin/env node
/* LA LEGENDA DICE CIO CHE IL GRAFICO DISEGNA — o non c'e.
 *
 * Commento dell'autore sull'app di lingue: nel "New users and activation — 2025 vs 2024" la
 * legenda del 2024 non era corretta. Prometteva una linea tratteggiata sopra due serie di barre
 * colorate. La legenda la scriveva la spec, il grafico lo disegna il motore, e nessuno
 * controllava che coincidessero: il modello aveva copiato la legenda del trend (dove l'anno prima
 * e davvero un tratteggio) dentro un colline. Stesso difetto in due mockup gia approvati.
 *
 * La cura e in due parti: la spec non puo piu dichiarare una legenda (il campo e rifiutato), e il
 * motore la costruisce dalle serie che traccia. Qui si prova la seconda parte in modo generale,
 * senza guardare il tipo di grafico: ogni segno della legenda deve esistere nel disegno.
 *   - un tratteggio in legenda vuol dire un tratto tratteggiato nel grafico, e viceversa;
 *   - un quadratino colorato vuol dire barre o aree di quel colore nel grafico.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render, validate } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('legenda (dice cio che il grafico disegna)');

function casi() {
  const out = [];
  const agg = (fonte, m) => Object.keys(m).filter(k => k[0] !== '_')
    .forEach(k => out.push({ id: fonte + '/' + k, caso: m[k] }));
  agg('archetipi', require('../engine/templates/index.js'));
  agg('banco', require('../engine/specs/banco/index.js'));
  agg('eval', require('../engine/specs/index.js'));
  const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
  fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js')
    .forEach(f => out.push({ id: 'locale/' + f.replace(/\.js$/, ''), caso: require(path.join(dir, f)) }));
  return out;
}
const CASI = casi();

ok('una legenda dichiarata nella spec viene rifiutata', () => {
  const c = CASI.find(x => x.id === 'locale/app-lingue').caso;
  const s = clona(c.spec);
  const v = s.pages[0].rows[0].visuals.find(x => x.type === 'colline');
  v.legend = [{ l: '{y}', c: 'var(--c2)' }, { l: '{py}', dash: true }];
  assert.throws(() => validate(s, c.build()), /"legend" non si dichiara/,
    'il campo che ha prodotto la legenda sbagliata non deve piu poter esistere');
});

ok('ogni segno della legenda esiste nel disegno, su ogni pagina di ogni mockup', () => {
  const guasti = [];
  let viste = 0;
  CASI.forEach(c => {
    const dom = new JSDOM(render(c.caso.spec, c.caso.build()), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document, win = dom.window;
    const pagine = [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page);
    (pagine.length ? pagine : [null]).forEach(p => {
      if (p) doc.querySelector('.navbtn[data-page="' + p + '"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      [...doc.querySelectorAll('#page .card')].forEach(card => {
        const lgd = card.querySelector('.lgd'), svg = card.querySelector('svg');
        if (!lgd || !svg) return;
        viste++;
        const tit = ((card.querySelector('.ch h3') || {}).textContent || '').trim();
        const tratteggioInLegenda = !!lgd.querySelector('.ln');
        const tratteggioNelGrafico = !!svg.querySelector('[stroke-dasharray]');
        if (tratteggioInLegenda && !tratteggioNelGrafico)
          guasti.push(c.id + ' · "' + tit + '": la legenda promette un tratteggio che il grafico non disegna');
        if (!tratteggioInLegenda && tratteggioNelGrafico && svg.querySelector('path[stroke-dasharray]'))
          guasti.push(c.id + ' · "' + tit + '": il grafico ha una serie tratteggiata che la legenda non spiega');
        const colori = new Set([...svg.querySelectorAll('rect,path,circle')].map(e => e.getAttribute('fill')).filter(Boolean));
        [...lgd.querySelectorAll('i')].forEach(q => {
          const col = (q.getAttribute('style') || '').replace(/^background:/, '').trim();
          if (col && !colori.has(col)) guasti.push(c.id + ' · "' + tit + '": la legenda mostra ' + col + ', che nel grafico non c e');
        });
      });
    });
    dom.window.close();
  });
  assert.ok(viste >= 10, 'solo ' + viste + ' legende guardate: il test non prova niente');
  assert.deepStrictEqual(guasti, [], guasti.join(String.fromCharCode(10) + '       '));
});

console.log('  ' + n + ' checks');
