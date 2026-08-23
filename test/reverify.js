#!/usr/bin/env node
/* Ri-renderizza un mockup dell'eval col motore ATTUALE e confronta lo STESSO valore fra
 * visual diversi.
 *
 *   node test/reverify.js eval-out/sonnet-2/social-run1.html
 *
 * Serve perché il difetto non era nelle fixture: l'harness girava solo sui quattro file
 * scritti da noi, che passano sempre. I dieci output veri non li guardava nessuno.
 */
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const { firstBalancedObject } = require('../lib/json-object.js');

const file = process.argv[2];
if (!file) { console.error('Uso: node test/reverify.js <file.html>'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');

/** SPEC e DATA sono due literal JSON dentro lo script finale. */
function grab(name) {
  const at = src.indexOf('var ' + name + '=');
  if (at < 0) throw new Error(name + ' non trovato');
  const obj = firstBalancedObject(src.slice(at));
  if (!obj) throw new Error(name + ' non bilanciato');
  return JSON.parse(obj);
}

const spec = grab('SPEC'), data = grab('DATA');
const dom = new JSDOM(render(spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document;
const t = e => ((e && e.textContent) || '').replace(/\s+/g, ' ').trim();

console.log('\n' + file + '  (ri-renderizzato col motore attuale)');
console.log('─'.repeat(74));

console.log('BANDA KPI');
[...doc.querySelectorAll('.kpi')].forEach(c =>
  console.log('   ' + t(c.querySelector('.k')).padEnd(24) + t(c.querySelector('.v'))));

console.log('\nVALORI DENTRO I VISUAL (etichette del grafico)');
[...doc.querySelectorAll('.card')].forEach(c => {
  if (c.classList.contains('kpi')) return;
  const svg = c.querySelector('svg');
  if (!svg) return;
  const labels = [...svg.querySelectorAll('text')].map(t).filter(Boolean);
  if (labels.length && labels.length <= 16) {
    console.log('   ' + (t(c.querySelector('.ttl')) || '(?)').slice(0, 44).padEnd(46) + labels.join('  '));
  }
});

console.log('\nMATRICE');
const tb = doc.querySelector('table');
if (tb) [...tb.querySelectorAll('tr')].slice(0, 8).forEach(r => console.log('   ' + [...r.children].map(t).join(' | ')));

dom.window.close();
