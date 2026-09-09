#!/usr/bin/env node
/* I gate anti-generico devono fare DUE cose, e la seconda e quella che conta:
 *   1. lasciar passare i quattro esempi canonici, che sono diversi per costruzione;
 *   2. BOCCIARE una collezione fatta tutta con lo stesso stampo — cioe lo stato in cui erano
 *      i dieci output del giro a pagamento, dove ogni singolo file passava ogni singolo gate.
 *
 * Un gate che passa sempre non e un gate. Per questo il test costruisce anche il caso che deve
 * fallire, invece di limitarsi a dire che i canonici vanno bene.
 */
const assert = require('assert');
const { scheda, insieme } = require('./gates-generic.js');
const templates = require('../engine/templates/index.js');
const fixtures = require('../engine/specs/index.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const esito = (esiti, id) => esiti.filter(e => e.id === id)[0];

console.log('gate anti-generico (la collezione, non il file)');

const canonici = Object.keys(templates).map(k => scheda(templates[k].spec, k));

ok('i quattro esempi canonici hanno quattro forme diverse', () => {
  const firme = new Set(canonici.map(s => s.firma));
  assert.strictEqual(firme.size, canonici.length,
    'due esempi canonici con la stessa firma sono un esempio solo scritto due volte');
});

ok('i canonici passano diversita, apertura e chiusura', () => {
  const esiti = insieme(canonici);
  ['diversita', 'apertura', 'chiusura', 'archetipo-dichiarato'].forEach(id => {
    const e = esito(esiti, id);
    assert.ok(e && e.passa, id + ': ' + (e ? e.testo : 'gate assente'));
  });
});

ok('nessuno dei canonici apre con la formula da principiante', () => {
  const rei = canonici.filter(s => s.formulaPrincipiante);
  assert.strictEqual(rei.length, 0, rei.map(s => s.nome).join(', '));
});

ok('le aperture sono quattro cose diverse, non la stessa con un nome diverso', () => {
  const teste = canonici.map(s => s.apertura[0]);
  assert.strictEqual(new Set(teste).size, teste.length, 'aperture: ' + teste.join(', '));
});

/* ---- la parte che conta: il gate deve saper dire di no ---- */

ok('una collezione fatta con un solo stampo viene bocciata sulla diversita', () => {
  /* dieci volte lo stesso scorecard: e lo stato dei dieci output del giro Sonnet */
  const uno = scheda(fixtures['social-monthly'].spec, 'x');
  const dieci = Array.from({ length: 10 }, (_, i) => Object.assign({}, uno, { nome: 'run' + i }));
  const e = esito(insieme(dieci), 'diversita');
  assert.ok(!e.passa, 'il gate ha lasciato passare dieci file identici: ' + e.testo);
  assert.match(e.testo, /100%/, 'e deve dire quanto sono identici: ' + e.testo);
});

ok('una collezione che apre sempre trend + donut viene bocciata sull apertura', () => {
  const finto = {
    archetype: 'scorecard', grid: { columns: 4 }, kpiBand: [1, 2, 3, 4],
    pages: [{ rows: [
      { visuals: [{ type: 'trend', span: 2 }, { type: 'donut', span: 2 }] },
      { visuals: [{ type: 'matrix', span: 4 }] }
    ] }]
  };
  const sei = Array.from({ length: 6 }, (_, i) => scheda(finto, 'run' + i));
  const e = esito(insieme(sei), 'apertura');
  assert.ok(!e.passa, 'il gate non ha visto sei aperture identiche: ' + e.testo);
});

ok('un board con dodici riquadri viene bocciato sulla densita', () => {
  const s = scheda(fixtures['ecommerce-retail'].spec, 'boardino');
  const e = esito(insieme([s], { boardino: 'board' }), 'densita-pubblico');
  assert.ok(e && !e.passa, 'densita ' + s.densita + ' accettata per un board: ' + (e && e.testo));
});

ok('un giro senza archetipo dichiarato viene segnalato', () => {
  const s = scheda({ grid: { columns: 4 }, kpiBand: [], pages: [{ rows: [] }] }, 'vecchio');
  const e = esito(insieme([s]), 'archetipo-dichiarato');
  assert.ok(!e.passa && /vecchio/.test(e.testo), e.testo);
});

console.log('  ' + n + ' checks');
