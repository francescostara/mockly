#!/usr/bin/env node
/* I TASSI RACCONTANO QUALCOSA — fra i membri di una dimensione e fra gli anni.
 *
 * Nel mockup di Muttahar (2 ott 2026) le dieci regioni stavano tutte al 90,2% di OTIF: i tassi
 * erano sui magazzini e le regioni ricevevano solo una quota degli ordini. E i tassi erano gli
 * stessi ogni anno, quindi ogni confronto col periodo precedente era piatto ("the data lacks
 * diversity"). Lo stesso difetto negli anni stava in otto casi del corpus.
 *
 * Gate:
 *  - il generatore: `mod` sposta il tasso con l'attr di un'altra dimensione; un attr puo avere un
 *    valore per anno, scorre dentro l'anno e la media dell'anno resta quella dichiarata; errori
 *    chiari su array della lunghezza sbagliata, mod senza attr, mod su una dimensione inesistente;
 *  - la validazione rifiuta un tasso uguale per ogni membro della dimensione che lo mostra e una
 *    banda KPI coi tassi fermi negli anni;
 *  - nessun caso del corpus ha tassi piatti; Muttahar ha regioni distanti e una rete che si muove.
 */
'use strict';
const assert = require('assert');
const builder = require('../engine/data-builder.js');
const { tassiPiatti } = require('../engine/tassi.js');
const { casi } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('tassi (diversi fra i membri, in movimento negli anni)');

const dp = (over = {}) => ({
  seed: 7, years: [2024, 2025],
  dims: {
    wh: { members: [{ id: 'a', n: 'A', base: 4000, attrs: { ot: [0.90, 0.95] } }, { id: 'b', n: 'B', base: 4000, attrs: { ot: 0.92 } }] },
    reg: { members: [{ id: 'x', n: 'X', base: 1, attrs: { m: 1.04 } }, { id: 'y', n: 'Y', base: 1, attrs: { m: 0.94 } }, { id: 'z', n: 'Z', base: 1, attrs: { m: 1 } }] }
  },
  facts: {
    dim: 'wh', split: { dim: 'reg', shares: [0.4, 0.3, 0.3] },
    fields: [{ id: 'orders', kind: 'seasonal', jitter: [1, 1] },
      Object.assign({ id: 'ontime', kind: 'share', of: 'orders', attr: 'ot', jitter: [1, 1], mod: { from: 'reg', attr: 'm' } }, over)]
  }
});
const tasso = (d, filtro) => {
  const C = d.facts.cols, R = d.facts.rows.map(r => Object.fromEntries(C.map((k, i) => [k, r[i]]))).filter(filtro);
  return R.reduce((a, r) => a + r.ontime, 0) / R.reduce((a, r) => a + r.orders, 0);
};

ok('mod: la regione sposta il tasso del magazzino', () => {
  const d = builder.build(dp());
  const x = tasso(d, r => r.reg === 0 && r.y === 2025), y = tasso(d, r => r.reg === 1 && r.y === 2025);
  assert(x - y > 0.08, `regioni X ${x.toFixed(3)} e Y ${y.toFixed(3)}: il correttivo non agisce`);
});
ok('un attr con un valore per anno: la media dell\'anno e quella dichiarata, il tasso si muove', () => {
  const d = builder.build(dp({ mod: undefined }));
  const a24 = tasso(d, r => r.wh === 0 && r.y === 2024), a25 = tasso(d, r => r.wh === 0 && r.y === 2025);
  assert(a25 - a24 > 0.03, `2024 ${a24.toFixed(3)}, 2025 ${a25.toFixed(3)}`);
  assert(Math.abs((a24 + a25) / 2 - 0.925) < 0.01, 'la media dei due anni si allontana dai valori dichiarati');
  const gen = tasso(d, r => r.wh === 0 && r.y === 2025 && r.m === 0), dic = tasso(d, r => r.wh === 0 && r.y === 2024 && r.m === 11);
  assert(Math.abs(gen - dic) < 0.01, `scalino a gennaio: dicembre ${dic.toFixed(3)}, gennaio ${gen.toFixed(3)}`);
});
ok('errori chiari: array lungo sbagliato, mod senza attr, mod su una dimensione che non c\'e', () => {
  const p1 = dp(); p1.dims.wh.members[0].attrs.ot = [0.9, 0.92, 0.95];   /* piu valori che anni */
  assert.throws(() => builder.build(p1), /un numero per anno/);
  const p2 = dp(); delete p2.dims.reg.members[1].attrs.m;
  assert.throws(() => builder.build(p2), /mod vuole attrs\.m/);
  assert.throws(() => builder.build(dp({ mod: { from: 'canale', attr: 'm' } })), /non e una dimensione dei fatti/);
});

const caso = casi().find(c => c.id === 'locale/supply-chain-muttahar').caso;
const vecchio = JSON.parse(JSON.stringify(caso.dataParams));
vecchio.facts.fields.forEach(f => { delete f.mod; });
Object.values(vecchio.dims).forEach(d => d.members.forEach(m => Object.keys(m.attrs || {})
  .forEach(k => { if (Array.isArray(m.attrs[k])) m.attrs[k] = m.attrs[k][1]; })));
ok('la validazione rifiuta i dati del primo Muttahar: regioni pari e anni fermi', () => {
  const p = tassiPiatti(caso.spec, builder.build(vecchio));
  assert(p.some(m => /same for every region/.test(m)), 'regioni pari non viste:\n' + p.join('\n'));
  assert(p.some(m => /flat across the years/.test(m)), 'anni fermi non visti:\n' + p.join('\n'));
});
ok('Muttahar v2: le regioni distano piu di 5 punti di OTIF, la rete si muove negli anni', () => {
  const d = caso.build(), C = d.facts.cols, R = d.facts.rows.map(r => Object.fromEntries(C.map((k, i) => [k, r[i]])));
  const otif = f => { const g = R.filter(f); return g.reduce((a, r) => a + r.otif, 0) / g.reduce((a, r) => a + r.orders, 0); };
  const reg = [...new Set(R.map(r => r.region))].map(i => otif(r => r.y === 2025 && r.region === i));
  assert(Math.max(...reg) - Math.min(...reg) > 0.05, 'regioni: ' + reg.map(x => (100 * x).toFixed(1)).join(', '));
  assert(otif(r => r.y === 2025) - otif(r => r.y === 2023) > 0.01, 'la rete non si muove');
});
ok('nessun caso del corpus ha tassi piatti per dimensione o negli anni', () => {
  const male = [];
  casi().forEach(c => {
    const d = c.caso.data || (c.caso.build && c.caso.build());
    if (d) tassiPiatti(c.caso.spec, d).forEach(m => male.push(c.id + ': ' + m));
  });
  assert(!male.length, male.join('\n'));
});

console.log(`  ${n} ok`);
