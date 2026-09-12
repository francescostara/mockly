#!/usr/bin/env node
/* L'ALBERO DELLE DOMANDE, messo alla prova.
 *
 * La promessa e forte: un mockup intero senza scrivere una frase, senza crediti, e sempre lo
 * stesso a parita di risposte. Una promessa cosi si difende solo provandola per intero — le
 * domande, il percorso, la composizione, il file che ne esce e le sue interazioni.
 *
 * Le cose che qui si difendono:
 *   1. e un ALBERO, non un modulo: la domanda dopo dipende da quella prima;
 *   2. nessuna domanda e rispondibile a caso: ognuna ha un testo, un perche, e opzioni vere;
 *   3. l'intervista incompleta non compone: meglio una domanda in piu che un valore inventato;
 *   4. il numero dichiarato dall'utente E la scala del mockup, non un'indicazione;
 *   5. il vocabolario del mestiere arriva davvero dentro il file;
 *   6. quello che esce e un report VIVO: si filtra, si clicca, i numeri si muovono;
 *   7. stesse risposte, stesso file byte per byte — altrimenti "deterministico" e una parola.
 */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { render } = require('../engine/render.js');
const I = require('../engine/intervista.js');
const SCHEDA = require('../engine/scheda.js');
const INTER = require('./interazione.js');

let n = 0;
const ok = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

console.log('l albero delle domande (un mockup solo con risposte chiuse)');

/** Gioca l'intervista scegliendo cio che e indicato, e il suggerito per tutto il resto. */
function gioca(scelte) {
  const r = {};
  let d, giri = 0;
  while ((d = I.prossima(r)) && giri++ < 40) {
    let v = (scelte || {})[d.id];
    if (v === undefined) {
      v = d.tipo === 'scelta' ? d.opzioni[0].v
        : d.tipo === 'numero' ? d.suggerito
          : (d.suggerito || 'Acme');
    }
    r[d.id] = v;
  }
  assert.ok(I.completa(r), 'l intervista non si e chiusa in 40 domande');
  return r;
}
const chiesto = r => I.percorso(r).map(d => d.id);

ok('e un albero: la domanda dopo dipende da quella prima', () => {
  const f = chiesto(gioca({ archetipo: 'funnel' }));
  const o = chiesto(gioca({ archetipo: 'operational' }));
  assert.ok(f.includes('trattative'), 'al funnel si chiedono le trattative chiuse');
  assert.ok(!f.includes('transazioni'), 'e non le transazioni al giorno');
  assert.ok(o.includes('transazioni'), 'all operativo si chiedono le transazioni al giorno');
  assert.ok(!o.includes('trattative'), 'e non le trattative');
});

ok('una domanda inutile non si fa', () => {
  const corta = chiesto(gioca({ storia: 2 }));
  assert.ok(!corta.includes('apertura'),
    'con due anni di storia non ha senso chiedere quanti anni si vedono all apertura');
  const lunga = chiesto(gioca({ storia: 5 }));
  assert.ok(lunga.includes('apertura'), 'con cinque anni la domanda serve');
});

ok('ogni domanda si puo rispondere senza sapere come e fatto un report', () => {
  const visti = {};
  I.ALBERO.forEach(d => {
    assert.ok(!visti[d.id], 'due domande con lo stesso id: ' + d.id);
    visti[d.id] = true;
    assert.ok(d.perche && d.perche.length > 20, d.id + ': manca il "perche" — una domanda senza ' +
      'motivo dichiarato costringe a indovinare cosa cambiera');
    assert.ok(['scelta', 'numero', 'testo'].includes(d.tipo), d.id + ': tipo "' + d.tipo + '" ignoto');
  });
  /* le opzioni dinamiche devono risolversi su una risposta plausibile qualunque */
  Object.keys(I.NICCHIE).forEach(nic => {
    I.percorso({ nicchia: nic, archetipo: 'funnel', storia: 5 }).forEach(d => {
      if (d.tipo !== 'scelta') return;
      assert.ok(Array.isArray(d.opzioni) && d.opzioni.length, nic + ' / ' + d.id + ': niente opzioni');
      d.opzioni.forEach(o => assert.ok(o.v !== undefined && o.testo, nic + ' / ' + d.id + ': opzione monca'));
    });
  });
});

ok('un intervista incompleta non compone niente', () => {
  assert.throws(() => I.componi({ nicchia: 'retail' }), /intervista incompleta/);
});

ok('il numero dichiarato E la scala del mockup', () => {
  const m = I.componi(gioca({ nicchia: 'ristorazione', archetipo: 'quadrants', volume: 3400000 }));
  const dati = m.build();
  const iy = dati.facts.cols.indexOf('y');
  const ip = dati.facts.cols.indexOf(m.dataParams.facts.fields[0].id);
  const ultimo = dati.years[dati.years.length - 1];
  let tot = 0;
  dati.facts.rows.forEach(row => { if (row[iy] === ultimo) tot += row[ip] || 0; });
  const scarto = Math.abs(tot - 3400000) / 3400000;
  assert.ok(scarto < 0.001, 'chiesti 3.400.000, generati ' + tot + ' (scarto ' +
    (scarto * 100).toFixed(2) + '%): la volumetria dichiarata deve essere la scala, non un consiglio');
});

