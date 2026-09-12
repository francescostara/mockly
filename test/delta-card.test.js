#!/usr/bin/env node
/* La delta-card: il numero grande e LA VARIAZIONE, mai il livello.
 *
 * Perche serve un test e non basta guardarla: la differenza fra le due cose e invisibile
 * finche i numeri sono plausibili. Una card che scrive "€21,0M" grande e "+14,2%" piccolo
 * sembra identica a una che fa il contrario, e risponde a un'altra domanda. Il difetto si
 * vede solo confrontando cio che e stampato con cio che la banda KPI calcola.
 *
 * Le tre cose provate qui:
 *   1. il protagonista e la variazione, e il livello sta nella riga di dettaglio;
 *   2. una percentuale varia in PUNTI — dire che un margine dal 35,9% al 32,3% e sceso
 *      "del 10%" e vero e si legge come un crollo del fatturato;
 *   3. senza un periodo precedente confrontabile la card lo dice invece di stampare +0,0%.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render, validate } = require('../engine/render.js');
const caso = require('../engine/specs/banco/delta-margine.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('delta-card (la variazione come protagonista)');

const data = caso.build();
const dom = new JSDOM(render(caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
const d = dom.window.document;
const txt = e => ((e && e.textContent) || '').replace(/\s+/g, ' ').trim();

const carte = [...d.querySelectorAll('.card')].filter(c => c.querySelector('.dcv')).map(c => ({
  titolo: txt(c.querySelector('.ch h3')),
  hero: txt(c.querySelector('.dcv')),
  verso: c.querySelector('.dcv').className,
  det: txt(c.querySelector('.dcd')),
  svg: c.querySelector('svg')
}));
const kpi = {};
[...d.querySelectorAll('.kpi')].forEach(c => { kpi[txt(c.querySelector('.k'))] = txt(c.querySelector('.v')); });

ok('la card scrive la variazione, non il livello', () => {
  const ric = carte.filter(c => c.titolo === 'Ricavi')[0];
  assert.ok(ric, 'la delta-card dei ricavi deve esistere');
  assert.match(ric.hero, /^[+−]\d/, 'il numero grande deve essere firmato: e una variazione');
  assert.notStrictEqual(ric.hero, kpi['Ricavi'],
    'il numero grande non puo essere il livello — quello e il lavoro della banda KPI');
  assert.ok(ric.det.includes(kpi['Ricavi']),
    'il livello non sparisce: sta nella riga di dettaglio, come contesto');
});

ok('la riga di dettaglio nomina i due periodi e porta la variazione assoluta', () => {
  const ric = carte.filter(c => c.titolo === 'Ricavi')[0];
  const anno = data.years[data.years.length - 1];   /* l'ultimo, non il secondo */
  assert.ok(ric.det.includes(String(anno)) && ric.det.includes(String(anno - 1)),
    'i due periodi vanno nominati: "+14,2%" senza sapere fra cosa e cosa non e un dato');
  assert.match(ric.det, /[+−]€/, 'la variazione assoluta e meta dell\'informazione');
});

ok('una percentuale varia in punti, non in percentuale di se stessa', () => {
  const mar = carte.filter(c => c.titolo === 'Margine lordo %')[0];
  assert.match(mar.hero, /pp$/, 'il margine deve variare in punti percentuali: ' + mar.hero);
  /* e la banda KPI deve dire la stessa cosa: la card e la banda non possono contraddirsi */
  const badge = txt([...d.querySelectorAll('.kpi')]
    .filter(c => txt(c.querySelector('.k')) === 'Margine lordo %')[0].querySelector('.d'));
  assert.match(badge, /pp/, 'anche la banda KPI: ' + badge);
});

ok('la storia si legge dal colore: ricavi su, margine giu, nello stesso periodo', () => {
  const ric = carte.filter(c => c.titolo === 'Ricavi')[0];
  const mar = carte.filter(c => c.titolo === 'Margine lordo %')[0];
  assert.match(ric.verso, /\bup\b/, 'i ricavi crescono');
  assert.match(mar.verso, /\bdn\b/, 'il margine si comprime');
});

ok('l\'area in fondo porta la traiettoria dei due anni, non un ornamento', () => {
  const ric = carte.filter(c => c.titolo === 'Ricavi')[0];
  const dpath = ric.svg.querySelector('path').getAttribute('d');
  const punti = (dpath.match(/L/g) || []).length + 1;
  assert.ok(punti >= 24, 'ventiquattro mesi almeno, uno per punto: ' + punti);
  const ys = [...dpath.matchAll(/,(\d+\.?\d*)/g)].map(m => +m[1]);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 4, 'una linea piatta significa misura letta male');
});

dom.window.close();

/* ---- la grammatica ---- */

ok('la delta-card con una dimensione e rifiutata', () => {
  const s = clona(caso.spec);
  s.pages[0].rows[0].visuals[0].bind.dim = 'bu';
  assert.throws(() => validate(s, data), err => {
    assert.match(err.message, /variazione di UNA misura/i);
    assert.match(err.message, /kind:"var"|hbar/i, 'e deve dire dove sta la risposta giusta');
    return true;
  });
});

ok('la delta-card oltre due colonne e rifiutata', () => {
  const s = clona(caso.spec);
  s.pages[0].rows[0].visuals[0].span = 3;
  s.pages[0].rows[0].visuals[2].span = 1;
  assert.throws(() => validate(s, data), /E' una card, non un grafico/i);
});

ok('la delta-card troppo bassa perde la traiettoria ed e rifiutata', () => {
  const s = clona(caso.spec);
  s.pages[0].rows[0].visuals[0].h = 84;
  assert.throws(() => validate(s, data), /si schiaccia/i);
});

console.log('  ' + n + ' checks');
