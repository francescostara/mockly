#!/usr/bin/env node
/* LA GRAMMATICA DICE TUTTO CIO CHE IL MOTORE ACCETTA — o il modello non puo saperlo.
 *
 * Il modello legge la grammatica (engine/spec.d.ts, dentro il prompt) e nient'altro. Il motore
 * pretendeva `motivo` su ogni card a piu viste, e la grammatica non lo nominava: il primo
 * tentativo del giro di Parsa (27 set 2026) e stato rifiutato per un campo che il modello non
 * poteva conoscere, e l'ha scoperto solo dall'errore. Lo stesso per `only`, `seasonality` e
 * `brand` sui membri: nel corpus da settimane, assenti dai tipi.
 *
 * Il gate e generale: ogni nome di campo che compare in una spec o nei dataParams del corpus —
 * cioe tutto cio che il motore accetta davvero — deve essere dichiarato in spec.d.ts. Un campo
 * nuovo nel motore senza dichiarazione fa fallire questo test al primo caso che lo usa.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { casi } = require('./corpus.js');
const VISTE = require('../engine/viste.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('grammatica (dichiara ogni campo che il motore accetta)');

const DTS = fs.readFileSync(path.join(__dirname, '..', 'engine', 'spec.d.ts'), 'utf8');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* dichiarato come proprieta (`nome:` / `nome?:`) o come chiave letterale di un Record ('nome') */
const dichiarato = k => new RegExp('\\b' + esc(k) + '\\??:').test(DTS) || DTS.indexOf("'" + k + "'") >= 0;

/* Contenitori le cui CHIAVI sono dati dell'autore, non nomi della grammatica: gli id delle
   dimensioni, i genitori del dettaglio, gli attributi liberi, i moltiplicatori per campo. */
const mappa = (percorso, dp) => (dp && percorso === '.dims') || /\.detail\.members$/.test(percorso) ||
  /\.(attrs|mult|targets)$/.test(percorso);

function nomi(o, percorso, dp, out) {
  if (Array.isArray(o)) { o.forEach(x => nomi(x, percorso, dp, out)); return out; }
  if (!o || typeof o !== 'object') return out;
  Object.keys(o).forEach(k => {
    if (!mappa(percorso, dp)) (out[k] = out[k] || new Set()).add((percorso + '.' + k).replace(/^\./, ''));
    nomi(o[k], percorso + '.' + k, dp, out);
  });
  return out;
}

ok('ogni campo usato da una spec o dai dataParams del corpus e dichiarato in spec.d.ts', () => {
  const usati = {};
  casi().forEach(c => { nomi(c.caso.spec, '', false, usati); nomi(c.caso.dataParams || {}, '', true, usati); });
  const mancanti = Object.keys(usati).filter(k => !dichiarato(k)).map(k => k + '  (' + [...usati[k]].slice(0, 2).join(', ') + ')');
  assert.deepStrictEqual(mancanti, [], 'campi accettati dal motore ma assenti dalla grammatica:\n       ' + mancanti.join('\n       '));
});

ok('la grammatica nomina ogni motivo che il motore ammette per le card a piu viste', () => {
  const motivi = Object.keys(VISTE.MOTIVI || {});
  assert.ok(motivi.length >= 3, 'engine/viste.js deve esportare MOTIVI');
  motivi.forEach(m => assert.ok(DTS.indexOf("'" + m + "'") >= 0, 'motivo "' + m + '" assente da spec.d.ts'));
  assert.ok(/\bmotivo:/.test(DTS), '"motivo" deve essere obbligatorio (senza ?) come nel motore');
});

ok('il prompt del modello contiene la grammatica aggiornata', () => {
  const prompt = fs.readFileSync(path.join(__dirname, '..', 'lib', 'prompt.ts'), 'utf8');
  assert.ok(/engine\/spec\.d\.ts/.test(prompt), 'lib/prompt.ts deve leggere engine/spec.d.ts');
});

console.log('  ' + n + ' checks');
