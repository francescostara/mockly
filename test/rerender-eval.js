#!/usr/bin/env node
/* Ri-renderizza le spec generate davvero (quelle votate a mano) con il motore corrente.
 *
 *   node test/rerender-eval.js [cartella]     default: eval-out/sonnet
 *
 * Gli HTML in eval-out/ portano dentro di se SPEC e DATA: si estraggono e si ridanno a
 * render(). Cosi una correzione del motore si verifica sui casi reali — non solo sulle
 * fixture scritte a mano — senza chiamare il modello e senza spendere nulla.
 *
 * Output in eval-out/<cartella>-rerender/.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');

const src = process.argv[2] || path.join('eval-out', 'sonnet');
const out = src.replace(/[\\/]+$/, '') + '-rerender';

/** SPEC e DATA sono due literal JSON dentro lo <script> finale del file. */
function extract(html) {
  const grab = name => {
    const at = html.indexOf('var ' + name + '=');
    if (at < 0) throw new Error(name + ' non trovato');
    const from = html.indexOf('{', at);
    let depth = 0, inStr = false, esc = false;
    for (let i = from; i < html.length; i++) {
      const c = html[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return JSON.parse(html.slice(from, i + 1)); }
    }
    throw new Error(name + ': oggetto non chiuso');
  };
  return { spec: grab('SPEC'), data: grab('DATA') };
}

/** Le stesse cose che una persona guarda aprendo il file. */
function inspect(html) {
  const cmp = /th,td{padding:2px 6px}/.test(html);   /* modalita compatta del motore */
  const ROW = cmp ? 20 : 26, HEAD = cmp ? 20 : 26;
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const d = dom.window.document;
  const qa = s => [...d.querySelectorAll(s)];
  const texts = qa('#page .ch h3, #page .ch .hs, #page .ch .hr, #page .lgd, #hTtl, #hSub').map(e => e.textContent);
  const rows = qa('#page > .row');

  /* altezza dichiarata: chrome della card + altezza del grafico, riga per riga */
  const rowHeights = rows.map(r => Math.max(...[...r.children].map(c => {
    const svg = c.querySelector('svg');
    const table = c.querySelector('table');
    const chrome = c.querySelector('.ch') ? 34 : 0;
    if (svg) return chrome + Number(svg.getAttribute('height') || 0);
    if (table) return chrome + HEAD + (table.querySelectorAll('tr').length - 1) * ROW + 12;
    return chrome + Number(c.style.height ? parseFloat(c.style.height) : 90);
  })));

  const res = {
    placeholders: texts.filter(t => /\{[a-zA-Z]+\}/.test(t)),
    rows: rows.length,
    rowHeights,
    kpiDetail: qa('#page .kpi .det').map(e => e.textContent)[0] || '',
    legendItems: qa('#page .lgd span').length,
    bad: /NaN|undefined|Infinity/.test(d.querySelector('#page').innerHTML)
  };
  dom.window.close();
  return res;
}

/* altezza utile della pagina: 720 meno header/toolbar, padding e gutter */
function pageBudget(spec, dense) {
  const shell = 58 + (spec.aesthetic === 'corporate-sober' ? 0 : 46 + 40);
  const rows = spec.pages[0].rows.length + 1;               /* +1 = banda KPI */
  const gutter = dense ? 8 : spec.grid.gutter;
  return 720 - shell - (dense ? 20 : 28) - gutter * (rows - 1);
}

if (!fs.existsSync(src)) {
  console.error('cartella non trovata: ' + src);
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

const files = fs.readdirSync(src).filter(f => f.endsWith('.html'));
let overflow = 0, withPlaceholders = 0;

console.log('ri-rendering di ' + files.length + ' spec reali con il motore corrente');
console.log('');

for (const f of files) {
  const html = fs.readFileSync(path.join(src, f), 'utf8');
  let spec, data;
  try { ({ spec, data } = extract(html)); }
  catch (err) { console.log('  ' + f.padEnd(22) + ' SPEC non estraibile (' + err.message + ')'); continue; }

  const fresh = render(spec, data);
  fs.writeFileSync(path.join(out, f), fresh);

  const before = inspect(html);
  const after = inspect(fresh);
  const dense = /#page{padding:10px 16px/.test(fresh);   /* il motore ha stretto la pagina */
  const budget = pageBudget(spec, dense);
  const usedAfter = after.rowHeights.reduce((a, b) => a + b, 0);
  const over = usedAfter - budget;

  if (over > 0) overflow++;
  if (after.placeholders.length) withPlaceholders++;

  console.log('  ' + f.replace('.html', '').padEnd(20) +
    ' segnaposto ' + String(before.placeholders.length) + '->' + after.placeholders.length +
    '  altezza ' + usedAfter + '/' + budget + 'px' + (over > 0 ? '  SFORA di ' + over + 'px' : '  ok') +
    (after.bad ? '  VALORI ROTTI' : ''));
}

console.log('');
console.log('  file con segnaposto residui : ' + withPlaceholders + '/' + files.length);
console.log('  file che sforano in altezza : ' + overflow + '/' + files.length);
console.log('');
console.log('  output: ' + out + '/');
