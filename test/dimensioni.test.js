#!/usr/bin/env node
/* TRE FILTRI VERI, LA CODA DELLA CLASSIFICA, IL DRILL CHE NON SI RIPETE.
 *
 * Tutto dal brief di Parsa (27 set 2026): quattro filtri chiesti — data, regione, categoria,
 * segmento — e un generatore che reggeva due dimensioni; i prodotti migliori E quelli che "may
 * need attention", e un hbar che sapeva solo i migliori; un drill che scriveva il nome della
 * categoria tre volte.
 *
 *  - facts.split come array di due: tre dimensioni nei fatti, ognuna muove le KPI, i totali
 *    tornano su ogni asse, e con UNA dimensione il dato e identico byte per byte a prima;
 *  - la crescita di un membro dello split inclina la sua quota fra gli anni;
 *  - attrFrom col nome di una dimensione legge i membri di quella;
 *  - hbar con order:"asc" mostra i peggiori, e order e rifiutato altrove;
 *  - drillHeader con {drill} e rifiutato.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const builder = require('../engine/data-builder.js');
const { render, validate } = require('../engine/render.js');
const { casi, renderCaso } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('dimensioni (tre filtri veri, coda della classifica, drill senza ripetizioni)');

const Q = require('../engine/templates/quadrants.js');
/* il template a quadranti (cliente x linea) con una terza dimensione: il canale */
function treDimensioni() {
  const dp = clona(Q.dataParams), spec = clona(Q.spec);
  dp.dims.canale = { members: [
    { id: 'dir', n: 'Diretto', base: 1, growth: 0.25, attrs: { sconto: 0.02 } },
    { id: 'dis', n: 'Distributori', base: 1, growth: -0.1, attrs: { sconto: 0.09 } }
  ] };
  dp.facts.split = [dp.facts.split, { dim: 'canale', shares: [0.6, 0.4] }];
  dp.facts.fields.push({ id: 'sconti', kind: 'share', of: 'ricavi', attr: 'sconto', attrFrom: 'canale', jitter: [1, 1] });
  spec.model.sums.push('sconti');
  spec.filters.dims.push({ id: 'canale', label: 'Canale', control: 'list', allLabel: 'Tutti', pill: 'Canale' });
  return { dp, spec };
}

ok('con due split i fatti hanno tre dimensioni, e i totali tornano su ognuna', () => {
  const { dp } = treDimensioni();
  const d = builder.build(dp);
  ['cliente', 'linea', 'canale'].forEach(k => assert.ok(d.facts.cols.indexOf(k) >= 0, 'manca la colonna ' + k));
  const ci = d.facts.cols.indexOf('ricavi'), yi = d.facts.cols.indexOf('y');
  d.years.forEach(y => {
    const righe = d.facts.rows.filter(r => r[yi] === y);
    const tot = righe.reduce((a, r) => a + r[ci], 0);
    ['cliente', 'linea', 'canale'].forEach(k => {
      const di = d.facts.cols.indexOf(k);
      const perMembro = d.dims[k].map((_, m) => righe.filter(r => r[di] === m).reduce((a, r) => a + r[ci], 0));
      assert.strictEqual(perMembro.reduce((a, x) => a + x, 0), tot, k + ': i membri non sommano al totale nel ' + y);
    });
  });
});

ok('con UNA dimensione di split il dato e identico, oggetto o array di uno', () => {
  casi().filter(c => c.caso.dataParams && c.caso.dataParams.facts && c.caso.dataParams.facts.split && !Array.isArray(c.caso.dataParams.facts.split))
    .forEach(c => {
      const dp = clona(c.caso.dataParams);
      dp.facts.split = [dp.facts.split];
      assert.strictEqual(JSON.stringify(builder.build(dp)), JSON.stringify(builder.build(clona(c.caso.dataParams))), c.id + ': il dato cambia');
    });
});

ok('la crescita di un membro dello split inclina la sua quota fra gli anni', () => {
  const { dp } = treDimensioni();
  const d = builder.build(dp);
  const ci = d.facts.cols.indexOf('ricavi'), yi = d.facts.cols.indexOf('y'), ki = d.facts.cols.indexOf('canale');
  const quota = y => { const r = d.facts.rows.filter(x => x[yi] === y); return r.filter(x => x[ki] === 0).reduce((a, x) => a + x[ci], 0) / r.reduce((a, x) => a + x[ci], 0); };
  assert.ok(quota(d.years[1]) > quota(d.years[0]) + 0.05, 'il canale diretto (+25%) doveva guadagnare quota: ' + quota(d.years[0]).toFixed(3) + ' → ' + quota(d.years[1]).toFixed(3));
});