ok('le due ancore cadono dove l utente le ha messe', () => {
  /* Il difetto che questa prova impedisce ha una faccia precisa: nove milioni dichiarati come
     fatturato applicati al campo dei LEAD, cioe nove milioni di contatti e un valore medio da
     ventimila euro a contratto. Un numero solo non regge un report: servono due ancore e due
     leve, e il rapporto fra loro deve essere quello dichiarato, non quello che capita. */
  const conta = (m, campo, stock) => {
    const d = m.build();
    const iy = d.facts.cols.indexOf('y'), im = d.facts.cols.indexOf('m'), ic = d.facts.cols.indexOf(campo);
    const ultimo = d.years[d.years.length - 1];
    let righe = d.facts.rows.filter(x => x[iy] === ultimo);
    if (stock) {
      const mm = righe.reduce((a, x) => Math.max(a, x[im]), 0);
      righe = righe.filter(x => x[im] === mm);
    }
    return righe.reduce((a, x) => a + (x[ic] || 0), 0);
  };
  const vicino = (avuto, atteso, tolleranza, che) => assert.ok(
    Math.abs(avuto - atteso) / atteso < tolleranza,
    che + ': chiesto ' + atteso + ', ottenuto ' + avuto);

  const f = I.componi(gioca({ archetipo: 'funnel', volume: 9000000, trattative: 320 }));
  vicino(conta(f, 'vinte'), 320, 0.02, 'funnel · trattative vinte');
  vicino(conta(f, 'valore'), 9000000, 0.01, 'funnel · valore');

  const e = I.componi(gioca({ archetipo: 'executive-summary', volume: 12000000, clienti: 4800 }));
  vicino(conta(e, 'clienti', true), 4800, 0.02, 'executive · clienti attivi a fine anno');

  const o = I.componi(gioca({ archetipo: 'operational', volume: 12000000, transazioni: 260 }));
  vicino(conta(o, 'presenze'), 260 * 365, 0.02, 'operativo · transazioni in un anno');
});

ok('il vocabolario del mestiere arriva dentro il file', () => {
  const m = I.componi(gioca({ nicchia: 'logistica', dimensione: 'tratte', quante: 4 }));
  const html = render(m.spec, m.build());
  ['Nord-Sud', 'Nord-Est', 'Centro', 'Isole'].forEach(v => assert.ok(html.includes(v),
    'manca la voce "' + v + '": il report deve parlare la lingua del mestiere'));
  assert.ok(html.includes('Tratta'), 'il filtro deve chiamarsi come lo chiama il cliente');
});

ok('la pelle scelta arriva, e la griglia la segue', () => {
  const m = I.componi(gioca({ pelle: 'tecnico-scuro' }));
  assert.strictEqual(m.spec.skin.shell, 'top');
  assert.strictEqual(m.spec.grid.contentWidth, 1248, 'la larghezza utile segue la shell');
  render(m.spec, m.build());     /* e il motore non la rifiuta */
});

ok('a ogni mestiere si propongono solo gli archetipi che gli stanno bene', () => {
  /* Lo scheletro della sintesi direzionale e costruito sul ricavo RICORRENTE — MRR, churn, NRR
     — che in un'osteria non esiste; quello operativo su capacita e riempimento, che in una
     pipeline B2B non vogliono dire niente. Un report che parla di cose che il cliente non ha e
     il difetto piu difficile da correggere dopo: non e un numero storto, e un discorso storto. */
  const opz = r => I.percorso(r).filter(d => d.id === 'archetipo')[0].opzioni.map(o => o.v);
  assert.ok(!opz({ nicchia: 'ristorazione' }).includes('executive-summary'),
    'a un ristorante non si propone la sintesi costruita sul ricorrente');
  assert.ok(!opz({ nicchia: 'b2b-sales' }).includes('operational'),
    'a una pipeline B2B non si propone il report di capacita e riempimento');
  assert.ok(opz({ nicchia: 'saas' }).includes('executive-summary'));
  Object.keys(I.NICCHIE).forEach(nic => {
    assert.ok((I.NICCHIE[nic].archetipi || []).length >= 2, nic + ': serve piu di una scelta');
  });
});

