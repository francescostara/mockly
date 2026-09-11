/* LA CODA DI REVISIONE — cosa si giudica, in che ordine, e cosa ne dice la macchina.
 *
 * Sta separata dal server perche e la parte che ha delle idee: quali mockup entrano, come si
 * mescolano, e come si calcola il verdetto automatico che l'autore NON deve vedere prima di
 * aver votato.
 *
 * Cosa entra: i report. Gli archetipi canonici, il banco, i giri del ciclo locale, le fixture
 * dell'eval. Cosa NON entra: il campionario delle pelli, che ha la sua pagina — li si giudica
 * la PELLE, qui il REPORT, e mescolarli significherebbe chiedere due domande diverse con lo
 * stesso questionario.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { render, measurePage } = require('../engine/render.js');
const GN = require('../test/gates-numbers.js');
const SCHEDA = require('../engine/scheda.js');
const INTER = require('../test/interazione.js');

const RADICE = path.join(__dirname, '..');

/** Tutti i casi giudicabili, con la loro provenienza. */
function casi() {
  const out = [];
  const aggiungi = (fonte, mappa) => Object.keys(mappa)
    .filter(k => k[0] !== '_')
    .forEach(id => out.push({ id: fonte + '/' + id, fonte, caso: mappa[id] }));

  aggiungi('archetipi', require('../engine/templates/index.js'));
  aggiungi('banco', require('../engine/specs/banco/index.js'));
  aggiungi('eval', require('../engine/specs/index.js'));

  const dirLoc = path.join(RADICE, 'engine', 'specs', 'locale');
  fs.readdirSync(dirLoc).filter(f => f.endsWith('.js') && f !== 'index.js').forEach(f => {
    out.push({ id: 'locale/' + f.replace(/\.js$/, ''), fonte: 'locale',
      caso: require(path.join(dirLoc, f)) });
  });
  return out;
}

/* L'ordine e MESCOLATO, non raggruppato per nicchia: tre report di ristorazione di fila
   addormentano l'occhio, e la ripetitivita — che e il difetto che cerchiamo — si nota solo
   quando due report simili arrivano lontani fra loro. Il mescolamento e deterministico: lo
   stesso giro presenta la stessa sequenza, cosi "il quarto" vuol dire qualcosa. */
function mescola(arr, seme) {
  const a = arr.slice();
  let s = seme || 20260911;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Il VERDETTO AUTOMATICO. Sono gli stessi gate del ciclo locale — numeri, geometria,
 * interazioni — perche il confronto con il giudizio umano ha senso solo se la macchina dice
 * qui esattamente quello che direbbe in produzione.
 */
function giudica(caso) {
  const data = caso.build();
  let html;
  try { html = render(caso.spec, data); }
  catch (e) {
    return { html: null, verdetto: 'DA RIVEDERE', problemi: [(e.message.split('\n')[1] || e.message).trim()] };
  }
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  let agg = null;
  try { const A = w.MK && w.MK.__A; if (A) agg = A.agg(A.slice({})); } catch { /* niente */ }
  let problemi = GN.tutti(d, caso.spec, agg);

  const fire = (el, ty) => el && el.dispatchEvent(new w.MouseEvent(ty, { bubbles: true, cancelable: true }));
  const B = {
    q: s => d.querySelector(s), qa: s => [...d.querySelectorAll(s)],
    clk: s => fire(typeof s === 'string' ? d.querySelector(s) : s, 'click'),
    rmb: s => fire(typeof s === 'string' ? d.querySelector(s) : s, 'contextmenu')
  };
  const es = INTER.esegui(B, caso.spec, data, SCHEDA.piano(caso.spec, data));
  problemi = problemi.concat(es.problemi);
  w.close();

  (caso.spec.pages || []).forEach(pg => {
    let m; try { m = measurePage(caso.spec, data, pg.id); } catch { return; }
    if (m.over > 0) problemi.push(`pagina "${pg.id}": sfora di ${m.over}px`);
    if (m.lastRowH < 120) problemi.push(`pagina "${pg.id}": riga di chiusura a ${m.lastRowH}px`);
  });

  return {
    html,
    verdetto: problemi.length ? 'DA RIVEDERE' : 'SPEDIBILE',
    problemi,
    interazioni: es.prove,
    scheda: SCHEDA.testo(caso.spec, data)
  };
}

/** La coda pronta: html in memoria, verdetto tenuto da parte. */
function costruisci(limite) {
  const tutti = mescola(casi());
  const scelti = limite ? tutti.slice(0, limite) : tutti;
  return scelti.map(c => {
    const g = giudica(c.caso);
    return {
      id: c.id,
      fonte: c.fonte,
      nome: c.caso.name || c.id,
      titolo: (c.caso.spec.meta || {}).title || c.id,
      archetipo: c.caso.spec.archetype || null,
      /* il verdetto e i problemi restano QUI: non escono verso la pagina prima del voto */
      auto: { verdetto: g.verdetto, problemi: g.problemi, interazioni: g.interazioni },
      scheda: g.scheda,
      html: g.html
    };
  });
}

module.exports = { costruisci, giudica, casi, mescola };
