#!/usr/bin/env node
/* Il gauge accetta solo misure di tipo tasso, e il perche va provato — non solo dichiarato.
 *
 * Il difetto latente: un gauge si muove coi filtri, il suo bersaglio no. Con un TASSO va bene,
 * perche il bersaglio di un win rate e lo stesso per ogni segmento. Con una misura ASSOLUTA
 * mente: "fatturato contro target 2M" filtrato su una regione mostra la quota della regione
 * contro il target dell'azienda intera, cioe un 12% che sembra un disastro ed e un errore di
 * lettura. E' la stessa forma del ratio che si sommava e funzionava finche l'id coincideva col
 * campo: corretto per caso.
 *
 * Il test dimostra tre cose: che il divieto esiste, che il caso pericoloso e davvero pericoloso
 * (il numero sbagliato si calcola, non e teoria), e che il gauge lecito si muove coi filtri
 * mantenendo il bersaglio.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render, validate } = require('../engine/render.js');
const caso = require('../engine/specs/banco/gauge-quota.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
const clona = o => JSON.parse(JSON.stringify(o));

console.log('gauge (solo tassi, bersaglio dichiarato)');

const data = caso.build();

ok('il gauge su un tasso e valido', () => {
  validate(caso.spec, data);
});

ok('il gauge su una misura ASSOLUTA e rifiutato dalla grammatica', () => {
  const s = clona(caso.spec);
  /* "chiuso vinto contro un target da 5 milioni": in euro, non in percentuale */
  s.pages[0].rows[0].visuals[0].bind = { measure: 'vinto', target: 5000000, targetLabel: 'target' };
  assert.throws(() => validate(s, data), err => {
    assert.match(err.message, /il gauge accetta solo tassi/i,
      'il messaggio deve dire che il gauge vuole un tasso, non solo che qualcosa non va');
    assert.match(err.message, /quota raggiunta|fatturato \/ target/i,
      'e deve dire come si aggiusta: usare il rapporto invece del valore assoluto');
    return true;
  });
});

/* La prova che il divieto non e pedanteria: col valore assoluto il numero SAREBBE sbagliato. */
ok('col valore assoluto il gauge direbbe davvero un numero falso sotto filtro', () => {
  const cols = data.facts.cols, iSeg = cols.indexOf('segmento'), iVinto = cols.indexOf('vinto');
  const iY = cols.indexOf('y'), anno = data.years[1];
  const totale = data.facts.rows.filter(r => r[iY] === anno).reduce((a, r) => a + r[iVinto], 0);
  const soloEnt = data.facts.rows
    .filter(r => r[iY] === anno && data.dims.segmento[r[iSeg]].id === 'ent')
    .reduce((a, r) => a + r[iVinto], 0);

  const target = totale * 1.1;                    /* un bersaglio d'azienda, non di segmento */
  const senzaFiltro = totale / target;
  const conFiltro = soloEnt / target;             /* il valore si affetta, il bersaglio no */

  assert.ok(senzaFiltro > 0.8, 'senza filtro il gauge legge ' + (senzaFiltro * 100).toFixed(0) + '%');
  assert.ok(conFiltro < senzaFiltro * 0.75,
    'filtrando su un segmento il gauge scenderebbe a ' + (conFiltro * 100).toFixed(0) +
    '% pur non essendo cambiato niente nella realta: e questo il numero che fa fermare un cliente');
});

ok('il target per membro e dichiarato nella grammatica ma rifiutato finche non e implementato', () => {
  const s = clona(caso.spec);
  s.pages[0].rows[0].visuals[0].bind.targets = { ent: 1.0, mid: 0.7, smb: 0.85 };
  assert.throws(() => validate(s, data), /non lo legge ancora/i,
    'un campo dichiarato e ignorato in silenzio e peggio di un campo che non esiste');
});

/* Il gauge lecito: il valore segue il filtro, il bersaglio resta. E' corretto proprio perche
   e un tasso — il 21% di win rate atteso vale per Enterprise come per SMB. */
ok('il gauge su un tasso si muove col filtro e tiene il suo bersaglio', () => {
  const dom = new JSDOM(render(caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const d = dom.window.document;
  const leggi = () => [...d.querySelectorAll('.card')]
    .filter(c => c.querySelector('.gnote'))
    .map(c => c.querySelector('.gnote').textContent.replace(/\s+/g, ' ').trim());

  const prima = leggi();
  const riga = d.querySelector('tbody tr[data-f^="segmento:"]');
  riga.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const dopo = leggi();

  assert.ok(prima.length >= 1 && dopo.length === prima.length, 'le annotazioni devono restare due');
  assert.notDeepStrictEqual(prima, dopo, 'il gauge deve reagire al filtro, o e un ornamento');
  /* il bersaglio nel testo non cambia: e il valore a muoversi */
  const bersaglio = t => (t.match(/(sopra|sotto) (\w+)/) || [])[2];
  assert.strictEqual(bersaglio(prima[0]), bersaglio(dopo[0]), 'il bersaglio di un tasso non si affetta');
  dom.window.close();
});

console.log('  ' + n + ' checks');