ok('nessuna parola dello scheletro sopravvive dove il mestiere e un altro', () => {
  const m = I.componi(gioca({ nicchia: 'ristorazione', archetipo: 'operational', dimensione: 'locali', azienda: 'Osteria Vera' }));
  /* si guarda cio che il lettore LEGGE, non la spec: gli id interni (ricavoSocio, soci) restano
     quelli dello scheletro ed e giusto cosi — tradurli romperebbe i riferimenti fra misure */
  const dom = new JSDOM(render(m.spec, m.build()), { runScripts: 'dangerously', pretendToBeVisual: true });
  /* la pagina e la scheda di interazione: e tutto cio che si legge davvero. Il testo dentro
     <script> e la spec serializzata, dove gli id restano quelli dello scheletro. */
  const d2 = dom.window.document;
  const letto = d2.getElementById('page').textContent + ' ' +
    [...d2.querySelectorAll('#rail, #tools, header, .hdr, #howp')].map(e => e.textContent).join(' ');
  ['Club Aurora', 'Soci', 'socio', 'per corso'].forEach(p => assert.ok(!letto.includes(p),
    'la parola "' + p + '" viene dalla palestra dello scheletro e in un ristorante non ci sta'));
  dom.window.close();
  /* il marchio non sta nel titolo — lo antepone il motore, e scriverlo due volte darebbe
     "Osteria Vera — Osteria Vera — ..." nella finestra del browser */
  assert.strictEqual(m.spec.meta.brand.name, 'Osteria Vera');
  assert.ok(!/—/.test(m.spec.meta.title), 'il titolo non porta piu il marchio dello scheletro: ' + m.spec.meta.title);
});

ok('ogni archetipo e ogni nicchia producono un report valido', () => {
  const prove = [];
  Object.keys(I.ARCHETIPI).forEach(a => {
    const nic = Object.keys(I.NICCHIE).filter(k => I.NICCHIE[k].archetipi.indexOf(a) >= 0)[0];
    prove.push({ archetipo: a, nicchia: nic });
  });
  Object.keys(I.NICCHIE).forEach(nic => prove.push({ nicchia: nic }));
  prove.forEach(p => {
    const m = I.componi(gioca(p));
    const dati = m.build();
    /* validate() non torna gli errori: li lancia. Va bene cosi — qui la prova e che non lanci.
       Il numero rotto si cerca nel TESTO della pagina renderizzata, non nel sorgente: la parola
       "undefined" compare cento volte nel motore inlineato, ed e codice, non un valore. */
    const dom = new JSDOM(render(m.spec, dati), { runScripts: 'dangerously', pretendToBeVisual: true });
    /* solo la pagina: il testo di <script> e sorgente del motore, non un valore mostrato */
    const testo = dom.window.document.getElementById('page').textContent;
    assert.ok(!/NaN|undefined|Infinity/.test(testo),
      p.nicchia + '/' + p.archetipo + ': numero rotto nella pagina — ' +
      (testo.match(/.{0,40}(NaN|undefined|Infinity).{0,20}/) || [''])[0].trim());
    dom.window.close();
  });
});

ok('il peso si dichiara, e le leve per rientrare si dicono', () => {
  const leggero = I.componi(gioca({ archetipo: 'quadrants', quante: 3, storia: 2 }));
  assert.ok(!leggero.peso.oltre, 'un caso normale deve stare nel tetto: ' + leggero.peso.kb + 'KB');
  const pesante = I.componi(gioca({ archetipo: 'executive-summary', quante: 6, storia: 6 }));
  assert.ok(pesante.peso.kb > 0);
  if (pesante.peso.oltre) {
    assert.ok(pesante.peso.leve.length,
      'se il file sfora, almeno una leva deve essere stata tirata prima di arrendersi');
  }
});

ok('quello che esce e un report vivo, non un disegno', () => {
  const m = I.componi(gioca({ nicchia: 'palestre', archetipo: 'operational', quante: 4 }));
  const dati = m.build();
  const dom = new JSDOM(render(m.spec, dati), { runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  const fire = (el, ty) => el && el.dispatchEvent(new w.MouseEvent(ty, { bubbles: true, cancelable: true }));
  const B = {
    q: s => d.querySelector(s), qa: s => [...d.querySelectorAll(s)],
    clk: s => fire(typeof s === 'string' ? d.querySelector(s) : s, 'click'),
    rmb: s => fire(typeof s === 'string' ? d.querySelector(s) : s, 'contextmenu')
  };
  const es = INTER.esegui(B, m.spec, dati, SCHEDA.piano(m.spec, dati));
  assert.strictEqual(es.problemi.length, 0, es.problemi.slice(0, 3).join('\n'));
  assert.ok(es.prove > 20, 'solo ' + es.prove + ' interazioni provate');
  w.close();
});

ok('stesse risposte, stesso file byte per byte', () => {
  const r = gioca({ nicchia: 'ecommerce', archetipo: 'funnel', quante: 5 });
  const a = render(I.componi(r).spec, I.componi(r).build());
  const b = render(I.componi(r).spec, I.componi(r).build());
  assert.strictEqual(a, b, 'due interviste identiche devono dare lo stesso file');
});

console.log('  ' + n + ' verifiche superate\n');
