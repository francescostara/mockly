#!/usr/bin/env node
/* LA FINESTRA TEMPORALE — piu anni insieme, con un anno solo come punto di partenza.
 *
 * Nasce da una richiesta precisa: "piu filtri di tempo applicabili contemporaneamente —
 * immagina se l'utente ha dieci anni di storia e ne vuole vedere solo tre; di base pero
 * partiamo con un anno come hai fatto fino ad ora".
 *
 * Le cose che qui si difendono, e che a occhio non si vedrebbero:
 *   1. il DEFAULT non cambia. Un report si apre sempre su un anno solo: la finestra e una
 *      possibilita, non un comportamento nuovo che si subisce;
 *   2. allargare la finestra somma davvero gli anni. Il difetto silenzioso sarebbe una
 *      selezione che accende tre chip e continua a mostrare un anno — visivamente identico,
 *      completamente falso;
 *   3. il confronto si sposta con la finestra: tre anni si confrontano coi TRE precedenti,
 *      non con l'anno prima dell'ultimo. E' l'errore che una macchina fa e un umano no;
 *   4. il disegno cambia con l'ampiezza: una linea per anno fino a cinque, un punto per anno
 *      dai sei in su. Trentasei mesi in fila non sono un grafico;
 *   5. sotto i tre anni di storia il controllo NON esiste — ne il suo codice viaggia nel file.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const builder = require('../engine/data-builder.js');
const caso = require('../engine/specs/banco/delta-margine.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('finestra temporale (piu anni insieme, uno di default)');

/* Lo stesso caso del banco, con otto anni di storia invece di due: e la situazione che la
   richiesta descrive, e nessuna spec del repo ce l'ha ancora. */
const dp = clona(caso.dataParams);
dp.years = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const dati = builder.build(dp);
const html = render(caso.spec, dati);
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document;
const A = w.MK.__A;
const clic = sel => {
  const el = typeof sel === 'string' ? d.querySelector(sel) : sel;
  assert.ok(el, 'manca il bersaglio ' + sel);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
};
const testo = () => d.getElementById('page').textContent;
const mis = 'ricavi';
const tot = () => A.mv(mis, A.agg(A.slice({})));
const totAnno = y => A.mv(mis, A.agg(A.slice({ y: y, timeline: true })));

ok('si apre su un anno solo, come sempre', () => {
  assert.strictEqual(A.ampiezza(), 1, 'la finestra di partenza deve essere di un anno');
  assert.strictEqual(A.S.y0, A.S.y, 'gli estremi coincidono');
  assert.strictEqual(A.periodLabel(), '2025', 'l etichetta e un anno, non un intervallo');
});

ok('il controllo propone solo ampiezze che la storia regge', () => {
  clic('#slBtn');
  const chip = [...d.querySelectorAll('#slSpan .slchip')].map(b => b.getAttribute('data-span'));
  assert.deepStrictEqual(chip, ['1', '2', '3', '5', '8'], 'ampiezze proposte: ' + chip.join(','));
  const acceso = d.querySelector('#slSpan .slchip.on');
  assert.strictEqual(acceso.getAttribute('data-span'), '1', 'parte acceso "1 anno"');
});

ok('tre anni selezionati sommano tre anni', () => {
  const attesi = [2023, 2024, 2025].reduce((s, y) => s + totAnno(y), 0);
  clic('[data-span="3"]');
  assert.strictEqual(A.ampiezza(), 3);
  assert.strictEqual(A.S.y0, 2023);
  assert.ok(Math.abs(tot() - attesi) < 1e-6,
    'il totale della finestra deve essere la somma dei tre anni: ' + tot() + ' contro ' + attesi);
});

ok('la finestra si vede: tre chip accesi, non uno', () => {
  const dentro = [...d.querySelectorAll('#slYear .slchip')]
    .filter(b => /\b(on|in)\b/.test(b.className)).map(b => b.getAttribute('data-y'));
  assert.deepStrictEqual(dentro, ['2023', '2024', '2025'], 'anni evidenziati: ' + dentro.join(','));
});

ok('l etichetta del periodo diventa un intervallo', () => {
  assert.strictEqual(A.periodLabel(), '2023–2025');
  assert.strictEqual(d.getElementById('slCur').textContent, '2023–2025');
  assert.ok(/2023–2025/.test(d.getElementById('hCtx').textContent),
    'la pillola di contesto deve dire che periodo si sta guardando');
});

ok('il confronto si sposta di tre anni, non di uno', () => {
  const p = A.periodPair();
  assert.strictEqual(p.cur, '2023–2025');
  assert.strictEqual(p.prev, '2020–2022', 'periodo precedente: ' + p.prev);
  const attesi = [2020, 2021, 2022].reduce((s, y) => s + totAnno(y), 0);
  const prev = A.mv(mis, A.prev({}));
  assert.ok(Math.abs(prev - attesi) < 1e-6,
    'il confronto deve valere i tre anni precedenti: ' + prev + ' contro ' + attesi);
});

