#!/usr/bin/env node
/* GLI STILI DEL FLUSSO GUIDATO, DISEGNATI (fase B; skill/references/flusso.md, "How the styles are
 * drawn").
 *
 *  1. un report che non dichiara stili esce come prima: nessuna classe, regola o codice degli stili;
 *  2. l'accento di ogni palette: mai rosso, testo chiaro sopra a 4,5:1, inchiostro sulle velature a 4,5:1;
 *  3. ogni stile di card su ogni template: accettato dove la misura lo regge, la pagina passa il motore
 *     e la riga porta la sua classe con la sua regola;
 *  4. il disegno di ogni stile: il glifo del Badge, le dodici colonne, l'area, la pila, l'anello;
 *  5. le card con grafico dicono il vero: la colonna piu alta e il mese piu alto dei dati, l'anello
 *     e la quota scritta nella card;
 *  6. le quattro intestazioni dei pannelli, e il sottotitolo che si spegne;
 *  7. il kit Power BI dice stile e intestazione di ogni pagina, con l'hex dell'accento;
 *  8. i template hanno un nome inglese per l'interfaccia.
 * L'altezza in un Chrome vero (nessuno stile alza la card o l'intestazione, nessuna pagina sfora)
 * sta in test/barra.test.js, che ha gia il browser.
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const A = require('../engine/azioni.js');
const P = require('../engine/progetto.js');
const C = require('../engine/compila.js');
const ST = require('../engine/stili.js');
const SKIN = require('../engine/skin.js');
const PB = require('../engine/powerbi.js');
const { render } = require('../engine/render.js');
const PR = require('../engine/specs/progetti/index.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('stili delle card e dei pannelli, disegnati (flusso guidato, fase B)');

/* apre il report in jsdom sulla pagina chiesta */
function apri(html, pagina) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  if (pagina) { const b = dom.window.document.querySelector('.navbtn[data-page="' + pagina + '"]'); if (b) b.click(); }
  return dom.window.document;
}
const progetto = (id, azioni) => {
  let s = A.storia(PR[id]);
  (azioni || []).forEach(a => { const r = A.mutateSpec(s, a); assert.ok(r.ok, JSON.stringify(a) + ': ' + r.errori.join('; ')); s = r.storia; });
  return s.presente;
};
const html = p => { const { spec, data } = C.compila(p); return render(spec, data); };

