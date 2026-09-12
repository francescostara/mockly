#!/usr/bin/env node
/* LA DOTTRINA DEL BOOKMARK, messa alla prova.
 *
 * Il bookmark e la funzione piu facile da abusare che il motore abbia: risolve "servirebbe un
 * altro grafico e non c'e posto" nascondendo qualcosa, e nascondere e gratis per chi compone e
 * caro per chi legge. Senza un gate, in tre giri ogni pagina avrebbe due card a linguette e il
 * report sarebbe diventato un'interfaccia da esplorare.
 *
 * Quindi qui si prova che il motore RIFIUTA gli usi che non stanno in piedi, non che li
 * sconsiglia: un consiglio in un file di log non ha mai fermato nessuno.
 *   1. un bookmark senza motivo dichiarato non renderizza;
 *   2. un motivo inventato non renderizza;
 *   3. due viste che non parlano della stessa cosa vanno dichiarate per quello che sono;
 *   4. tre viste sull'apertura sono un menu, non un report;
 *   5. tre card a linguette nella stessa pagina sono una caccia al tesoro;
 *   6. il consiglio arriva quando serve: due lenti sulla stessa dimensione sprecano un riquadro.
 */
const assert = require('assert');
const { render, lint } = require('../engine/render.js');
const VISTE = require('../engine/viste.js');
const caso = require('../engine/specs/locale/scuola-online.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('la dottrina del bookmark (una card a piu viste deve dire perche)');

const dati = caso.build();
/* il contenitore vero, quello approvato in revisione: si parte da li e lo si guasta */
const buona = clona(caso.spec);
const contenitore = spec => VISTE.contenitori(spec)[0].v;

const rifiuta = (spec, atteso, perche) => {
  let msg = null;
  try { render(spec, dati); } catch (e) { msg = e.message; }
  assert.ok(msg, 'doveva essere rifiutata: ' + perche);
  assert.ok(atteso.test(msg), 'motivo del rifiuto inatteso:\n' + msg);
};

ok('il caso approvato in revisione passa', () => {
  render(buona, dati);
  assert.strictEqual(VISTE.valida(buona).length, 0);
});

ok('un bookmark senza motivo non renderizza', () => {
  const s = clona(buona);
  delete contenitore(s).motivo;
  rifiuta(s, /deve dichiarare "motivo"/, 'nasconde meta del contenuto senza dire perche');
});

ok('un motivo inventato non renderizza', () => {
  const s = clona(buona);
  contenitore(s).motivo = 'perche-ci-stava';
  rifiuta(s, /motivo "perche-ci-stava" sconosciuto/, 'i motivi ammessi sono tre');
});

ok('due viste scollegate vanno dichiarate per quello che sono', () => {
  const s = clona(buona);
  /* le due viste di questo caso NON condividono misura ne dimensione: sotto "altro-taglio",
     che promette la stessa domanda con un altro asse, e una dichiarazione falsa */
  contenitore(s).motivo = 'altro-taglio';
  rifiuta(s, /non condividono ne la misura ne la dimensione/,
    'un motivo che descrive male il bookmark e peggio di nessun motivo');
});

ok('una vista senza nome non renderizza', () => {
  const s = clona(buona);
  /* il nome della linguetta puo venire da "etichetta" o, in mancanza, dal titolo della vista:
     senza nessuno dei due la linguetta direbbe "vista 2", che non e un nome */
  delete contenitore(s).viste[1].etichetta;
  delete contenitore(s).viste[1].title;
  rifiuta(s, /manca "etichetta"/, 'una linguetta senza nome non si clicca');
});

ok('tre viste sull apertura sono un menu', () => {
  const s = clona(buona);
  const c = contenitore(s);
  c.viste.push(Object.assign(clona(c.viste[1]), { etichetta: 'Terza' }));
  rifiuta(s, /APERTURA ha 3 viste/, 'la prima cosa che si vede non puo essere un menu');
});

ok('quattro viste in una card non renderizzano mai', () => {
  const s = clona(buona);
  const c = contenitore(s);
  /* spostata fuori dall apertura, cosi si prova il tetto delle viste e non quello dell apertura */
  const riga = s.pages[0].rows[0];
  s.pages[0].rows[1].visuals.unshift(riga.visuals.shift());
  while (c.viste.length < 4) c.viste.push(Object.assign(clona(c.viste[1]), { etichetta: 'V' + c.viste.length }));
  rifiuta(s, /4 viste in una card/, 'oltre tre linguette non ci stanno nell intestazione');
});

ok('tre card a linguette nella stessa pagina sono una caccia al tesoro', () => {
  const s = clona(buona);
  const c = clona(contenitore(s));
  const riga = s.pages[0].rows[1] || s.pages[0].rows[0];
  riga.visuals.push(clona(c), clona(c));
  rifiuta(s, /card a piu viste. Il massimo e 2/, 'la pagina smette di essere un report');
});

ok('il consiglio arriva quando due lenti sprecano un riquadro', () => {
  const s = clona(buona);
  /* due volte lo stesso grafico sulla stessa dimensione con misure diverse, fuori dall apertura */
  const riga = s.pages[0].rows[1];
  const base = { type: 'hbar', span: 2, h: 150, bind: { dim: 'corso', measure: 'ricavi' } };
  riga.visuals.push(Object.assign({}, base, { title: 'Ricavi per corso' }));
  riga.visuals.push(Object.assign({}, base, { title: 'Margine per corso', bind: { dim: 'corso', measure: 'marginePc' } }));
  const consigli = VISTE.consiglia(s);
  assert.ok(consigli.some(x => /due lenti sulla stessa domanda/.test(x)),
    'il motore deve accorgersene da solo:\n' + consigli.join('\n'));
});

ok('il consiglio sull apertura esiste, ma non ferma niente', () => {
  const note = lint(buona, dati);
  assert.ok(note.some(x => /bookmark sta sull'APERTURA/.test(x)), 'il consiglio deve comparire');
  render(buona, dati);   /* e comunque renderizza */
});

console.log('  ' + n + ' verifiche superate\n');
