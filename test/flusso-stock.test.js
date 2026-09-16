#!/usr/bin/env node
/* UN FLUSSO DIVISO UNO STOCK: il numero sbagliato dodici volte, reso inesprimibile.
 *
 * Nato dal secondo giro sul mockup dell'app di lingue: "Paid conversion 68,9%" dove il vero era
 * il 6,3%. Gli abbonati erano sommati su dodici mesi, il MAU era la misura `last` di dicembre —
 * e la misura `last` aveva lo stesso id del campo sommato, quindi il rapporto la leggeva al
 * posto del campo senza che nessuno l'avesse chiesto. Mockup valido, riconciliato, falso.
 *
 * Il gate vive in engine/render.js (validate). Qui si prova che:
 *   1. la combinazione e rifiutata, col nome della misura e la via d'uscita nel messaggio;
 *   2. la forma corretta — due somme, e lo stock con un id suo — passa;
 *   3. due stock insieme (DAU/MAU di fine periodo) restano leciti.
 */
const assert = require('assert');
const { render } = require('../engine/render.js');
const caso = require('../engine/specs/banco/delta-margine.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('flusso contro stock (il rapporto sbagliato dodici volte)');

const dati = caso.build();
const campo = caso.spec.model.sums[0];          /* un campo sommato vero del caso */
const altro = caso.spec.model.sums[1];

const conMisure = misure => {
  const s = clona(caso.spec);
  s.model.measures = s.model.measures.concat(misure);
  return s;
};
const rifiuto = s => { try { render(s, dati); return null; } catch (e) { return e.message; } };

ok('una misura last che oscura il campo, sotto una somma, e rifiutata', () => {
  /* rimuove la misura con lo stesso id del campo, se c'e, per poterla ridichiarare last */
  const s = conMisure([]);
  s.model.measures = s.model.measures.filter(m => m.id !== campo);
  s.model.measures.push({ id: campo, label: 'Stock', agg: 'last', field: campo, unit: 'count', format: 'N' });
  s.model.measures.push({ id: 'rapportoSbagliato', label: 'X', agg: 'ratio', num: altro, den: campo, unit: 'pct', format: 'pc' });
  s.kpiBand = s.kpiBand.map(k => k.measure === campo ? Object.assign({}, k, { measure: 'rapportoSbagliato' }) : k);
  const msg = rifiuto(s);
  assert.ok(msg && /mixes a point-in-time value/.test(msg), 'doveva essere rifiutata:\n' + msg);
  assert.ok(/rapportoSbagliato/.test(msg) && /Last/.test(msg), 'il messaggio deve dire quale misura e come uscirne');
});

ok('la forma corretta passa: due somme, e lo stock con un id suo', () => {
  const s = conMisure([
    { id: campo + 'Last', label: 'Stock', agg: 'last', field: campo, unit: 'count', format: 'N' },
    { id: 'rapportoGiusto', label: 'Y', agg: 'ratio', num: altro, den: campo, unit: 'pct', format: 'pc' }
  ]);
  assert.strictEqual(rifiuto(s), null);
});

ok('due stock insieme restano leciti', () => {
  const s = conMisure([
    { id: 'aLast', label: 'A', agg: 'last', field: campo, unit: 'count', format: 'N' },
    { id: 'bLast', label: 'B', agg: 'last', field: altro, unit: 'count', format: 'N' },
    { id: 'rapportoStock', label: 'Z', agg: 'ratio', num: 'bLast', den: 'aLast', unit: 'pct', format: 'pc' }
  ]);
  assert.strictEqual(rifiuto(s), null);
});

console.log('  ' + n + ' checks');
