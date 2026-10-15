#!/usr/bin/env node
/* L'ASSE DELLA LINEA SI ADATTA AI DATI, E UNA CELLA SENZA BASE E VUOTA.
 *
 * Fra sul mockup di Muttahar (2 ott 2026), pagina Trends & targets: nel grafico misto colonne +
 * OTIF "non si capisce bene l'asse e la riga e dritta… se passo sopra col mouse non si vede il
 * valore". L'asse della linea andava da zero a 1,25 volte il massimo, senza etichette: un OTIF
 * fra 80% e 90% stava in un decimo dell'altezza. E nella heatmap magazzino x regione le corsie
 * che non esistono (un magazzino che non serve quella regione) uscivano "0.0%" col gradino piu
 * freddo, cioe "pessimo" dove la verita e "niente".
 *
 * Gate, su ogni mockup del corpus:
 *  - ogni colline con una linea ha l'asse secondario scritto (almeno due tacche), un bersaglio
 *    col tooltip su ogni punto, e se la linea cambia valore i punti occupano un'altezza vera;
 *  - nessuna heatmap su un rapporto scrive "0.0%" in una cella: dove manca la base c'e "—".
 */
'use strict';
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { casi, renderCaso } = require('./corpus.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };
console.log('assi (la linea del colline si legge, la heatmap non inventa zeri)');

const visuali = pg => {
  const out = [];
  pg.rows.forEach(r => r.visuals.forEach(v => (v.viste || [v]).forEach(x => out.push(x))));
  return out;
};
const perPagina = (c, fn) => {
  const spec = c.caso.spec;
  const dom = new JSDOM(renderCaso(c, spec), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document, win = dom.window;
  const pagine = [...doc.querySelectorAll('.navbtn')].map(b => b.dataset.page);
  (pagine.length ? pagine : [null]).forEach(p => {
    if (p) doc.querySelector('.navbtn[data-page="' + p + '"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    fn(p ? spec.pages.find(x => x.id === p) : spec.pages[0], doc);
  });
};

const guastiC = [], guastiH = [];
let colline = 0, heat = 0, vuote = 0, conTarget = 0, colori = 0, lineeEt = 0, quote = 0;
const guastiEt = [];
const num = t => parseFloat(String(t).replace(/[^\d.,\-−]/g, '').replace('−', '-').replace(/,/g, ''));
const guastiColori = [];
casi().forEach(c => perPagina(c, (pg, doc) => {
  const vs = visuali(pg);
  /* solo le viste visibili: la prima di ogni card a viste */
  const attesi = [];
  pg.rows.forEach(r => r.visuals.forEach(v => { const x = v.viste ? v.viste[0] : v; if (x.type === 'colline' && x.bind && x.bind.line) attesi.push(x); }));
  const svg = [...doc.querySelectorAll('#page svg')].filter(s => s.querySelector('circle.l2p'));
  if (attesi.length && svg.length < attesi.length) guastiC.push(`${c.id} · ${pg.id}: ${attesi.length} colline con la linea, ${svg.length} con i punti interrogabili`);
  svg.forEach(s => {
    colline++;
    const punti = [...s.querySelectorAll('circle.l2p')];
    const tacche = s.querySelectorAll('text.l2').length;
    if (tacche < 2) guastiC.push(`${c.id} · ${pg.id}: l'asse della linea ha ${tacche} tacche`);
    punti.forEach(p => { if (!/<br>/.test(p.getAttribute('data-tip') || '')) guastiC.push(`${c.id} · ${pg.id}: un punto della linea senza tooltip`); });
    const valori = new Set(punti.map(p => (p.getAttribute('data-tip') || '').split('<br>')[1]));
    const ys = punti.map(p => +p.getAttribute('cy'));
    /* l'asse della linea e popolato su tutta l'altezza, come in Power BI (Fra, 3 ott 2026) */
    const H = +s.getAttribute('height'), ty = [...s.querySelectorAll('text.l2')].map(t => +t.getAttribute('y'));
    if (ty.length >= 2 && Math.max(...ty) - Math.min(...ty) < H * 0.6) guastiC.push(`${c.id} · ${pg.id}: le tacche dell'asse della linea coprono ${Math.round(100 * (Math.max(...ty) - Math.min(...ty)) / H)}% dell'altezza`);
    /* con un target la scala lo include: una linea che si muove di due decimi occupa pochi pixel, giustamente */
    if (valori.size > 2 && !s.querySelector('line.tgt') && Math.max(...ys) - Math.min(...ys) < 20)
      guastiC.push(`${c.id} · ${pg.id}: la linea cambia valore ma i punti stanno in ${(Math.max(...ys) - Math.min(...ys)).toFixed(1)}px (asse non adattato)`);
  });
  /* un colline con il target lo disegna: una linea fissa dentro l'area del grafico */
  attesi.filter(x => typeof x.bind.target === 'number').forEach(() => { conTarget++; });
  const tgt = [...doc.querySelectorAll('#page svg line.tgt')];
  if (tgt.length < attesi.filter(x => typeof x.bind.target === 'number').length) guastiC.push(`${c.id} · ${pg.id}: un colline con "target" non disegna la linea del target`);
  tgt.forEach(l => { const y = +l.getAttribute('y1'), H = +l.closest('svg').getAttribute('height'); if (!(y > 0 && y < H)) guastiC.push(`${c.id} · ${pg.id}: la linea del target sta fuori dal grafico (y ${y})`); });
  /* IL COLORE DI UN MEMBRO E LO STESSO OVUNQUE: il quadratino della tabella e la barra dell'hbar */
  const sw = {};
  [...doc.querySelectorAll('#page td')].forEach(td => { const q = td.querySelector('.sw'); if (q) sw[td.textContent.replace('›', '').trim()] = q.style.background; });
  [...doc.querySelectorAll('#page svg')].filter(x => x.querySelector('rect.barra')).forEach(x => [...x.querySelectorAll('g.hit')].forEach(g => {
    const nome = (g.querySelector('text') || {}).textContent, bar = g.querySelector('rect.barra');
    if (!nome || !(nome in sw)) return;
    colori++;
    const norm = v => { const e = doc.createElement('i'); e.style.color = v; return e.style.color; };
    if (norm(bar.getAttribute('fill')) !== norm(sw[nome])) guastiColori.push(`${c.id} · ${pg.id}: "${nome}" e ${sw[nome]} nella tabella e ${bar.getAttribute('fill')} nella barra`);
  }));
  /* MINIMO, MASSIMO E ULTIMO PUNTO (guideline delle label di Fra, 3 ott 2026): ogni linea con almeno
     sei punti scrive i suoi estremi, e il massimo scritto e davvero il massimo della linea */
  [...doc.querySelectorAll('#page svg')].forEach(sv => {
    const et = [...sv.querySelectorAll('text[data-et]')];
    const linea = sv.querySelector('circle.l2p') ? [...sv.querySelectorAll('circle.l2p')] : null;
    if (!et.length) {
      if (linea && linea.length >= 6) guastiEt.push(c.id + ' · ' + pg.id + ': una linea di ' + linea.length + ' punti senza etichette di minimo e massimo');
      return;
    }
    lineeEt++;
    if (linea) {
      const vals = linea.map(p => num((p.getAttribute('data-tip') || '').split('<br>')[1].split(': ')[1].split(' (')[0]));
      const scritti = et.map(t => num(t.textContent));
      if (Math.max(...scritti) < Math.max(...vals) - 1e-9) guastiEt.push(c.id + ' · ' + pg.id + ': il massimo scritto (' + Math.max(...scritti) + ') non e il massimo della linea (' + Math.max(...vals) + ')');
    }
  });
  /* LA QUOTA SUL TOTALE accanto al valore di un hbar su una misura che si somma */
  [...doc.querySelectorAll('#page svg')].filter(sv => sv.querySelector('rect.barra')).forEach(sv => {
    const q = [...sv.querySelectorAll('tspan')].map(t => t.textContent.trim()).filter(t => /^\d+%$/.test(t));
    if (!q.length) return;
    quote++;
    const somma = q.reduce((a, t) => a + parseInt(t, 10), 0);
    if (somma > 102) guastiEt.push(c.id + ' · ' + pg.id + ': le quote di un hbar sommano ' + somma + '%');
  });
  const spec = c.caso.spec, mis = {};
  (spec.model.measures || []).forEach(m => { mis[m.id] = m; });
  vs.filter(v => v.type === 'heatmap' && mis[v.bind.measure] && mis[v.bind.measure].agg === 'ratio').forEach(() => { heat++; });
  [...doc.querySelectorAll('#page svg')].forEach(s => {
    vuote += s.querySelectorAll('rect.vuota').length;
    [...s.querySelectorAll('rect.hit[data-tip]')].forEach(r => {
      if (/<br>0[.,]0%$/.test(r.getAttribute('data-tip')) && r.getAttribute('data-f'))
        guastiH.push(`${c.id} · ${pg.id}: cella "${r.getAttribute('data-tip').replace(/<[^>]+>/g, ' ')}"`);
    });
  });
}));

ok('ogni colline con la linea: asse secondario su tutta l altezza, tooltip su ogni punto, linea che si muove', () => {
  assert(colline >= 3, `solo ${colline} colline con la linea nel corpus: il gate non prova niente`);
  assert.deepStrictEqual(guastiC.slice(0, 8), [], guastiC.slice(0, 8).join('\n'));
});
ok('il target di un colline e una linea fissa; un membro ha lo stesso colore nella tabella e nella barra', () => {
  assert(conTarget >= 2 && colori >= 6, `colline con target ${conTarget}, barre confrontate col colore della tabella ${colori}`);
  assert.deepStrictEqual(guastiColori.slice(0, 8), [], guastiColori.slice(0, 8).join(String.fromCharCode(10)));
});
ok('le linee scrivono minimo, massimo e ultimo punto; le barre di una misura additiva la loro quota sul totale', () => {
  assert(lineeEt >= 5 && quote >= 3, 'linee etichettate ' + lineeEt + ', hbar con la quota ' + quote);
  assert.deepStrictEqual(guastiEt.slice(0, 8), [], guastiEt.slice(0, 8).join(String.fromCharCode(10)));
});
ok('nessuna heatmap su un rapporto scrive 0.0% dove manca la base; le corsie vuote ci sono (Muttahar)', () => {
  assert(heat >= 1 && vuote >= 1, `heatmap su rapporti ${heat}, celle vuote ${vuote}`);
  assert.deepStrictEqual(guastiH.slice(0, 8), [], guastiH.slice(0, 8).join('\n'));
});
/* LA LINEA SI MUOVE (Fra su Nicola, 15 ott 2026: "il primo line chart devi lavorare sugli assi: cosi non
   si vede l'evoluzione ma sembra una linea dritta"). Un trend con l'asse da zero e tutti i punti nella
   meta alta del grafico schiaccia l'evoluzione: l'asse deve partire vicino ai dati. */
ok('ogni trend: se i punti stanno tutti nella meta alta, l asse non parte da zero', () => {
  const guasti = [];
  let visti = 0;
  casi().forEach(c => perPagina(c, (pg, doc) => {
    [...doc.querySelectorAll('#page svg')].forEach(svg => {
      const linea = svg.querySelector('path[stroke="var(--cur)"][stroke-width="2"]');
      const punti = [...svg.querySelectorAll('circle.hit')].map(e => +e.getAttribute('cy'));
      if (!linea || punti.length < 6) return;
      const h = +svg.getAttribute('height'), t = 14, ih = h - 14 - 22;
      const tacche = [...svg.querySelectorAll('text[text-anchor="end"]')].filter(e => e.getAttribute('fill') === 'var(--muted2)');
      if (!tacche.length) return;
      visti++;
      const fondo = tacche.reduce((a, e) => +e.getAttribute('y') > +a.getAttribute('y') ? e : a);
      const zero = /^[^1-9]*0([.,]0+)?[^0-9]*$/.test(fondo.textContent.trim());
      const piuBasso = Math.max.apply(null, punti);
      if (zero && piuBasso < t + ih * 0.5) guasti.push(c.id + ' · ' + (pg ? pg.id : '') + ': asse da zero e linea tutta nella meta alta');
    });
  }));
  assert.ok(visti >= 5, 'solo ' + visti + ' trend guardati');
  assert.deepStrictEqual(guasti, [], guasti.join(String.fromCharCode(10) + '       '));
});

/* LO STESSO GRAFICO DUE VOLTE NELLA STESSA PAGINA si rifiuta: si usa il bookmark (Fra su Nicola) */
ok('due visual dello stesso tipo sulla stessa dimensione nella stessa pagina sono rifiutati: si usa una card a viste', () => {
  const { validate } = require('../engine/render.js');
  const c = casi().find(x => x.id === 'locale/app-lingue');
  const s = JSON.parse(JSON.stringify(c.caso.spec));
  const card = s.drill.page.rows[0].visuals[0];
  s.drill.page.rows[0].visuals = card.viste.map(v => Object.assign({}, v, { span: 2, h: 170 }));
  s.drill.page.rows[0].visuals.forEach(v => { delete v.etichetta; });
  assert.throws(() => validate(s, c.caso.build()), /stesso grafico ripetuto/);
  assert.doesNotThrow(() => validate(c.caso.spec, c.caso.build()), 'con la card a viste passa');
});

/* I DATI ANNUALI HANNO UNA LINEA ANNUALE: `grain: "year"` disegna un punto per anno su tutti gli anni
   (Nicola: il PIL pro capite mese per mese era dodici punti uguali) */
ok('un trend con grain "year" disegna un punto per ogni anno dei dati, con l asse adattato', () => {
  const c = casi().find(x => x.id === 'locale/supply-chain-muttahar');
  const spec = JSON.parse(JSON.stringify(c.caso.spec)), data = c.caso.build();
  const pg = spec.pages.find(p => p.rows.some(r => r.visuals.some(v => v.type === 'colline')));
  const row = pg.rows.find(r => r.visuals.some(v => v.type === 'colline'));
  const i = row.visuals.findIndex(v => v.type === 'colline');
  row.visuals[i] = { type: 'trend', span: row.visuals[i].span, h: row.visuals[i].h, title: 'OTIF per anno', bind: { measure: 'otif', grain: 'year' } };
  const { render } = require('../engine/render.js');
  const dom = new JSDOM(render(spec, data), { runScripts: 'dangerously', pretendToBeVisual: true });
  const doc = dom.window.document;
  doc.querySelector('.navbtn[data-page="' + pg.id + '"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const card = [...doc.querySelectorAll('#page .card')].find(k => /OTIF per anno/.test(k.textContent));
  const punti = card.querySelectorAll('circle.hit').length;
  assert.strictEqual(punti, data.years.length, 'un punto per anno: ' + punti + ' su ' + data.years.length);
  /* e nessuna legenda "anno / anno prima tratteggiato": la serie per anni non la disegna */
  assert.ok(!card.querySelector('.lgd .ln'), 'la legenda promette un tratteggio che il trend per anni non disegna');
  dom.window.close();
});

console.log('  ' + n + ' checks');
