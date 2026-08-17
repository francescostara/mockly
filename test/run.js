/* Run the whole gate: unit tests, then the headless harness over every brief in
 * skill/evals/evals.json. Exit code 1 if anything fails. */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { runCase } = require('./harness.js');
const fixtures = require('../engine/specs/index.js');

const root = path.join(__dirname, '..');
const evals = JSON.parse(fs.readFileSync(path.join(root, 'skill', 'evals', 'evals.json'), 'utf8'));

let failed = 0;
['runtime.smoke.js', 'data-model.test.js', 'canonical-equivalence.test.js'].forEach(f => {
  try {
    process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' }));
  } catch (err) {
    failed++;
    process.stdout.write((err.stdout || '') + (err.stderr || ''));
  }
});

console.log('\nevals harness');
const summary = [];
evals.cases.forEach(c => {
  const fx = fixtures[c.id];
  if (!fx) { failed++; console.log(`\n  ${c.id}: NO FIXTURE`); return; }
  const R = runCase(c.id, fx, c);
  failed += R.fail;
  console.log(`\n  ${c.id}  (${(R.bytes / 1024).toFixed(1)}KB, ${R.lines} lines, ${R.states} states)`);
  R.checks.forEach(ch => console.log(`    ${ch.pass ? 'ok  ' : 'FAIL'} ${ch.label}${ch.detail ? '  [' + ch.detail + ']' : ''}`));
  (R.advisories || []).forEach(a => console.log(`    note  ${a}`));
  summary.push({ id: c.id, checks: R.checks.length, fail: R.fail, states: R.states, kb: +(R.bytes / 1024).toFixed(1) });
});

console.log('\nsummary');
summary.forEach(s => console.log(`  ${s.fail ? 'FAIL' : 'PASS'}  ${s.id.padEnd(20)} ${String(s.checks).padStart(3)} checks  ${String(s.states).padStart(4)} states  ${s.kb}KB`));
console.log(failed ? `\n${failed} FAILURES` : '\nall gates green');
process.exit(failed ? 1 : 0);
