#!/usr/bin/env node
/* IL DONUT — le due cose che la revisione gli ha chiesto, e che non devono tornare indietro.
 *
 *   1. IL BLOCCO CENTRATO. Il difetto e stato segnalato tre volte con "non e cambiato nulla"
 *      prima che se ne capisse la causa: il cuscinetto veniva messo ai bordi, e il vuoto stava
 *      IN MEZZO, fra anello e legenda. Qui si misura proprio quello: il margine a sinistra
 *      dell'anello e quello a destra della legenda devono essere uguali.
 *   2. LA FETTA "ALTRI". Staccata di poco — quanto basta a dire "questa e diversa", non tanto da
 *      diventare la cosa piu vistosa del visual, che esiste per mostrare la testa — e grigia,
 *      fuori dalla scala categoriale: non e una categoria vera, e non deve sembrarlo.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const SKIN = require('../engine/skin.js');
const COL = require('../engine/colore.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('donut (il blocco centrato e la fetta "Altri")');

const apri = caso => {
  const dom = new JSDOM(render(caso.spec, caso.build()), { runScripts: 'dangerously', pretendToBeVisual: true });
  return dom;
};

/* anello e legenda di ogni donut di una pagina, con la larghezza della sua card */
function donut(doc) {
  return [...doc.querySelectorAll('.card')].map(card => {
    const svg = card.querySelector('svg');
    if (!svg) return null;
    const fette = [...svg.querySelectorAll('path.hit')].filter(p => / A[\d.]+,[\d.]+ 0 [01] 1 /.test(p.getAttribute('d')));
    const legenda = [...svg.querySelectorAll('g.hit rect[fill="transparent"]')];
    if (!fette.length || !legenda.length) return null;
    return { card, svg, fette, legenda, w: Number(svg.getAttribute('width')) };
  }).filter(Boolean);
}

ok('anello e legenda sono un blocco centrato: niente vuoto in mezzo', () => {
  ['concentrazione', 'filtro-organico'].forEach(nome => {
    const dom = apri(require('../engine/specs/banco/' + nome + '.js'));
    const trovati = donut(dom.window.document);
    assert.ok(trovati.length, nome + ': nessun donut trovato');
    trovati.forEach(dn => {
      /* il bordo sinistro dell'anello: il centro meno il raggio esterno, letti dal primo arco */
      const d0 = dn.fette[0].getAttribute('d');
      const r = Number(d0.match(/ A([\d.]+),/)[1]);
      const cx = Number(dn.svg.querySelector('text[text-anchor="middle"][font-size="19"], text[text-anchor="middle"][font-size="14"]').getAttribute('x'));
      const sinistra = cx - r;
      const leg = dn.legenda[0];
      const destra = dn.w - (Number(leg.getAttribute('x')) + Number(leg.getAttribute('width')));
      assert.ok(Math.abs(sinistra - destra) <= 6,
        nome + ': margine sinistro ' + sinistra.toFixed(0) + 'px contro destro ' + destra.toFixed(0) +
        'px — il blocco non e centrato, e lo spazio che manca da una parte sta finendo in mezzo');
    });
    dom.window.close();
  });
});

ok('"Altri" e grigio neutro, fuori dalla scala categoriale', () => {
  const dom = apri(require('../engine/specs/banco/concentrazione.js'));
  const altri = dom.window.document.querySelector('path.altri');
  assert.ok(altri, 'la fetta "Altri" deve esistere nel caso della concentrazione (topN: 3)');
  assert.strictEqual(altri.getAttribute('fill'), 'var(--altri)',
    'la coda non prende un colore della serie: non e una categoria');
  dom.window.close();
});

ok('il grigio di "Altri" stacca dalla card su tutte le famiglie, e la cifra sopra si legge', () => {
  Object.keys(SKIN.FAMIGLIE).forEach(id => {
    const t = SKIN.palette(id);
    assert.ok(COL.contrasto(t.altri, t.card) >= 3,
      id + ': "Altri" a ' + COL.contrasto(t.altri, t.card).toFixed(2) + ':1 sulla card, sotto il 3:1 degli elementi grafici');
    assert.ok(COL.contrasto(t.altriInk, t.altri) >= 3,
      id + ': la percentuale sopra "Altri" non si legge');
    (t.serie || []).forEach(c => assert.notStrictEqual(String(c).toLowerCase(), String(t.altri).toLowerCase(),
      id + ': "Altri" coincide con un colore della serie'));
  });
});

ok('lo stacco e minimo, e riguarda solo "Altri"', () => {
  const dom = apri(require('../engine/specs/banco/concentrazione.js'));
  const doc = dom.window.document;
  const spostate = [...doc.querySelectorAll('path[transform]')];
  assert.strictEqual(spostate.length, 1, 'solo la coda si stacca: ' + spostate.length + ' fette spostate');
  assert.ok(spostate[0].classList.contains('altri'));
  const [dx, dy] = spostate[0].getAttribute('transform').match(/-?[\d.]+/g).map(Number);
  const dist = Math.hypot(dx, dy);
  assert.ok(dist > 1 && dist <= 4, 'stacco di ' + dist.toFixed(1) + 'px: deve distinguere, non richiamare lo sguardo');
  dom.window.close();
});

console.log('  ' + n + ' checks');