ok('attrFrom col nome di una dimensione legge i suoi membri; un nome sbagliato e rifiutato', () => {
  const { dp } = treDimensioni();
  const d = builder.build(dp);
  const ci = d.facts.cols.indexOf('ricavi'), si = d.facts.cols.indexOf('sconti'), ki = d.facts.cols.indexOf('canale');
  const tasso = m => { const r = d.facts.rows.filter(x => x[ki] === m); return r.reduce((a, x) => a + x[si], 0) / r.reduce((a, x) => a + x[ci], 0); };
  assert.ok(Math.abs(tasso(0) - 0.02) < 0.003 && Math.abs(tasso(1) - 0.09) < 0.003, 'sconti per canale: ' + tasso(0) + ', ' + tasso(1));
  const rotto = clona(dp); rotto.facts.fields[rotto.facts.fields.length - 1].attrFrom = 'regione';
  assert.throws(() => builder.build(rotto), /attrFrom "regione" non e una dimensione dei fatti/);
});

ok('tre split o un grano oltre 120 celle sono rifiutati con un messaggio che dice cosa fare', () => {
  const { dp } = treDimensioni();
  const tre = clona(dp); tre.dims.x = { members: [{ id: 'a', n: 'A', base: 1 }, { id: 'b', n: 'B', base: 1 }] };
  tre.facts.split.push({ dim: 'x' });
  assert.throws(() => builder.build(tre), /al massimo due dimensioni/);
  const grande = clona(dp);
  grande.dims.canale.members = 'abcdefg'.split('').map(l => ({ id: l, n: l, base: 1, attrs: { sconto: 0.01 } }));
  grande.facts.split[1].shares = undefined;
  assert.throws(() => builder.build(grande), /sotto 120/);
});

