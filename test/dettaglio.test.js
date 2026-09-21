#!/usr/bin/env node
/* IL DETTAGLIO HA UN CARATTERE — pesi e difficolta dichiarati, non quote a caso.
 *
 * Nato dal secondo giro del primo tester esterno: ha lodato "sz / cz / rz sounds" come il topic
 * piu praticato del polacco e ha chiesto di scendere a vedere quali topic trainano ogni lingua.
 * Ma quel primato era casuale — il dettaglio usciva con una quota a caso per figlio — e nessun
 * topic poteva essere piu difficile di un altro, perche ogni misura si divideva con la stessa
 * quota: il tasso di errore di ogni topic era la copia di quello della sua lingua.
 *
 * Il test prova quattro cose: che un figlio senza carattere si comporta come prima (lo stesso
 * seme da gli stessi numeri), che il peso dichiarato decide la quota, che il moltiplicatore rende
 * un topic davvero piu difficile senza rompere la quadratura col genitore, e che un
 * moltiplicatore su un campo che il dettaglio non divide viene rifiutato invece che ignorato.
 */
'use strict';
const assert = require('assert');
const builder = require('../engine/data-builder.js');
const MK = require('../engine/runtime.js');
const caso = require('../engine/specs/locale/app-lingue.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('dettaglio (pesi e difficolta dichiarati)');

/* i topic del polacco, com'erano (nomi soli) e con il loro carattere */
const PL = [
  { n: 'Seven noun cases', w: 2.4, mult: { mistakes: 1.6 } },
  { n: 'Verb aspect pairs', w: 1.5, mult: { mistakes: 1.3 } },
  { n: 'Gender agreement', w: 1.0, mult: { mistakes: 1.1 } },
  { n: 'sz / cz / rz sounds', w: 2.8, mult: { mistakes: 0.7 } }
];
const conCarattere = () => { const dp = clona(caso.dataParams); dp.detail.members.pl = PL; return dp; };

/* le righe di dettaglio sommate per figlio, sull'ultimo anno */
function perFiglio(data) {
  const F = MK.materialize(data.facts, data.dims), y = data.years[data.years.length - 1];
  const out = {};
  MK.expandDetail(F.filter(r => r.y === y), data.dims, data.detailModel).forEach(r => {
    const o = out[r.topic] = out[r.topic] || { lessons: 0, attempts: 0, mistakes: 0 };
    o.lessons += r.lessons; o.attempts += r.attempts; o.mistakes += r.mistakes;
  });
  return out;
}

ok('un figlio senza carattere si comporta come prima: stesso seme, stessi numeri', () => {
  const prima = builder.build(clona(caso.dataParams));
  const dopo = builder.build(conCarattere());
  /* il polacco cambia perche lo si e dichiarato; le altre lingue devono restare identiche */
  Object.keys(prima.detailModel.shares).filter(k => !k.startsWith('pl:')).forEach(k =>
    assert.strictEqual(dopo.detailModel.shares[k], prima.detailModel.shares[k], k + ' ha cambiato quota senza motivo'));
  assert.deepStrictEqual(dopo.facts, prima.facts, 'i fatti non devono cambiare: il dettaglio si appoggia sopra');
});

ok('il peso dichiarato decide la quota: il topic piu praticato e quello che si e detto', () => {
  const d = builder.build(conCarattere());
  const q = k => d.detailModel.shares['pl:' + k];
  const tot = PL.reduce((a, t) => a + t.w, 0);
  PL.forEach(t => assert.ok(Math.abs(q(t.n) - t.w / tot) < 1e-4, t.n + ': quota ' + q(t.n) + ' invece di ' + (t.w / tot)));
  const pratica = perFiglio(d);
  const primo = Object.keys(pratica).filter(k => k.startsWith('pl:')).sort((a, b) => pratica[b].lessons - pratica[a].lessons)[0];
  assert.strictEqual(primo, 'pl:sz / cz / rz sounds', 'il piu praticato deve essere quello col peso piu alto, non un caso');
});

ok('il moltiplicatore rende un topic piu difficile, e i figli sommano ancora al genitore', () => {
  const d = builder.build(conCarattere());
  const t = perFiglio(d);
  const tasso = k => t['pl:' + k].mistakes / t['pl:' + k].attempts;
  assert.ok(tasso('Seven noun cases') > tasso('sz / cz / rz sounds') * 2,
    'i casi (' + (tasso('Seven noun cases') * 100).toFixed(1) + '%) devono essere ben piu difficili dei suoni (' +
    (tasso('sz / cz / rz sounds') * 100).toFixed(1) + '%)');
  /* senza carattere i tassi erano copie: lo si verifica sul caso vecchio */
  const vecchio = perFiglio(builder.build(clona(caso.dataParams)));
  const tv = Object.keys(vecchio).filter(k => k.startsWith('pl:')).map(k => vecchio[k].mistakes / vecchio[k].attempts);
  assert.ok(Math.max(...tv) - Math.min(...tv) < 1e-9, 'il caso di prova doveva avere tassi identici');
  ['lessons', 'attempts', 'mistakes'].forEach(f => assert.strictEqual(d.tieOut[f + '_delta'], 0, f + ': il dettaglio non quadra col genitore'));
});

ok('un moltiplicatore su un campo che il dettaglio non divide viene rifiutato', () => {
  const dp = conCarattere();
  dp.detail.members.pl[0].mult = { revenue: 2 };
  assert.throws(() => builder.build(dp), /mult\.revenue.*non divide/,
    'un campo accettato e ignorato in silenzio e peggio di un campo che non esiste');
  const dp2 = conCarattere();
  dp2.detail.members.pl[1].w = 0;
  assert.throws(() => builder.build(dp2), /peso "w"/, 'un peso nullo o negativo non e un peso');
});

console.log('  ' + n + ' checks');
