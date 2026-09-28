/* Un caso dell'harness: lo esegue il runner (dentro un gruppo, o da riga di comando da solo).
   Restituisce il blocco di testo del caso e il riepilogo per la tabella finale. */
'use strict';
const fs = require('fs');
const path = require('path');

function eseguiCaso(id) {
  const { runCase } = require('./harness.js');
  const fixtures = require('../engine/specs/index.js');
  const evals = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'skill', 'evals', 'evals.json'), 'utf8'));
  const c = evals.cases.find(x => x.id === id);
  const fx = fixtures[id];
  if (!c || !fx) return { testo: `\n  ${id}: NO FIXTURE\n`, riepilogo: { id, checks: 0, fail: 1, states: 0, kb: 0 } };
  const R = runCase(c.id, fx, c);
  const righe = [`\n  ${c.id}  (${(R.bytes / 1024).toFixed(1)}KB, ${R.lines} lines, ${R.states} states)`];
  R.checks.forEach(ch => righe.push(`    ${ch.pass ? 'ok  ' : 'FAIL'} ${ch.label}${ch.detail ? '  [' + ch.detail + ']' : ''}`));
  (R.advisories || []).forEach(a => righe.push(`    note  ${a}`));
  return { testo: righe.join('\n') + '\n', riepilogo: { id: c.id, checks: R.checks.length, fail: R.fail, states: R.states, kb: +(R.bytes / 1024).toFixed(1) } };
}

module.exports = { eseguiCaso };

if (require.main === module) {
  const r = eseguiCaso(process.argv[2]);
  process.stdout.write(r.testo);
  process.exit(r.riepilogo.fail ? 1 : 0);
}
