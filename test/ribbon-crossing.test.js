#!/usr/bin/env node
/* Il ribbon deve mostrare i SORPASSI, non solo gli andamenti.
 *
 * Il criterio, senza ambiguita: se due entita si scambiano di posizione fra due periodi, i loro
 * nastri devono incrociarsi. Se non si incrociano mai, il visual sta impilando per valore ed e
 * un area chart travestito — e allora non serve a niente, perche il sorpasso E la storia.
 *
 * Il caso di prova non e osservato, e costruito: in engine/specs/banco/ribbon-sorpasso.js
 * "Nord" parte davanti e finisce dietro a "Sud". La risposta giusta e nota in partenza, quindi
 * il test puo fallire per il motivo giusto.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const caso = require('../engine/specs/banco/ribbon-sorpasso.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('ribbon: il sorpasso si vede');

const data = caso.build();
const dom = new JSDOM(render(caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document;

/* Le ancore del ribbon sono i rettangoli cliccabili su ogni periodo: portano data-f con
   l'entita, e la loro y dice a che altezza sta quell'entita in quel periodo. */
function ancore() {
  const per = {};
  [...doc.querySelectorAll('rect.hit[data-f^="area:"]')].forEach(r => {
    const id = r.getAttribute('data-f').split(':')[1];
    const x = Math.round(Number(r.getAttribute('x')));
    const y = Number(r.getAttribute('y'));
    (per[x] || (per[x] = {}))[id] = y;
  });
  return Object.keys(per).map(Number).sort((a, b) => a - b).map(x => per[x]);
}

const periodi = ancore();

ok('il ribbon disegna tutti i periodi con tutte le entita', () => {
  assert.ok(periodi.length >= 4, 'trovati ' + periodi.length + ' periodi, attesi almeno 4 trimestri');
  periodi.forEach((p, i) => assert.strictEqual(Object.keys(p).length, data.dims.area.length,
    'periodo ' + i + ': ' + Object.keys(p).length + ' entita invece di ' + data.dims.area.length));
});

/* Il dato costruito: Nord scende, Sud sale. Prima si verifica che il SORPASSO esista davvero
   nei numeri — se non ci fosse, il test del disegno non direbbe niente. */
ok('nel dato Nord e davanti a Sud nel primo periodo e dietro nell ultimo', () => {
  const somma = (id, mesi) => data.facts.rows
    .filter(r => r[data.facts.cols.indexOf('y')] === data.years[1] &&
      mesi.includes(r[data.facts.cols.indexOf('m')]) &&
      data.dims.area[r[data.facts.cols.indexOf('area')]].id === id)
    .reduce((a, r) => a + r[data.facts.cols.indexOf('rev')], 0);
  const q1 = [0, 1, 2], q4 = [9, 10, 11];
  assert.ok(somma('nord', q1) > somma('sud', q1), 'nel Q1 Nord dovrebbe stare davanti');
  assert.ok(somma('nord', q4) < somma('sud', q4), 'nel Q4 Sud dovrebbe aver sorpassato');
});

ok('le due entita che si sorpassano si scambiano di altezza', () => {
  const primo = periodi[0], ultimo = periodi[periodi.length - 1];
  const nordSopraPrima = primo.nord < primo.sud;      /* y minore = piu in alto = rango migliore */
  const nordSopraDopo = ultimo.nord < ultimo.sud;
  assert.ok(nordSopraPrima, 'nel primo periodo Nord deve stare sopra Sud nel disegno');
  assert.ok(!nordSopraDopo, 'nell ultimo periodo Sud deve stare sopra Nord: senza questo scambio ' +
    'il ribbon sta impilando per valore ed e un area chart travestito');
});

ok('i nastri di Nord e Sud si incrociano davvero', () => {
  /* Un incrocio c'e quando fra due periodi consecutivi il segno della differenza di altezza
     cambia: e la definizione geometrica del sorpasso. */
  let incroci = 0;
  for (let i = 1; i < periodi.length; i++) {
    const prima = periodi[i - 1].nord - periodi[i - 1].sud;
    const dopo = periodi[i].nord - periodi[i].sud;
    if (prima * dopo < 0) incroci++;
  }
  assert.ok(incroci >= 1, 'nessun incrocio fra Nord e Sud in ' + periodi.length +
    ' periodi: i nastri corrono paralleli, quindi il sorpasso non e visibile');
});

ok('ogni entita tiene lo stesso colore su tutti i periodi', () => {
  const perId = {};
  [...doc.querySelectorAll('rect.hit[data-f^="area:"]')].forEach(r => {
    const id = r.getAttribute('data-f').split(':')[1];
    const c = r.getAttribute('fill');
    if (!perId[id]) perId[id] = c;
    assert.strictEqual(perId[id], c, 'l entita "' + id + '" cambia colore fra un periodo e l altro: ' +
      'e proprio il colore costante che rende leggibile il sorpasso');
  });
});

dom.window.close();
console.log('  ' + n + ' checks');
