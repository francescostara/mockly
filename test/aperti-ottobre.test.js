#!/usr/bin/env node
/* I DIFETTI APERTI DI OTTOBRE, CHIUSI (Fra, 21 ott 2026, Q&A sui report di Teigor e Mauricio).
 *
 *  - "Target 85 85": l'etichetta del target si scrive una volta sola;
 *  - un conto economico senza budget non disegna le colonne Budget e Var vuote;
 *  - le durate in secondi si leggono come le direbbe una persona (42 s, 2:07 min, 1 h 05);
 *  - la guida spiega ogni misura con una descrizione, non solo le card della banda.
 * Le barre che riempiono la card si misurano in Chrome (test/barra.test.js).
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');
const { render, validate } = require('../engine/render.js');
const SCHEDA = require('../engine/scheda.js');
const MK = require('../engine/runtime.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('difetti aperti di ottobre (target, budget, durate, guida)');
const clona = o => JSON.parse(JSON.stringify(o));
const testi = html => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document, out = [];
  const pagine = [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page);
  (pagine.length ? pagine : [null]).forEach(p => {
    if (p) doc.querySelector('.navbtn[data-page="' + p + '"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    out.push(doc.getElementById('page').innerHTML);
  });
  dom.window.close();
  return out.join('\n');
};
const caso = id => casi().find(x => x.id === id);

ok('il target si scrive una volta: "Target 92%" resta cosi, "Target" diventa "Target 92,0%"', () => {
  const c = caso('locale/supply-chain-muttahar'), data = c.caso.build();
  const conLabel = (lab) => {
    const s = clona(c.caso.spec);
    JSON.stringify(s, (k, v) => { if (v && v.type === 'colline' && v.bind && v.bind.target !== undefined) v.bind.targetLabel = lab; return v; });
    return testi(render(s, data));
  };
  const a = conLabel('Target 92%');
  assert.ok(/Target 92%</.test(a), 'l etichetta col numero si scrive com e');
  assert.ok(!/Target 92% 9/.test(a), 'il valore non si riaggiunge: ' + (a.match(/Target 92%[^<]{0,12}/) || [''])[0]);
  const b = conLabel('Target');
  assert.ok(/Target 92[.,]0%/.test(b), 'senza numero il motore aggiunge il valore');
});

ok('un conto economico senza budget non ha colonne Budget e Var', () => {
  const c = caso('locale/cfo-bodan'), data = c.caso.build();
  const s = clona(c.caso.spec);
  let st = null;
  JSON.stringify(s, (k, v) => { if (v && v.type === 'statement') st = v; return v; });
  assert.ok(st, 'il caso ha un conto economico');
  st.bind.lines.forEach(l => { delete l.budget; });
  const h = testi(render(s, data));
  const tab = h.slice(h.indexOf('class="mx st"'));
  const intest = tab.slice(0, tab.indexOf('</thead>'));
  assert.ok(!/>Budget</.test(intest) && !/>Var</.test(intest), 'senza budget niente colonne Budget e Var: ' + intest.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 120));
  assert.ok(!/<td class="tnum bdg"><\/td>/.test(tab), 'nessuna cella di budget vuota');
  const conB = testi(render(c.caso.spec, data));
  assert.ok(/>Budget</.test(conB), 'con il budget le colonne restano');
});

ok('le durate: 42 s, 2:07 min, 1 h 05; unit "seconds" con format "dur" e ammessa', () => {
  const f = MK.fmt({ locale: 'it-IT' });
  assert.strictEqual(f.dur(42), '42 s');
  assert.strictEqual(f.dur(127), '2:07 min');
  assert.strictEqual(f.dur(3900), '1 h 05');
  const c = caso('locale/supply-chain-muttahar'), s = clona(c.caso.spec);
  s.model.measures.push({ id: 'tempo', label: 'Secondi per ordine', agg: 'ratio', num: 'freight', den: 'orders', unit: 'seconds', format: 'dur' });
  assert.doesNotThrow(() => validate(s, c.caso.build()));
  s.model.measures[s.model.measures.length - 1].format = 'N';
  assert.throws(() => validate(s, c.caso.build()), /unit "seconds" e format "N"/);
});

ok('la guida spiega anche le misure dei visual che hanno una descrizione, pagina per pagina', () => {
  const c = caso('locale/pagamenti-luca'), s = clona(c.caso.spec);
  const band = new Set(s.kpiBand.map(k => k.measure));
  let usata = null;
  JSON.stringify(s.pages, (k, v) => { if (!usata && k === 'measure' && typeof v === 'string' && !band.has(v)) usata = v; return v; });
  assert.ok(usata, 'serve una misura usata in un visual e non nella banda');
  const m = s.model.measures.find(x => x.id === usata);
  m.description = 'Una misura di prova spiegata nella guida';
  const t = SCHEDA.testo(s, c.caso.build());
  assert.ok(/## The other measures in the report/.test(t), 'manca la sezione delle altre misure');
  assert.ok(t.indexOf('Una misura di prova spiegata nella guida') >= 0, 'la descrizione della misura non e nella guida');
});

ok('ogni pila al 100% scrive quote che fanno 100, su ogni pagina di ogni mockup', () => {
  const guasti = []; let pile = 0;
  casi().forEach(c => {
    const dom = new JSDOM(renderCaso(c), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document;
    const pagine = [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page);
    (pagine.length ? pagine : [null]).forEach(p => {
      if (p) doc.querySelector('.navbtn[data-page="' + p + '"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      doc.querySelectorAll('#page svg.s100').forEach(svg => {
        const righe = {};
        svg.querySelectorAll('rect.hit[data-f]').forEach(r => { const y = r.getAttribute('y'); (righe[y] = righe[y] || []).push(r); });
        Object.values(righe).forEach(rs => {
          const testi = rs.map(r => r.nextElementSibling && r.nextElementSibling.tagName === 'text' && /^\d+%$/.test(r.nextElementSibling.textContent.trim()) ? parseInt(r.nextElementSibling.textContent, 10) : null);
          if (testi.some(t => t === null)) return;    /* una parte troppo stretta per la sua quota: niente da sommare */
          pile++;
          const t = testi.reduce((a, b) => a + b, 0);
          if (t !== 100) guasti.push(c.id + ' · ' + (p || '') + ': una pila somma ' + t + '%');
        });
      });
    });
    dom.window.close();
  });
  assert.ok(pile >= 5, 'solo ' + pile + ' pile complete');
  assert.deepStrictEqual(guasti, []);
});

console.log('  ' + n + ' checks');
