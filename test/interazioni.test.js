#!/usr/bin/env node
/* FILTRI CHE FILTRANO, CLIC CHE EVIDENZIANO; COLORI CHE NON SI SCONTRANO; IL BUDGET SI RICONOSCE.
 *
 * Bodan sul report CFO (4 ott 2026):
 *  1. "selecting a segment highlights the bars, while selecting an entity filters the chart… one
 *     behaviour would be cleaner" — ora vale la regola di Power BI: un filtro della barra filtra
 *     ogni visual; il clic dentro un grafico evidenzia quel grafico e filtra gli altri; un visual
 *     puo staccarsi da un filtro (`ignoreFilters`, Edit interactions → None);
 *  2. "2026 and Netherlands share the same color" — il periodo corrente ha il suo token (--cur),
 *     lontano da ogni colore dei membri e dal grigio dell'anno prima;
 *  3. "a different color for budget than for actual" — le colonne di budget hanno uno sfondo.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('interazioni (filtri, evidenziazioni, colori del tempo, colonne di budget)');

const c = casi().find(x => x.id === 'locale/cfo-bodan');
const apri = () => {
  const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document, win = dom.window;
  const clic = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  clic(doc.querySelector('.navbtn[data-page="revenue"]'));
  const card = re => [...doc.querySelectorAll('#page .card')].find(k => re.test(((k.querySelector('.ch h3') || {}).textContent || '')));
  return { doc, clic, card };
};
const barre = el => [...el.querySelectorAll('rect.barra')].length;
const righe = el => [...el.querySelectorAll('tbody tr.r')].length;

ok('un filtro della barra filtra anche il visual della sua dimensione', () => {
  const { doc, clic, card } = apri();
  assert.strictEqual(barre(card(/^Revenue by entity/)), 3);
  clic(doc.querySelector('#rail [data-f="ent:nl"]'));
  assert.strictEqual(barre(card(/^Revenue by entity/)), 1, 'la classifica per entita deve mostrare solo l entita scelta');
  assert.strictEqual(card(/^Revenue by entity/).querySelectorAll('.dimd').length, 0, 'filtrata, non evidenziata');
});

ok('il clic dentro un grafico evidenzia quel grafico e filtra gli altri', () => {
  const { clic, card } = apri();
  const mix = card(/^Product mix/), tab = card(/^Revenue by product line/);
  assert.strictEqual(righe(tab), 3);
  clic(mix.querySelector('[data-f="prod:svc"]'));
  const mix2 = card(/^Product mix/), tab2 = card(/^Revenue by product line/);
  assert(mix2.querySelectorAll('.dimd').length > 0, 'il grafico cliccato evidenzia');
  assert.strictEqual(mix2.querySelectorAll('rect.hit').length, mix.querySelectorAll('rect.hit').length, 'il grafico cliccato tiene tutti i membri');
  assert.strictEqual(righe(tab2), 1, 'la tabella per linea di prodotto, un altro visual, e filtrata');
});

ok('un visual staccato da un filtro tiene tutti i membri e non lo segue', () => {
  const { doc, clic, card } = apri();
  const prima = card(/^Product mix/).textContent;
  clic(doc.querySelector('[data-dd="seg"]'));
  clic(doc.querySelector('.ddp [data-f="seg:smb"]'));
  const mix = card(/^Product mix/);
  assert.strictEqual(mix.textContent, prima, 'il mix per segmento non deve cambiare col filtro del segmento');
  assert.strictEqual(mix.querySelectorAll('.dimd').length, 0);
  assert.notStrictEqual(card(/^Revenue by entity/).textContent.length, 0);
  assert(/Edit interactions → None/.test(require('../engine/powerbi.js').kit(c.caso.spec, c.caso.dataParams, c.caso.build())), 'il kit spiega come staccarlo in Power BI');
});

ok('il periodo corrente ha un colore suo, lontano dai membri e dall anno prima, in ogni mockup', () => {
  const rgb = h => { const m = /#([0-9a-f]{6})/i.exec(h || ''); if (!m) return null; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 441.7;
  const guasti = [];
  casi().forEach(k => {
    const h = renderCaso(k), root = (h.match(/:root\{[^}]*\}/) || [''])[0];
    const tok = t => rgb((root.match(new RegExp('--' + t + ':([^;}]+)')) || [])[1]);
    const cur = tok('cur'), pri = tok('prior');
    if (!cur) { guasti.push(k.id + ': manca --cur'); return; }
    [1, 2, 3, 4, 5, 6].forEach(i => { const ci = tok('c' + i); if (ci && dist(cur, ci) < 0.12) guasti.push(k.id + ': --cur troppo vicino a --c' + i); });
    if (pri && dist(cur, pri) < 0.25) guasti.push(k.id + ': --cur troppo vicino all anno prima');
  });
  assert.deepStrictEqual(guasti.slice(0, 8), [], guasti.slice(0, 8).join(String.fromCharCode(10)));
  const rt = require('fs').readFileSync(require('path').join(__dirname, '..', 'engine', 'runtime.js'), 'utf8');
  assert(/if \(v\.type === 'trend'\) return \[\{ l: '\{y\}', c: 'var\(--cur\)' \}/.test(rt) && /if \(v\.type === 'colline'\) return \[\{ l: '\{y\}', c: 'var\(--cur\)' \}/.test(rt), 'la legenda del trend e del colline usa --cur per l anno corrente');
});

ok('le colonne di budget hanno il loro sfondo, nella tabella e nel conto economico', () => {
  const { doc, clic } = apri();
  clic(doc.querySelector('.navbtn[data-page="exec"]'));
  const th = [...doc.querySelectorAll('#page th.bdg')];
  assert(th.length >= 2 && th.every(t => /budget/i.test(t.textContent)), 'le intestazioni Budget della tabella delle entita');
  clic(doc.querySelector('.navbtn[data-page="pnl"]'));
  assert(doc.querySelectorAll('#page .st th.bdg').length >= 2 && doc.querySelectorAll('#page .st td.bdg').length >= 12, 'la colonna Budget del conto economico');
  assert(/td\.bdg,th\.bdg\{background:var\(--bud\)\}/.test(doc.querySelector('style').textContent), 'lo sfondo del budget nel CSS');
});

console.log('  ' + n + ' checks');
