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
  const iY = cols.indexOf('y'), anno = data.years[data.years.length - 1];   /* l'ultimo */
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

/* Il gauge di Parsa (27 set 2026): "100.0%, 0.0 pp below Target" con l'arco rosso — uno scarto
   che il formato non sa scrivere non e "sotto". E il gauge Prime cost della storia del gauge:
   su una misura dove meno e meglio, stare sotto il bersaglio e il risultato buono. Si prova
   sul primo gauge del caso, spostando il bersaglio sul valore e ribaltando il verso. */
const gauge = (spec) => {
  const dom = new JSDOM(render(spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const card = [...dom.window.document.querySelectorAll('.card')].find(c => c.querySelector('.gnote'));
  const out = { nota: card.querySelector('.gnote').textContent.replace(/\s+/g, ' ').trim(),
    colori: [...card.querySelectorAll('path')].map(p => p.getAttribute('stroke')).filter(Boolean) };
  dom.window.close();
  return out;
};
const valoreDelPrimo = () => {
  const dom = new JSDOM(render(caso.spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const t = dom.window.document.querySelector('.gnote').textContent;
  dom.window.close();
  return parseFloat(t.match(/([\d.,]+)\s?%/)[1].replace(',', '.')) / 100;
};

ok('un valore in linea col bersaglio si dice in linea, e non e rosso', () => {
  const s = clona(caso.spec);
  const v = s.pages[0].rows[0].visuals.find(x => x.type === 'gauge') || s.pages[0].rows[0].visuals[0];
  v.bind.target = valoreDelPrimo() + 0.0002;                 /* uno scarto sotto la risoluzione */
  const g = gauge(s);
  assert.match(g.nota, /in linea con|in line with/, g.nota);
  assert.ok(!/sotto|below/.test(g.nota), 'uno scarto che non si scrive non e "sotto": ' + g.nota);
  assert.ok(g.colori.indexOf('var(--bad)') < 0, 'in linea non e rosso');
});

ok('su una misura dove meno e meglio (inv), stare sotto il bersaglio e verde', () => {
  const s = clona(caso.spec);
  const v = s.pages[0].rows[0].visuals.find(x => x.type === 'gauge') || s.pages[0].rows[0].visuals[0];
  const m = s.model.measures.find(x => x.id === v.bind.measure);
  m.inv = true;
  v.bind.target = Math.min(1, valoreDelPrimo() + 0.1);       /* il valore sta sotto il bersaglio */
  const g = gauge(s);
  assert.ok(g.colori.indexOf('var(--good)') >= 0 && g.colori.indexOf('var(--bad)') < 0, 'sotto il bersaglio con inv deve essere verde: ' + g.colori.join(','));
});

/* LO SPAZIO SEGUE L'INFORMAZIONE (Fra, 29 set 2026, su due mockup di fila): un gauge da solo in una
   card larga occupa lo spazio di un grafico per un numero solo. Rifiutato — anche dentro una vista
   nascosta — e il gauge multiplo mette due o tre pannelli nella stessa card, ognuno col suo bersaglio. */
ok('un gauge singolo in una card larga e rifiutato, anche come vista nascosta di una card', () => {
  const s = clona(caso.spec);
  const riga = s.pages[0].rows.find(r => r.visuals.some(x => x.type === 'gauge'));
  const g = riga.visuals.find(x => x.type === 'gauge');
  const colW = (s.grid.contentWidth - s.grid.gutter * (s.grid.columns - 1)) / s.grid.columns;
  const largo = Math.ceil((301 + s.grid.gutter) / (colW + s.grid.gutter));
  /* il gauge si allarga rubando colonne agli altri visual della riga */
  const altri = riga.visuals.filter(x => x.type !== 'gauge').sort((a, b) => b.span - a.span);
  if (largo > g.span && altri.length && altri[0].span > largo - g.span) { altri[0].span -= (largo - g.span); g.span = largo; }
  assert.ok(colW * g.span + s.grid.gutter * (g.span - 1) > 300, 'il caso di prova deve avere un gauge largo');
  assert.throws(() => validate(s, data), /gauge da solo in una card di \d+px/);
  const s2 = clona(s);
  const r2 = s2.pages[0].rows.find(r => r.visuals.some(x => x.type === 'gauge'));
  const i = r2.visuals.findIndex(x => x.type === 'gauge'), gg = r2.visuals[i];
  const altro = r2.visuals.find(x => x.type !== 'gauge');
  r2.visuals[i] = { id: 'vv', span: gg.span, h: gg.h, motivo: 'pagina-sprecata', viste: [Object.assign(clona(altro), { etichetta: 'A', span: gg.span }), Object.assign(clona(gg), { etichetta: 'B' })] };
  assert.throws(() => validate(s2, data), /gauge da solo in una card di \d+px/, 'la vista nascosta deve essere controllata come la prima');
});

ok('il gauge multiplo disegna un pannello per misura, ognuno col suo bersaglio', () => {
  /* i due gauge del banco (attainment e win rate, nessuno dei due in banda) in una card sola */
  const sp = clona(caso.spec);
  const riga = sp.pages[0].rows.find(r => r.visuals.filter(x => x.type === 'gauge').length === 2);
  const gg = riga.visuals.filter(x => x.type === 'gauge');
  const v = { type: 'gauge', span: gg[0].span + gg[1].span, h: gg[0].h, title: 'Bersagli', bind: { misure: gg.map(x => x.bind) } };
  riga.visuals = [v].concat(riga.visuals.filter(x => x.type !== 'gauge'));
  const c = { spec: sp, build: () => data };
  const dom = new JSDOM(render(c.spec, c.build()), { runScripts: 'dangerously', pretendToBeVisual: true });
  const card = [...dom.window.document.querySelectorAll('#page .card')].find(k => ((k.querySelector('.ch h3') || {}).textContent || '').indexOf(v.title) === 0);
  const archi = card.querySelectorAll('svg');
  assert.strictEqual(archi.length, 2, 'due gauge, due svg');
  assert.strictEqual(card.querySelectorAll('line[stroke="var(--ink)"]').length, 2, 'ogni gauge ha la sua tacca del bersaglio');
  dom.window.close();
});

ok('un gauge su una misura che ha gia la sua card nella banda KPI e rifiutato (il doppione)', () => {
  const s = clona(caso.spec);
  const g = s.pages[0].rows.flatMap(r => r.visuals).find(x => x.type === 'gauge');
  s.kpiBand[0] = Object.assign({}, s.kpiBand[0], { measure: g.bind.measure });
  assert.throws(() => validate(s, data), /ha gia una card nella banda KPI/);
  /* e nessun gauge del corpus ripete la banda */
  require('./corpus.js').casi().forEach(c => {
    const kpi = new Set(c.caso.spec.kpiBand.map(k => k.measure));
    c.caso.spec.pages.concat(c.caso.spec.drill ? [c.caso.spec.drill.page] : []).forEach(p => p.rows.forEach(r => r.visuals.forEach(v => (v.viste || [v])
      .filter(vv => vv.type === 'gauge').forEach(vv => (vv.bind.misure || [vv.bind]).forEach(m =>
        assert.ok(!kpi.has(m.measure), c.id + ': il gauge su "' + m.measure + '" ripete una card KPI'))))));
  });
});

console.log('  ' + n + ' checks');