ok('un report che non dichiara stili esce come prima: nessuna classe, regola o codice degli stili', () => {
  const casi = require('./corpus.js').casi().slice(0, 6);
  casi.forEach(({ id, caso }) => {
    const h = render(caso.spec, caso.build(caso.dataParams));
    const css = h.slice(h.indexOf('<style>'), h.indexOf('</style>'));
    assert.ok(!/\.ks-|\.ph-|\.kb2|\.kg\{|\.kr\{/.test(css), id + ': il foglio porta regole degli stili');
    assert.ok(!/M\.kpiGraf ?= ?function/.test(h), id + ': viaggia il codice dei grafici delle card');
  });
});

/* tinta in gradi, saturazione 0..1 */
function tinta(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: d / (1 - Math.abs(mx + mn - 1)) };
}
ok('l\'accento di ogni palette: mai rosso, testo chiaro sopra a 4,5:1, inchiostro sulle velature a 4,5:1', () => {
  const guasti = [];
  Object.keys(SKIN.FAMIGLIE).forEach(id => {
    const t = SKIN.palette(id);
    const { h, s } = tinta(t.acc);
    if (s > 0.35 && (h < 20 || h > 340)) guasti.push(id + ': accento rosso ' + t.acc);
    if (t.acc === t.bad || t.acc === t.alert) guasti.push(id + ': accento uguale al colore del problema');
    if (SKIN.contrasto(t.accInk, t.acc) < 4.5) guasti.push(id + ': testo chiaro sull\'accento ' + SKIN.contrasto(t.accInk, t.acc).toFixed(2));
    if (SKIN.contrasto(t.ink, t.wash) < 4.5) guasti.push(id + ': inchiostro sul Wash ' + SKIN.contrasto(t.ink, t.wash).toFixed(2));
    if (SKIN.contrasto(t.ink, t.bandBg) < 4.5) guasti.push(id + ': inchiostro sulla Band ' + SKIN.contrasto(t.ink, t.bandBg).toFixed(2));
    if (SKIN.contrasto(t.muted, t.wash) < 3) guasti.push(id + ': etichetta grigia sul Wash ' + SKIN.contrasto(t.muted, t.wash).toFixed(2));
  });
  assert.deepStrictEqual(guasti, []);
});

/* ogni stile va sulla pagina del corpus che lo regge: Ring sulle quote, gli altri sulle somme */
const PAGINA = { ring: 'p1' };
ok('ogni stile di card e ogni template, a rotazione: accettato dove la misura lo regge, la pagina passa, la riga ha la sua regola', () => {
  /* undici coppie: ogni stile almeno una volta, ogni template almeno una volta (il prodotto intero
     costava tredici secondi, mezzo tetto della suite) */
  const T = P.templates(), coppie = Math.max(T.length, ST.CARD.length);
  for (let i = 0; i < coppie; i++) {
    const t = T[i % T.length], c = ST.CARD[i % ST.CARD.length], pg = PAGINA[c.id] || 'p2';
    const h = html(progetto('retail-stili', [{ tipo: 'scegliTemplate', valore: t.id }, { tipo: 'setCardStyle', pagina: pg, valore: c.id }]));
    if (c.id !== 'plain') assert.ok(h.indexOf('.ks-' + c.id) >= 0 || (c.gruppo === 'chart' && h.indexOf('.kg{') >= 0), t.id + '/' + c.id + ': manca la regola dello stile');
  }
  /* ogni template accetta il progetto: la barra dei filtri ci sta anche sulla rail stretta */
  T.forEach(t => assert.ok(A.mutateSpec(A.storia(PR['retail-stili']), { tipo: 'scegliTemplate', valore: t.id }).ok, t.id + ': template rifiutato'));
  /* e dove la misura non lo regge, lo stile si rifiuta col motivo */
  const r = A.mutateSpec(A.storia(PR['retail-stili']), { tipo: 'setCardStyle', pagina: 'p2', valore: 'ring' });
  assert.ok(!r.ok && /needs a share/.test(r.errori[0]), r.errori.join('; '));
});

ok('il disegno di ogni stile: il glifo del Badge, le dodici colonne, l\'area, la pila, l\'anello', () => {
  const conta = (st, pg, sel) => {
    const d = apri(html(progetto('retail-stili', [{ tipo: 'setCardStyle', pagina: pg, valore: st }])), pg);
    const riga = d.querySelector('.row.ks-' + st);
    assert.ok(riga, st + ': la riga KPI non porta la classe ks-' + st);
    return [...riga.querySelectorAll('.kpi')].map(k => k.querySelectorAll(sel).length);
  };
  conta('badge', 'p2', '.kb2 svg path').forEach(x => assert.strictEqual(x, 1, 'Badge: un glifo per card'));
  conta('columns', 'p2', '.kg svg rect').forEach(x => assert.strictEqual(x, 12, 'Columns: dodici colonne, una per mese'));
  conta('area', 'p2', '.kg svg path').forEach(x => assert.strictEqual(x, 2, 'Area: l\'area e la sua linea'));
  conta('stack', 'p2', '.kg svg rect').forEach(x => assert.strictEqual(x, 48, 'Stack: tre membri e il resto, per dodici mesi'));
  conta('ring', 'p1', '.kr svg circle').forEach(x => assert.strictEqual(x, 2, 'Ring: il binario e la quota'));
  /* le card con grafico non hanno la riga di dettaglio al posto della striscia; Ring la tiene */
  const d = apri(html(progetto('retail-stili')), 'p1');
  assert.ok(d.querySelectorAll('.row.ks-ring .kpi .det').length === 3);
});

ok('le card con grafico dicono il vero: la colonna piu alta e il mese piu alto, l\'anello e la quota della card', () => {
  const p = progetto('retail-stili', [{ tipo: 'setCardStyle', pagina: 'p2', valore: 'columns' }]);
  const { spec, data } = C.compila(p);
  const d = apri(render(spec, data), 'p2');
  const y = spec.filters.date.default.y || data.years[data.years.length - 1];
  const col = data.facts.cols, iy = col.indexOf('y'), im = col.indexOf('m'), ir = col.indexOf('rev');
  const mesi = new Array(12).fill(0);
  data.facts.rows.forEach(r => { if (r[iy] === y) mesi[r[im]] += r[ir]; });
  const atteso = mesi.indexOf(Math.max(...mesi));
  const card = [...d.querySelectorAll('.row.ks-columns .kpi')].find(k => /revenue/i.test(k.querySelector('.k').textContent));
  const alt = [...card.querySelectorAll('.kg rect')].map(r => +r.getAttribute('height'));
  assert.strictEqual(alt.indexOf(Math.max(...alt)), atteso, 'la colonna piu alta non e il mese piu alto dei dati');
  /* l'anello: la quota disegnata e il valore scritto nella card */
  const dr = apri(html(progetto('retail-stili')), 'p1');
  [...dr.querySelectorAll('.row.ks-ring .kpi')].forEach(k => {
    const v = parseFloat(k.querySelector('.v').textContent.replace(',', '.')) / 100;
    const c = k.querySelectorAll('.kr circle')[1].getAttribute('stroke-dasharray').split(' ').map(Number);
    assert.ok(Math.abs(c[0] / c[1] - Math.min(1, v)) < 0.01, k.querySelector('.k').textContent + ': anello ' + (c[0] / c[1]).toFixed(3) + ' contro ' + v);
  });
});

ok('le quattro intestazioni dei pannelli, e il sottotitolo che si spegne', () => {
  ST.HEADER.forEach(hd => {
    const h = html(progetto('retail-stili', [{ tipo: 'setPanelHeader', pagina: 'p2', valore: hd.id }]));
    assert.ok(h.indexOf('.ph-' + hd.id + '>.card>.ch') >= 0, hd.id + ': manca la regola');
    const d = apri(h, 'p2');
    assert.ok(d.querySelectorAll('.row.ph-' + hd.id + '>.card>.ch').length >= 2, hd.id + ': i pannelli non portano la classe');
  });
  const d = apri(html(progetto('retail-stili')), 'p2');
  assert.strictEqual(d.querySelectorAll('.row.ph-band .ch .hs').length, 0, 'sottotitolo "no": i pannelli hanno solo il titolo');
});

ok('il kit Power BI dice stile e intestazione di ogni pagina, con l\'hex dell\'accento', () => {
  const p = progetto('retail-stili');
  const { spec, data } = C.compila(p);
  const k = PB.kit(spec, {}, data);
  ['ring', 'stack', 'area'].forEach(s => assert.ok(k.indexOf('Card style: **' + s + '**') >= 0, 'il kit non dice lo stile ' + s));
  ['tab', 'band', 'quiet'].forEach(h => assert.ok(k.indexOf('Panel header: **' + h + '**') >= 0, 'il kit non dice l\'intestazione ' + h));
  assert.ok(k.indexOf('accent colour: ' + SKIN.palette(spec.skin.palette).acc) >= 0, 'manca l\'hex dell\'accento');
});

ok('i template hanno un nome inglese per l\'interfaccia', () => {
  P.templates().forEach(t => {
    assert.ok(t.name && /^[A-Z][A-Za-z ]+$/.test(t.name), t.id + ': nome "' + t.name + '"');
    assert.notStrictEqual(t.name, t.nome, t.id + ': il nome inglese e quello italiano coincidono');
  });
});

console.log('  ' + n + ' checks');
