#!/usr/bin/env node
/* I DATI FORNITI (Fra, 20 ott 2026: "immaginiamo come se lui ci avesse fornito i dati… potremmo
 * partire anche da una base di dati"). Nicola: "per un tema economico chi guarda si aspetta i numeri
 * veri", "sono dati annuali, il dettaglio per mese non ha senso", "la trasformazione strutturale si
 * vede bene solo partendo dal 1970".
 *
 * Gate:
 *  - una tabella annuale caricata e disegnata: le card sono i numeri della tabella, niente mesi;
 *  - oltre i dodici anni del generatore (1970-2023);
 *  - cio che manca resta mancante: un rapporto senza base scrive "—";
 *  - un membro sconosciuto, un numero che non e un numero, un anno sbagliato: rifiutati;
 *  - un visual staccato dal periodo (ignoreFilters "date") tiene tutti gli anni.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const DF = require('../engine/dati-forniti.js');
const { render } = require('../engine/render.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('dati forniti (una tabella vera al posto del generatore)');

/* due paesi, 1970-2023, PIL e popolazione; la quota della manifattura solo dal 1991 */
const righe = [];
for (let y = 1970; y <= 2023; y++) {
  [['aa', 100, 1.02], ['bb', 60, 1.035]].forEach(([p, b, g]) => {
    const pil = Math.round(b * Math.pow(g, y - 1970) * 1000) / 1000;
    righe.push({ anno: y, paese: p, pil: pil, pop: p === 'aa' ? 10 : 8, man: y >= 1991 ? Math.round(pil * 0.2 * 1000) / 1000 : '', base: y >= 1991 ? pil : '' });
  });
}
const cfg = {
  righe, anno: 'anno',
  dimensioni: [{ id: 'paese', colonna: 'paese', membri: [{ id: 'aa', n: 'Paese A' }, { id: 'bb', n: 'Paese B' }] }],
  campi: ['pil', 'pop', 'man', 'base']
};
const spec = {
  meta: { title: 'Prova dati forniti', locale: 'it-IT', currency: '$', watermark: 'Dati forniti · prova', source: 'Fonte: tabella di prova' },
  aesthetic: 'corporate-sober', archetype: 'scorecard',
  grid: { contentWidth: 1044, gutter: 12, columns: 2 },
  model: { sums: ['pil', 'pop', 'man', 'base'], measures: [
    { id: 'pil', label: 'PIL', agg: 'sum', field: 'pil', unit: 'money', format: 'eurF' },
    { id: 'pc', label: 'PIL pro capite', agg: 'ratio', num: 'pil', den: 'pop', unit: 'money', format: 'eurF' },
    { id: 'qm', label: 'Quota manifattura', agg: 'ratio', num: 'man', den: 'base', unit: 'pct', format: 'pc' }] },
  filters: { date: { levels: ['year'], default: { y: 2023 } }, dims: [{ id: 'paese', label: 'Paese', control: 'list', allLabel: 'Tutti', pill: 'Paese' }] },
  kpiBand: [{ id: 'k1', label: 'PIL', measure: 'pil', span: 1 }, { id: 'k2', label: 'Quota manifattura', measure: 'qm', span: 1 }],
  pages: [{ id: 'p', title: 'Prova', rows: [
    { visuals: [{ type: 'trend', span: 1, h: 160, title: 'PIL pro capite', bind: { measure: 'pc', grain: 'year' } },
                { type: 'hbar', span: 1, h: 160, title: 'PIL, tutti gli anni', bind: { dim: 'paese', measure: 'pil', ignoreFilters: ['date'], share: false } }] },
    { flex: true, visuals: [{ type: 'matrix', span: 2, title: 'Paesi', bind: { dim: 'paese', label: 'Paese', sort: 'pil', drill: false, columns: [{ measure: 'pil', label: 'PIL' }, { measure: 'qm', label: 'Quota manifattura' }] } }] }] }]
};

