#!/usr/bin/env node
/* IL PERIODO PRECEDENTE E GRIGIO — in ogni grafico, in ogni palette.
 *
 * Nel mockup di Parsa (27 set 2026) le colonne del 2024 nel colline erano verdi: il colline
 * disegnava l'anno prima nel quinto colore della scala, e nel navy-corporate il quinto e un verde
 * pieno. Accanto al 2025 in ocra, il 2024 si leggeva come "l'anno buono". Nel trend lo stesso
 * anno era una linea grigia tratteggiata: due grafici, due significati per la stessa cosa.
 *
 * Il termine di paragone non e un dato e non prende un colore dei dati. Gate:
 *  - il token --prior esiste in tutte le famiglie, e neutro (saturazione bassa), visibile sul
 *    fondo della card, diverso da ogni colore della scala;
 *  - il colline, il trend e la legenda automatica disegnano l'anno prima con --prior e con
 *    nessun --c1..--c6.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SKIN = require('../engine/skin.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('periodo precedente (grigio neutro in ogni grafico e palette)');

const rgb = h => { const x = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255); };
const sat = h => { const c = rgb(h), mx = Math.max(...c), mn = Math.min(...c), l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };

ok('--prior in tutte le famiglie: neutro, visibile sulla card, diverso dalla scala dei dati', () => {
  const guasti = [];
  Object.keys(SKIN.FAMIGLIE).forEach(id => {
    const t = SKIN.palette(id);
    if (!t.prior) { guasti.push(id + ': manca --prior'); return; }
    if (sat(t.prior) > 0.15) guasti.push(id + ': --prior ' + t.prior + ' ha saturazione ' + sat(t.prior).toFixed(2) + ' (non e un grigio)');
    if (SKIN.contrasto(t.prior, t.card) < 1.6) guasti.push(id + ': --prior ' + t.prior + ' quasi invisibile sulla card (' + SKIN.contrasto(t.prior, t.card).toFixed(2) + ':1)');
    for (let k = 1; k <= 6; k++) if (String(t['c' + k]).toLowerCase() === String(t.prior).toLowerCase()) guasti.push(id + ': --prior uguale a --c' + k);
  });
  assert.deepStrictEqual(guasti, [], guasti.join('\n       '));
});

const RT = fs.readFileSync(path.join(__dirname, '..', 'engine', 'runtime.js'), 'utf8');
const regione = nome => { const a = RT.indexOf('/*#region chart:' + nome + '*/'); return RT.slice(a, RT.indexOf('/*#endregion*/', a)); };

ok('colline, trend e legenda automatica disegnano l\'anno prima con --prior, mai con un colore dei dati', () => {
  const col = regione('colline');
  assert.ok(/fill="var\(--prior\)"[^\n]*annoLabel\(S\.y - nAmp/.test(col), 'le colonne dell\'anno prima nel colline devono usare var(--prior)');
  assert.ok(!/var\(--c[1-6]\)"[^\n]*annoLabel\(S\.y - nAmp/.test(col), 'le colonne dell\'anno prima nel colline usano un colore dei dati');
  const tr = regione('trend');
  assert.ok(/pb \+ '" fill="none" stroke="var\(--prior\)"/.test(tr), 'la linea dell\'anno prima nel trend deve usare var(--prior)');
  const lg = RT.slice(RT.indexOf('A.legendaAuto = function'), RT.indexOf('A.legend = '));
  assert.ok(/colline'\) return \[[^\]]*\{ l: '\{py\}', c: 'var\(--prior\)' \}/.test(lg), 'la legenda del colline deve dire --prior per l\'anno prima');
  const css = fs.readFileSync(path.join(__dirname, '..', 'engine', 'render.js'), 'utf8');
  assert.ok(/\.lgd \.ln\{[^}]*dashed var\(--prior\)/.test(css), 'il tratteggio della legenda deve usare var(--prior)');
});

console.log('  ' + n + ' checks');