ok('il trend disegna una linea per anno', () => {
  const carta = [...d.querySelectorAll('.card')].filter(c => /Andamento|Trend/i.test(
    (c.querySelector('.ch h3') || {}).textContent || ''))[0]
    || [...d.querySelectorAll('.card')].filter(c => c.querySelectorAll('svg path').length >= 3)[0];
  assert.ok(carta, 'serve una card con un trend per provare il disegno');
  const et = [...carta.querySelectorAll('text')].map(t => t.textContent);
  ['2023', '2024', '2025'].forEach(y => assert.ok(et.includes(y),
    'ogni anno della finestra deve essere nominato accanto alla sua linea (manca ' + y + ')'));
});

ok('otto anni: un punto per anno, non novantasei mesi', () => {
  clic('[data-span="8"]');
  assert.strictEqual(A.ampiezza(), 8);
  const carte = [...d.querySelectorAll('.card')];
  const conPunti = carte.map(c => c.querySelectorAll('circle.hit').length).filter(k => k > 0);
  assert.ok(conPunti.some(k => k === 8),
    'con otto anni un trend deve avere otto punti, non dodici: ' + conPunti.join(','));
});

ok('un anno della storia lontana si guarda per anni, non per mesi', () => {
  clic('[data-span="1"]');
  clic('[data-y="2018"]');                                  /* fuori dagli ultimi tre: grana annuale */
  assert.strictEqual(A.ampiezza(), 1);
  assert.ok(A.grossa(), '2018 non ha piu i dodici mesi');
  assert.strictEqual(d.getElementById('slQtrG').style.display, 'none',
    'il trimestre non e una domanda che quel dato possa reggere');
  assert.strictEqual(d.getElementById('slMonG').style.display, 'none');
  assert.ok(A.mv(mis, A.agg(A.slice({}))) > 0, 'i totali di un anno lontano restano veri');
  assert.ok(!/NaN|undefined|Infinity/.test(testo()), 'la pagina contiene un numero rotto');
});

ok('nessun numero rotto con la finestra larga', () => {
  assert.ok(!/NaN|undefined|Infinity/.test(testo()), 'la pagina contiene un numero rotto');
});

ok('azzera riporta a un anno solo', () => {
  clic('#btnReset');
  assert.strictEqual(A.ampiezza(), 1, '"azzera filtri" che lascia otto anni non ha azzerato niente');
  assert.strictEqual(A.periodLabel(), '2025');
});

ok('sotto i tre anni il controllo non esiste, e nemmeno il suo codice', () => {
  const breve = render(caso.spec, caso.build());          /* due anni, come nel banco */
  assert.ok(!/slSpanG/.test(breve), 'con due anni di storia la riga "quanti anni" non va emessa');
  assert.ok(!/data-span/.test(breve), 'ne il suo codice deve viaggiare nel file');
  const dom2 = new JSDOM(breve, { runScripts: 'dangerously', pretendToBeVisual: true });
  assert.strictEqual(dom2.window.MK.__A.ampiezza(), 1, 'e il report resta a un anno');
  dom2.window.close();
});

/* ---------------------------------------------------------------- il ribbon segue la finestra */
{
  const casoR = require('../engine/specs/banco/ribbon-sorpasso.js');
  const dpR = clona(casoR.dataParams);
  dpR.years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const domR = new JSDOM(render(casoR.spec, builder.build(dpR)), { runScripts: 'dangerously', pretendToBeVisual: true });
  const dR = domR.window.document;
  const clicR = sel => dR.querySelector(sel).dispatchEvent(
    new domR.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const colonne = () => [...dR.querySelectorAll('.card svg text')]
    .map(t => t.textContent).filter(t => /^(Q[1-4]|20\d\d)/.test(t));

  ok('il ribbon si allunga con la finestra, e non oltre', () => {
    assert.deepStrictEqual(colonne(), ['Q1', 'Q2', 'Q3', 'Q4'], 'un anno: i quattro trimestri');
    clicR('#slBtn'); clicR('[data-span="3"]');
    const tre = colonne();
    assert.strictEqual(tre.length, 12, 'tre anni: dodici trimestri, non quattro sommati');
    assert.strictEqual(tre[0], 'Q1 23', 'la colonna dice anche di che anno e');
    clicR('#slBtn'); clicR('[data-span="7"]');
    assert.deepStrictEqual(colonne(), ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
      'sette anni: un anno per colonna — con ventotto trimestri i sorpassi non si vedrebbero piu');
  });

  ok('le colonne del ribbon non si accavallano', () => {
    const x = [...dR.querySelectorAll('.card svg text')]
      .filter(t => /^20\d\d$/.test(t.textContent)).map(t => parseFloat(t.getAttribute('x')));
    for (let i = 1; i < x.length; i++) {
      assert.ok(x[i] - x[i - 1] > 22, 'due colonne a ' + (x[i] - x[i - 1]).toFixed(0) + 'px una dall altra');
    }
  });
  domR.window.close();
}

dom.window.close();
console.log('  ' + n + ' verifiche superate\n');