ok('nel mockup ogni filtro delle tre dimensioni cambia il testo di una KPI', () => {
  const { dp, spec } = treDimensioni();
  const dom = new JSDOM(render(spec, builder.build(dp)), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document, win = dom.window;
  const kpi = () => [...doc.querySelectorAll('.kpi')].map(k => k.textContent).join('|');
  ['cliente', 'linea', 'canale'].forEach(dim => {
    const prima = kpi();
    const el = doc.querySelector('[data-f^="' + dim + ':"]:not([data-f="' + dim + ':"])');
    assert.ok(el, 'manca il controllo del filtro ' + dim);
    el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    assert.notStrictEqual(kpi(), prima, 'il filtro ' + dim + ' non muove le KPI');
    doc.getElementById('btnReset').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  });
});

const conHbar = () => casi().find(c => c.caso.spec.pages.some(p => p.rows.some(r => r.visuals.some(v => v.type === 'hbar' && !v.bind.detail))));

ok('hbar con order:"asc" mostra per primo il membro piu debole', () => {
  const c = conHbar();
  assert.ok(c, 'serve un caso con un hbar');
  const s = clona(c.caso.spec);
  let pi = 0, v;
  s.pages.forEach((p, i) => p.rows.forEach(r => r.visuals.forEach(x => { if (!v && x.type === 'hbar' && !x.bind.detail) { v = x; pi = i; } })));
  const etichette = spec => {
    const dom = new JSDOM(renderCaso(c, spec), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document;
    if (pi) doc.querySelector('.navbtn[data-page="' + spec.pages[pi].id + '"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const card = [...doc.querySelectorAll('#page .card')].find(k => ((k.querySelector('.ch h3') || {}).textContent || '').indexOf(v.title.replace(/\{.*$/, '').trim()) === 0);
    return [...card.querySelectorAll('svg text')].map(t => t.textContent).filter(t => /[A-Za-z]/.test(t));
  };
  const desc = etichette(s);
  v.bind.order = 'asc';
  const asc = etichette(s);
  assert.notStrictEqual(asc[0], desc[0], 'con order asc il primo membro deve cambiare (' + desc[0] + ')');
});

ok('order e rifiutato fuori dall\'hbar e con valori diversi da asc/desc', () => {
  const c = conHbar();
  const s = clona(c.caso.spec);
  const v = s.pages.flatMap(p => p.rows.flatMap(r => r.visuals)).find(x => x.type === 'hbar');
  v.bind.order = 'down';
  assert.throws(() => validate(s, c.caso.build()), /order "down" non ammesso/);
});

ok('drillHeader con {drill} e rifiutato: il nome lo scrive il motore', () => {
  const c = casi().find(x => x.caso.spec.drill);
  const s = clona(c.caso.spec);
  s.drill.page.drillHeader = '{drill} · {period}';
  assert.throws(() => validate(s, c.caso.build()), /drillHeader .* contiene \{drill\}/);
});

ok('l\'errore della barra dice di quanto sfora e quanto libera ogni via d\'uscita, e i conti tornano', () => {
  const c = casi().find(x => x.id === 'locale/retail-parsa');
  assert.ok(c, 'serve il caso di Parsa nel corpus');
  const s = clona(c.caso.spec), data = c.caso.build();
  s.skin.shell = 'rail-slim'; s.grid.contentWidth = 1116;
  s.filters.dims.forEach(d => { d.control = 'list'; });
  const errore = sp => { try { validate(sp, data); return null; } catch (e) { return e.message; } };
  const m1 = errore(s);
  assert.ok(m1 && /sfora di (\d+)px/.test(m1), 'deve dire di quanto sfora: ' + m1);
  assert.ok(/Costi: data \d+px/.test(m1), 'deve dire quanto costa ogni controllo');
  const over = +m1.match(/sfora di (\d+)px/)[1];
  const via = m1.match(/"(\w+)" a control:"dropdown" libera (\d+)px/);
  assert.ok(via, 'deve proporre la tendina col suo guadagno');
  s.filters.dims.find(d => d.id === via[1]).control = 'dropdown';
  const m2 = errore(s), libera = +via[2];
  if (libera >= over) assert.ok(!m2 || !/toolbar/.test(m2), 'il guadagno dichiarato bastava, e la barra sfora ancora: ' + m2);
  else assert.strictEqual(+(m2.match(/sfora di (\d+)px/) || [])[1], over - libera, 'il guadagno dichiarato non e quello vero');
});

ok('la misura secondaria di un hbar si legge su ogni barra, e resta dentro la card', () => {
  const c = casi().find(x => x.id === 'locale/retail-parsa');
  const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document;
  doc.querySelector('.navbtn[data-page="regions"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const card = [...doc.querySelectorAll('#page .card')].find(k => /products/i.test((k.querySelector('.ch h3') || {}).textContent || ''));
  const svg = card.querySelector('svg'), w = +svg.getAttribute('width');
  /* dal 3 ott 2026 (Luca) la misura secondaria sta sulla riga del nome, allineata a destra: ogni
     barra la mostra, e nessuna scritta esce dalla card (le cifre sono monospaziate: 0,62 em) */
  const righe = [...svg.querySelectorAll('g.hit')];
  assert.ok(righe.length >= 3 && righe.every(g => [...g.querySelectorAll('text.tnum')].some(t => /^[\d.,]+%\s*margin$/.test(t.textContent))),
    'il margine deve comparire su ogni barra: ' + righe.map(g => g.textContent).join(' | '));
  const largh = (s, px) => s.length * px * 0.62;
  [...svg.querySelectorAll('text.tnum')].forEach(t => {
    const x = +t.getAttribute('x'), l = largh(t.textContent, +t.getAttribute('font-size') || 9);
    const fine = t.getAttribute('text-anchor') === 'end' ? x : x + l;
    assert.ok(fine <= w + 1 && (t.getAttribute('text-anchor') === 'end' ? x - l : x) >= -1, 'la scritta esce dalla card: ' + t.textContent);
  });
  dom.window.close();
});

ok('nel funnel la percentuale di passaggio sta fuori dalla barra, su ogni funnel del corpus', () => {
  const { largh } = require('../engine/runtime.js');
  let visti = 0;
  casi().forEach(c => {
    const pagine = c.caso.spec.pages.filter(p => p.rows.some(r => r.visuals.some(v => (v.viste || [v]).some(x => x.type === 'funnel'))));
    if (!pagine.length) return;
    const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document;
    pagine.forEach(p => {
      const nav = doc.querySelector('.navbtn[data-page="' + p.id + '"]');
      if (nav) nav.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      const titoli = p.rows.flatMap(r => r.visuals.flatMap(v => v.viste || [v])).filter(x => x.type === 'funnel').map(x => String(x.title || '').replace(/\{.*$/, '').trim());
      [...doc.querySelectorAll('#page .card')].filter(k => titoli.some(t => t && ((k.querySelector('.ch h3') || {}).textContent || '').indexOf(t) === 0))
        .map(k => k.querySelector('svg')).filter(Boolean).forEach(svg => {
        const barre = [...svg.querySelectorAll('rect')].map(r => +r.getAttribute('x') + +r.getAttribute('width'));
        [...svg.querySelectorAll('text')].filter(t => /^\d+%$/.test(t.textContent.trim())).forEach(t => {
          visti++;
          const inizio = +t.getAttribute('x') - largh(t.textContent, 8.5);
          assert.ok(barre.every(fine => fine <= inizio + 1), c.id + ': la percentuale ' + t.textContent + ' cade sopra una barra');
        });
      });
    });
    dom.window.close();
  });
  assert.ok(visti >= 2, 'nessun funnel misurato');
});

console.log('  ' + n + ' checks');
