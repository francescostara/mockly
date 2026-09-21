#!/usr/bin/env node
/* UN CONTEGGIO SOTTILE DEVE TENERE IL SUO TASSO.
 *
 * Ogni campo del generatore e un intero. Arrotondare ogni cella per conto suo e innocuo sulle
 * celle grandi e falso su quelle piccole: 3 nuovi utenti per una retention del 16% fanno 0,48,
 * che arrotondato e zero, e un anno di celle cosi porta un 16% dichiarato a un 10% a schermo.
 * Trovato sul segmento russo dell'app di lingue, dove lo scambio 1:1 usciva meno efficace delle
 * voice room — una storia che nessuno aveva scritto, prodotta dall'arrotondamento.
 *
 * Il caso qui sotto e costruito apposta piccolo: una catena di quote (nuovi → chi trova un
 * partner → chi resta a 30 giorni) su un membro con poche centinaia di utenti al mese.
 */
'use strict';
const assert = require('assert');
const builder = require('../engine/data-builder.js');
const MK = require('../engine/runtime.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('conteggi sottili (il tasso dichiarato sopravvive all arrotondamento)');

const J = [0.97, 1.03];
const dp = {
  seed: 4242, years: [2024, 2025],
  dims: {
    lingua: { members: [
      { id: 'grande', n: 'Grande', base: 60000, growth: 0.1, attrs: { nuovi: 0.2, partner: 0.07, resta: 0.16 } },
      { id: 'piccola', n: 'Piccola', base: 1800, growth: -0.1, attrs: { nuovi: 0.18, partner: 0.034, resta: 0.16 } }
    ] },
    cat: { members: [{ id: 'a', n: 'A', base: 1 }, { id: 'b', n: 'B', base: 1 }, { id: 'c', n: 'C', base: 1 }] }
  },
  facts: {
    dim: 'lingua', split: { dim: 'cat', shares: [0.4, 0.35, 0.25] },
    fields: [
      { id: 'mau', kind: 'seasonal', jitter: J },
      { id: 'nuovi', kind: 'share', of: 'mau', attr: 'nuovi', jitter: J },
      { id: 'conPartner', kind: 'share', of: 'nuovi', attr: 'partner', jitter: J },
      { id: 'restati', kind: 'share', of: 'conPartner', attr: 'resta', jitter: J }
    ]
  }
};

const d = builder.build(dp);
const F = MK.materialize(d.facts, d.dims);
const somma = (f, l, y) => F.filter(r => r.lingua === l && r.y === y).reduce((a, r) => a + r[f], 0);

ok('il caso di prova e davvero sottile: poche unita per cella', () => {
  const celle = F.filter(r => r.lingua === 'piccola' && r.y === 2025).map(r => r.conPartner);
  const media = celle.reduce((a, b) => a + b, 0) / celle.length;
  assert.ok(media < 5, 'la cella media deve avere meno di 5 unita, ne ha ' + media.toFixed(1) + ': il caso non prova niente');
});

ok('su un segmento sottile il tasso annuale resta quello dichiarato', () => {
  [2024, 2025].forEach(y => {
    const t = somma('restati', 'piccola', y) / somma('conPartner', 'piccola', y);
    assert.ok(Math.abs(t - 0.16) < 0.02, y + ': dichiarato 16%, a schermo ' + (t * 100).toFixed(1) +
      '% — l arrotondamento cella per cella ha riscritto la storia');
  });
});

ok('sul segmento grande non cambia niente di sostanziale', () => {
  const t = somma('restati', 'grande', 2025) / somma('conPartner', 'grande', 2025);
  assert.ok(Math.abs(t - 0.16) < 0.01, 'dichiarato 16%, a schermo ' + (t * 100).toFixed(1) + '%');
});

console.log('  ' + n + ' checks');