const data = DF.carica(cfg);
const apri = (s) => {
  const dom = new JSDOM(render(s || spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  return dom;
};
const num = t => parseFloat(String(t).replace(/[^\d,.\-−]/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-'));

ok('la tabella annuale diventa il data del motore: 54 anni contigui, nessun mese', () => {
  assert.strictEqual(data.years.length, 54);
  assert.strictEqual(data.years[0], 1970);
  assert.deepStrictEqual(data.mensili, []);
  assert.ok(data.facts.rows.every(r => r[1] === 0), 'ogni riga e un anno intero');
});

ok('le card sono i numeri della tabella, e il report non offre trimestri ne mesi', () => {
  const dom = apri(), doc = dom.window.document;
  const pil2023 = righe.filter(r => r.anno === 2023).reduce((a, r) => a + r.pil, 0);
  const v = num(doc.querySelector('.kpi .v').textContent);
  assert.ok(Math.abs(v - pil2023) / pil2023 < 0.02, 'PIL 2023: ' + v + ' contro ' + pil2023);
  assert.ok(!doc.querySelector('#slQtr [data-q]') || doc.querySelector('#slQtr').offsetParent === null || [...doc.querySelectorAll('.slchip[data-q], .slchip[data-m]')].length === 0,
    'niente trimestri e mesi per dati annuali');
  dom.window.close();
});

ok('il trend annuale ha un punto per ogni anno, 1970-2023', () => {
  const dom = apri(), doc = dom.window.document;
  const card = [...doc.querySelectorAll('#page .card')].find(k => /PIL pro capite/.test(k.textContent));
  assert.strictEqual(card.querySelectorAll('circle.hit').length, 54);
  dom.window.close();
});

ok('cio che manca resta mancante: la quota della manifattura prima del 1991 e "—"', () => {
  const s = JSON.parse(JSON.stringify(spec)); s.filters.date.default = { y: 1980 };
  const dom = apri(s), doc = dom.window.document;
  const card = [...doc.querySelectorAll('.kpi')].find(k => /manifattura/i.test(k.textContent));
  assert.ok(/—/.test(card.querySelector('.v').textContent), 'la quota del 1980 deve essere "—": ' + card.querySelector('.v').textContent);
  dom.window.close();
});

ok('un visual staccato dal periodo (ignoreFilters "date") tiene tutti gli anni', () => {
  const dom = apri(), doc = dom.window.document;
  const card = [...doc.querySelectorAll('#page .card')].find(k => /tutti gli anni/.test(k.textContent));
  const tot = righe.filter(r => r.paese === 'aa').reduce((a, r) => a + r.pil, 0);
  const tip = [...card.querySelectorAll('[data-tip]')].map(e => e.getAttribute('data-tip')).find(t => /Paese A/.test(t));
  const v = num(tip.split('<br>')[1]);
  assert.ok(Math.abs(v - tot) / tot < 0.02, 'il PIL di Paese A su tutti gli anni: ' + v + ' contro ' + tot);
  dom.window.close();
});

ok('i rifiuti: membro sconosciuto, numero che non e un numero, anno sbagliato', () => {
  const con = mod => Object.assign({}, cfg, { righe: righe.slice(0, 4).map((r, i) => i ? r : Object.assign({}, r, mod)) });
  assert.throws(() => DF.carica(con({ paese: 'zz' })), /non e un membro di "paese"/);
  assert.throws(() => DF.carica(con({ pil: 'tanto' })), /non e un numero/);
  assert.throws(() => DF.carica(con({ anno: 'ieri' })), /non e un anno/);
});

ok('il CSV si legge come le righe (virgola o punto e virgola, virgolette)', () => {
  const csv = 'anno;paese;pil;pop;man;base\n2022;aa;"1,5";10;;\n2023;bb;2;8;0,4;2\n';
  const d = DF.carica(Object.assign({}, cfg, { righe: undefined, csv }));
  assert.deepStrictEqual(d.years, [2022, 2023]);
  assert.strictEqual(d.facts.rows.find(r => r[0] === 2022)[3], 1.5);
});

ok('il kit dei dati forniti dice di importare il CSV, non di generare dati sintetici, ed e annuale', () => {
  const P = require('../engine/powerbi.js');
  const k = P.kit(spec, null, Object.assign({}, data, { fonte: 'tabella di prova' }));
  const md = typeof k === 'string' ? k : k.md;
  assert.ok(/i dati forniti/.test(md), 'manca la sezione dei dati forniti');
  assert.ok(!/undefined|sintetico ma plausibile|da generare/.test(md), 'il kit parla di generare dati o scrive undefined');
  assert.ok(/grano annuale/.test(md) && /un anno per/.test(md), 'il kit non dice che i dati sono annuali');
  assert.ok(/DATE \( 1970, 1, 1 \)/.test(md), 'il calendario parte dal primo anno dei dati');
});

ok('lo scatter non disegna un paese senza il dato: niente punti sullo zero', () => {
  const s = JSON.parse(JSON.stringify(spec));
  s.pages[0].rows[0].visuals[1] = { type: 'scatter', span: 1, h: 160, title: 'Manifattura contro PIL', bind: { dim: 'paese', x: 'pil', y: 'qm' } };
  s.filters.date.default = { y: 1980 };
  const dom = apri(s), doc = dom.window.document;
  const card = [...doc.querySelectorAll('#page .card')].find(k => /Manifattura contro PIL/.test(k.textContent));
  assert.strictEqual(card.querySelectorAll('circle.hit').length, 0, 'nel 1980 la quota non c e: nessun punto');
  dom.window.close();
});

console.log('  ' + n + ' checks');
