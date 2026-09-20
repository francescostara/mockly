#!/usr/bin/env node
/* IL REPORT PARLA LA LINGUA DEL REPORT, fino all'ultima parola che scrive il motore.
 *
 * Nata dal primo feedback di un tester esterno su un report in inglese: la scheda "How to use
 * this mockup" diceva "click una riga", "click un punto". I nomi delle cose da cliccare vivevano
 * in una tabella sola, in italiano, e finivano dentro le frasi inglesi. Nessun test se ne
 * accorgeva perche i test del repo giravano quasi tutti su report italiani.
 *
 * Il gate nato allora guardava il posto giusto ma non abbastanza in la: leggeva SOLO la scheda.
 * Due parole italiane sono rimaste in pagina per giorni — "Ultimo aggiornamento" nell'intestazione
 * e "6,1 pp sopra goal" sotto un gauge — nel primo mockup mandato a un tester esterno. E' lo
 * stesso schema del gate di geometria che controllava l'ancora del testo e non il testo.
 *
 * Ora ogni mockup del repo viene riletto in inglese DUE volte: la scheda, e la pagina intera
 * renderizzata — tutte le pagine, il drill, i pannelli. Nessuna parola italiana deve uscirne.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SCHEDA = require('../engine/scheda.js');
const builder = require('../engine/data-builder.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('il report nella lingua del report — cornice, scheda, ripieghi');

const casi = [];
const da = mappa => Object.keys(mappa).filter(k => k[0] !== '_').forEach(k => casi.push([k, mappa[k]]));
da(require('../engine/templates/index.js'));
da(require('../engine/specs/banco/index.js'));
const dir = path.join(__dirname, '..', 'engine', 'specs', 'locale');
fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js').forEach(f => casi.push([f, require(path.join(dir, f))]));

const ITALIANO = /\b(una|uno|un) (riga|punto|cella|barra|fetta|nastro|segmento|colonna)\b|\bclicca\b|\btasto destro\b|\bper filtrare\b/i;

ok('in un report inglese la scheda non contiene parole italiane', () => {
  let visti = 0;
  casi.filter(([, c]) => c.spec && c.dataParams).forEach(([id, c]) => {
    const spec = clona(c.spec);
    spec.meta.locale = 'en-US';
    const t = SCHEDA.testo(spec, builder.build(c.dataParams));
    const m = t.match(ITALIANO);
    assert.ok(!m, id + ': parola italiana nella scheda inglese — "' + (m ? t.slice(Math.max(0, m.index - 30), m.index + 30) : '') + '"');
    visti++;
  });
  assert.ok(visti >= 10, 'solo ' + visti + ' casi riletti');
});

ok('ogni cosa cliccabile ha il suo nome in inglese', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'engine', 'scheda.js'), 'utf8');
  const blocco = (src.match(/cliccabili: \{([\s\S]*?)\}/) || [])[1] || '';
  Object.keys(SCHEDA.CLICCABILI).forEach(tipo => assert.ok(new RegExp('\\b' + tipo + ':').test(blocco),
    'il visual "' + tipo + '" e cliccabile ma non ha un nome inglese: finirebbe in italiano nella scheda'));
});


/* Le parole che il MOTORE scrive in pagina quando una chiave di meta.strings manca: sono quelle
   che finiscono in un report inglese senza che nessuno le abbia scritte. */
const ITALIANO_PAGINA = new RegExp('(^|[^A-Za-zÀ-ú])(' + [
  'Ultimo aggiornamento', 'Azzera filtri', 'Quanti anni', 'Trimestre', 'Trim\.', 'Anno', 'Mese',
  'Tutto', 'Tutti', 'Altri', 'Confronto', 'Periodo', 'obiettivo', 'sopra', 'sotto',
  'traiettoria mensile', 'nessun periodo precedente confrontabile', 'clicca', 'una riga', 'un punto'
].join('|') + ')(?![A-Za-zÀ-ú])');

ok('in un report inglese nessuna parola italiana arriva in pagina', () => {
  const { render } = require('../engine/render.js');
  const { JSDOM } = require('jsdom');
  const guasti = [];
  let visti = 0;
  casi.filter(([, c]) => c.spec && c.dataParams).forEach(([id, c]) => {
    const spec = clona(c.spec);
    spec.meta.locale = 'en-US';
    const dom = new JSDOM(render(spec, builder.build(c.dataParams)), { runScripts: 'dangerously', pretendToBeVisual: true });
    const doc = dom.window.document, win = dom.window;
    const clic = sel => { const e = doc.querySelector(sel); if (e) e.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); return !!e; };
    /* SOLO cio che scrive il MOTORE: la cornice, le pillole di contesto, la nota del gauge, la
       scheda. I titoli e i sottotitoli li scrive il modello, e in un test che si limita a
       cambiare il locale restano in italiano per costruzione: cercarli li sarebbe rumore. */
    const CORNICE = '#topbar, #rail, .slgrp, .slpanel, .ctxwrap, .updated, #btnReset, .dhd, .gnote, .scheda';
    const guarda = (dove) => {
      const t = [...doc.querySelectorAll(CORNICE)].map(e => e.textContent).join(' ').replace(/\s+/g, ' ');
      const m = t.match(ITALIANO_PAGINA);
      if (m) guasti.push(id + ' · ' + dove + ': "' + t.slice(Math.max(0, m.index - 40), m.index + 40).trim() + '"');
    };
    /* ogni pagina, il pannello del periodo, la scheda, e il drill: tutto cio che il lettore apre */
    [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page).forEach(p => {
      clic('.navbtn[data-page="' + p + '"]'); guarda('pagina ' + p);
    });
    if (clic('#slBtn')) { guarda('selettore del periodo'); clic('#slBtn'); }
    if (clic('#btnScheda, [data-scheda]')) guarda('scheda');
    const riga = spec.drill && doc.querySelector('[data-drill]');
    if (riga) { riga.dispatchEvent(new win.MouseEvent('contextmenu', { bubbles: true })); guarda('drill'); }
    dom.window.close();
    visti++;
  });
  assert.deepStrictEqual(guasti, [], guasti.join(String.fromCharCode(10) + '       '));
  assert.ok(visti >= 10, 'solo ' + visti + ' casi riletti');
});

ok('ogni parola che il motore ripiega in italiano ha la sua voce inglese', () => {
  /* La rete regge solo se e completa: un T.qualcosa || 'parola italiana' aggiunto domani al
     motore, senza la sua voce nel dizionario, riapre esattamente il buco di "Ultimo
     aggiornamento". Qui si leggono i sorgenti e si pretende che ogni chiave ci sia. */
  const { INGLESE } = require('../engine/render.js');
  const mancanti = [];
  ['render.js', 'runtime.js'].forEach(f => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'engine', f), 'utf8');
    const re = /T2?\.([a-zA-Z]+) \|\| '([^']+)'/g;
    let m;
    while ((m = re.exec(src))) {
      if (INGLESE[m[1]] === undefined) mancanti.push(f + ': T.' + m[1] + " ripiega su '" + m[2] + "' e non ha una voce inglese");
    }
  });
  assert.deepStrictEqual([...new Set(mancanti)], [], mancanti.join(String.fromCharCode(10) + '       '));
});

console.log('  ' + n + ' checks · ' + casi.length + ' mockup');
