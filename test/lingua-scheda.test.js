#!/usr/bin/env node
/* LA SCHEDA DI INTERAZIONE PARLA LA LINGUA DEL REPORT, tutta.
 *
 * Nata dal primo feedback di un tester esterno su un report in inglese: la scheda "How to use
 * this mockup" diceva "click una riga", "click un punto". I nomi delle cose da cliccare vivevano
 * in una tabella sola, in italiano, e finivano dentro le frasi inglesi. Nessun test se ne
 * accorgeva perche i test del repo giravano quasi tutti su report italiani.
 *
 * Qui ogni mockup del repo viene riletto in inglese, e la scheda non deve contenere una parola
 * italiana fra quelle che la compongono.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SCHEDA = require('../engine/scheda.js');
const builder = require('../engine/data-builder.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('la scheda di interazione nella lingua del report');

const casi = [];
const da = mappa => Object.keys(mappa).filter(k => k[0] !== '_').forEach(k => casi.push([k, mappa[k]]));
da(require('../engine/templates/index.js'));
da(require('../engine/specs/banco/index.js'));
const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js').forEach(f => casi.push([f, require(path.join(dir, f))]));

const ITALIANO = /\b(una|uno|un) (riga|punto|cella|barra|fetta|nastro|segmento|colonna)\b|\bclicca\b|\btasto destro\b|\bper filtrare\b/i;

ok('in un report inglese la scheda non contiene parole italiane', () => {
  let visti = 0;
  casi.filter(([, c]) => c.spec && c.dataParams).forEach(([id, c]) => {
    const spec = clona(c.spec);
    spec.meta.locale = 'en-US';
    const t = SCHEDA.testo(spec, builder.build(c.dataParams));
    const m = t.match(ITALIANO);
    assert.ok(!m, id + ': parola italiana nella scheda inglese — "' + (m ? t.slice(Math.max(0, m.index - 30), m.index + 30) : '') + '"');
    visti++;
  });
  assert.ok(visti >= 10, 'solo ' + visti + ' casi riletti');
});

ok('ogni cosa cliccabile ha il suo nome in inglese', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'engine', 'scheda.js'), 'utf8');
  const blocco = (src.match(/cliccabili: \{([\s\S]*?)\}/) || [])[1] || '';
  Object.keys(SCHEDA.CLICCABILI).forEach(tipo => assert.ok(new RegExp('\\b' + tipo + ':').test(blocco),
    'il visual "' + tipo + '" e cliccabile ma non ha un nome inglese: finirebbe in italiano nella scheda'));
});

console.log('  ' + n + ' checks · ' + casi.length + ' mockup');
