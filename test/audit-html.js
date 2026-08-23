#!/usr/bin/env node
/* Ispeziona un mockup GIA generato: numeri renderizzati, geometria, allineamenti.
 *
 *   node test/audit-html.js eval-out/sonnet-2/ecommerce-run2.html
 *
 * Serve a rispondere a "cosa vede davvero chi apre il file", senza spendere niente. Legge i
 * valori DOPO che il runtime ha girato, non dal sorgente: le KPI sono calcolate a runtime, e
 * un numero sbagliato non si vede guardando l'HTML statico.
 */
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');

const file = process.argv[2];
if (!file) { console.error('Uso: node test/audit-html.js <file.html>'); process.exit(1); }

const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true });
const { document } = dom.window;

const txt = el => ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();

console.log('\n' + file);
console.log('─'.repeat(72));

/* ---- banda KPI ---- */
const kpis = [...document.querySelectorAll('.kpi')].map(c => ({
  label: txt(c.querySelector('.k')),
  value: txt(c.querySelector('.v')),
  det: txt(c.querySelector('.det'))
}));
console.log('BANDA KPI');
kpis.forEach(k => console.log('   ' + k.label.padEnd(24) + k.value.padEnd(14) + k.det));

/* ---- visual dichiarati ---- */
console.log('\nVISUAL');
[...document.querySelectorAll('.card')].forEach(c => {
  if (c.classList.contains('kpi')) return;
  const t = txt(c.querySelector('.ch h3')) || '(senza titolo)';
  const svg = c.querySelector('svg');
  console.log('   ' + t.slice(0, 58).padEnd(60) + (svg ? 'svg' : 'no-svg'));
});

/* ---- matrice: la riga dei totali e quella che si controlla a mano ---- */
const tables = [...document.querySelectorAll('table')];
if (tables.length) {
  console.log('\nMATRICE (prime righe + totale)');
  const t = tables[0];
  const head = [...t.querySelectorAll('thead th')].map(th => txt(th));
  console.log('   ' + head.join(' | '));
  [...t.querySelectorAll('tbody tr')].slice(0, 8).forEach(tr => {
    console.log('   ' + [...tr.children].map(td => txt(td)).join(' | '));
  });
}

/* ---- composizioni: segmenti tutti uguali = distribuzione finta ---- */
console.log('\nCOMPOSIZIONI (stack100 / donut)');
[...document.querySelectorAll('svg')].forEach(svg => {
  const card = svg.closest('.card');
  const title = card ? txt(card.querySelector('.ch h3')) : '';
  const rects = [...svg.querySelectorAll('rect')].filter(r => Number(r.getAttribute('width')) > 0);
  if (rects.length >= 3 && rects.length <= 40) {
    const w = rects.map(r => Math.round(Number(r.getAttribute('width'))));
    const uniq = [...new Set(w)];
    if (uniq.length === 1 && w.length >= 3) {
      console.log('   SEGMENTI TUTTI UGUALI  ' + title.slice(0, 44) + '  (' + w.length + ' x ' + uniq[0] + 'px)');
    }
  }
});

/* ---- geometria: niente deve uscire dal canvas ---- */
console.log('\nGEOMETRIA');
const H = 720;
const over = [];
[...document.querySelectorAll('.card')].forEach(c => {
  /* jsdom non fa layout: si usano gli attributi di stile dichiarati, che e cio che il motore
     ha deciso. Basta a vedere se la somma delle altezze sfonda il canvas. */
  const h = c.style.height || (c.querySelector('svg') ? c.querySelector('svg').getAttribute('height') : '');
  if (h) over.push(Number(String(h).replace('px', '')));
});
console.log('   altezze dichiarate dei visual: ' + over.join(', '));
console.log('   somma: ' + over.reduce((a, b) => a + b, 0) + 'px (canvas ' + H + 'px, al netto di shell e banda)');

dom.window.close();
