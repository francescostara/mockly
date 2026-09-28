#!/usr/bin/env node
/* UN COLORE, UNA CATEGORIA — E IL ROSSO SOLO AL PROBLEMA.
 *
 * Nel ribbon di Nitish (28 set 2026) "Water Sports" era rosso pieno mentre la categoria in calo,
 * Fitness, era blu; e con sei categorie e cinque colori distinti la sesta ricominciava la scala,
 * cosi Water Sports e Footwear rischiavano lo stesso colore. Due difetti della palette, non
 * della spec:
 *  - due famiglie (warm-taupe, terroso) mettevano un rosso vero nella scala categoriale: il
 *    vermiglione della base, scurito per il contrasto;
 *  - il motore assegnava i colori per indice e, finiti, ricominciava da capo senza dirlo.
 * Gate: nessuna famiglia ha un rosso fra i colori di categoria; e dove il colore identifica il
 * membro (ribbon, stack100, donut, hbar per membro) i membri a schermo non superano i colori
 * distinti — il motore rifiuta e dice quali palette ne hanno abbastanza.
 */
'use strict';
const assert = require('assert');
const SKIN = require('../engine/skin.js');
const COL = require('../engine/colore.js');
const { validate } = require('../engine/render.js');
const { casi } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('colori di categoria (uno per membro, mai il rosso del problema)');

ok('nessuna famiglia mette un rosso fra i colori di categoria', () => {
  const guasti = [];
  Object.keys(SKIN.FAMIGLIE).forEach(id => {
    const t = SKIN.palette(id);
    [1, 2, 3, 4, 5, 6].forEach(k => { if (COL.rosso(t['c' + k])) guasti.push(id + ': --c' + k + ' ' + t['c' + k] + ' e un rosso'); });
  });
  assert.deepStrictEqual(guasti, [], guasti.join('\n       '));
  assert.ok(COL.rosso('#CA1719') && COL.rosso('#D62728') && !COL.rosso('#E67200') && !COL.rosso('#C05500'),
    'il riconoscimento del rosso deve prendere i rossi veri e lasciare gli aranci');
});

ok('nessun mockup del corpus mostra due membri dello stesso colore dove il colore li distingue', () => {
  const guasti = [];
  casi().forEach(c => { try { validate(c.caso.spec, c.caso.build()); } catch (e) { if (/colori distinti/.test(e.message)) guasti.push(c.id); } });
  assert.deepStrictEqual(guasti, []);
});

ok('un ribbon con piu membri dei colori distinti e rifiutato, e il messaggio dice come uscirne', () => {
  const c = casi().find(x => x.id === 'banco/ribbon-sorpasso');
  const s = clona(c.caso.spec), dp = clona(c.caso.dataParams);
  s.skin = Object.assign({}, s.skin, { palette: 'warm-taupe' });
  const dim = dp.facts.dim, m = dp.dims[dim].members;
  while (m.length < 6) m.push(Object.assign(clona(m[m.length - 1]), { id: 'x' + m.length, n: 'Extra ' + m.length }));
  const build = require('../engine/data-builder.js').build;
  assert.throws(() => validate(s, build(dp)), err => {
    assert.match(err.message, /6 membri a schermo e la palette ha 5 colori distinti/);
    assert.match(err.message, /palette con piu colori \([a-z-]+/);
    return true;
  });
});

ok('la grammatica dice il vero su quante famiglie hanno sei colori e quante cinque', () => {
  const dts = require('fs').readFileSync(require('path').join(__dirname, '..', 'engine', 'spec.d.ts'), 'utf8');
  /* le famiglie nominate fra "6 colori:" e "5 colori:", e fra "5 colori:" e "Nessuna scala" */
  const blocco = (da, a) => dts.slice(dts.indexOf(da), dts.indexOf(a, dts.indexOf(da)));
  const nomi = t => Object.keys(SKIN.FAMIGLIE).filter(f => new RegExp('[\\s,:]' + f + '(,|\\s|$)').test(t)).sort();
  const lista = k => k === '6' ? nomi(blocco('6 colori:', '5 colori:')) : nomi(blocco('5 colori:', 'Nessuna scala'));
  const vere = k => Object.keys(SKIN.FAMIGLIE).filter(f => (new Set(SKIN.palette(f).serie).size >= 6) === (k === '6')).sort();
  assert.deepStrictEqual(lista('6'), vere('6'));
  assert.deepStrictEqual(lista('5'), vere('5'));
});

console.log('  ' + n + ' checks');
